# Siddhartha Nursery (MongoDB + Secure Login)

## Quick start (local)
1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm start`
4. Open http://localhost:10000 (login with ADMIN_USER / ADMIN_PASS)

## Deploy on Render
- Build Command: `npm install`
- Start Command: `node server.js`
- Environment:
  - `PORT` = 10000
  - `MONGO_URI` = your Atlas connection string
  - `SESSION_SECRET` = long random string
  - `ADMIN_USER`, `ADMIN_PASS` = your credentials
