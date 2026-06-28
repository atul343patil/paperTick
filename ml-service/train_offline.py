"""
Offline training script for PaperTick Hybrid LSTM-CNN model.

This script is run ONCE by the developer (not from the web UI).
It trains the model and saves weights + scaler for the Flask service.

Usage:
  python train_offline.py --data data/nse_nifty_options.csv
  python train_offline.py --synthetic --samples 50000
"""

import argparse
import math
import os
import sys
import logging
import numpy as np
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Ensure ml-service root is on sys.path so imports work
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from utils.feature_engineering import create_sequence
from models.hybrid_model import (
    HybridModel, _build_model,
    SEQ_LEN, NUM_FEATURES, WEIGHTS_PATH, SCALER_PATH, SAVED_DIR,
    BATCH_SIZE, EPOCHS, EARLY_STOP_PATIENCE, LEARNING_RATE,
    GAMMA_BOUNDARY,
)


# ── Synthetic data generation (Black-Scholes SDE) ───────────────────

def _bs_price(S, K, T, r, sigma, option_type):
    """Compute analytical Black-Scholes price."""
    from scipy.stats import norm as sp_norm

    sqrt_T = math.sqrt(max(T, 1e-10))
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    if option_type == "call":
        price = S * sp_norm.cdf(d1) - K * math.exp(-r * T) * sp_norm.cdf(d2)
    else:
        price = K * math.exp(-r * T) * sp_norm.cdf(-d2) - S * sp_norm.cdf(-d1)

    return max(price, 0.0)


def generate_realistic_synthetic(n_samples=50000, seed=42):
    """
    Generate realistic Nifty-like synthetic option data.

    Parameters follow the spec:
      S ~ Uniform(20000, 26000)
      K = S rounded to nearest 50/100 with random offset of -10 to +10 strikes
      T ~ Uniform(1/365, 90/365)
      r = 0.065 (RBI repo rate, fixed)
      sigma ~ Uniform(0.10, 0.30)
      V_market = BS price + Gaussian noise scaled to ~1-3% of price (bid-ask spread)
    """
    logger.info(f"Generating {n_samples} realistic synthetic samples...")

    rng = np.random.default_rng(seed=seed)

    S_arr = rng.uniform(20000, 26000, n_samples)

    # Strike: round spot to nearest 50, then offset by -10 to +10 strike intervals (50 pts each)
    strike_offsets = rng.integers(-10, 11, n_samples)  # -10 to +10 strikes
    K_arr = np.round(S_arr / 50) * 50 + strike_offsets * 50

    T_arr = rng.uniform(1 / 365, 90 / 365, n_samples)  # 1 day to 3 months
    r_val = 0.065  # Fixed RBI repo rate
    r_arr = np.full(n_samples, r_val)
    sigma_arr = rng.uniform(0.10, 0.30, n_samples)  # Realistic Nifty IV range
    is_call = rng.integers(0, 2, n_samples)

    y = np.zeros(n_samples)
    X = np.zeros((n_samples, SEQ_LEN, NUM_FEATURES), dtype=np.float32)
    option_types = []

    for i in range(n_samples):
        S, K, T, r, sigma = S_arr[i], K_arr[i], T_arr[i], r_arr[i], sigma_arr[i]
        otype = "call" if is_call[i] else "put"
        option_types.append(otype)

        bs = _bs_price(S, K, T, r, sigma, otype)

        # Add realistic bid-ask noise: Gaussian, ~1-3% of price
        noise_pct = rng.uniform(0.01, 0.03)
        noise = rng.normal(0, bs * noise_pct + 0.5)  # +0.5 floor for very cheap options
        market_price = max(bs + noise, 0.0)

        # Enforce no-arbitrage: market price >= intrinsic
        if otype == "call":
            intrinsic = max(S - K, 0.0)
        else:
            intrinsic = max(K - S, 0.0)
        market_price = max(market_price, intrinsic)

        y[i] = market_price

        seq = create_sequence(S, K, T, r, sigma, otype, seq_len=SEQ_LEN)
        X[i] = seq

    logger.info(f"Synthetic data generated. Price range: [{y.min():.2f}, {y.max():.2f}], mean: {y.mean():.2f}")
    return X, y, {
        "S": S_arr, "K": K_arr, "T": T_arr,
        "r": r_arr, "sigma": sigma_arr, "option_types": option_types,
    }


def load_csv_data(csv_path):
    """
    Load real option data from CSV and build training arrays.

    Expected columns:
      spot_price, strike_price, days_to_expiry, risk_free_rate,
      implied_volatility, option_type, market_price

    Rates/volatilities can be in decimal (0.065) or percent (6.5) — auto-detected.
    """
    import pandas as pd

    logger.info(f"Loading CSV data from {csv_path}...")
    df = pd.read_csv(csv_path)

    required = {"spot_price", "strike_price", "days_to_expiry",
                "risk_free_rate", "implied_volatility", "option_type", "market_price"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV missing columns: {missing}. "
            f"Required: {sorted(required)}"
        )

    # Clean
    df = df.dropna(subset=list(required))
    df = df[df["market_price"] > 0]
    df = df[df["days_to_expiry"] > 0]

    n = len(df)
    logger.info(f"Loaded {n} valid rows from CSV.")

    X = np.zeros((n, SEQ_LEN, NUM_FEATURES), dtype=np.float32)
    y = np.zeros(n)

    for i, (_, row) in enumerate(df.iterrows()):
        S = float(row["spot_price"])
        K = float(row["strike_price"])
        T = float(row["days_to_expiry"]) / 365.0
        r = float(row["risk_free_rate"])
        sigma = float(row["implied_volatility"])
        otype = str(row["option_type"]).lower().strip()

        # Auto-detect percent vs decimal
        if r > 1:
            r = r / 100.0
        if sigma > 1:
            sigma = sigma / 100.0

        y[i] = float(row["market_price"])
        X[i] = create_sequence(S, K, T, r, sigma, otype, seq_len=SEQ_LEN)

    return X, y


# ── Training logic ───────────────────────────────────────────────────

def train_and_save(X, y):
    """
    Train the Hybrid LSTM-CNN model and save weights + scaler.
    Prints MAE, MAPE, R² on a held-out validation split.
    """
    import tensorflow as tf
    from sklearn.preprocessing import StandardScaler

    logger.info(f"Training on {X.shape[0]} samples, sequence shape: {X.shape[1:]}")

    # Fit scaler
    N, seq, feat = X.shape
    flat = X.reshape(-1, feat)
    scaler = StandardScaler()
    scaler.fit(flat)
    flat_scaled = scaler.transform(flat)
    X_scaled = flat_scaled.reshape(N, seq, feat)

    # Build model
    model = _build_model()

    optimizer = tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE)
    best_val_loss = float("inf")
    patience_counter = 0

    # 80/20 split (shuffle first)
    rng = np.random.default_rng(seed=42)
    indices = rng.permutation(N)
    X_scaled = X_scaled[indices]
    y = y[indices]

    split = int(0.8 * N)
    X_train, X_val = X_scaled[:split], X_scaled[split:]
    y_train, y_val = y[:split], y[split:]

    logger.info(f"Train: {X_train.shape[0]} samples | Val: {X_val.shape[0]} samples")

    train_ds = tf.data.Dataset.from_tensor_slices(
        (X_train.astype(np.float32), y_train.astype(np.float32))
    ).shuffle(4096).batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)

    val_ds = tf.data.Dataset.from_tensor_slices(
        (X_val.astype(np.float32), y_val.astype(np.float32))
    ).batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)

    epochs_trained = 0

    for epoch in range(EPOCHS):
        epoch_loss = []
        for x_batch, y_batch in train_ds:
            with tf.GradientTape() as tape:
                preds = model(x_batch, training=True)
                preds = tf.squeeze(preds, axis=-1)

                # L_data = MSE
                l_data = tf.reduce_mean(tf.square(preds - y_batch))

                # L_boundary: price >= 0
                l_boundary = tf.reduce_mean(tf.square(tf.nn.relu(-preds)))

                total_loss = l_data + GAMMA_BOUNDARY * l_boundary

            grads = tape.gradient(total_loss, model.trainable_variables)
            optimizer.apply_gradients(zip(grads, model.trainable_variables))
            epoch_loss.append(float(total_loss))

        # Validation
        val_losses = []
        for x_batch, y_batch in val_ds:
            preds = model(x_batch, training=False)
            preds = tf.squeeze(preds, axis=-1)
            v_loss = tf.reduce_mean(tf.square(preds - y_batch))
            val_losses.append(float(v_loss))

        avg_val = np.mean(val_losses) if val_losses else float("inf")
        avg_train = np.mean(epoch_loss)

        if epoch % 5 == 0 or epoch == EPOCHS - 1:
            logger.info(f"Epoch {epoch + 1}/{EPOCHS}: train_loss={avg_train:.4f}, val_loss={avg_val:.4f}")

        # Early stopping
        if avg_val < best_val_loss:
            best_val_loss = avg_val
            patience_counter = 0
            model.save_weights(WEIGHTS_PATH)
        else:
            patience_counter += 1
            if patience_counter >= EARLY_STOP_PATIENCE:
                logger.info(f"Early stopping at epoch {epoch + 1}.")
                break

        epochs_trained = epoch + 1

    # Save scaler
    joblib.dump(scaler, SCALER_PATH)
    logger.info(f"Scaler saved to {SCALER_PATH}")

    # Reload best weights
    model.load_weights(WEIGHTS_PATH)
    logger.info(f"Best weights saved to {WEIGHTS_PATH}")

    # ── Evaluate on validation set ───────────────────────────────────
    val_preds = []
    val_true = []
    for x_batch, y_batch in val_ds:
        p = model.predict(x_batch, verbose=0).flatten()
        val_preds.extend(p.tolist())
        val_true.extend(y_batch.numpy().tolist())

    val_preds = np.array(val_preds)
    val_true = np.array(val_true)

    # MAE
    mae = np.mean(np.abs(val_true - val_preds))

    # MAPE (avoid div by zero for very small prices)
    mask = val_true > 1.0  # only compute MAPE where price > ₹1
    if mask.sum() > 0:
        mape = np.mean(np.abs((val_true[mask] - val_preds[mask]) / val_true[mask])) * 100
    else:
        mape = float("nan")

    # R²
    ss_res = np.sum((val_true - val_preds) ** 2)
    ss_tot = np.sum((val_true - np.mean(val_true)) ** 2)
    r_squared = 1.0 - ss_res / max(ss_tot, 1e-10)

    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE — Validation Metrics")
    logger.info("=" * 60)
    logger.info(f"  MAE      : ₹{mae:.4f}")
    logger.info(f"  MAPE     : {mape:.2f}%")
    logger.info(f"  R²       : {r_squared:.4f}")
    logger.info(f"  Epochs   : {epochs_trained}")
    logger.info(f"  Best Loss: {best_val_loss:.6f}")
    logger.info("=" * 60)
    logger.info(f"  Weights  : {WEIGHTS_PATH}")
    logger.info(f"  Scaler   : {SCALER_PATH}")
    logger.info("=" * 60)

    return {
        "mae": round(mae, 4),
        "mape": round(mape, 2),
        "r_squared": round(r_squared, 4),
        "epochs_trained": epochs_trained,
        "best_val_loss": round(best_val_loss, 6),
    }


# ── CLI ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="PaperTick — Offline model training (run ONCE, not from web UI)"
    )
    parser.add_argument("--data", type=str, default=None,
                        help="Path to CSV file with historical option data")
    parser.add_argument("--synthetic", action="store_true",
                        help="Generate synthetic Nifty data via Black-Scholes")
    parser.add_argument("--samples", type=int, default=50000,
                        help="Number of synthetic samples (default: 50000)")

    args = parser.parse_args()

    if not args.data and not args.synthetic:
        parser.error("Specify --data <csv_path> or --synthetic")

    os.makedirs(SAVED_DIR, exist_ok=True)

    if args.data:
        csv_path = args.data
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found: {csv_path}")
            sys.exit(1)
        X, y = load_csv_data(csv_path)
    else:
        X, y, _ = generate_realistic_synthetic(n_samples=args.samples)

    result = train_and_save(X, y)
    logger.info(f"Final result: {result}")


if __name__ == "__main__":
    main()
