const { Game, User, Position, StockPrice } = require('../models');
const config = require('../config');

class GameController {
  constructor() {
    this.currentGame = null;
    this.gameInterval = null;
    this.notifyCallback = null;
  }

  // 初始化游戏状态
  async initialize() {
    const runningGame = await Game.findOne({
      where: { status: 'running' }
    });
    
    if (runningGame) {
      this.currentGame = runningGame;
      this.resumeGame();
    } else {
      await this.createNewGame();
    }
  }

  // 创建新游戏
  async createNewGame() {
    this.currentGame = await Game.create({
      status: 'waiting',
      currentRound: 0,
      startTime: null,
      endTime: null,
      nextRoundTime: null
    });

    // 创建初始股票价格
    await Promise.all(config.stockList.map(stock => 
      StockPrice.create({
        gameId: this.currentGame.id,
        code: stock.code,
        price: this.generateInitialPrice(),
        priceChange: 0
      })
    ));
  }

  // 生成初始股价
  generateInitialPrice() {
    return Math.floor(Math.random() * (1000 - 100) + 100);
  }

  // 玩家加入游戏
  async joinGame(userId) {
    const user = await User.findByPk(userId);
    if (!user || user.inGame) return;

    await Position.bulkCreate(config.stockList.map(stock => ({
      userId,
      gameId: this.currentGame.id,
      code: stock.code,
      quantity: 0,
      averagePrice: 0
    })));

    await user.update({ inGame: true });
  }

  // 更新股价
  async updateStockPrices() {
    const newPrices = this.currentGame.stockPrices.map(stock => ({
      code: stock.code,
      price: this.calculateNewPrice(stock.price),
      timestamp: new Date()
    }));

    await Game.updateOne(
      { _id: this.currentGame._id },
      { 
        $set: { stockPrices: newPrices },
        $inc: { currentRound: 1 }
      }
    );
  }

  // 计算新股价
  calculateNewPrice(currentPrice) {
    const { volatility } = config.priceRange;
    const change = (Math.random() * 2 - 1) * volatility;
    const newPrice = currentPrice * (1 + change);
    return Math.max(config.priceRange.min, 
           Math.min(config.priceRange.max, newPrice));
  }

  // 检查游戏是否可以开始
  async checkGameStart() {
    const game = await Game.findById(this.currentGame._id);
    if (game.status === 'waiting' && 
        game.players.length >= game.minPlayers) {
      await this.startGame();
    }
  }

  // 开始游戏
  async startGame() {
    await Game.updateOne(
      { _id: this.currentGame._id },
      { 
        status: 'running',
        startTime: new Date(),
        nextRoundTime: new Date(Date.now() + config.roundInterval * 1000)
      }
    );
    this.startGameLoop();
  }

  // 游戏主循环
  startGameLoop() {
    this.gameInterval = setInterval(async () => {
      const game = await Game.findById(this.currentGame._id);
      
      if (game.currentRound >= config.maxRounds) {
        await this.endGame();
        return;
      }

      await this.updateStockPrices();
    }, config.roundInterval * 1000);
  }

  // 结束游戏
  async endGame() {
    clearInterval(this.gameInterval);
    
    // 结算所有玩家
    const game = await Game.findById(this.currentGame._id);
    for (const player of game.players) {
      await this.settlePlayer(player);
    }

    await Game.updateOne(
      { _id: this.currentGame._id },
      { 
        status: 'finished',
        endTime: new Date()
      }
    );

    // 创建新游戏
    setTimeout(() => this.createNewGame(), config.matchInterval * 1000);
  }

  // 结算玩家
  async settlePlayer(player) {
    let finalAmount = player.cash;
    
    // 计算持仓价值
    for (const position of player.positions) {
      const stockPrice = this.currentGame.stockPrices.find(
        s => s.code === position.code
      );
      finalAmount += stockPrice.price * position.quantity;
    }

    // 更新玩家总资产并发放新一轮的门票费用
    await User.updateOne(
      { _id: player.userId },
      { 
        $inc: { 
          totalAsset: finalAmount,
          // 额外发放一笔等同于门票费用的资金
          totalAsset: config.entryFee 
        },
        $set: { inGame: false }
      }
    );

    // 发送通知给客户端
    this.notifyPlayer(player.userId, {
      type: 'bonus',
      message: `游戏结束！您获得了 ¥${config.entryFee} 的奖励金`,
      amount: config.entryFee
    });
  }

  // 添加通知方法
  notifyPlayer(userId, notification) {
    // 这个方法的具体实现将在 WebSocket 服务中完成
    if (this.notifyCallback) {
      this.notifyCallback(userId, notification);
    }
  }

  setNotifyCallback(callback) {
    this.notifyCallback = callback;
  }
}

module.exports = new GameController(); 