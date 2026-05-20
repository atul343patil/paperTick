"""
Feature engineering for the Hybrid LSTM-CNN neural network.
Computes 15 features from raw option parameters, based on:
  - Our paper: "A Physics-Informed Hybrid LSTM-CNN Ensemble Framework"
  - Oxford paper: "Deep Learning for Options Trading" (Section 6.2)
"""

import math
import numpy as np
from scipy.stats import norm


def compute_features(S, K, T, r, sigma, option_type):
    """
    Compute the 15-dimensional feature vector for the neural network.

    Parameters
    ----------
    S : float       Spot price
    K : float       Strike price
    T : float       Time to expiry (years)
    r : float       Risk-free rate (decimal)
    sigma : float   Implied volatility (decimal)
    option_type : str   'call' or 'put'

    Returns
    -------
    np.ndarray  Shape (15,) feature vector.
    """
    sqrt_T = math.sqrt(max(T, 1e-10))
    moneyness = S / K
    log_moneyness = math.log(max(moneyness, 1e-10))
    exp_neg_rT = math.exp(-r * T)
    sigma_sqrt_T = sigma * sqrt_T
    sigma_sq = sigma ** 2

    # Black-Scholes d1 / d2
    d1 = (log_moneyness + (r + 0.5 * sigma_sq) * T) / max(sigma_sqrt_T, 1e-10)
    d2 = d1 - sigma_sqrt_T

    # BS price as feature
    if option_type == "call":
        bs_price = S * norm.cdf(d1) - K * exp_neg_rT * norm.cdf(d2)
        intrinsic_value = max(S - K, 0.0)
    else:
        bs_price = K * exp_neg_rT * norm.cdf(-d2) - S * norm.cdf(-d1)
        intrinsic_value = max(K - S, 0.0)

    bs_price = max(bs_price, 0.0)
    time_value_proxy = S * sigma * sqrt_T  # Vega-like proxy

    is_call = 1.0 if option_type == "call" else 0.0

    features = np.array([
        log_moneyness,      # 1
        sqrt_T,             # 2
        exp_neg_rT,         # 3
        sigma,              # 4
        T,                  # 5
        r,                  # 6
        moneyness,          # 7
        d1,                 # 8
        d2,                 # 9
        bs_price,           # 10
        intrinsic_value,    # 11
        time_value_proxy,   # 12
        sigma_sqrt_T,       # 13
        sigma_sq,           # 14
        is_call,            # 15
    ], dtype=np.float64)

    return features


def create_sequence(S, K, T, r, sigma, option_type, seq_len=30):
    """
    Create a (seq_len, 15) input sequence for the LSTM.

    If historical data is unavailable, we generate a synthetic sequence
    by perturbing the current features with small Gaussian noise to
    simulate a stable market window.

    Parameters
    ----------
    seq_len : int   Number of timesteps (default 30).

    Returns
    -------
    np.ndarray  Shape (seq_len, 15).
    """
    base = compute_features(S, K, T, r, sigma, option_type)
    sequence = np.tile(base, (seq_len, 1))  # (30, 15)

    # Add small Gaussian noise to simulate temporal variation
    # (excluding the binary is_call feature at index 14)
    rng = np.random.default_rng(seed=42)
    noise = rng.normal(0, 0.02, size=(seq_len, 14))
    sequence[:, :14] += sequence[:, :14] * noise

    return sequence.astype(np.float32)
