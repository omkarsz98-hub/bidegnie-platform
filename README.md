# BidGenie Platform

## What is this?
BidGenie is a smart auction platform that allows users to bid on items in real-time. It features a modern, cyberpunk-themed user interface, an integrated machine learning service for price prediction and fraud detection, and a robust backend for managing real-time websocket connections and database records.

## What does it use?
- **Frontend:** React, Vite, TailwindCSS (Modern, dynamic UI with animations)
- **Backend:** Node.js, Express, MongoDB, Socket.io (Real-time bidding and REST API)
- **ML Service:** Python, Flask, scikit-learn (Price prediction & fraud detection models)

## How do I run it?

### 1. Database Setup
Make sure you have [MongoDB](https://www.mongodb.com/try/download/community) installed and running on your system.

### 2. Environment Variables
Copy the example environment file to create your own `.env` file in the root, backend, and frontend directories (as needed):
```bash
cp .env.example .env
```
*(Make sure to update the `.env` file with your actual `MONGO_URI` and secrets.)*

### 3. Start the Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```
*(The backend will run on `http://localhost:5000`)*

### 4. Start the ML Service (Python)
Open a new terminal window:
```bash
cd ml-service
python -m venv venv

# Activate venv (Windows):
venv\Scripts\activate
# Activate venv (Mac/Linux):
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*(The ML service will run on `http://localhost:5001`)*

### 5. Start the Frontend (React)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*(The frontend will be available at `http://localhost:5173`)*
