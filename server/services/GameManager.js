const WebSocket = require('ws');
const config = require('../../config');
const cardManager = require('./CardManager');

class GameManager {
  constructor() {
    this.gameState = {
      status: 'waiting',    // waiting -> running -> finished
      currentRound: 0,
      nextRoundTime: null,
      isSettling: false,
      leaderboard: []  // 排行榜数据
    };
    
    this.stockPrices = new Map();
    this.stockProbabilities = new Map();  // 这里也有一份
    this.roundTimer = null;   // 回合计时器
    this.matchTimer = null;   // 对局间隔计时器
    this.clients = null;      // 添加 clients 引用
    this.playerManager = null;  // 添加 playerManager 引用
    
    // 不在构造函数中启动游戏
    // this.startNewGame();  // 移除这行
  }

  // 添加初始化方法
  initialize() {
    if (!this.playerManager || !this.clients) {
      console.error('GameManager 未完全初始化');
      return;
    }
    console.log('GameManager 初始化完成，开始新游戏');
    this.startNewGame();
  }

  // 添加设置 clients 的方法
  setClients(clientsMap) {
    this.clients = clientsMap;
  }

  // 修改：游戏对局开始
  startNewGame() {
    console.log('初始化新游戏');
    this.cleanup();  // 清理所有定时器
    
    // 重置游戏状态
    this.gameState = {
      status: 'running',
      currentRound: 0,
      nextRoundTime: Date.now() + (config.roundInterval * 1000),
      isSettling: false,
      leaderboard: []
    };
    
    // 初始化股票价格和概率
    this.initializeStockPrices();  // 这里会重置所有概率为0.50！
    
    // 启动游戏循环
    this.updateRound();
    
    // 通知外部状态更新
    this.notifyUpdate();
  }

  // 修改：更新排行榜方法
  updateLeaderboard(playerManager) {
    if (!playerManager) return;

    try {
      // 使用 Map 来确保每个用户只出现一次
      const userMap = new Map();
      
      Array.from(playerManager.players.entries())
        .filter(([_, player]) => player.inGame)
        .forEach(([clientId, player]) => {
          const user = playerManager.userInfo.get(clientId);
          const totalValue = this.calculatePlayerValue(player);
          
          // 使用用户昵称作为键
          const nickname = user?.nickname || '未知玩家';
          
          // 如果已存在该用户，只保留总资产更高的那个记录
          if (!userMap.has(nickname) || 
              Number(userMap.get(nickname).totalValue) < Number(totalValue)) {
            userMap.set(nickname, {
              clientId,
              nickname,
              totalValue: Number(totalValue).toFixed(2),
              cash: Number(player.cash).toFixed(2),
              positionValue: Number(player.positions.reduce((total, pos) => {
                const stock = this.stockPrices.get(pos.code);
                return total + (pos.quantity * (stock?.price || 0));
              }, 0)).toFixed(2)
            });
          }
        });

      // 转换为数组并排序
      const leaderboard = Array.from(userMap.values())
        .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));

      this.gameState.leaderboard = leaderboard;
    } catch (error) {
      console.error('更新排行榜时出错:', error);
    }
  }

  // 修改：更新回合方法
  updateRound() {
    if (this.gameState.status !== 'running') return;
    
    try {
      // 检查是否达到最大回合数
      if (this.gameState.currentRound >= config.maxRounds) {
        console.log('达到最大回合数，结束游戏');
        this.endGame();
        return;
      }

      // 增加回合数并设置下一回合结束时间
      this.gameState.currentRound++;
      this.gameState.nextRoundTime = Date.now() + (config.roundInterval * 1000);
      
      //console.log(`开始第 ${this.gameState.currentRound}/${config.maxRounds} 回合，将在 ${config.roundInterval} 秒后结束`);
      
      // 处理功能卡效果
      cardManager.processEffects(this.gameState);
      
      // 为在游戏中的玩家分发新的功能卡
      this.playerManager.players.forEach((player, clientId) => {
        // 检查玩家是否真的断线
        const ws = this.clients?.get(clientId);
        if (player.inGame && (!ws || ws.readyState !== WebSocket.OPEN)) {
          console.log(`检测到玩家 ${clientId} 可能断线，保持状态 30 秒`);
          setTimeout(() => {
            const currentWs = this.clients?.get(clientId);
            if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
              console.log(`玩家 ${clientId} 超过 30 秒未重连，清理状态`);
              player.inGame = false;
            }
          }, 30000);
        } else if (player.inGame) {
          cardManager.initializePlayer(clientId);
          cardManager.distributeCards();
        }
      });

      // 更新排行榜
      if (this.playerManager) {
        this.updateLeaderboard(this.playerManager);
      }

      // 清除现有的计时器
      if (this.roundTimer) {
        clearTimeout(this.roundTimer);
      }
      
      // 设置下一回合的计时器
      this.roundTimer = setTimeout(() => {
        // 回合结束时的清算流程
        this.endRoundSettlement();
        // 开始新回合
        this.updateRound();
      }, config.roundInterval * 1000);
      
      // 通知外部状态更新
      this.notifyUpdate();

    } catch (error) {
      console.error('更新回合时出错:', error);
      if (this.roundTimer) {
        clearTimeout(this.roundTimer);
      }
      this.roundTimer = setTimeout(() => {
        this.updateRound();
      }, config.roundInterval * 1000);
    }
  }

  // 修改回合结束清算方法
  endRoundSettlement() {
    // 1. 更新股票价格（使用当前的概率）
    this.updateStockPrices();

    // 2. 清算当前回合的所有效果
    if (this.gameState.forcedChanges) {
      this.gameState.forcedChanges.clear();
    }

    // 3. 重置所有股票的概率为0.50（为下一回合准备）
    this.stockPrices.forEach((_, code) => {
      const currentProb = this.stockProbabilities.get(code);
      this.stockProbabilities.set(code, 0.50);
      //console.log(`重置股票 ${code} 的概率为 0.50 (原概率: ${currentProb})`);
    });

    // 4. 更新排行榜
    if (this.playerManager) {
      this.updateLeaderboard(this.playerManager);
    }
  }

  // 修改：计算玩家总价值的方法
  calculatePlayerValue(player) {
    if (!player || !player.positions) return 0;
    
    try {
      // 计算持仓市值
      const positionValue = player.positions.reduce((total, position) => {
        const stock = this.stockPrices.get(position.code);
        if (stock && position.quantity > 0) {
          return total + (stock.price * position.quantity);
        }
        return total;
      }, 0);
      
      // 返回现金 + 持仓市值
      return Number(player.cash || 0) + positionValue;
    } catch (error) {
      console.error('计算玩家总价值时出错:', error);
      return 0;
    }
  }

  // 修改：游戏对局结束
  endGame() {
    console.log('游戏结束');
    
    // 停止回合计时器
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
      this.roundTimer = null;
    }
    
    this.gameState.status = 'finished';
    this.gameState.isSettling = true;
    
    // 设置对局间隔时间
    this.gameState.nextRoundTime = Date.now() + (config.matchInterval * 1000);
    
    // 通知外部游戏结束，进行清算
    this.notifyUpdate();
    
    // 启动对局间隔计时器
    this.startMatchInterval();

    // 清理所有卡片和效果
    this.playerManager.players.forEach((_, clientId) => {
      cardManager.clearPlayerCards(clientId);
    });
    cardManager.clearAllEffects();

    // 重置所有股票的概率为50%
    this.stockProbabilities.forEach((_, code) => {
      this.stockProbabilities.set(code, 0.50);
    });
  }

  // 修改：启动对局间隔计时
  startMatchInterval() {
    //console.log(`下一局将在 ${config.matchInterval} 秒后开始`);
    
    if (this.matchTimer) {
      clearTimeout(this.matchTimer);
    }
    
    this.matchTimer = setTimeout(() => {
      //console.log('对局间隔结束，开始新游戏循环');
      this.startNewGame();
    }, config.matchInterval * 1000);
  }

  // 工具方法
  cleanup() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.matchTimer) {
      clearTimeout(this.matchTimer);
      this.matchTimer = null;
    }
  }

  notifyUpdate() {
    if (this.onRoundUpdate) {
      this.onRoundUpdate();
    }
  }

  setRoundUpdateCallback(callback) {
    this.onRoundUpdate = callback;
  }

  // 股票价格管理
  initializeStockPrices() {
    const isFirstInit = this.stockPrices.size === 0;  // 检查是否是首次初始化
    
    config.stockList.forEach(stock => {
      const initialPrice = Math.floor(
        config.priceRange.min + 
        Math.random() * (config.priceRange.max - config.priceRange.min)
      );
      
      this.stockPrices.set(stock.code, {
        code: stock.code,
        name: stock.name,
        price: initialPrice,
        priceChange: 0
      });

      // 只在首次初始化时设置概率
      if (isFirstInit) {
        this.stockProbabilities.set(stock.code, 0.50);
      }
    });
  }

  updateStockPrices() {
    this.stockPrices.forEach((stock, code) => {
      const effect = cardManager.activeEffects.get(code);
      const isFrozen = effect && effect.effect === 'freeze';
      
      let probability = this.stockProbabilities.get(code) || 0.5;
      const oldPrice = stock.price;
      let newPrice;
      let priceDirection;
      let randomValue;

      // 根据概率范围决定价格变动
      if (probability < 0) {
        // 冻结状态
        newPrice = oldPrice;
        priceDirection = '冻结';
        //console.log(`股票 ${code} 价格更新:`, {
        //  概率: probability,
        //  强制变动: '冻结',
        //  随机值: '无',
        //  方向: priceDirection,
        //  旧价格: oldPrice,
        //  新价格: newPrice
        //});
      } else if (probability < 0.5) {
        // 强制下跌
        newPrice = Math.floor(oldPrice * 0.9);
        priceDirection = '强制下跌';
        //console.log(`股票 ${code} 价格更新:`, {
        //  概率: probability,
        //  强制变动: '强制下跌',
        //  随机值: '无',
        //  方向: priceDirection,
        //  旧价格: oldPrice,
        //  新价格: newPrice
        //});
      } else if (probability > 0.5) {
        // 强制上涨
        newPrice = Math.floor(oldPrice * 1.1);
        priceDirection = '强制上涨';
        //console.log(`股票 ${code} 价格更新:`, {
        //  概率: probability,
        //  强制变动: '强制上涨',
        //  随机值: '无',
        //  方向: priceDirection,
        //  旧价格: oldPrice,
        //  新价格: newPrice
        //});
      } else {
        // 自然波动 (probability = 0.5)
        randomValue = Math.random();
        const isUpward = randomValue < 0.5;
        newPrice = Math.floor(oldPrice * (isUpward ? 1.1 : 0.9));
        priceDirection = isUpward ? '自然上涨' : '自然下跌';
        //console.log(`股票 ${code} 价格更新:`, {
        //  概率: probability,
        //  强制变动: '无',
        //  随机值: randomValue,
        //  方向: priceDirection,
        //  旧价格: oldPrice,
        //  新价格: newPrice
        //});
      }

      this.stockPrices.set(code, {
        ...stock,
        price: newPrice,
        priceChange: Number(((newPrice - oldPrice) / oldPrice * 100).toFixed(2))
      });
    });
  }

  // 广播消息
  broadcastGameState(clients, playerManager) {
    if (!clients) return;
    
    // 先更新排行榜
    this.updateLeaderboard(playerManager);
    
    // 准备要广播的游戏状态数据
    const baseGameState = {
      status: this.gameState.status,
      currentRound: this.gameState.currentRound,
      nextRoundTime: this.gameState.nextRoundTime,
      stocks: Array.from(this.stockPrices.values()),
      leaderboard: this.gameState.leaderboard  // 确保包含最新排行榜
    };

    // 对每个客户端发送个性化的游戏状态
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const clientId = client.clientId;
        const player = playerManager.players.get(clientId);
        const user = playerManager.userInfo.get(clientId);

        // 为每个客户端添加个性化数据
        const personalizedState = {
          ...baseGameState,
          playerInfo: player ? {
            clientId,
            nickname: user?.nickname || '',
            cash: player.cash,
            positions: player.positions,
            inGame: player.inGame,
            totalValue: this.calculatePlayerValue(player)  // 添加总价值
          } : null
        };

        try {
          client.send(JSON.stringify({
            type: 'gameState',
            payload: personalizedState
          }));
        } catch (error) {
          console.error(`向客户端 ${clientId} 发送状态失败:`, error);
        }
      }
    });
  }

  // 添加：设置 playerManager 的方法
  setPlayerManager(manager) {
    this.playerManager = manager;
  }

  // 修改：玩家加入游戏时的处理
  handlePlayerJoin(playerManager, clientId) {
    cardManager.initializePlayer(clientId);
    this.updateLeaderboard(playerManager);
    this.notifyUpdate();
  }

  handleMessage(clientId, message) {
    switch (message.type) {
      case 'useCard':
        this.handleUseCard(clientId, message);
        break;
        
      case 'getCards':
        this.handleGetCards(clientId);
        break;
    }
  }

  handleUseCard(clientId, message) {
    const success = cardManager.useCard(clientId, message.cardId, message.targetId);
    if (success) {
      // 更新并广播游戏状态
      this.updateLeaderboard(this.playerManager);
      this.broadcastGameState(this.clients, this.playerManager);
    }
  }

  handleGetCards(clientId) {
    const cards = cardManager.getPlayerCards(clientId);
    this.sendToClient(clientId, {
      type: 'cards',
      cards
    });
  }
}

// 修改导出方式
const gameManager = new GameManager();
module.exports = gameManager; 