import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { Auction } from "../models/Auction.js";
import { Bid } from "../models/Bid.js";
import { AutoBid } from "../models/AutoBid.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const cleanAuctions = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const [auctionResult, bidResult, autoBidResult] = await Promise.all([
      Auction.deleteMany({}),
      Bid.deleteMany({}),
      AutoBid.deleteMany({})
    ]);

    console.log(`Deleted auctions: ${auctionResult.deletedCount}`);
    console.log(`Deleted bids: ${bidResult.deletedCount}`);
    console.log(`Deleted autobids: ${autoBidResult.deletedCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Clean failed:", error.message);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors on failure path
    }
    process.exit(1);
  }
};

cleanAuctions();
