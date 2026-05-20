"""
Numerical Greeks via finite difference.
Used by models that do not have analytical Greek formulas (MC, NN).
"""


def finite_difference_greeks(price_fn, S, K, T, r, sigma, option_type):
    """
    Compute Greeks via central finite difference.

    Parameters
    ----------
    price_fn : callable
        A function (S, K, T, r, sigma, option_type) -> float (price only).
    S, K, T, r, sigma : float
        Option parameters.
    option_type : str
        'call' or 'put'.

    Returns
    -------
    dict  {delta, gamma, theta, vega, rho}
    """
    is_call = option_type == "call"
    base = price_fn(S, K, T, r, sigma, option_type)

    # Delta and Gamma (bump S)
    dS = S * 0.01
    p_up = price_fn(S + dS, K, T, r, sigma, option_type)
    p_down = price_fn(max(S - dS, 0.01), K, T, r, sigma, option_type)
    delta = (p_up - p_down) / (2.0 * dS)
    gamma = (p_up - 2.0 * base + p_down) / (dS ** 2)

    # Theta (bump T by 1 day)
    dt = 1.0 / 365.0
    T_down = max(T - dt, 0.001)
    p_T = price_fn(S, K, T_down, r, sigma, option_type)
    theta = (p_T - base)  # per day (T decreased by 1 day)

    # Vega (bump sigma by 1%)
    d_sigma = 0.01
    p_sig_up = price_fn(S, K, T, r, sigma + d_sigma, option_type)
    p_sig_down = price_fn(S, K, T, r, max(sigma - d_sigma, 0.001), option_type)
    vega = (p_sig_up - p_sig_down) / (2.0 * d_sigma) / 100.0

    # Rho (bump r by 1%)
    dr = 0.01
    p_r_up = price_fn(S, K, T, r + dr, sigma, option_type)
    p_r_down = price_fn(S, K, T, max(r - dr, 0.0), sigma, option_type)
    rho = (p_r_up - p_r_down) / (2.0 * dr) / 100.0

    # Clamp
    if is_call:
        delta = max(0.0, min(1.0, delta))
    else:
        delta = max(-1.0, min(0.0, delta))

    gamma = max(0.0, min(10.0, gamma))
    theta = max(-S * 0.1, min(0.0, theta))
    vega = max(0.0, min(S * 0.5, vega))

    return {
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "theta": round(theta, 6),
        "vega": round(vega, 6),
        "rho": round(rho, 6),
    }
