import express from "express";

import {
  createAuction,
  getLiveAuctions,
  placeBid,
  getAuctionResult,
  getSuggestedBid,
  setAutoBid,
  getAuctionById,
  getAuctionBids,
  getUserAutoBid,
  disableAutoBid,
  getMyAuctions,
  getSellerStats,
} from "../controllers/auctionController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* =========================================================
   🔥 SELLER ROUTES
========================================================= */

/* CREATE AUCTION */
router.post(
  "/create",
  protect,
  authorizeRoles("seller"),
  upload.single("image"),
  createAuction
);

/* SELLER — MY AUCTIONS */
router.get(
  "/my",
  protect,
  authorizeRoles("seller"),
  getMyAuctions
);

/* SELLER — DASHBOARD STATS */
router.get(
  "/seller-stats",
  protect,
  authorizeRoles("seller"),
  getSellerStats
);

/* =========================================================
   🔥 GENERAL AUCTION ROUTES
========================================================= */

/* GET ALL LIVE AUCTIONS */
router.get(
  "/",
  protect,
  getLiveAuctions
);

/* PLACE BID */
router.post(
  "/bid",
  protect,
  authorizeRoles("bidder"),
  placeBid
);

/* GET AUCTION RESULT */
router.get(
  "/result/:id",
  protect,
  getAuctionResult
);

/* GET AUCTION BIDS */
router.get(
  "/bids/:id",
  protect,
  getAuctionBids
);

/* =========================================================
   🔥 AI & AUTO BID ROUTES
========================================================= */

/* AI SUGGESTED BID */
router.get(
  "/suggest/:id",
  protect,
  authorizeRoles("bidder"),
  getSuggestedBid
);

/* SET AUTO BID */
router.post(
  "/autobid",
  protect,
  authorizeRoles("bidder"),
  setAutoBid
);

/* GET USER AUTO BID */
router.get(
  "/autobid/:id",
  protect,
  authorizeRoles("bidder"),
  getUserAutoBid
);

/* DISABLE AUTO BID */
router.put(
  "/autobid/:id",
  protect,
  authorizeRoles("bidder"),
  disableAutoBid
);

/* =========================================================
   ⚠️ KEEP GENERIC ROUTE LAST
========================================================= */

router.get(
  "/:id",
  protect,
  getAuctionById
);

export default router;
