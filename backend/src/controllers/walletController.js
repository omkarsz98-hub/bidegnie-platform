import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Auction } from "../models/Auction.js";

const MAX_WALLET_BALANCE = 1000000;

export const addFunds = async (req, res) => {
  try {
    if (req.user.role !== "bidder") {
      return res.status(403).json({
        success: false,
        message: "Only bidders can add funds."
      });
    }

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < 1000) {
      return res.status(400).json({
        success: false,
        message: "Minimum add-funds amount is ₹1,000."
      });
    }

    if (amount > MAX_WALLET_BALANCE) {
      return res.status(400).json({
        success: false,
        message: "Maximum per transaction is ₹10,00,000."
      });
    }

    const user = await User.findById(req.user._id).select("walletBalance");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (user.walletBalance + amount > MAX_WALLET_BALANCE) {
      return res.status(400).json({
        success: false,
        message: "Wallet limit exceeded. Max balance is ₹10,00,000."
      });
    }

    user.walletBalance += amount;
    await user.save();

    await Transaction.create({
      user: req.user._id,
      type: "credit",
      amount,
      description: "Funds added"
    });

    return res.status(200).json({
      success: true,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getWalletSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("walletBalance role");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    let activeRevenue = 0;
    let completedSales = 0;

    if (user.role === "seller") {
      const auctions = await Auction.find({ seller: req.user._id }).select("status currentPrice");
      activeRevenue = auctions
        .filter((a) => a.status === "live")
        .reduce((sum, a) => sum + Number(a.currentPrice || 0), 0);
      completedSales = auctions.filter((a) => a.status === "ended").length;
    }

    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      walletBalance: user.walletBalance || 0,
      role: user.role,
      activeRevenue,
      completedSales,
      transactions
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

