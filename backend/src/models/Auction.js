import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    isSuspicious: {
  type: Boolean,
  default: false
},
fraudScore: {
  type: Number,
  default: 0
},
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    category: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: null,
    },
    startingPrice: {
      type: Number,
      required: true
    },
    reservePrice: {
      type: Number,
      default: null
    },
    currentPrice: {
      type: Number,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "ended"],
      default: "upcoming"
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

export const Auction = mongoose.model("Auction", auctionSchema);
