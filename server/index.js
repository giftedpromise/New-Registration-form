const express = require("express");
const mongoose = require("mongoose");
const UserModel = require("./model/User");
const cors = require("cors");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");

const session = require("express-session");

const MONGO_URI =
  "mongodb+srv://gifted:admin@cluster0.8pckn.mongodb.net/userCredentials";
const PORT = 3001;

const app = express();
app.use(express.json());

// Configure CORS with credentials
app.use(
  cors({
    origin: "http://localhost:5173", // Update this with your frontend's origin
    credentials: true, // Allow credentials such as cookies or sessions
  })
);

// Session middleware
app.use(
  session({
    secret: "12345", // Secret should be a string
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI, // MongoDB URI should be a string
    }),
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err.message));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ name, email, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        req.session.user = {
          id: user._id,
          name: user.name,
          email: user.email,
        };
        console.log("Login Success:", user.name);
        res.json("Success");
      } else {
        res.status(401).json("Password doesn't match");
      }
    } else {
      res.status(404).json("No Records found");
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Failed to logout" });
      } else {
        res.status(200).json({ message: "Logout successful" });
      }
    });
  } else {
    res.status(400).json({ error: "No session found" });
  }
});

app.get("/user", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json("Not authenticated");
  }
});
