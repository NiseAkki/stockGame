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
      nextRoundTime: null,
      minPlayers: 2
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
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      if (user.inGame) {
        throw new Error('已经在游戏中');
      }

      console.log('玩家加入游戏前状态:', {
        userId,
        nickname: user.nickname,
        totalAsset: user.totalAsset,
        cash: user.cash,
        inGame: user.inGame
      });

      if (user.totalAsset < config.entryFee) {
        throw new Error('资产不足，无法支付入场费');
      }

      // 先扣除入场费
      const newTotalAsset = user.totalAsset - config.entryFee;
      const newCash = config.entryFee;

      // 更新用户状态
      await user.update({
        totalAsset: newTotalAsset,
        cash: newCash,
        inGame: true
      });

      console.log('玩家加入游戏后状态:', {
        userId,
        nickname: user.nickname,
        totalAsset: newTotalAsset,
        cash: newCash,
        inGame: true
      });

      // 创建用户的初始持仓记录
      await Promise.all(config.stockList.map(stock => 
        Position.create({
          userId,
          gameId: this.currentGame.id,
          code: stock.code,
          quantity: 0,
          averagePrice: 0
        })
      ));

      // 立即发送更新后的游戏状态
      const gameStatePayload = {
        status: this.currentGame.status,
        currentRound: this.currentGame.currentRound,
        nextRoundTime: this.currentGame.nextRoundTime,
        playerInfo: {
          nickname: user.nickname,
          totalAsset: newTotalAsset,
          cash: newCash,
          inGame: true
        }
      };

      console.log('发送游戏状态更新:', gameStatePayload);

      this.notifyPlayer(userId, {
        type: 'gameState',
        payload: gameStatePayload
      });

      // 最后发送入场费通知
      this.notifyPlayer(userId, {
        type: 'entryFee',
        message: `已扣除入场费 ¥${config.entryFee}`,
        amount: config.entryFee
      });

    } catch (error) {
      console.error('加入游戏错误:', error);
      this.notifyPlayer(userId, {
        type: 'error',
        message: error.message
      });
    }
  }

  // 更新股价
  async updateStockPrices() {
    const stocks = await StockPrice.findAll({
      where: { gameId: this.currentGame.id }
    });

    for (const stock of stocks) {
      const oldPrice = Number(stock.price);
      const newPrice = this.calculateNewPrice(oldPrice);
      await stock.update({
        price: newPrice,
        priceChange: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2)
      });
    }

    await this.currentGame.increment('currentRound');
    await this.currentGame.update({
      nextRoundTime: new Date(Date.now() + config.roundInterval * 1000)
    });
  }

  // 计算新股价
  calculateNewPrice(currentPrice) {
    const { volatility, min, max } = config.priceRange;
    const change = (Math.random() * 2 - 1) * volatility;
    const newPrice = currentPrice * (1 + change);
    return Math.max(min, Math.min(max, newPrice));
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
      try {
        await this.updateStockPrices();
        
        // 获取所有玩家
        const positions = await Position.findAll({
          where: { gameId: this.currentGame.id },
          include: [User]
        });

        const userIds = [...new Set(positions.map(p => p.userId))];
        
        // 获取最新的股票数据
        const stocks = await StockPrice.findAll({
          where: { gameId: this.currentGame.id }
        });

        // 广播给每个玩家
        for (const userId of userIds) {
          // 发送完整的游戏状态更新
          const gameState = {
            type: 'gameState',
            payload: {
              status: this.currentGame.status,
              currentRound: this.currentGame.currentRound,
              nextRoundTime: this.currentGame.nextRoundTime,
              stocks: stocks.map(stock => ({
                code: stock.code,
                name: config.stockList.find(s => s.code === stock.code).name,
                price: Number(stock.price),
                priceChange: Number(stock.priceChange),
                position: positions.find(p => p.userId === userId && p.code === stock.code)?.quantity || 0,
                averagePrice: positions.find(p => p.userId === userId && p.code === stock.code)?.averagePrice || 0
              })),
              playerInfo: {
                nickname: positions[0]?.User.nickname,
                totalAsset: positions[0]?.User.totalAsset,
                cash: positions[0]?.User.cash,
                inGame: positions[0]?.User.inGame
              }
            }
          };

          this.notifyPlayer(userId, gameState);
        }

        // 检查游戏是否结束
        if (this.currentGame.currentRound >= config.maxRounds) {
          await this.endGame();
        }
      } catch (error) {
        console.error('游戏循环错误:', error);
      }
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

    let finalAmount = user.cash;  // 使用当前现金
    for (const position of userPositions) {
      const stockPrice = stockPrices.find(s => s.code === position.code);
      finalAmount += stockPrice.price * position.quantity;
    }

    // 更新用户资产和状态
    await user.update({
      totalAsset: user.totalAsset + finalAmount,  // 将最终金额加到总资产中
      cash: 0,  // 清空现金
      inGame: false
    });

    this.notifyPlayer(user.id, {
      type: 'gameEnd',
      message: `游戏结束！您的最终收益为 ¥${(finalAmount - config.entryFee).toFixed(2)}`,
      amount: finalAmount
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

  async getGameState(userId) {
    const user = await User.findByPk(userId);
    const stocks = await StockPrice.findAll({
      where: { gameId: this.currentGame.id }
    });

    const positions = await this.getUserPositions(userId);

    return {
      status: this.currentGame.status,
      currentRound: this.currentGame.currentRound,
      nextRoundTime: this.currentGame.nextRoundTime,
      playerInfo: {
        nickname: user.nickname,
        totalAsset: user.totalAsset,
        cash: user.cash,
        inGame: user.inGame
      },
      stocks: stocks.map(stock => ({
        code: stock.code,
        name: config.stockList.find(s => s.code === stock.code).name,
        price: stock.price,
        priceChange: stock.priceChange,
        position: positions.find(p => p.code === stock.code)?.quantity || 0,
        averagePrice: positions.find(p => p.code === stock.code)?.averagePrice || 0
      }))
    };
  }

  async broadcastGameState() {
    const positions = await Position.findAll({
      where: { gameId: this.currentGame.id },
      include: [User]
    });

    const userIds = [...new Set(positions.map(p => p.userId))];
    
    for (const userId of userIds) {
      this.notifyPlayer(userId, {
        type: 'gameState',
        payload: await this.getGameState(userId)
      });
    }
  }

  async trade(userId, stockCode, action, quantity) {
    try {
      const user = await User.findByPk(userId);
      const stock = await StockPrice.findOne({
        where: { 
          gameId: this.currentGame.id,
          code: stockCode
        }
      });
      const position = await Position.findOne({
        where: {
          userId,
          gameId: this.currentGame.id,
          code: stockCode
        }
      });

      if (!user || !stock || !position) {
        throw new Error('无效的交易请求');
      }

      const totalCost = stock.price * quantity;

      if (action === 'buy') {
        if (user.cash < totalCost) {
          throw new Error('资金不足');
        }

        // 更新持仓
        const newQuantity = position.quantity + quantity;
        const newAveragePrice = (position.averagePrice * position.quantity + totalCost) / newQuantity;
        await position.update({
          quantity: newQuantity,
          averagePrice: newAveragePrice
        });

        // 扣除资金
        await user.update({
          cash: user.cash - totalCost
        });
      } else if (action === 'sell') {
        if (position.quantity < quantity) {
          throw new Error('持仓不足');
        }

        // 更新持仓
        const newQuantity = position.quantity - quantity;
        await position.update({
          quantity: newQuantity,
          averagePrice: newQuantity > 0 ? position.averagePrice : 0
        });

        // 增加资金
        await user.update({
          cash: user.cash + totalCost
        });
      }

      // 通知客户端
      this.notifyPlayer(userId, {
        type: 'tradeResult',
        success: true,
        newCash: user.cash,
        newPositions: await this.getUserPositions(userId)
      });
    } catch (error) {
      this.notifyPlayer(userId, {
        type: 'tradeResult',
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new GameController(); 