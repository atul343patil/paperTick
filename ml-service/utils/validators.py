"""
Input validation and boundary enforcement for option pricing parameters.
Enforces strict bounds before ANY calculation reaches the pricing engines.
"""


def validate_inputs(data):
    """
    Validate and sanitize all option pricing inputs.

    Parameters
    ----------
    data : dict
        Raw request payload with keys: S, K, T, r, sigma, option_type.

    Returns
    -------
    dict
        Sanitized inputs with all values cast to proper types.

    Raises
    ------
    ValueError
        If any input is missing, out of range, or invalid.
    """
    errors = []

    # --- Presence checks ---
    required = ["S", "K", "T", "r", "sigma", "option_type"]
    for field in required:
        if field not in data or data[field] is None:
            errors.append(f"Missing required field: {field}")

    if errors:
        raise ValueError("; ".join(errors))

    # --- Type coercion ---
    try:
        S = float(data["S"])
    except (TypeError, ValueError):
        errors.append(f"S must be a number, got: {data['S']}")
        S = 0.0

    try:
        K = float(data["K"])
    except (TypeError, ValueError):
        errors.append(f"K must be a number, got: {data['K']}")
        K = 0.0

    try:
        T = float(data["T"])
    except (TypeError, ValueError):
        errors.append(f"T must be a number, got: {data['T']}")
        T = 0.0

    try:
        r = float(data["r"])
    except (TypeError, ValueError):
        errors.append(f"r must be a number, got: {data['r']}")
        r = 0.0

    try:
        sigma = float(data["sigma"])
    except (TypeError, ValueError):
        errors.append(f"sigma must be a number, got: {data['sigma']}")
        sigma = 0.0

    option_type = str(data["option_type"]).lower().strip()

    if errors:
        raise ValueError("; ".join(errors))

    # --- Range checks ---
    if not (0.01 <= S <= 1_000_000):
        errors.append(f"S (spot price) must be between 0.01 and 1,000,000. Got: {S}")

    if not (0.01 <= K <= 1_000_000):
        errors.append(f"K (strike price) must be between 0.01 and 1,000,000. Got: {K}")

    if not (0.001 <= T <= 10):
        errors.append(f"T (time to expiry in years) must be between 0.001 and 10. Got: {T}")

    if not (0.0 <= r <= 0.5):
        errors.append(f"r (risk-free rate) must be between 0.0 and 0.5. Got: {r}")

    if not (0.001 <= sigma <= 5.0):
        errors.append(f"sigma (volatility) must be between 0.001 and 5.0. Got: {sigma}")

    if option_type not in ("call", "put"):
        errors.append(f"option_type must be 'call' or 'put'. Got: '{option_type}'")

    if errors:
        raise ValueError("; ".join(errors))

    return {
        "S": S,
        "K": K,
        "T": T,
        "r": r,
        "sigma": sigma,
        "option_type": option_type,
    }
