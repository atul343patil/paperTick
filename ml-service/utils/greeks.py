import math


def _norm_cdf(value):
	return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def _norm_pdf(value):
	return math.exp(-0.5 * value**2) / math.sqrt(2.0 * math.pi)


def calculate_greeks(payload):
	spot = float(payload.get("spot", 0))
	strike = float(payload.get("strike", 0))
	time_to_expiry = float(payload.get("timeToExpiry", 0))
	rate = float(payload.get("rate", 0.05))
	volatility = float(payload.get("volatility", 0.2))
	option_type = payload.get("optionType", "CE")

	if spot <= 0 or strike <= 0 or time_to_expiry <= 0 or volatility <= 0:
		return {"delta": 0, "gamma": 0, "vega": 0, "theta": 0, "rho": 0}

	sqrt_t = math.sqrt(time_to_expiry)
	d1 = (
		math.log(spot / strike)
		+ (rate + 0.5 * volatility**2) * time_to_expiry
	) / (volatility * sqrt_t)
	d2 = d1 - volatility * sqrt_t

	pdf = _norm_pdf(d1)
	if option_type == "PE":
		delta = _norm_cdf(d1) - 1
	else:
		delta = _norm_cdf(d1)

	gamma = pdf / (spot * volatility * sqrt_t)
	vega = spot * pdf * sqrt_t / 100.0

	if option_type == "PE":
		theta = (
			-spot * pdf * volatility / (2 * sqrt_t)
			+ rate * strike * math.exp(-rate * time_to_expiry) * _norm_cdf(-d2)
		) / 365.0
		rho = -strike * time_to_expiry * math.exp(-rate * time_to_expiry) * _norm_cdf(-d2) / 100.0
	else:
		theta = (
			-spot * pdf * volatility / (2 * sqrt_t)
			- rate * strike * math.exp(-rate * time_to_expiry) * _norm_cdf(d2)
		) / 365.0
		rho = strike * time_to_expiry * math.exp(-rate * time_to_expiry) * _norm_cdf(d2) / 100.0

	return {
		"delta": round(delta, 6),
		"gamma": round(gamma, 6),
		"vega": round(vega, 6),
		"theta": round(theta, 6),
		"rho": round(rho, 6)
	}
