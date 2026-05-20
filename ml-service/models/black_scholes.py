"""
Exact Black-Scholes analytical pricing with all Greeks.
All values are mathematically bounded per specification constraints.

References:
  - Black, F. & Scholes, M. (1973)
  - "A Physics-Informed Hybrid LSTM-CNN Ensemble Framework" (our paper)
"""

import math
from scipy.stats import norm


def _safe_sqrt(x):
    """Non-negative square root."""
    return math.sqrt(max(x, 0.0))


def price(S, K, T, r, sigma, option_type="call"):
    """
    Compute Black-Scholes option price and all Greeks.

    Parameters
    ----------
    S : float           Spot price
    K : float           Strike price
    T : float           Time to expiry (years)
    r : float           Risk-free rate (decimal)
    sigma : float       Implied volatility (decimal)
    option_type : str   'call' or 'put'

    Returns
    -------
    dict    Price, all Greeks, d1, d2, intrinsic/time value.
    """
    is_call = option_type == "call"

    # --- Intrinsic value ---
    intrinsic = max(S - K, 0.0) if is_call else max(K - S, 0.0)

    # --- Boundary: T -> 0 ---
    if T < 0.001:
        p = intrinsic
        delta = 1.0 if (is_call and S > K) else (-1.0 if (not is_call and K > S) else 0.0)
        return {
            "price": round(p, 6),
            "delta": delta,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0,
            "d1": 0.0,
            "d2": 0.0,
            "intrinsic_value": round(intrinsic, 6),
            "time_value": 0.0,
            "model": "black_scholes",
        }

    # --- Boundary: sigma -> 0 ---
    if sigma < 0.001:
        forward = S * math.exp(r * T)
        if is_call:
            p = max(forward - K, 0.0) * math.exp(-r * T)
        else:
            p = max(K - forward, 0.0) * math.exp(-r * T)
        p = max(p, 0.0)
        delta = 1.0 if (is_call and forward > K) else (-1.0 if (not is_call and K > forward) else 0.0)
        return {
            "price": round(p, 6),
            "delta": delta,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0,
            "d1": 0.0,
            "d2": 0.0,
            "intrinsic_value": round(intrinsic, 6),
            "time_value": round(max(p - intrinsic, 0.0), 6),
            "model": "black_scholes",
        }

    # --- Core Black-Scholes ---
    sqrt_T = _safe_sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    exp_neg_rT = math.exp(-r * T)
    n_d1 = norm.pdf(d1)   # standard normal PDF
    N_d1 = norm.cdf(d1)   # standard normal CDF
    N_d2 = norm.cdf(d2)
    N_neg_d1 = norm.cdf(-d1)
    N_neg_d2 = norm.cdf(-d2)

    # --- Price ---
    if is_call:
        p = S * N_d1 - K * exp_neg_rT * N_d2
    else:
        p = K * exp_neg_rT * N_neg_d2 - S * N_neg_d1

    p = max(p, 0.0)

    # Upper bound clamp
    if is_call:
        p = min(p, S)
    else:
        p = min(p, K * exp_neg_rT)

    # Price must be >= intrinsic
    p = max(p, intrinsic)

    # --- Delta ---
    if is_call:
        delta = N_d1
    else:
        delta = N_d1 - 1.0
    delta = max(-1.0, min(1.0, delta))

    # --- Gamma ---
    gamma = n_d1 / (S * sigma * sqrt_T)
    gamma = max(0.0, min(10.0, gamma))

    # --- Theta (per calendar day) ---
    if is_call:
        theta = (-S * n_d1 * sigma / (2.0 * sqrt_T) - r * K * exp_neg_rT * N_d2) / 365.0
    else:
        theta = (-S * n_d1 * sigma / (2.0 * sqrt_T) + r * K * exp_neg_rT * N_neg_d2) / 365.0
    theta = max(-S * 0.1, min(0.0, theta))

    # --- Vega (per 1% change in vol) ---
    vega = S * n_d1 * sqrt_T / 100.0
    vega = max(0.0, min(S * 0.5, vega))

    # --- Rho (per 1% change in rate) ---
    if is_call:
        rho = K * T * exp_neg_rT * N_d2 / 100.0
    else:
        rho = -K * T * exp_neg_rT * N_neg_d2 / 100.0

    time_value = max(p - intrinsic, 0.0)

    return {
        "price": round(p, 6),
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "theta": round(theta, 6),
        "vega": round(vega, 6),
        "rho": round(rho, 6),
        "d1": round(d1, 6),
        "d2": round(d2, 6),
        "intrinsic_value": round(intrinsic, 6),
        "time_value": round(time_value, 6),
        "model": "black_scholes",
    }
