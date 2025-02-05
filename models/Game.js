const mongoose = require('mongoose');

const stockPriceSchema = new mongoose.Schema({
  code: String,
  price: Number,
  timestamp: Date
});

const playerStateSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  nickname: String,
  cash: Number,
  positions: [{
    code: String,
    quantity: Number,
    averagePrice: Number
  }]
});

const gameSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['waiting', 'running', 'finished'],
    default: 'waiting'
  },
  currentRound: {
    type: Number,
    default: 0
  },
  stockPrices: [stockPriceSchema],
  players: [playerStateSchema],
  startTime: Date,
  endTime: Date,
  nextRoundTime: Date,
  minPlayers: {
    type: Number,
    default: 2
  }
});

module.exports = mongoose.model('Game', gameSchema); 