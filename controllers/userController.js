import Session from "../models/Session.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

export async function register(req, res) {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  if (!name || !email || !password) {
    return res.json({ message: "All fields are required to register" });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.json({ messsage: "User already exists" });
  }

  await User.create({
    name,
    email,
    password: hashedPassword,
  });

  return res.json({ message: "User registered" });
}

export async function login(req, res) {
  const { email, password } = req.body; 
  if (!email || !password) {
    return res.json({ message: "All fields are required" });
  }

  const user = await User.findOne({
    email,
  });
  
  if (!user) {
    return res.json({ message: "Invalid credentails" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.json({ message: "Invalid password or credentials" });
  }

  // Previous session delete
  await Session.deleteMany({userId : user._id})

  const session = await Session.create({
    userId: user._id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  res.cookie("sid", session._id, {
    httpOnly: true,
    signed: true,
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({ message: "User logged in " });
}

export async function logout(req, res) {

  await Session.deleteOne({userId : req.user._id})
  res.clearCookie("sid");

  return res.status(201).json({ message: "User logged out" });
}


export async function logoutAllDevices(req , res) {
    await Session.deleteMany({userId : req.user._id})

    res.clearCookie("sid")

    return res.status(201).json({message : "Logged out from all devices"})
}


