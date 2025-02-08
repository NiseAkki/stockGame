const config = require('../../config');

class PlayerManager {
  constructor() {
    this.players = new Map();
    this.userInfo = new Map();
    this.gameManager = null;  // 将 gameManager 移到实例属性中
  }

  // 修改：用户管理
  addPlayer(clientId, userInfo) {
    console.log('添加玩家:', userInfo);
    
    // 保存用户基本信息
    this.userInfo.set(clientId, userInfo);
    
    // 初始化玩家游戏状态
    this.players.set(clientId, {
      inGame: false,
      cash: 0,
      positions: [],
      nickname: userInfo.nickname
    });

    // 如果游戏正在进行，立即更新排行榜
    if (this.gameManager && this.gameManager.gameState.status === 'running') {
      this.gameManager.updateLeaderboard(this);
    }
  }

  // 修改：游戏参与管理
  joinGame(clientId) {
    const player = this.players.get(clientId);
    const user = this.userInfo.get(clientId);
    
    if (!player || !user) {
      console.error('玩家信息不存在:', { 
        clientId,
        hasPlayer: !!player,
        hasUser: !!user
      });
      throw new Error('玩家信息不存在');
    }

    // 如果玩家已经在游戏中，直接返回现有状态
    if (player.inGame) {
      console.log(`玩家 ${user.nickname} 已在游戏中，状态:`, {
        总资产: user.totalAsset,
        游戏资金: player.cash,
        游戏状态: this.gameManager?.gameState.status || 'unknown'
      });
      return { user, player };
    }

    // 检查是否有足够资产
    if (user.totalAsset < config.entryFee) {
      throw new Error(`资产不足，需要 ¥${config.entryFee}`);
    }

    // 扣除入场费
    user.totalAsset -= config.entryFee;

    // 更新玩家状态
    player.inGame = true;
    player.cash = config.entryFee;  // 设置初始游戏资金
    player.positions = config.stockList.map(stock => ({
      code: stock.code,
      quantity: 0,
      averagePrice: 0
    }));

    console.log(`玩家 ${user.nickname} 加入游戏:`, {
      总资产: user.totalAsset,
      游戏资金: player.cash,
      游戏状态: this.gameManager?.gameState.status || 'unknown'
    });
    
    // 立即更新排行榜
    if (this.gameManager) {
      this.gameManager.updateLeaderboard(this);
    }

    return { user, player };
  }

  // 移除玩家时清理所有相关数据
  removePlayer(clientId) {
    this.players.delete(clientId);
    this.userInfo.delete(clientId);
    console.log(`移除玩家 ${clientId}`);
  }

  // 修改：重置玩家状态，加入清算逻辑
  resetPlayer(clientId) {
    const player = this.players.get(clientId);
    const user = this.userInfo.get(clientId);
    
    if (player && user) {
      // 计算持仓价值
      let positionValue = 0;
      player.positions.forEach(position => {
        if (this.gameManager) {
          const currentPrice = this.gameManager.stockPrices.get(position.code)?.price || 0;
          positionValue += currentPrice * position.quantity;
        }
      });

      // 计算最终收益（现金 + 持仓市值）
      const finalValue = player.cash + positionValue;
      
      // 更新总资产（加上游戏收益和新门票）
      const oldTotalAsset = user.totalAsset;
      user.totalAsset += finalValue + config.entryFee;

      // 重置玩家状态
      player.inGame = false;
      player.cash = 0;
      player.positions = config.stockList.map(stock => ({
        code: stock.code,
        quantity: 0,
        averagePrice: 0
      }));

      // 广播清算结果和更新后的游戏状态
      if (this.gameManager) {
        const client = this.gameManager.clients?.get(clientId);
        if (client && client.readyState === 1) { // WebSocket.OPEN
          // 发送清算结果
          client.send(JSON.stringify({
            type: 'settlement',
            payload: {
              message: `游戏结束清算结果：\n` +
                      `持仓市值：¥${positionValue}\n` +
                      `剩余资金：¥${player.cash}\n` +
                      `游戏总价值：¥${finalValue}\n` +
                      `系统发放新门票：¥${config.entryFee}`,
              details: {
                原总资产: oldTotalAsset,
                现金: player.cash,
                持仓市值: positionValue,
                游戏收益: finalValue,
                新门票: config.entryFee,
                新总资产: user.totalAsset
              }
            }
          }));

          // 立即发送更新后的游戏状态
          client.send(JSON.stringify({
            type: 'gameState',
            payload: {
              status: this.gameManager.gameState.status,
              playerInfo: {
                nickname: user.nickname,
                totalAsset: user.totalAsset,
                cash: player.cash,
                inGame: player.inGame
              }
            }
          }));
        }
      }
    }
  }

  // 新增：重置所有玩家
  resetAllPlayers() {
    for (const [clientId] of this.players) {
      this.resetPlayer(clientId);
    }
  }

  // 交易管理
  handleTrade(clientId, tradeInfo) {
    console.log('PlayerManager开始处理交易:', {
      clientId,
      tradeInfo
    });

    const player = this.players.get(clientId);
    console.log('获取到的玩家信息:', {
      hasPlayer: !!player,
      cash: player?.cash,
      positions: player?.positions
    });

    const { stockCode, action, quantity, currentPrice } = tradeInfo;
    const position = player.positions.find(p => p.code === stockCode);
    
    console.log('交易前的持仓信息:', {
      stockCode,
      currentPosition: position
    });

    if (action === 'buy') {
      // 检查资金是否足够
      const cost = currentPrice * quantity;
      console.log('买入前检查:', {
        cost,
        playerCash: player.cash,
        sufficient: player.cash >= cost
      });

      if (player.cash < cost) {
        throw new Error('资金不足');
      }

      // 更新现金和持仓
      player.cash -= cost;
      position.quantity += quantity;
      position.averagePrice = position.quantity === 0 ? 
        currentPrice : 
        ((position.averagePrice * (position.quantity - quantity) + cost) / position.quantity);

      console.log('买入后的状态:', {
        newCash: player.cash,
        newQuantity: position.quantity,
        newAveragePrice: position.averagePrice
      });
    } else if (action === 'sell') {
      // 检查持仓是否足够
      if (position.quantity < quantity) {
        throw new Error('持仓不足');
      }

      // 更新现金和持仓
      const income = currentPrice * quantity;
      player.cash += income;
      position.quantity -= quantity;
      // 卖出时不更新均价

    } else {
      throw new Error('无效的交易类型');
    }

    // 保存更新后的玩家状态
    this.players.set(clientId, player);
    console.log('交易完成后的玩家状态:', {
      cash: player.cash,
      positions: player.positions
    });

    return {
      newCash: player.cash,
      newPosition: position
    };
  }

  // 修改：广播清算信息
  broadcastSettlement(ws, clientId) {
    const info = this.getSettlementInfo(clientId);
    if (!info) return;

    const gameValue = info.cash + info.positionValue;  // 游戏总价值

    ws.send(JSON.stringify({
      type: 'settlement',
      payload: {
        message: `游戏结束清算结果：\n` +
                `持仓市值：¥${info.positionValue}\n` +
                `剩余资金：¥${info.cash}\n` +
                `游戏总价值：¥${gameValue}\n` +
                `系统发放新门票：¥${config.entryFee}`,  // 显示新门票
        details: {
          ...info,
          gameValue,
          newEntryFee: config.entryFee
        }
      }
    }));
  }

  // 修改：获取玩家清算信息
  getSettlementInfo(clientId) {
    const player = this.players.get(clientId);
    const user = this.userInfo.get(clientId);
    
    if (!player || !user || !this.gameManager) return null;

    let positionValue = 0;
    const positions = player.positions.map(position => {
      const currentPrice = this.gameManager.stockPrices.get(position.code)?.price || 0;
      const value = currentPrice * position.quantity;
      positionValue += value;
      
      return {
        ...position,
        currentPrice,
        value
      };
    });

    const gameValue = player.cash + positionValue;  // 游戏总价值

    return {
      nickname: user.nickname,
      cash: player.cash,
      positions,
      positionValue,
      gameValue,
      beforeTotalAsset: user.totalAsset,
      afterTotalAsset: user.totalAsset + gameValue + config.entryFee  // 加上游戏价值和新门票
    };
  }

  // 修改：设置 gameManager 的方法
  setGameManager(manager) {
    this.gameManager = manager;  // 使用实例属性
    console.log('PlayerManager: gameManager 已设置');
  }

  // 修改：设置玩家信息
  setPlayerInfo(clientId, userInfo) {
    this.userInfo.set(clientId, userInfo);
    this.players.set(clientId, {
      inGame: false,
      cash: 0,
      positions: [],
      nickname: userInfo.nickname
    });
  }
}

module.exports = new PlayerManager(); 