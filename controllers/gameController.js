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
    const stockPrices = await StockPrice.findAll({
      where: { gameId: this.currentGame.id }
    });

    await Promise.all(stockPrices.map(stock => 
      stock.update({
        price: this.calculateNewPrice(stock.price),
        updatedAt: new Date()
      })
    ));

    await this.currentGame.increment('currentRound');
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
    const playerCount = await Position.count({
      where: { gameId: this.currentGame.id },
      distinct: true,
      col: 'userId'
    });

    if (this.currentGame.status === 'waiting' && 
        playerCount >= this.currentGame.minPlayers) {
      await this.startGame();
    }
  }

  // 开始游戏
  async startGame() {
    const now = new Date();
    await this.currentGame.update({
      status: 'running',
      startTime: now,
      nextRoundTime: new Date(now.getTime() + config.roundInterval * 1000)
    });
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
    const positions = await Position.findAll({
      where: { gameId: this.currentGame.id },
      include: [User]
    });

    const players = [...new Set(positions.map(p => p.User))];
    for (const player of players) {
      await this.settlePlayer(player, positions);
    }

    await this.currentGame.update({
      status: 'finished',
      endTime: new Date()
    });

    // 创建新游戏
    setTimeout(() => this.createNewGame(), config.matchInterval * 1000);
  }

  // 结算玩家
  async settlePlayer(user, positions) {
    const userPositions = positions.filter(p => p.userId === user.id);
    const stockPrices = await StockPrice.findAll({
      where: { gameId: this.currentGame.id }
    });

    let finalAmount = user.cash;
    for (const position of userPositions) {
      const stockPrice = stockPrices.find(s => s.code === position.code);
      finalAmount += stockPrice.price * position.quantity;
    }

    await user.update({
      totalAsset: user.totalAsset + finalAmount + config.entryFee,
      inGame: false
    });

    this.notifyPlayer(user.id, {
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