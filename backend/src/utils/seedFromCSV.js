import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Auction } from "../models/Auction.js";
import { User } from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const csvFilePath = path.resolve(__dirname, "../data/auction_dataset.csv");

const CATEGORY_KEYWORDS = {
  Electronics: ["tv", "speaker", "home theater"],
  Furniture: ["sofa", "table", "bed"],
  Tools: ["power tool", "drill", "saw"]
};

const parseCSV = () =>
  new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (error) => reject(error));
  });

const pickField = (row, candidates) => {
  const key = Object.keys(row).find((col) =>
    candidates.some((candidate) => candidate.toLowerCase() === col.toLowerCase())
  );
  return key ? row[key] : undefined;
};

const generateCategory = (productName) => {
  const value = String(productName || "").toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => value.includes(keyword))) {
      return category;
    }
  }

  return "General";
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedFromCSV = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const sellers = await User.find({ role: "seller" }).select("_id");
    if (!sellers.length) {
      throw new Error("No sellers found in database");
    }

    const rows = await parseCSV();
    const firstTenRows = rows.slice(0, 10);
    const now = Date.now();

    const liveAuctions = firstTenRows.map((row, index) => {
      const productNameRaw = pickField(row, ["product_name", "Product_Name"]) || `Item ${index + 1}`;
      const productName = String(productNameRaw).trim();
      const startingPriceRaw = pickField(row, ["starting_price", "Start_Price"]);
      const startingPrice = Number.parseFloat(startingPriceRaw) || 0;
      const seller = sellers[randomInt(0, sellers.length - 1)];

      return {
        title: productName,
        description: `Seeded from CSV row ${index + 1}`,
        productName,
        category: generateCategory(productName),
        startingPrice,
        currentPrice: startingPrice,
        bidIncrement: randomInt(100, 500),
        status: "live",
        isSuspicious: false,
        endTime: new Date(now + randomInt(1, 3) * 24 * 60 * 60 * 1000),
        seller: seller._id
      };
    });

    const inserted = await Auction.insertMany(liveAuctions);
    console.log(`Seed completed: inserted ${inserted.length} live auctions.`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors on failure path
    }
    process.exit(1);
  }
};

seedFromCSV();
