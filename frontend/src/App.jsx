import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import LiveAuctions from "./pages/LiveAuctions";
import AuctionDetail from "./pages/AuctionDetail";
import CreateAuction from "./pages/CreateAuction";
import MyAuctions from "./pages/MyAuctions";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Insights from "./pages/Insights";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import SellerDashboard from "./pages/SellerDashboard";
import Wallet from "./pages/Wallet";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

function App() {
  return (
    <div className="transition-all duration-500 ease-in-out">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/seller/dashboard"
            element={
              <RoleProtectedRoute role="seller">
                <SellerDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route path="/live" element={<LiveAuctions />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/auction/:id" element={<AuctionDetail />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/ai" element={<Insights />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />

          <Route
            path="/create"
            element={
              <RoleProtectedRoute allowedRole="seller">
                <CreateAuction />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/my-auctions"
            element={
              <RoleProtectedRoute allowedRole="seller">
                <MyAuctions />
              </RoleProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
