const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Users = require("./usersModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const axios = require("axios");
const cors = require("cors");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ganesh123ex@gmail.com",
    pass: "nrvq kwif nivy bpxe",
  },
});

app.use(cors());

app.use(express.json());

app.listen(3000, () => {
  console.log(`Server running on http://localhost:3000`);
});

mongoose
  .connect("mongodb+srv://ganesh:ganesh@cluster7337.7exrzd7.mongodb.net/")
  .then(() => console.log("db connected..."));

const authMiddleware = (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (!jwtToken) {
    res.status(400);
    res.send("please provide authentication token");
  }
  jwt.verify(jwtToken, "ganesh", (error, payload) => {
    if (error) {
      return res.status(400).send("invalid token");
    }
    if (payload.tokenType !== "authentication") {
      return res.status(400).send("invalid token");
    }
    req.userId = payload.userId;
    req.tokenType = payload.tokenType;
    next();
  });
};

app.post("/token-validation", authMiddleware, async (req, res) => {
  res.status(200).send("token is valid");
});

app.post("/signup", async (req, res) => {
  try {
    const { gmail, password, confirmPassword } = req.body;
    let existed = await Users.findOne({ gmail });
    if (existed) {
      return res.status(400).send("user already existed");
    }
    if (password !== confirmPassword) {
      return res.status(400).send("password did not match");
    }
    let hashedPassword = await bcrypt.hash(password, 10);
    let newUser = new Users({
      gmail,
      password: hashedPassword,
    });
    await newUser.save();
    res.status(200).send("user registered successfully");
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.post("/signin", async (req, res) => {
  try {
    const { gmail, password } = req.body;
    const existed = await Users.findOne({ gmail });
    if (!existed) {
      return res.status(400).send("user not exist");
    } else {
      let passwordMatch = await bcrypt.compare(password, existed.password);
      if (!passwordMatch) {
        return res.status(400).send("invalid password");
      } else {
        let payload = {
          userId: existed._id,
          tokenType: "authentication",
        };
        let token = jwt.sign(payload, "ganesh");
        res.send({ token });
      }
    }
  } catch (error) {
    console.log(err.message);
    res.status(500).send(error);
  }
});

app.post("/forget-password", async (req, res) => {
  const { gmail } = req.body;
  try {
    const existed = await Users.findOne({ gmail });
    if (!existed) {
      res.status(400).send("user not exists");
    }
    let payload = {
      userId: existed._id,
      tokenType: "resetPassword",
    };
    let token = jwt.sign(payload, "ganesh", { expiresIn: "30m" });

    const resetLink = `http://localhost:3000/reset-password/${token}`;
    const msg = {
      from: "ganesh123ex@gmail.com",
      to: gmail,
      subject: "reset password",
      text: `Click the link to reset your password: ${resetLink}`,
    };

    await transporter.sendMail(msg);

    res.send("password reset link has been sent to your gmail");
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  try {
    if (!newPassword) {
      return res.status(400).send("please provide new password");
    }
    const payload = jwt.verify(token, "ganesh");
    if (!payload || payload.tokenType !== "resetPassword") {
      return res.status(400).send("invalid token");
    }
    const user = await Users.findById(payload.userId);

    let hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.send("password reset was successfull");
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/characters", authMiddleware, async (req, res) => {
  try {
    const { data } = await axios.get("https://swapi.dev/api/people");
    res.send(data);
  } catch (error) {
    res.status(500).json(error);
  }
});
