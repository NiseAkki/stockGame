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
}, {
  timestamps: true // 添加创建时间和更新时间
});

module.exports = mongoose.model('Game', gameSchema);

module.exports = (sequelize, DataTypes) => {
  const Game = sequelize.define('Game', {
    status: {
      type: DataTypes.ENUM('waiting', 'running', 'finished'),
      defaultValue: 'waiting'
    },
    currentRound: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    nextRoundTime: DataTypes.DATE,
    minPlayers: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    }
  });

  return Game;
}; 