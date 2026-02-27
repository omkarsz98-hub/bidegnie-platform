import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Auction } from "../models/Auction.js";
import { Bid } from "../models/Bid.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { getAutoBidPrediction } from "./mlService.js";

const BOT_DEFS = [
  { customerId: "BG900001" },
  { customerId: "BG900002" },
  { customerId: "BG900003" }
];
const BOT_DELAY_MIN_MS = 120000;
const BOT_DELAY_MAX_MS = 180000;
const MIN_SAFE_END_SECONDS = 30;

let botLoopStarted = false;
const botBudgets = new Map();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const waitRandomDelay = () => randomInt(BOT_DELAY_MIN_MS, BOT_DELAY_MAX_MS);

const generateBotDoc = async (customerId) => {
  const slug = customerId.toLowerCase();
  const password = crypto.randomBytes(16).toString("hex");
  const hashedPassword = await bcrypt.hash(password, 10);

  return {
    customerId,
    name: customerId,
    email: `${slug}@bidgenie.local`,
    password: hashedPassword,
    role: "bot",
    isActive: true
  };
};

const ensureBots = async () => {
  for (const botDef of BOT_DEFS) {
    const exists = await User.findOne({
      customerId: botDef.customerId,
      role: "bot"
    }).select("_id");

    if (!exists) {
      const botPayload = await generateBotDoc(botDef.customerId);
      await User.create(botPayload);
    }
  }

  const bots = await User.find({
    customerId: { $in: BOT_DEFS.map((bot) => bot.customerId) },
    role: "bot"
  }).select("_id customerId");

  for (const bot of bots) {
    if (!botBudgets.has(String(bot._id))) {
      botBudgets.set(String(bot._id), randomInt(100000, 500000));
    }
  }

  return bots;
};

const pickRandom = (items) => items[randomInt(0, items.length - 1)];

const getRemainingSeconds = (endTime) =>
  Math.floor((new Date(endTime).getTime() - Date.now()) / 1000);

const getNextBotBid = async (auction, remainingSeconds) => {
  const fallbackIncrement = Number(auction.bidIncrement) || randomInt(100, 500);

  const autoResult = await getAutoBidPrediction({
    current_price: auction.currentPrice,
    time_remaining: remainingSeconds,
    bid_velocity: 1
  });

  if (!autoResult || typeof autoResult.recommended_bid !== "number") {
    return {
      recommended: null,
      bid: auction.currentPrice + fallbackIncrement
    };
  }

  const recommended = autoResult.recommended_bid;
  const underbidAmount = randomInt(200, 800);

  return {
    recommended,
    bid: Math.floor(recommended - underbidAmount)
  };
};

const runBotCycle = async (io) => {
  try {
    const bots = await ensureBots();
    if (!bots.length) return;

    const auctions = await Auction.find({ status: "live" }).select(
      "_id currentPrice endTime bidIncrement status winner seller isSuspicious"
    );

    const eligibleAuctions = auctions.filter((auction) => {
      if (auction.status !== "live") return false;
      if (auction.isSuspicious === true) return false;
      return getRemainingSeconds(auction.endTime) >= MIN_SAFE_END_SECONDS;
    });

    if (!eligibleAuctions.length) return;

    const auction = pickRandom(eligibleAuctions);
    const bot = pickRandom(bots);
    const botBudget = botBudgets.get(String(bot._id)) || 0;
    const remainingSeconds = getRemainingSeconds(auction.endTime);

    if (remainingSeconds < MIN_SAFE_END_SECONDS) return;
    if (remainingSeconds <= 0) return;

    const bidPlan = await getNextBotBid(auction, remainingSeconds);
    const botBid = bidPlan.bid;

    if (auction.status !== "live") return;
    if (auction.isSuspicious === true) return;
    if (new Date() > new Date(auction.endTime)) return;
    if (typeof botBid !== "number") return;
    if (botBid <= auction.currentPrice) return;
    if (bidPlan.recommended !== null && botBid >= bidPlan.recommended) return;
    if (botBid > botBudget) return;

    const randomDelay = randomInt(1000, 2500);
    await new Promise((resolve) => setTimeout(resolve, randomDelay));

    if (auction.status !== "live") return;
    if (auction.isSuspicious === true) return;
    if (new Date() >= new Date(auction.endTime)) return;

    const previousWinnerId = auction.winner;
    const previousPrice = Number(auction.currentPrice || 0);

    await Bid.create({
      auction: auction._id,
      bidder: bot._id,
      amount: botBid,
      isBot: true
    });

    if (
      previousWinnerId &&
      String(previousWinnerId) !== String(bot._id) &&
      previousPrice > 0
    ) {
      await User.updateOne(
        { _id: previousWinnerId },
        { $inc: { walletBalance: previousPrice } }
      );
      await Transaction.create({
        user: previousWinnerId,
        type: "refund",
        amount: previousPrice,
        description: "Outbid refund"
      });
    }

    auction.currentPrice = botBid;
    auction.winner = bot._id;
    await auction.save();

    io.emit("newBid", {
      auctionId: auction._id,
      newPrice: botBid,
      bidderCustomerId: bot.customerId
    });

    io.emit("sellerNotification", {
      auctionId: auction._id,
      message: "🤖 AI bidder placed a bid on your auction"
    });
  } catch (error) {
    console.error("Bot cycle error:", error.message);
  }
};

const scheduleNextCycle = (io) => {
  const delay = waitRandomDelay();
  setTimeout(async () => {
    await runBotCycle(io);
    scheduleNextCycle(io);
  }, delay);
};

const startBotService = (io) => {
  if (botLoopStarted) return;
  botLoopStarted = true;

  scheduleNextCycle(io);
};

export default startBotService;
