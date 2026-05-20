# Phase 2: Authentication & Home Page - Setup Guide

## Overview
Phase 2 implements a complete JWT-based authentication system with user registration/login and a landing home page.

## Backend Setup

### Environment Variables
Create `server/.env` with:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/papertick
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Install Dependencies
```bash
cd server
npm install
```

### Start MongoDB
```bash
# Using local MongoDB
mongod

# OR using MongoDB Atlas - update MONGO_URI in .env
```

### Start Backend Server
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

## Frontend Setup

### Environment Variables
Create `client/.env` with:
```
VITE_API_URL=http://localhost:5000/api
```

### Install Dependencies
```bash
cd client
npm install
```

### Start Development Server
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

## API Endpoints (Phase 2)

### Authentication Routes
- `POST /api/auth/register` - User registration
  - Body: `{ name, email, password }`
  - Returns: `{ token, user }`

- `POST /api/auth/login` - User login
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

- `GET /api/auth/me` - Get current user (requires JWT)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`

### Health Check
- `GET /api/health` - Server status
  - Returns: `{ status: 'OK' }`

## Frontend Pages (Phase 2)

- `/` - Home page (landing)
  - Features overview: Real Market Data, Options Analytics, ML-Powered Pricing, Zero Risk
  - Statistics: Virtual Capital, Instruments, Model Info
  - Call-to-action buttons
  - Redirects authenticated users to /markets

- `/login` - User login
  - Email and password fields
  - Error handling with toast notifications
  - Redirects authenticated users to home

- `/register` - User registration
  - Name, email, password fields
  - Client-side validation (password min 6 chars)
  - Error handling with toast notifications
  - Redirects authenticated users to home

## Authentication Flow

1. User registers/logs in
2. Backend validates credentials and generates JWT token
3. Frontend stores token in localStorage and Redux state
4. Subsequent requests automatically attach token via axios interceptor
5. Protected routes check Redux auth state
6. On 401 response, axios interceptor triggers logout

## Key Features

### Backend Security
- Password hashing with bcryptjs (salt rounds: 12)
- JWT token validation on protected routes
- Input validation with express-validator
- Rate limiting: 100 requests per 15 minutes
- CORS configured for CLIENT_URL only
- Helmet security headers

### Frontend UX
- Protected routes with loading states
- Auto-logout on 401 responses
- Form validation with error toasts
- Password visibility toggle on login/register
- Persistent authentication across page reloads
- Dark theme with Tailwind CSS

## Development Commands

### Backend
```bash
npm run dev      # Start with nodemon
npm start        # Production start
npm run lint     # Check code (if configured)
```

### Frontend
```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Testing Authentication

### Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get current user
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check MONGO_URI in server/.env
- Try connecting with MongoDB Compass

### CORS Error
- Ensure CLIENT_URL in server/.env matches frontend URL
- Default: http://localhost:5173

### JWT Token Not Persisting
- Check browser localStorage (DevTools > Application > localStorage)
- Verify JWT_SECRET is set in server/.env
- Check Redux store (should have token and user in auth slice)

### Package Dependencies Missing
- Run `npm install` in both server/ and client/
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Next Phase
- Phase 3: Markets/Live Data (market quotes, watchlist, indices)
- Phase 4: Trading & Options (order placement, option chains, strategies)
- ML Service: Connect Flask options pricing calculator
*** End Patch