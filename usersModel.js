const mongoose = require("mongoose");

const Users = mongoose.Schema({
  gmail: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("users", Users);
