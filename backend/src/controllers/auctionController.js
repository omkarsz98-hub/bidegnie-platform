import { Auction } from "../models/Auction.js";
import { Bid } from "../models/Bid.js";
import { AutoBid } from "../models/AutoBid.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import {
  getAIPrediction,
  getFraudPrediction,
  getAutoBidPrediction
} from "../services/mlService.js";

const createWalletTransaction = async (userId, type, amount, description) => {
  await Transaction.create({ user: userId, type, amount, description });
};

const refundUser = async (userId, amount) => {
  if (!userId || !amount || amount <= 0) return;
  await User.updateOne({ _id: userId }, { $inc: { walletBalance: amount } });
  await createWalletTransaction(userId, "refund", amount, "Outbid refund");
};

const settleAuctionPayout = async (auction) => {
  if (!auction?.seller || !auction?.winner) return;
  const amount = Number(auction.currentPrice || 0);
  if (amount <= 0) return;

  const description = `Auction sale:${auction._id}`;
  const existing = await Transaction.findOne({
    user: auction.seller,
    type: "credit",
    description
  });
  if (existing) return;

  const sellerId = auction.seller?._id || auction.seller;
  await User.updateOne(
    { _id: sellerId },
    { $inc: { walletBalance: amount } }
  );
  await createWalletTransaction(auction.seller, "credit", amount, description);
};

const closeExpiredAuctions = async (query = {}) => {
  const now = new Date();
  const expiring = await Auction.find({ ...query, status: "live", endTime: { $lte: now } });

  for (const expAuction of expiring) {
    const auction = await Auction.findOneAndUpdate(
      { _id: expAuction._id, status: "live" },
      { status: "ended" },
      { new: true }
    );
    if (auction) {
      await settleAuctionPayout(auction);
    }
  }
};

/* ================= CREATE AUCTION ================= */

export const createAuction = async (req, res) => {
  try {
    const categoryMap = {
      Electronics: ["Laptop", "Tablet", "Used Smartphone", "Digital Camera", "LED TV"],
      "Home Appliances": ["Refrigerator", "Washing Machine", "Microwave Oven", "Air Conditioner"],
      Furniture: ["Office Chair"],
      "Musical Instruments": ["Electric Guitar"],
      "Entertainment Systems": ["Home Theater System"],
      "Accessories & Tools": ["Scooter Helmet", "Power Tools"]
    };

    const { title, description, startingPrice, endTime, reservePrice, category, productName } = req.body;
    const numericStartingPrice = Number(startingPrice);
    const parsedEndTime = new Date(endTime);

    if (!Number.isFinite(numericStartingPrice) || numericStartingPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid starting price"
      });
    }

    if (!endTime || Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid end time"
      });
    }

    if (parsedEndTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "End time must be in the future"
      });
    }

    if (!categoryMap[category] || !categoryMap[category].includes(productName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category or product selection"
      });
    }

    const auction = await Auction.create({
      title,
      description,
      category,
      productName,
      startingPrice: numericStartingPrice,
      currentPrice: numericStartingPrice,
      endTime: parsedEndTime,
      reservePrice: reservePrice || null,
      seller: req.user._id,
      image: req.file ? `/images/${req.file.filename}` : null,
      status: "live",
      isSuspicious: false
    });

    return res.status(201).json({
      success: true,
      message: "Auction created successfully",
      auction
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET ALL LIVE AUCTIONS ================= */

export const getLiveAuctions = async (req, res) => {
  try {
    const now = new Date();

    if (req.query.seller === "currentUser") {
      await closeExpiredAuctions({ seller: req.user._id });
    } else {
      await closeExpiredAuctions();
    }

    const query =
      req.query.seller === "currentUser"
        ? { seller: req.user._id }
        : { status: "live", endTime: { $gt: now } };

    const auctions = await Auction.find(query)
      .populate("seller", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, auctions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET SINGLE AUCTION ================= */

export const getAuctionById = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate("seller", "name")
      .populate("winner", "customerId");

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    if (auction.status === "live" && new Date(auction.endTime) <= new Date()) {
      const updatedAuction = await Auction.findOneAndUpdate(
        { _id: auction._id, status: "live" },
        { status: "ended" },
        { new: true }
      );
      if (updatedAuction) {
        auction.status = "ended";
        await settleAuctionPayout(updatedAuction);
      }
    }

    const bids = await Bid.find({ auction: auction._id })
      .populate("bidder", "customerId role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, auction, bids });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= PLACE BID (WITH AUTOBID + FRAUD) ================= */

export const placeBid = async (req, res) => {
  try {
    const { auctionId, amount, confirmOverride } = req.body;

    if (req.user.role === "seller") {
      return res.status(403).json({ success: false, message: "Sellers cannot place bids." });
    }

    const auction = await Auction.findById(auctionId);

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    if (auction.status !== "live") {
      return res.status(400).json({ success: false, message: "Auction not live" });
    }

    if (new Date() > new Date(auction.endTime)) {
      return res.status(400).json({ success: false, message: "Auction has ended." });
    }

    if (amount <= auction.currentPrice) {
      return res.status(400).json({ success: false, message: "Bid must be higher than current price" });
    }

    if (!confirmOverride) {
      const marketPrediction = await getAIPrediction({
        currentPrice: auction.currentPrice,
        current_price: auction.currentPrice,
        startingPrice: auction.startingPrice,
        starting_price: auction.startingPrice,
        bidAmount: amount,
        bid_amount: amount,
        category: auction.category,
        productName: auction.productName,
        timeRemainingMs: Math.max(0, new Date(auction.endTime).getTime() - Date.now())
      });

      const predictedPrice = Number(
        marketPrediction?.predicted_price ??
        marketPrediction?.predictedPrice ??
        marketPrediction?.suggestedBid ??
        auction.currentPrice
      );
      const winningProbabilityRaw =
        marketPrediction?.winning_probability ??
        marketPrediction?.winningProbability ??
        marketPrediction?.confidence ??
        0;
      const winningProbability = Number(winningProbabilityRaw) || 0;

      if (predictedPrice > 0) {
        const overPercent = ((Number(amount) - predictedPrice) / predictedPrice) * 100;
        const mildWarning = overPercent > 5;
        const strongWarning = overPercent > 15;
        const extremeWarning = overPercent > 30;

        if (extremeWarning || strongWarning || mildWarning) {
          const level = extremeWarning ? "extreme" : strongWarning ? "strong" : "mild";
          return res.status(200).json({
            success: false,
            overpriceWarning: true,
            level,
            predictedPrice,
            userBid: Number(amount),
            overPercent: Number(overPercent.toFixed(2)),
            confidence: winningProbability
          });
        }
      }
    }

    const bidder = await User.findById(req.user._id).select("walletBalance");
    if (!bidder || Number(bidder.walletBalance || 0) < Number(amount)) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const bidIncrement = amount - auction.currentPrice;
    const timeRemaining = (new Date(auction.endTime) - Date.now()) / 1000;

    const fraudResult = await getFraudPrediction({
      current_price: auction.currentPrice,
      bid_increment: bidIncrement,
      bid_velocity: 1,
      time_remaining: timeRemaining,
      category: auction.category,
      productName: auction.productName
    });

    if (fraudResult?.fraud_probability > 0.7) {
      auction.isSuspicious = true;
    }

    const previousWinnerId = auction.winner;
    const previousPrice = Number(auction.currentPrice || 0);

    await User.updateOne({ _id: req.user._id }, { $inc: { walletBalance: -Number(amount) } });
    await createWalletTransaction(req.user._id, "debit", Number(amount), "Bid placed");

    if (previousWinnerId) {
      await refundUser(previousWinnerId, previousPrice);
    }

    await Bid.create({ auction: auction._id, bidder: req.user._id, amount });

    auction.currentPrice = amount;
    auction.winner = req.user._id;
    await auction.save();

    const io = req.app.get("io");

    io?.emit("newBid", {
      auctionId: auction._id,
      newPrice: amount,
      bidderCustomerId: req.user.customerId
    });
    io?.emit("sellerNotification", {
      sellerId: auction.seller,
      auctionId: auction._id,
      message: "New bid placed on your auction",
      amount
    });

    const recentBids = await Bid.find({
      auction: auction._id,
      createdAt: { $gte: new Date(Date.now() - 30000) }
    });

    const suspiciousActivity = recentBids.length >= 8;

    // Background Autobid Processing
    (async () => {
      try {
        const autoBidders = await AutoBid.find({ auction: auction._id, isActive: true }).populate("bidder", "customerId");

        for (const auto of autoBidders) {
          // Refetch auction to get latest price/winner safely
          const currentAuction = await Auction.findById(auction._id);
          if (!currentAuction || currentAuction.status !== "live" || currentAuction.isSuspicious === true) {
            break;
          }

          const autoBidderId = auto.bidder?._id?.toString?.() || auto.bidder?.toString?.();

          if (!autoBidderId || autoBidderId === currentAuction.winner?.toString()) {
            continue;
          }

          const autoTimeRemainingMs = new Date(currentAuction.endTime).getTime() - Date.now();
          if (autoTimeRemainingMs < 3000) {
            continue;
          }

          const autoResult = await getAutoBidPrediction({
            current_price: currentAuction.currentPrice,
            time_remaining: autoTimeRemainingMs / 1000,
            bid_velocity: 1,
            budget: auto.maxBudget,
            category: currentAuction.category,
            productName: currentAuction.productName
          });

          let nextBidAmount;
          const recommendedBid = Number(autoResult?.recommended_bid);

          if (Number.isFinite(recommendedBid) && recommendedBid > Number(auto.maxBudget)) {
            continue;
          }

          if (
            autoResult &&
            autoResult.confidence !== undefined &&
            Number(autoResult.confidence) < 0.6
          ) {
            continue;
          }

          let predictedBid = autoResult?.recommended_bid ? Math.floor(autoResult.recommended_bid) : 0;
          let minIncrement = currentAuction.currentPrice + 50; // default safe increment
          nextBidAmount = Math.max(minIncrement, predictedBid);

          if (nextBidAmount <= auto.maxBudget) {
            const randomDelay = Math.floor(Math.random() * (2500 - 1000 + 1)) + 1000;
            await new Promise((resolve) => setTimeout(resolve, randomDelay));

            // Verify auction state again after delay
            const finalAuction = await Auction.findById(currentAuction._id);
            if (
              !finalAuction ||
              finalAuction.status !== "live" ||
              new Date().getTime() > new Date(finalAuction.endTime).getTime() ||
              nextBidAmount <= finalAuction.currentPrice ||
              finalAuction.winner?.toString() === autoBidderId
            ) {
              continue;
            }

            const autoUser = await User.findById(autoBidderId).select("walletBalance");
            if (!autoUser || Number(autoUser.walletBalance || 0) < Number(nextBidAmount)) {
              continue;
            }

            const autoPreviousWinnerId = finalAuction.winner;
            const autoPreviousPrice = Number(finalAuction.currentPrice || 0);

            await User.updateOne({ _id: autoBidderId }, { $inc: { walletBalance: -Number(nextBidAmount) } });
            await createWalletTransaction(autoBidderId, "debit", Number(nextBidAmount), "Bid placed (autobid)");

            if (autoPreviousWinnerId) {
              await refundUser(autoPreviousWinnerId, autoPreviousPrice);
            }

            await Bid.create({ auction: finalAuction._id, bidder: autoBidderId, amount: nextBidAmount });

            finalAuction.currentPrice = nextBidAmount;
            finalAuction.winner = autoBidderId;
            await finalAuction.save();

            io?.emit("newBid", {
              auctionId: finalAuction._id,
              newPrice: nextBidAmount,
              bidderCustomerId: auto.bidder?.customerId
            });
            io?.emit("sellerNotification", {
              sellerId: finalAuction.seller,
              auctionId: finalAuction._id,
              message: "Auto-bid placed on your auction",
              amount: nextBidAmount
            });
          }
        }
      } catch (err) {
        console.error("Autobid processing error:", err.message);
      }
    })();

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      overbiddingWarning: suspiciousActivity,
      suspiciousActivity
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= AUTOBID CONTROLLERS ================= */

export const setAutoBid = async (req, res) => {
  try {
    const { auctionId, maxBudget } = req.body;

    const auction = await Auction.findById(auctionId);

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    if (maxBudget <= auction.currentPrice) {
      return res.status(400).json({ success: false, message: "Budget must exceed current price" });
    }

    let autoBid = await AutoBid.findOne({ auction: auctionId, bidder: req.user._id });

    if (autoBid) {
      autoBid.maxBudget = maxBudget;
      autoBid.isActive = true;
      await autoBid.save();
    } else {
      autoBid = await AutoBid.create({ auction: auctionId, bidder: req.user._id, maxBudget });
    }

    return res.status(200).json({ success: true, autoBid });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserAutoBid = async (req, res) => {
  try {
    const autoBid = await AutoBid.findOne({
      auction: req.params.id,
      bidder: req.user._id,
      isActive: true
    });
    return res.status(200).json({ success: true, autoBid });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const disableAutoBid = async (req, res) => {
  try {
    const result = await AutoBid.updateMany(
      { auction: req.params.id, bidder: req.user._id, isActive: true },
      { $set: { isActive: false } }
    );

    if (!result.modifiedCount) {
      return res.status(404).json({ success: false, message: "AutoBid not found" });
    }

    return res.status(200).json({ success: true, message: "AutoBid disabled" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SELLER ROUTES ================= */

export const getMyAuctions = async (req, res) => {
  try {
    await closeExpiredAuctions({ seller: req.user._id });

    const auctions = await Auction.find({ seller: req.user._id })
      .populate("winner", "customerId")
      .sort({ createdAt: -1 });

    const enrichedAuctions = await Promise.all(
      auctions.map(async (auction) => {
        const bidCount = await Bid.countDocuments({ auction: auction._id });
        return { ...auction.toObject(), bidCount };
      })
    );

    return res.status(200).json({ success: true, auctions: enrichedAuctions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSellerStats = async (req, res) => {
  try {
    const auctions = await Auction.find({ seller: req.user._id });

    const totalAuctions = auctions.length;
    const activeAuctions = auctions.filter((a) => a.status === "live").length;
    const endedAuctions = auctions.filter((a) => a.status === "ended");

    const totalRevenue = endedAuctions.reduce((sum, auction) => sum + (auction.currentPrice || 0), 0);

    return res.status(200).json({
      success: true,
      stats: { totalAuctions, activeAuctions, totalRevenue }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET AUCTION RESULT ================= */

export const getAuctionResult = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).populate("winner", "customerId");

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    if (auction.status !== "ended") {
      return res.status(400).json({ success: false, message: "Auction not ended yet" });
    }

    return res.status(200).json({ success: true, winner: auction.winner, finalPrice: auction.currentPrice });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET AUCTION BIDS ================= */

export const getAuctionBids = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const bids = await Bid.find({ auction: req.params.id })
      .populate("bidder", "customerId role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, bids });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= AI SUGGESTED BID ================= */

export const getSuggestedBid = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const bids = await Bid.find({ auction: auction._id });
    const now = Date.now();
    const endTimeMs = new Date(auction.endTime).getTime();

    const durationSeconds = Math.max(
      1,
      (endTimeMs - now) / 1000
    );

    const safeCurrentPrice = Number(auction.currentPrice) || 0;
    const safeStartingPrice = Number(auction.startingPrice) || 0;
    const safeTotalBids = Number(bids.length) || 0;

    const uniqueBidders = new Set(
      bids.map((b) => b.bidder?.toString())
    ).size;

    const bidVelocity = safeTotalBids / durationSeconds;
    const priceGrowthRate =
      (safeCurrentPrice - safeStartingPrice) /
      Math.max(safeStartingPrice, 1);

    const prediction = await getAIPrediction({
      current_price: safeCurrentPrice,
      starting_price: safeStartingPrice,
      total_bids: safeTotalBids,
      unique_bidders: uniqueBidders,
      duration: durationSeconds,
      bid_velocity: bidVelocity,
      price_growth_rate: priceGrowthRate,
      product_name: auction.productName
    });

    if (!prediction) {
      return res.status(500).json({
        success: false,
        message: "Prediction unavailable"
      });
    }

    return res.status(200).json({
      success: true,
      suggestedBid: prediction?.suggestedBid,
      modelResponse: prediction,
      aiPrediction: prediction
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= AUCTION ENDING JOB ================= */

const emitToConnectedUser = (io, connectedUsers, userId, event, payload) => {
  if (!io || !connectedUsers || !userId) return;
  const sockets = connectedUsers.get(String(userId));
  if (!sockets) return;
  for (const socketId of sockets) {
    io.to(socketId).emit(event, payload);
  }
};

export const checkAndEndAuctions = async ({ io = global.io, connectedUsers = null } = {}) => {
  try {
    const now = new Date();
    const liveAuctions = await Auction.find({ status: "live", endTime: { $lte: now } });

    if (!liveAuctions.length) return;

    for (const liveAuction of liveAuctions) {
      const auction = await Auction.findOneAndUpdate(
        { _id: liveAuction._id, status: "live" },
        { status: "ended" },
        { new: true }
      );

      if (!auction) continue;

      await settleAuctionPayout(auction);

      const winnerUser = auction.winner
        ? await User.findById(auction.winner).select("customerId")
        : null;

      io?.emit("auctionEnded", {
        auctionId: auction._id,
        winner: auction.winner,
        winnerCustomerId: winnerUser?.customerId || null,
        finalPrice: auction.currentPrice,
        auctionTitle: auction.title || auction.productName || "Auction"
      });

      emitToConnectedUser(io, connectedUsers, auction.seller?.toString?.() || auction.seller, "sellerAuctionEnded", {
        auctionId: auction._id,
        winnerCustomerId: winnerUser?.customerId || "BG------",
        finalPrice: auction.currentPrice
      });
    }
  } catch (error) {
    console.error("Auction end checker error:", error.message);
  }
};
