import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addFunds, getWalletSummary } from "../controllers/walletController.js";

const router = express.Router();

router.post("/add-funds", protect, addFunds);
router.get("/", protect, getWalletSummary);

export default router;

