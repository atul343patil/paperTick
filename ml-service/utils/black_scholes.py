import math


def _norm_cdf(value):
	return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def black_scholes_price(payload):
	spot = float(payload.get("spot", 0))
	strike = float(payload.get("strike", 0))
	time_to_expiry = float(payload.get("timeToExpiry", 0))
	rate = float(payload.get("rate", 0.05))
	volatility = float(payload.get("volatility", 0.2))
	option_type = payload.get("optionType", "CE")

	if spot <= 0 or strike <= 0 or time_to_expiry <= 0 or volatility <= 0:
		return 0.0

	d1 = (
		math.log(spot / strike)
		+ (rate + 0.5 * volatility**2) * time_to_expiry
	) / (volatility * math.sqrt(time_to_expiry))
	d2 = d1 - volatility * math.sqrt(time_to_expiry)

	if option_type == "PE":
		price = strike * math.exp(-rate * time_to_expiry) * _norm_cdf(-d2) - spot * _norm_cdf(-d1)
	else:
		price = spot * _norm_cdf(d1) - strike * math.exp(-rate * time_to_expiry) * _norm_cdf(d2)

	return round(price, 4)
