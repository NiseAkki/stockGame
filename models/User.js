const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    required: true
  },
  totalAsset: {
    type: Number,
    default: 100000
  },
  inGame: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('User', userSchema); 