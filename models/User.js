const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photo: { type: String, default: null },
  bio: { type: String, default: "" },
  joined: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
