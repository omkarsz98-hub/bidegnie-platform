# BidGenie System Connection Log
Date: 2026-02-27
Workspace: `E:\bidgenie-platform`

## 1) What the Project Contains

### Backend (`backend/`)
- Express API + Socket.IO server: `backend/src/server.js`
- Mongo connection: `backend/src/config/db.js`
- Core routes:
  - Auth: `backend/src/routes/authRoutes.js`
  - Auctions: `backend/src/routes/auctionRoutes.js`
  - Wallet: `backend/src/routes/walletRoutes.js`
  - Users: `backend/src/routes/userRoutes.js`
- Main business logic:
  - Auctions/Bids/Autobid/Fraud checks: `backend/src/controllers/auctionController.js`
  - Auth/JWT: `backend/src/controllers/authController.js`
  - Wallet credits/debits/history: `backend/src/controllers/walletController.js`
- Service integrations:
  - ML HTTP client: `backend/src/services/mlService.js`
  - Bot bidding loop: `backend/src/services/botService.js`
- Data models:
  - `Auction`, `Bid`, `AutoBid`, `User`, `Transaction`

### Frontend (`frontend/`)
- React app routes: `frontend/src/App.jsx`
- Protected/role routing:
  - `frontend/src/components/ProtectedRoute.jsx`
  - `frontend/src/components/RoleProtectedRoute.jsx`
- Major pages:
  - `Landing`, `Login`, `Register`, `Dashboard`, `SellerDashboard`, `LiveAuctions`, `AuctionDetail`, `Wallet`, etc.
- Realtime UI updates via Socket.IO client in:
  - `LiveAuctions.jsx`, `Dashboard.jsx`, `AuctionDetail.jsx`, `SellerDashboard.jsx`

### ML Service (`ml-service/`)
- Flask app with 3 endpoints in `ml-service/app.py`:
  - `POST /predict`
  - `POST /predict-fraud`
  - `POST /predict-autobid`
- Uses scikit-learn RandomForest models persisted as:
  - `fraud_model.pkl`
  - `autobid_model.pkl`

## 2) How System Connection Works

## Startup and runtime wiring
1. Backend starts and connects Mongo (`connectDB`) in `server.js`.
2. Backend mounts APIs (`/api/auth`, `/api/auctions`, `/api/wallet`, `/api/users`) and static images (`/images`).
3. Socket.IO starts on same backend server.
4. Backend starts:
   - `startBotService(io)`
   - 1-second background timer that:
     - checks expired auctions
     - emits `auctionTick` / `auctionTimer`

## Frontend to Backend
- All pages call backend with JWT Bearer token (`http://localhost:5000/...`).
- Socket client connects to `http://localhost:5000` and subscribes to events.

## Backend to ML service
- `backend/src/services/mlService.js` calls:
  - `http://localhost:5001/predict`
  - `http://localhost:5001/predict-fraud`
  - `http://localhost:5001/predict-autobid`
- ML call failure behavior: returns `null` (logs error, no throw).

## 3) Core Functional Flow

## Auth flow
- Register/Login in `authController.js`:
  - validates user
  - issues JWT (`JWT_SECRET`)
  - returns user object including `customerId`, `role`, `walletBalance`

## Auction creation (seller)
- Route: `POST /api/auctions/create`
- Guard: `protect + authorizeRoles("seller")`
- Optional image upload via multer (`upload.single("image")`)
- Stores auction with category/product validation map

## Bidding (bidder)
- Route: `POST /api/auctions/bid`
- Guard: `protect + authorizeRoles("bidder")`
- `placeBid()` in `auctionController.js` performs:
  - live/expiry checks
  - overprice ML warning (from `/predict`)
  - wallet balance check/debit
  - previous winner refund
  - bid record create
  - auction price/winner update
  - socket emits `newBid`, `sellerNotification`
  - autobid loop execution with optional ML recommendation (`/predict-autobid`)

## Auction ending + payout
- `checkAndEndAuctions()` marks ended auctions.
- Seller wallet is credited (full current price) once via transaction idempotency guard.
- Emits:
  - global `auctionEnded`
  - seller-targeted `sellerAuctionEnded`

## Bot bidding
- `startBotService()` schedules recurring random cycle (2-3 min).
- Ensures bot users exist (`BG900001`, `BG900002`, `BG900003`).
- Selects eligible live auction + bot, asks ML autobid, applies underbid strategy.
- Emits `newBid` and `sellerNotification` on successful bot bid.

## 4) Socket Event Map
- Client -> Server:
  - `registerUser` (bind userId to socket set)
- Server -> Client:
  - `newBid`
  - `auctionTick`
  - `auctionTimer`
  - `auctionEnded`
  - `sellerAuctionEnded`
  - `sellerNotification`

## 5) Environment + External Dependencies

## Environment variables in use
- Backend:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `PORT`
  - `CLIENT_URL`
  - `ML_SERVICE_URL` (optional, default localhost:5001)

## Service ports
- Backend API + Socket.IO: `5000`
- ML Flask service: `5001`
- Frontend dev server (Vite): typically `5173`

## 6) Current Loopholes / Stability Risks Observed

## High
1. Manual bid numeric hardening is partial.
- `placeBid()` compares raw `amount` directly; strict `Number.isFinite` normalization is not applied at function start.
- File: `backend/src/controllers/auctionController.js` (around line 151 onward).

2. Concurrency protection missing on critical price writes.
- Manual bid/autobid/bot paths still perform in-memory `auction.save()` after read-delay windows.
- Can allow stale overwrite under concurrent bids.
- Files:
  - `backend/src/controllers/auctionController.js`
  - `backend/src/services/botService.js`

## Medium
3. Seller still fetches bidder-only endpoints in AuctionDetail fetch bundle.
- `AuctionDetail.jsx` always calls `/suggest/:id` and `/autobid/:id`.
- For seller this is unnecessary and may produce noise/403.

4. Transaction schema does not include optional `auction` and `isBot` fields.
- Current writes primarily use user/type/amount/description.
- File: `backend/src/models/Transaction.js`

5. Encoding artifacts in some messages/comments.
- Examples of mojibake (`â‚¹`, emoji artifacts) exist in source text/log strings.
- Cosmetic but impacts readability.

## Low
6. Frontend AI insight fallback can anchor to current price.
- `predictedFinalPrice` falls back to `auction.currentPrice` in `AuctionDetail.jsx`, which can reduce realism when ML unavailable.

## 7) End-to-End Connection Summary
- Frontend authenticates with backend JWT.
- Backend orchestrates all auction/wallet/business logic.
- Backend calls ML service for prediction/fraud/autobid assistance.
- Mongo stores source of truth for users, auctions, bids, autobid config, wallet transactions.
- Socket.IO carries real-time bid/timer/end notifications to all clients and seller-specific channels.

## 8) Quick Health Checklist
- API wiring: connected
- DB wiring: connected
- ML integration: connected with null-fallback
- Socket integration: connected across key pages
- Role guards: present in route layer
- Main risk area: concurrent bid write consistency + strict numeric validation
