const WebSocket = require('ws');
const config = require('../../config');

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
    this.roundTimer = null;   // 回合计时器
    this.matchTimer = null;   // 对局间隔计时器
    
    // 启动游戏循环
    this.startNewGame();
  }

  // 修改：游戏对局开始
  startNewGame() {
    console.log('初始化新游戏');
    this.cleanup();  // 清理所有定时器
    
    // 重置游戏状态，直接设置为 running
    this.gameState = {
      status: 'running',  // 直接设置为 running，不需要 waiting 状态
      currentRound: 1,    // 直接从第一回合开始
      nextRoundTime: Date.now() + (config.roundInterval * 1000),
      isSettling: false,
      leaderboard: []
    };
    
    // 初始化股票价格
    this.initializeStockPrices();
    
    // 启动第一回合计时器
    this.roundTimer = setTimeout(() => {
      this.updateRound();
    }, config.roundInterval * 1000);
    
    // 通知外部状态更新
    this.notifyUpdate();
  }

  // 修改：更新排行榜方法
  updateLeaderboard(playerManager) {
    if (!playerManager) return;

    try {
      // 获取所有在游戏中的玩家
      const activePlayers = Array.from(playerManager.players.entries())
        .filter(([_, player]) => player.inGame);

      // 计算每个玩家的总资产并排序
      const leaderboard = activePlayers
        .map(([clientId, player]) => {
          const totalValue = this.calculatePlayerValue(player);
          const userInfo = playerManager.userInfo.get(clientId);
          
          return {
            clientId,
            nickname: userInfo?.nickname || '未知玩家',
            totalValue,
            cash: player.cash,
            positionValue: player.positions.reduce((total, pos) => {
              const stock = this.stockPrices.get(pos.code);
              return total + (pos.quantity * (stock?.price || 0));
            }, 0)
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      this.gameState.leaderboard = leaderboard;
      
      // 不触发任何计时器相关的操作
      // 只更新排行榜数据
    } catch (error) {
      console.error('更新排行榜时出错:', error);
    }
  }

  // 修改：更新回合方法
  updateRound() {
    if (this.gameState.status !== 'running') return;
    
    try {
      // 更新股票价格
      this.updateStockPrices();
      
      // 更新排行榜
      if (this.playerManager) {
        console.log('回合结束，更新排行榜');
        this.updateLeaderboard(this.playerManager);
      }

      // 检查是否达到最大回合数
      if (this.gameState.currentRound >= config.maxRounds) {
        this.endGame();
        return;
      }

      // 增加回合数并设置下一回合结束时间
      this.gameState.currentRound++;
      this.gameState.nextRoundTime = Date.now() + (config.roundInterval * 1000);
      
      console.log(`开始第 ${this.gameState.currentRound} 回合，将在 ${config.roundInterval} 秒后结束`);
      
      // 设置下一回合的计时器
      this.roundTimer = setTimeout(() => {
        this.updateRound();
      }, config.roundInterval * 1000);
      
      // 通知外部状态更新
      this.notifyUpdate();
    } catch (error) {
      console.error('更新回合时出错:', error);
      console.error(error.stack);
    }
  }

  // 修改：计算玩家总价值的方法
  calculatePlayerValue(player) {
    if (!player || !player.positions) return 0;
    
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
  }

  // 修改：启动对局间隔计时
  startMatchInterval() {
    console.log(`下一局将在 ${config.matchInterval} 秒后开始`);
    
    if (this.matchTimer) {
      clearTimeout(this.matchTimer);
    }
    
    this.matchTimer = setTimeout(() => {
      console.log('对局间隔结束，开始新游戏循环');
      this.startNewGame();
    }, config.matchInterval * 1000);
  }

  // 工具方法
  cleanup() {
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
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
    });
  }

  updateStockPrices() {
    this.stockPrices.forEach((stock, code) => {
      const oldPrice = stock.price;
      const change = (Math.random() - 0.5) * 2 * config.priceRange.volatility;
      const newPrice = Math.max(
        config.priceRange.min,
        Math.floor(oldPrice * (1 + change))
      );
      
      const priceChange = ((newPrice - oldPrice) / oldPrice * 100);
      
      this.stockPrices.set(code, {
        ...stock,
        price: newPrice,
        priceChange: Number(priceChange.toFixed(2))
      });
    });
  }

  // 广播消息
  broadcastGameState(clients, playerManager) {
    if (!clients) return;
    
    try {
      clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN) {
          const player = playerManager.players.get(clientId);
          const user = playerManager.userInfo.get(clientId);
          
          const gameStateMessage = {
            type: 'gameState',
            payload: {
              status: this.gameState.status,
              currentRound: this.gameState.currentRound,
              nextRoundTime: this.gameState.nextRoundTime,
              leaderboard: this.gameState.leaderboard,
              stocks: Array.from(this.stockPrices.values()).map(stock => ({
                ...stock,
                position: player?.positions?.find(p => p.code === stock.code)?.quantity || 0,
                averagePrice: player?.positions?.find(p => p.code === stock.code)?.averagePrice || 0
              })),
              playerInfo: player ? {
                clientId,
                nickname: user?.nickname || '',
                totalAsset: user?.totalAsset || 0,
                cash: player.cash,
                inGame: player.inGame  // 使用玩家实际的 inGame 状态
              } : {
                clientId,
                nickname: user?.nickname || '',
                totalAsset: user?.totalAsset || 0,
                cash: 0,
                inGame: false
              }
            }
          };

          client.send(JSON.stringify(gameStateMessage));
        }
      });
    } catch (error) {
      console.error('广播游戏状态时出错:', error);
    }
  }

  // 添加：设置 playerManager 的方法
  setPlayerManager(manager) {
    this.playerManager = manager;
  }
}

module.exports = new GameManager(); 