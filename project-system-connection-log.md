# BidGenie Current System Log
Date: 2026-02-27
Workspace: `E:\bidgenie-platform`

## 1) Folder Structure (Current)
```text
bidgenie-platform/
├── backend/
│   ├── public/
│   │   └── auction-images/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── auctionController.js
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   └── walletController.js
│   │   ├── data/
│   │   │   └── auction_dataset.csv
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── uploadMiddleware.js
│   │   ├── models/
│   │   │   ├── Auction.js
│   │   │   ├── Bid.js
│   │   │   ├── AutoBid.js
│   │   │   ├── Transaction.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── auctionRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   └── walletRoutes.js
│   │   ├── services/
│   │   │   ├── mlService.js
│   │   │   └── botService.js
│   │   ├── utils/
│   │   │   ├── cleanAuctions.js
│   │   │   ├── generateCustomerId.js
│   │   │   └── seedFromCSV.js
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RoleProtectedRoute.jsx
│   │   │   ├── GlassCard.jsx
│   │   │   ├── GlowButton.jsx
│   │   │   ├── ConfidenceBar.jsx
│   │   │   ├── HeatGauge.jsx
│   │   │   ├── SectionHeader.jsx
│   │   │   └── Logo.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SellerDashboard.jsx
│   │   │   ├── LiveAuctions.jsx
│   │   │   ├── AuctionDetail.jsx
│   │   │   ├── CreateAuction.jsx
│   │   │   ├── MyAuctions.jsx
│   │   │   ├── Wallet.jsx
│   │   │   ├── Insights.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── ml-service/
    ├── app.py
    ├── train_models.py
    ├── auction_dataset.csv
    ├── price_model.pkl
    ├── fraud_model.pkl
    ├── category_encoder.pkl
    └── requirements.txt
```

## 2) What Each Layer Contains
- Frontend (React + Tailwind): pages, route guards, dashboard UI, live auctions, auction details, wallet UI, socket client updates.
- Backend (Express + Mongoose + Socket.IO): auth, auctions, bidding/autobid, wallet transactions, seller stats, bot bidder service, static images.
- ML Service (Flask + sklearn): model inference for `/predict`, `/predict-fraud`, `/predict-autobid` using trained artifacts.

## 3) System Connection Map
```text
Browser (React frontend)
  -> HTTP + JWT -> Node/Express backend (port 5000)
  -> Socket.IO -> Node/Socket server (port 5000)

Node backend
  -> MongoDB via Mongoose (MONGO_URI)
  -> HTTP -> Flask ML service (port 5001)

Flask ML service
  -> Loads local model files (.pkl)
  -> Uses local dataset and training script in ml-service/
```

## 4) Backend Runtime Flow
1. `backend/src/server.js` starts Express, Socket.IO, Mongo connection.
2. Mounts routes:
   - `/api/auth`
   - `/api/auctions`
   - `/api/wallet`
   - `/api/users`
3. Serves auction images: `/images -> public/auction-images`.
4. Runs background jobs every 1 second:
   - checks auction end state (`checkAndEndAuctions`)
   - emits `auctionTick` + `auctionTimer`.
5. Starts bot engine (`startBotService(io)`).

## 5) Key API Surface (Current)
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- Auctions:
  - `POST /api/auctions/create` (seller + upload)
  - `GET /api/auctions` (live or seller scoped via query)
  - `GET /api/auctions/:id`
  - `POST /api/auctions/bid` (bidder)
  - `GET /api/auctions/bids/:id`
  - `GET /api/auctions/result/:id`
  - `GET /api/auctions/suggest/:id` (bidder)
  - `POST /api/auctions/autobid` (bidder)
  - `GET /api/auctions/autobid/:id` (bidder)
  - `PUT /api/auctions/autobid/:id` (bidder)
  - `GET /api/auctions/my` (seller)
  - `GET /api/auctions/seller-stats` (seller)
- Wallet:
  - `POST /api/wallet/add-funds`
  - `GET /api/wallet`
- User:
  - `PUT /api/users/profile`

## 6) Socket Events (Current)
- Client -> Server:
  - `registerUser` (maps userId to connected socket IDs)
- Server -> Client:
  - `newBid`
  - `auctionTick`
  - `auctionTimer`
  - `auctionEnded`
  - `sellerAuctionEnded`
  - `sellerNotification`

## 7) ML Service Flow (Current)
- Training:
  - `ml-service/train_models.py` aggregates by `Auction_ID`, derives engineered features, trains RF regressor/classifier, saves artifacts.
- Inference (`ml-service/app.py`):
  - Loads `price_model.pkl`, `fraud_model.pkl`, `category_encoder.pkl`.
  - `/predict` returns:
    - `predicted_final_price`
    - `confidence_score`
    - `fraud_probability`
    - `winning_probability_ratio`
    - compatibility aliases (`predicted_price`, `winning_probability`, `confidence`, `suggestedBid`)
  - `/predict-fraud` returns fraud probability only.
  - `/predict-autobid` returns `safe_bid`, `recommended_bid`, `confidence`.

## 8) Frontend Integration Flow
1. User logs in/registers -> token and user object in localStorage.
2. Protected routes render app sections by role.
3. Live list (`LiveAuctions.jsx`) fetches `/api/auctions`, listens to `newBid` and `auctionTick`.
4. Detail page (`AuctionDetail.jsx`):
   - fetches auction + bids
   - bidder-only fetches suggest/autobid
   - seller skips bidder-only endpoints
   - listens to `newBid`, `auctionTick`, `auctionEnded`
   - bidder AI section uses pure ML fields from backend response
   - seller shows market intelligence panel
5. Seller dashboard listens to `sellerAuctionEnded` notifications.

## 9) Data Models in Use
- `User`: includes `customerId`, `role` (`bidder/seller/admin/bot`), `walletBalance`.
- `Auction`: includes category/product/image/prices/endTime/status/winner and suspicious flags.
- `Bid`: auction, bidder, amount.
- `AutoBid`: auction, bidder, maxBudget, isActive.
- `Transaction`: user, type (`credit/debit/refund`), amount, description.

## 10) Operational Notes
- Backend ML client (`backend/src/services/mlService.js`) returns `null` on ML failures instead of throwing.
- Auction close logic credits seller wallet once via settlement guard in transaction description.
- Image upload path is active via multer and static `/images` serving.

## 11) Environment Connections
- Backend `.env` expected keys:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `PORT` (optional, default 5000)
  - `CLIENT_URL` (optional)
  - `ML_SERVICE_URL` (optional, default `http://localhost:5001`)
- ML service runs on `5001` and enforces single-port startup guard.

## 12) End-to-End Summary
- The system is a connected pipeline: React UI -> protected backend APIs + sockets -> MongoDB state + ML inference.
- Auction lifecycle, wallet accounting, bot bidding, and real-time UI updates are all linked through backend controllers/services and socket emits.
- ML predictions are consumed through backend service wrappers and surfaced on bidder/seller views with role-based rendering.
