const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if the user already exists (either by username or email)
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        message: "Username or Email already exists",
      });
    }

    const user = new User({ username, email, password });

    await user.save();

    // Respond with the generated token
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error registering user",
      error: err.message,
    });
  }
};

exports.login = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if the user exists by either username or email
    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { username: user.username, userId: user._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1h" }
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error logging in",
      error: err.message,
    });
  }
};
