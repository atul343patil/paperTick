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

## Services

- Client: http://localhost:5173
- Server: http://localhost:5000
- ML Service: http://localhost:7000
