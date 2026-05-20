"""
Monte Carlo simulation with antithetic variates for variance reduction.
Greeks computed via bump-and-reprice (finite difference) with shared seed.

References:
  - Glasserman, P. (2003). "Monte Carlo Methods in Financial Engineering"
  - "A Physics-Informed Hybrid LSTM-CNN Ensemble Framework" (our paper)
"""

import math
import numpy as np
from scipy.stats import norm

N_SIMULATIONS = 10000
USE_ANTITHETIC = True
SEED = 42


def _simulate_price(S, K, T, r, sigma, option_type, rng_state):
    """
    Run a single Monte Carlo simulation using pre-generated random numbers.

    Parameters
    ----------
    rng_state : np.ndarray
        Pre-generated standard normal samples.

    Returns
    -------
    tuple  (price, std_error, payoffs)
    """
    Z = rng_state

    if USE_ANTITHETIC:
        Z_full = np.concatenate([Z, -Z])
    else:
        Z_full = Z

    # Geometric Brownian Motion terminal prices
    S_T = S * np.exp((r - 0.5 * sigma ** 2) * T + sigma * math.sqrt(max(T, 1e-10)) * Z_full)

    # Payoffs
    if option_type == "call":
        payoffs = np.maximum(S_T - K, 0.0)
    else:
        payoffs = np.maximum(K - S_T, 0.0)

    # Discounted expected payoff
    discount = math.exp(-r * T)
    option_price = discount * np.mean(payoffs)
    std_error = discount * np.std(payoffs) / math.sqrt(len(payoffs))

    return max(option_price, 0.0), std_error, payoffs


def price(S, K, T, r, sigma, option_type="call"):
    """
    Monte Carlo option price with all Greeks via finite difference.

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
    dict    Price, all Greeks, std_error, confidence_interval.
    """
    is_call = option_type == "call"
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
            "intrinsic_value": round(intrinsic, 6),
            "time_value": 0.0,
            "std_error": 0.0,
            "confidence_interval": [round(p, 6), round(p, 6)],
            "model": "monte_carlo",
        }

    # Generate SHARED random seed for all bump calculations
    rng = np.random.default_rng(SEED)
    Z = rng.standard_normal(N_SIMULATIONS)

    # --- Base price ---
    base_price, std_error, _ = _simulate_price(S, K, T, r, sigma, option_type, Z)
    base_price = max(base_price, intrinsic)

    # --- Confidence interval ---
    ci_lower = base_price - 1.96 * std_error
    ci_upper = base_price + 1.96 * std_error

    # --- Delta: bump S ---
    dS = S * 0.01
    p_up, _, _ = _simulate_price(S + dS, K, T, r, sigma, option_type, Z)
    p_down, _, _ = _simulate_price(S - dS, K, T, r, sigma, option_type, Z)
    delta = (p_up - p_down) / (2.0 * dS)

    # Clamp delta
    if is_call:
        delta = max(0.0, min(1.0, delta))
    else:
        delta = max(-1.0, min(0.0, delta))

    # --- Gamma: second derivative w.r.t. S ---
    gamma = (p_up - 2.0 * base_price + p_down) / (dS ** 2)
    gamma = max(0.0, min(10.0, gamma))

    # --- Theta: bump T ---
    dt = 1.0 / 365.0
    T_bumped = max(T - dt, 0.001)
    p_T, _, _ = _simulate_price(S, K, T_bumped, r, sigma, option_type, Z)
    theta = (p_T - base_price) / dt  # this is already per day
    theta = theta / 365.0 * 365.0     # keep per day
    theta = -abs(theta)  # theta is almost always negative
    theta = max(-S * 0.1, min(0.0, theta))

    # --- Vega: bump sigma ---
    d_sigma = 0.01
    sigma_up = sigma + d_sigma
    sigma_down = max(sigma - d_sigma, 0.001)
    p_sigma_up, _, _ = _simulate_price(S, K, T, r, sigma_up, option_type, Z)
    p_sigma_down, _, _ = _simulate_price(S, K, T, r, sigma_down, option_type, Z)
    vega = (p_sigma_up - p_sigma_down) / (2.0 * d_sigma)
    vega = vega / 100.0  # per 1% change
    vega = max(0.0, min(S * 0.5, vega))

    # --- Rho: bump r ---
    dr = 0.01
    p_r_up, _, _ = _simulate_price(S, K, T, r + dr, sigma, option_type, Z)
    p_r_down, _, _ = _simulate_price(S, K, T, max(r - dr, 0.0), sigma, option_type, Z)
    rho = (p_r_up - p_r_down) / (2.0 * dr)
    rho = rho / 100.0  # per 1% change

    time_value = max(base_price - intrinsic, 0.0)

    return {
        "price": round(base_price, 6),
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "theta": round(theta, 6),
        "vega": round(vega, 6),
        "rho": round(rho, 6),
        "intrinsic_value": round(intrinsic, 6),
        "time_value": round(time_value, 6),
        "std_error": round(std_error, 6),
        "confidence_interval": [round(ci_lower, 6), round(ci_upper, 6)],
        "model": "monte_carlo",
    }
