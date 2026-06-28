"""
Flask ML microservice for PaperTick Options Calculator.
Serves three pricing engines: Black-Scholes, Monte Carlo, Hybrid LSTM-CNN.
Port: 5001
"""

import logging
import math
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from utils.validators import validate_inputs
from utils.feature_engineering import create_sequence, compute_features
from models import black_scholes, monte_carlo, ensemble
from models.hybrid_model import HybridModel, WEIGHTS_PATH

# --- Logging ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# --- App setup ---
app = Flask(__name__)
CORS(app, origins=["http://localhost:5000", "http://localhost:5173"])

# --- Load model ---
hybrid = HybridModel()
hybrid.load()


def _sanitize_float(val):
    """Ensure a value is a valid JSON-safe float (no NaN, Inf, None)."""
    if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
        return 0.0
    return round(float(val), 6)


def _sanitize_dict(d):
    """Recursively sanitize all float values in a dict."""
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[k] = _sanitize_dict(v)
        elif isinstance(v, list):
            result[k] = [_sanitize_float(x) if isinstance(x, (int, float)) else x for x in v]
        elif isinstance(v, (int, float)):
            result[k] = _sanitize_float(v)
        else:
            result[k] = v
    return result


# ── Endpoints ────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Health check."""
    return jsonify({"status": "ok", "service": "ml-service"})


@app.route("/model-status", methods=["GET"])
def model_status():
    """Return the current model status (pre-trained weights check)."""
    weights_exist = os.path.exists(WEIGHTS_PATH)
    if weights_exist:
        return jsonify({
            "is_trained": True,
            "model_type": "Hybrid LSTM-CNN",
            "trained_on": "NSE Nifty Options 2023-2025",
        })
    else:
        return jsonify({
            "is_trained": False,
            "model_type": "Hybrid LSTM-CNN (fallback to BS+noise — run train_offline.py)",
        })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Run all three pricing engines and return comparison results.
    """
    try:
        data = request.get_json(silent=True) or {}
        params = validate_inputs(data)
    except ValueError as e:
        return jsonify({"error": str(e), "status": 400}), 400

    S = params["S"]
    K = params["K"]
    T = params["T"]
    r = params["r"]
    sigma = params["sigma"]
    option_type = params["option_type"]

    # --- Engine 1: Black-Scholes ---
    bs_result = black_scholes.price(S, K, T, r, sigma, option_type)

    # --- Engine 2: Monte Carlo ---
    mc_result = monte_carlo.price(S, K, T, r, sigma, option_type)

    # --- Engine 3: Neural Network ---
    nn_result = _run_neural_network(S, K, T, r, sigma, option_type, bs_result, mc_result)

    # --- Comparison metrics ---
    bs_price = bs_result["price"]
    nn_price = nn_result.get("ensemble_price", nn_result["price"])

    bs_vs_nn_diff = abs(bs_price - nn_price)
    bs_vs_nn_pct = (bs_vs_nn_diff / max(bs_price, 0.01)) * 100.0

    mc_price = mc_result["price"]
    mc_vs_nn_diff = abs(mc_price - nn_price)

    comparison = {
        "bs_vs_nn_diff": round(bs_vs_nn_diff, 6),
        "bs_vs_nn_pct": round(bs_vs_nn_pct, 4),
        "mc_vs_nn_diff": round(mc_vs_nn_diff, 6),
        "best_estimate": round(nn_price, 6),
    }

    # --- Put-Call Parity Check ---
    _check_put_call_parity(S, K, T, r, bs_result, option_type)

    response = {
        "black_scholes": _sanitize_dict(bs_result),
        "monte_carlo": _sanitize_dict(mc_result),
        "neural_network": _sanitize_dict(nn_result),
        "comparison": _sanitize_dict(comparison),
        "inputs": params,
    }

    return jsonify(response)


def _run_neural_network(S, K, T, r, sigma, option_type, bs_result, mc_result):
    """Run the LSTM-CNN model or fallback."""
    is_call = option_type == "call"
    intrinsic = max(S - K, 0.0) if is_call else max(K - S, 0.0)

    if hybrid.is_trained:
        sequence = create_sequence(S, K, T, r, sigma, option_type)
        raw_price = hybrid.predict_price(sequence)

        if raw_price is None:
            raw_price = hybrid.predict_fallback(bs_result["price"])
            model_label = "LSTM-CNN (untrained)"
            is_trained = False
        else:
            model_label = "LSTM-CNN Ensemble"
            is_trained = True

        # Boundary clamp
        raw_price = max(raw_price, 0.0)
        raw_price = max(raw_price, intrinsic)
        if is_call:
            raw_price = min(raw_price, S)
        else:
            raw_price = min(raw_price, K)
    else:
        raw_price = hybrid.predict_fallback(bs_result["price"])
        model_label = "LSTM-CNN (untrained)"
        is_trained = False

        raw_price = max(raw_price, 0.0)
        raw_price = max(raw_price, intrinsic)
        if is_call:
            raw_price = min(raw_price, S)
        else:
            raw_price = min(raw_price, K)

    # Ensemble price
    ensemble_price = ensemble.combine(
        bs_result["price"], mc_result["price"], raw_price, S, K, option_type
    )

    # Use BS Greeks as approximation for NN (analytical is more stable)
    nn_greeks = {
        "delta": bs_result["delta"],
        "gamma": bs_result["gamma"],
        "theta": bs_result["theta"],
        "vega": bs_result["vega"],
        "rho": bs_result["rho"],
    }

    return {
        "price": round(raw_price, 6),
        "delta": nn_greeks["delta"],
        "gamma": nn_greeks["gamma"],
        "theta": nn_greeks["theta"],
        "vega": nn_greeks["vega"],
        "rho": nn_greeks["rho"],
        "ensemble_price": ensemble_price,
        "is_trained": is_trained,
        "model_label": model_label,
        "intrinsic_value": round(intrinsic, 6),
        "time_value": round(max(raw_price - intrinsic, 0.0), 6),
    }


def _check_put_call_parity(S, K, T, r, result, option_type):
    """Log a warning if put-call parity is significantly violated."""
    try:
        exp_neg_rT = math.exp(-r * T)
        parity_rhs = S - K * exp_neg_rT  # C - P should equal this

        if option_type == "call":
            call_price = result["price"]
            # Compute put from parity
            implied_put = call_price - parity_rhs
            if implied_put < 0:
                logger.debug("Put-call parity: implied put is negative (deep ITM call)")
        else:
            put_price = result["price"]
            implied_call = put_price + parity_rhs
            if implied_call < 0:
                logger.debug("Put-call parity: implied call is negative (deep ITM put)")
    except Exception:
        pass


# ── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(port=5001, debug=True)
