import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { generateCustomerId } from "../utils/generateCustomerId.js";

dotenv.config();

/* =====================================================
   REGISTER USER (AUTO LOGIN ENABLED)
===================================================== */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate role
    if (!["bidder", "seller"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected"
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate customer ID
    const customerId = generateCustomerId();

    // Create new user
    const newUser = await User.create({
      customerId,
      name,
      email,
      password: hashedPassword,
      role
    });

    // Generate JWT token (AUTO LOGIN)
    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        _id: newUser._id,
        customerId: newUser.customerId,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email,
        walletBalance: newUser.walletBalance || 0
      },
      role: newUser.role,
      customerId: newUser.customerId,
      userId: newUser._id
    });

  } catch (error) {
    console.error("Register Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};


/* =====================================================
   LOGIN USER (EMAIL + PASSWORD)
===================================================== */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        customerId: user.customerId,
        role: user.role,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance || 0
      },
      role: user.role,
      customerId: user.customerId,
      userId: user._id
    });

  } catch (error) {
    console.error("Login Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};
