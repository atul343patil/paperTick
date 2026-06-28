# paperTick

Virtual trading platform scaffold with a React frontend, Node.js backend, and Flask ML service.

## Quick Start

1. Copy environment variables:
	- `cp .env.example .env`
2. Start MongoDB + Redis (optional):
	- `docker-compose up -d`
3. Run the backend:
	- `cd server`
	- `npm install`
	- `npm run dev`
4. Run the frontend:
	- `cd client`
	- `npm install`
	- `npm run dev`
5. Run the ML service:
	- `cd ml-service`
	- `python -m venv .venv`
	- `.venv\Scripts\activate`
	- `pip install -r requirements.txt`
	- `python app.py`
6. One-time model training (run before first use, not from UI):
	```bash
	cd ml-service
	python train_offline.py --data data/nse_nifty_options.csv
	# OR if no real dataset available:
	python train_offline.py --synthetic --samples 50000
	```
	This creates `saved/model_weights.h5` and `saved/scaler.pkl`.
	The Flask service will automatically load these on startup.
	Re-run this script only when you want to retrain on new data.

## Services

- Client: http://localhost:5173
- Server: http://localhost:5000
- ML Service: http://localhost:7000
