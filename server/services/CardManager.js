const config = require('../../config');

class CardManager {
  constructor() {
    this.playerCards = new Map();  // 玩家持有的卡片
    this.activeEffects = new Map(); // 当前生效的卡片效果
    this.gameManager = null;  // 添加对 GameManager 的引用
  }

  // 初始化玩家的卡片
  initializePlayer(clientId) {
    // 只在玩家不存在时初始化，避免清空现有卡片
    if (!this.playerCards.has(clientId)) {
      this.playerCards.set(clientId, []);
    }
  }

  // 分发卡片
  distributeCards() {
    const { cardsPerRound, maxCards } = config.cards.distribution;
    const cardTypes = Object.values(config.cards.types);

    this.playerCards.forEach((cards, clientId) => {
      // 检查玩家卡片数量是否达到上限
      if (cards.length >= maxCards) {
        console.log(`玩家 ${clientId} 卡片已达上限 (${maxCards})`);
        return;
      }

      // 随机选择一张卡片
      const randomCard = cardTypes[Math.floor(Math.random() * cardTypes.length)];
      const newCard = {
        ...randomCard,
        instanceId: `${randomCard.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // 添加到玩家卡片列表末尾
      cards.push(newCard);
      /*console.log(`给玩家 ${clientId} 发放卡片:`, newCard.name);*/

      // 通知玩家
      if (this.notifyPlayer) {
        this.notifyPlayer(clientId, {
          type: 'cards',
          cards: cards
        });
      }
    });
  }

  // 使用卡片
  useCard(clientId, cardInstanceId, targetId) {
    console.log('收到使用卡片请求:', { clientId, cardInstanceId, targetId }); // 新增日志

    const playerCards = this.playerCards.get(clientId);
    if (!playerCards) {
      console.error('找不到玩家卡片:', clientId);
      return false;
    }

    const cardIndex = playerCards.findIndex(card => card.instanceId === cardInstanceId);
    if (cardIndex === -1) {
      console.error('找不到指定卡片:', cardInstanceId);
      return false;
    }

    const card = playerCards[cardIndex];
    console.log('准备使用卡片:', card); // 新增日志

    let success = false;
    let affectedStock = null;
    let moneyEffect = null;

    switch (card.id) {
      case 'SMALL_MONEY':
      case 'BIG_MONEY':
        console.log('处理金钱卡片...'); // 新增日志
        
        // 获取玩家
        const player = this.playerManager?.players.get(clientId);
        if (!player) {
          console.error(`找不到玩家数据: ${clientId}`);
          return false;
        }

        // 确定增加的金额
        const amount = card.id === 'SMALL_MONEY' ? 50 : 500;
        const oldCash = player.cash;  // 记录旧的现金数额
        
        // 增加玩家现金
        player.cash = Number(player.cash || 0) + amount;
        
        console.log('金钱更新:', {
          玩家: clientId,
          卡片: card.name,
          原有现金: oldCash,
          增加金额: amount,
          现有现金: player.cash
        });
        
        moneyEffect = {
          clientId,
          amount
        };
        
        success = true;
        break;

      case 'FORCE_RISE':
        const stockCodeRise = targetId;
        if (!this.gameManager.stockPrices.has(stockCodeRise)) {
          console.error(`无效的股票代码: ${stockCodeRise}`);
          return false;
        }
        
        // 获取当前概率并增加0.01
        const currentProbRise = this.gameManager.stockProbabilities.get(stockCodeRise) || 0.5;
        // 如果当前是冻结状态，则不能修改
        if (currentProbRise < 0) {
          console.log(`股票 ${stockCodeRise} 处于冻结状态，无法使用涨跌卡`);
          return false;
        }
        // 增加1%的上涨概率
        this.gameManager.stockProbabilities.set(stockCodeRise, currentProbRise + 0.01);
        
        console.log(`玩家 ${clientId} 对股票 ${stockCodeRise} 使用了涨涨涨，概率从 ${currentProbRise} 调整为 ${currentProbRise + 0.01}`);
        
        this.activeEffects.set(stockCodeRise, {
          type: card.id,
          effect: 'rise',
          direction: 'rise',
          duration: card.duration,
          timing: card.timing,
          sourceClientId: clientId,
          priority: 100
        });
        
        affectedStock = {
          code: stockCodeRise,
          effect: 'rise'
        };
        
        success = true;
        break;

      case 'FORCE_FALL':
        const stockCodeFall = targetId;
        if (!this.gameManager.stockPrices.has(stockCodeFall)) {
          console.error(`无效的股票代码: ${stockCodeFall}`);
          return false;
        }
        
        // 获取当前概率并减少0.01
        const currentProbFall = this.gameManager.stockProbabilities.get(stockCodeFall) || 0.5;
        // 如果当前是冻结状态，则不能修改
        if (currentProbFall < 0) {
          console.log(`股票 ${stockCodeFall} 处于冻结状态，无法使用涨跌卡`);
          return false;
        }
        // 减少1%的上涨概率（相当于增加下跌概率）
        this.gameManager.stockProbabilities.set(stockCodeFall, currentProbFall - 0.01);
        
        console.log(`玩家 ${clientId} 对股票 ${stockCodeFall} 使用了跌跌跌，概率从 ${currentProbFall} 调整为 ${currentProbFall - 0.01}`);
        
        this.activeEffects.set(stockCodeFall, {
          type: card.id,
          effect: 'fall',
          direction: 'fall',
          duration: card.duration,
          timing: card.timing,
          sourceClientId: clientId,
          priority: 100
        });
        
        affectedStock = {
          code: stockCodeFall,
          effect: 'fall'
        };
        
        success = true;
        break;

      case 'PRICE_FREEZE':
        const stockCode = targetId;
        
        // 验证股票代码是否有效
        const stockExists = config.stockList.some(stock => stock.code === stockCode);
        if (!stockExists) {
          console.error(`无效的股票代码: ${stockCode}`);
          return false;
        }

        const freezeProb = -99.5;
        
        // 使用 GameManager 的概率管理
        this.gameManager.stockProbabilities.set(stockCode, freezeProb);
        console.log(`玩家 ${clientId} 对股票 ${stockCode} 使用了车门焊死，概率从 0.5 调整为 ${freezeProb}`);

        // 记录冻结效果
        this.activeEffects.set(stockCode, {
          type: card.id,
          effect: 'freeze',
          duration: card.duration,
          timing: card.timing,
          sourceClientId: clientId,
          priority: 1000
        });
        
        // 保存受影响的股票信息
        affectedStock = {
          code: stockCode,
          effect: 'freeze'
        };

        success = true;
        break;

      // ... 其他卡片处理逻辑 ...
    }

    if (success) {
      console.log('卡片使用成功，准备发送通知'); // 新增日志
      
      // 移除使用的卡片
      playerCards.splice(cardIndex, 1);
      
      // 通知玩家卡片更新
      if (this.notifyPlayer) {
        this.notifyPlayer(clientId, {
          type: 'cards',
          cards: playerCards
        });
      } else {
        console.error('notifyPlayer 回调未设置！'); // 新增日志
      }

      // 处理金钱效果通知
      if (moneyEffect) {
        console.log('发送金钱效果通知'); // 新增日志
        if (this.notifyPlayer) {
          this.notifyPlayer(moneyEffect.clientId, {
            type: 'notification',
            payload: {
              type: 'success',
              title: '获得金钱',
              message: `恭喜获得 ${moneyEffect.amount} 元！`
            }
          });

          // 立即更新游戏状态
          if (this.gameManager) {
            console.log('触发游戏状态更新'); // 新增日志
            this.gameManager.notifyUpdate();
            
            // 立即广播新的游戏状态
            this.gameManager.broadcastGameState(
              this.gameManager.clients,
              this.playerManager
            );
          } else {
            console.error('gameManager 未设置！'); // 新增日志
          }
        }
      }

      // 处理股票效果通知（保持原有逻辑）
      if (affectedStock) {
        this.broadcastMessage({
          type: 'notification',
          payload: {
            type: 'warning',
            title: '股票状态变化',
            message: `${affectedStock.code} 的股价将在下一回合${
              affectedStock.effect === 'rise' ? '上涨' : 
              affectedStock.effect === 'fall' ? '下跌' : 
              '被冻结'
            }！`
          }
        });
      }
    }

    return success;
  }

  // 处理卡片效果
  processEffects(gameState) {
    this.activeEffects.forEach((effect, stockCode) => {
      switch (effect.type) {
        case 'FORCE_RISE':
        case 'FORCE_FALL':
          this.processStockPriceEffect(stockCode, effect, gameState);
          break;
      }

      // 减少持续时间
      effect.duration--;
      if (effect.duration <= 0) {
        this.activeEffects.delete(stockCode);
      }
    });
  }

  // 处理股票价格效果
  processStockPriceEffect(stockCode, effect, gameState) {
    // 检查是否被冻结
    const probability = this.gameManager.stockProbabilities.get(stockCode);
    if (probability < 0) {
      console.log(`股票 ${stockCode} 已被冻结，忽略所有价格变动效果`);
      return;
    }

    if (effect.timing !== 'next') return;

    // 在下一回合强制股票涨跌
    gameState.forcedChanges = gameState.forcedChanges || new Map();
    
    // 记录强制效果
    gameState.forcedChanges.set(stockCode, effect.direction);
    
    console.log('设置股票强制变动:', {
      回合: gameState.currentRound,
      股票代码: stockCode,
      变动方向: effect.direction === 'rise' ? '上涨' : '下跌',
      生效时机: '下一回合',
      当前所有效果: Array.from(gameState.forcedChanges.entries()).map(([code, dir]) => ({
        股票: code,
        方向: dir
      }))
    });
  }

  // 清理玩家的卡片 - 只在对局结束时调用
  clearPlayerCards(clientId) {
    this.playerCards.delete(clientId);
  }

  // 获取玩家的卡片 - 按获取顺序返回
  getPlayerCards(clientId) {
    return this.playerCards.get(clientId) || [];
  }

  // 清理所有效果
  clearAllEffects() {
    this.activeEffects.clear();
  }

  // 添加通知函数
  setNotifyCallback(callback) {
    this.notifyPlayer = callback;
  }

  // 添加 playerManager 引用
  setPlayerManager(manager) {
    if (!manager) {
      console.error('传入的 playerManager 为空');
      return;
    }
    console.log('设置 playerManager:', manager);
    this.playerManager = manager;
  }

  // 添加广播消息的方法
  broadcastMessage(message) {
    if (!this.playerManager) {
      console.error('playerManager 未初始化');
      return;
    }

    if (!this.notifyPlayer) {
      console.error('notifyPlayer 回调未设置');
      return;
    }

    try {
      // 获取所有玩家并发送消息
      const players = this.playerManager.players;
      if (!players) {
        console.error('players 不存在');
        return;
      }

      players.forEach((_, clientId) => {
        try {
          this.notifyPlayer(clientId, message);
        } catch (error) {
          console.error(`向玩家 ${clientId} 发送消息失败:`, error);
        }
      });
    } catch (error) {
      console.error('广播消息时出错:', error);
    }
  }

  setGameManager(manager) {
    this.gameManager = manager;
  }
}

module.exports = new CardManager(); 