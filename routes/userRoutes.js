import express from "express";
import {
  login,
  logout,
  logoutAllDevices,
  register,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import OTP from "../models/OTP.js";
import nodemailer from "nodemailer";
import "dotenv/config";
import Session from "../models/Session.js";
import User from "../models/User.js";

const router = express.Router();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// register
router.post("/register", register);

// login
router.post("/login", login);

// logout
router.post("/logout", authMiddleware, logout);

// logout all devices
router.post("/logout-all", authMiddleware, logoutAllDevices);

// OTP generate
router.post("/request-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ message: "Email is required for OTP " });
  }

  const otp = crypto.randomInt(1000, 10000); // 4 digits
  const otpHash = await bcrypt.hash(otp.toString(), 12);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await OTP.deleteMany({ email });

  // store otp
  await OTP.create({
    email,
    otpHash,
    expiresAt,
    attempts : 0,
  });


  // send to email -> nodemailer
  await transporter.sendMail({
    from : process.env.SMTP_USER,
    to: email,
    subject : "Your OTP",
    text : `Your OTP is ${otp} . Valid for 5 mins`,
  });

  return res.json({ message: "OTP sent" });
});

// OTP verify
router.post("/verify-otp" , async (req , res) => {
  const { email , otp} = req.body

  if( !email ||!otp){
    return res.json({message : "Email and OTP is required"})
  }

  const storedOTP = await OTP.findOne({email}) // _id : "" , otpHash : , expiresAt , attempts

  if(!storedOTP){
    return res.json({message : "OTP not found or expired"})
  }

  if(storedOTP.expiresAt < new Date()){
    await OTP.findByIdAndDelete(storedOTP._id)
    return res.json({message : "OTP expired"})
  }

  // otp validation
  const isValid = await bcrypt.compare(otp , storedOTP.otpHash)

  if(!isValid){
    
    return res.json({message : "Invalid OTP"})
  }

  // OTP one time use
  await OTP.findByIdAndDelete(storedOTP._id)

  const user = await User.findOne({email})

  // session create
  const session = await Session.create({
    userId: user._id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  res.cookie("sid", session._id, {
    httpOnly: true,
    signed: true,
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.json({message : "OTP verified"})

})

export default router;
