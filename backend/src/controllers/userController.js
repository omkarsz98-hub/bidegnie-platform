import { User } from "../models/User.js";

export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof email === "string" && email.trim()) {
      updates.email = email.trim().toLowerCase();
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (updates.email && updates.email !== user.email) {
      const existing = await User.findOne({ email: updates.email, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Email already in use."
        });
      }
    }

    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email;

    await user.save();

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        customerId: user.customerId,
        role: user.role,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance || 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

