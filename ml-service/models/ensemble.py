"""
Weighted ensemble combiner for the three pricing engines.
Weights from our paper (optimized on validation set):
  V_ensemble = 0.2 * V_BS + 0.1 * V_MC + 0.7 * V_NN
"""

import math


# Ensemble weights from paper Section 3.3
W_BS = 0.2
W_MC = 0.1
W_NN = 0.7


def combine(bs_price, mc_price, nn_price, S, K, option_type="call"):
    """
    Compute the weighted ensemble price with boundary enforcement.

    Parameters
    ----------
    bs_price : float    Black-Scholes price.
    mc_price : float    Monte Carlo price.
    nn_price : float    Neural network price.
    S : float           Spot price.
    K : float           Strike price.
    option_type : str   'call' or 'put'.

    Returns
    -------
    float   Ensemble price, clamped to valid bounds.
    """
    ensemble = W_BS * bs_price + W_MC * mc_price + W_NN * nn_price

    # Enforce non-negative
    ensemble = max(ensemble, 0.0)

    # Enforce >= intrinsic value
    intrinsic = max(S - K, 0.0) if option_type == "call" else max(K - S, 0.0)
    ensemble = max(ensemble, intrinsic)

    # Upper bound
    if option_type == "call":
        ensemble = min(ensemble, S)
    else:
        ensemble = min(ensemble, K)

    return round(ensemble, 6)


def combine_greeks(bs_greeks, mc_greeks, nn_greeks):
    """
    Weighted average of Greeks from all three models.

    Parameters
    ----------
    bs_greeks, mc_greeks, nn_greeks : dict
        Each dict has keys: delta, gamma, theta, vega, rho.

    Returns
    -------
    dict   Weighted ensemble Greeks.
    """
    result = {}
    for key in ["delta", "gamma", "theta", "vega", "rho"]:
        bs_val = bs_greeks.get(key, 0.0)
        mc_val = mc_greeks.get(key, 0.0)
        nn_val = nn_greeks.get(key, 0.0)
        result[key] = round(W_BS * bs_val + W_MC * mc_val + W_NN * nn_val, 6)
    return result
