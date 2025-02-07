import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  GameLayout,
  Card, 
  StockGrid, 
  StockCard, 
  Button 
} from './StyledComponents';
import gameService from '../services/gameService';
import config from '../config';
import Leaderboard from './Leaderboard';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .user-info {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .nickname {
    font-size: 24px;
    font-weight: bold;
  }

  .asset {
    font-size: 20px;
    color: ${props => props.theme.primary};
  }

  .cash {
    font-size: 20px;
    color: ${props => props.theme.primary};
  }
`;

const GameStatus = styled(Card)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => props.theme.accent};
  
  .round-info {
    font-size: 18px;
    font-weight: bold;
  }

  .timer {
    font-size: 24px;
    font-weight: bold;
  }
`;

// 添加对局间隔计时样式
const MatchInterval = styled(GameStatus)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  padding: 40px;
  background: ${props => props.theme.accent};
  
  .timer {
    font-size: 48px;
    font-weight: bold;
  }
  
  .message {
    font-size: 24px;
    text-align: center;
    margin-bottom: 20px;
  }
`;

// 添加对局结束显示组件
const GameEndDisplay = styled(Card)`
  text-align: center;
  padding: 40px;
  background: ${props => props.theme.accent};
  border: 3px solid ${props => props.theme.primary};
  margin: 20px 0;
  
  .title {
    font-size: 28px;
    font-weight: bold;
    color: ${props => props.theme.text};
    margin-bottom: 20px;
  }
  
  .timer {
    font-size: 36px;
    font-weight: bold;
    color: ${props => props.theme.primary};
    margin: 20px 0;
  }
  
  .message {
    font-size: 18px;
    color: ${props => props.theme.text};
    margin-bottom: 15px;
  }
`;

const GameInterface = ({ user }) => {
  const [gameState, setGameState] = useState({
    status: 'waiting',
    currentRound: 0,
    nextRoundTime: null,
    stocks: [],
    playerInfo: {
      nickname: user?.nickname || '',
      totalAsset: Number(user?.totalAsset) || 10000,
      cash: Number(user?.cash) || 0,
      inGame: false
    }
  });

  const [isConnected, setIsConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      console.error('用户信息不存在');
      return;
    }

    // 设置回调函数
    gameService.setCallbacks({
      onGameStateUpdate: handleGameStateUpdate,
      onStockUpdate: handleStockUpdate,
      onTradeResult: handleTradeResult,
      onError: (error) => {
        console.error('游戏错误:', error);
        setError(error);
        setIsConnected(false);
      }
    });

    const initGame = async () => {
      try {
        console.log('开始初始化游戏:', user);
        await gameService.connect(user);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('游戏初始化失败:', err);
        setError(err.message);
        setIsConnected(false);
      }
    };

    initGame();

    return () => {
      console.log('组件卸载，断开连接');
      gameService.disconnect();
      setIsConnected(false);
    };
  }, [user]);

  // 修改倒计时逻辑
  useEffect(() => {
    let timer;
    
    if (gameState.nextRoundTime) {
      const updateTimer = () => {
        const now = Date.now();
        const next = new Date(gameState.nextRoundTime).getTime();
        const remaining = Math.max(0, Math.floor((next - now) / 1000));
        
        setTimeLeft(remaining);

        // 如果倒计时结束且状态是 finished
        if (remaining === 0 && gameState.status === 'finished') {
          clearInterval(timer);
        }
      };

      updateTimer(); // 立即执行一次
      timer = setInterval(updateTimer, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [gameState.nextRoundTime, gameState.status]);

  // 修改游戏状态更新处理函数
  const handleGameStateUpdate = (newState) => {
    console.log('收到游戏状态更新:', newState);
    
    if (!newState) return;

    setGameState(prev => {
      // 确保保留现有的 playerInfo
      const updatedState = {
        ...prev,
        status: newState.status,
        currentRound: newState.currentRound,
        nextRoundTime: newState.nextRoundTime,
        stocks: Array.isArray(newState.stocks) ? newState.stocks.map(stock => ({
          ...stock,
          price: Number(stock.price),
          priceChange: Number(stock.priceChange),
          position: Number(stock.position) || 0,
          averagePrice: Number(stock.averagePrice) || 0
        })) : prev.stocks,
        playerInfo: {
          ...prev.playerInfo, // 保留现有的 playerInfo
          ...(newState.playerInfo || {}), // 合并新的 playerInfo
          nickname: newState.playerInfo?.nickname || prev.playerInfo.nickname, // 确保保留昵称
          totalAsset: Number(newState.playerInfo?.totalAsset) || prev.playerInfo.totalAsset,
          cash: Number(newState.playerInfo?.cash) || 0,
          inGame: Boolean(newState.playerInfo?.inGame)
        }
      };

      console.log('更新后的游戏状态:', updatedState);
      return updatedState;
    });
  };

  const handleStockUpdate = (stocks) => {
    console.log('收到股票更新:', stocks);
    setGameState(prev => {
      const newState = {
        ...prev,
        stocks: stocks.map(stock => ({
          ...stock,
          price: Number(stock.price),
          priceChange: Number(stock.priceChange)
        }))
      };
      console.log('更新后的股票状态:', newState);
      return newState;
    });
    setTimeLeft(30);  // 重置倒计时
  };

  const handleTradeResult = (result) => {
    if (result.success) {
      setGameState(prev => ({
        ...prev,
        playerInfo: {
          ...prev.playerInfo,
          cash: result.newCash,
          positions: result.newPositions
        }
      }));
    } else {
      alert(result.message);
    }
  };

  const handleTrade = (stockCode, action) => {
    if (!isConnected) {
      alert('正在连接服务器，请稍后再试');
      return;
    }
    gameService.trade(stockCode, action, 1);
  };

  const handleJoinGame = () => {
    if (!isConnected) {
      alert('正在连接服务器，请稍后再试');
      return;
    }

    if (Number(gameState.playerInfo.totalAsset) < config.entryFee) {
      alert(`资产不足，需要至少 ¥${config.entryFee} 才能参加游戏`);
      return;
    }

    console.log('尝试加入游戏:', {
      isConnected,
      totalAsset: gameState.playerInfo.totalAsset,
      entryFee: config.entryFee
    });

    gameService.joinGame();
  };

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px', color: 'red' }}>
        连接错误: {error}
        <br />
        <button onClick={() => window.location.reload()}>
          刷新页面重试
        </button>
      </div>
    );
  }

  return (
    <GameLayout>
      <div className="main-content">
        <Header>
          <div className="user-info">
            <span className="nickname">{gameState.playerInfo.nickname}</span>
            <span className="asset">
              总资产: ¥{(Number(gameState.playerInfo.totalAsset) || 0).toFixed(2)}
            </span>
            <span className="cash">
              游戏资金: ¥{(Number(gameState.playerInfo.cash) || 0).toFixed(2)}
            </span>
          </div>
        </Header>

        <GameStatus>
          {!gameState.playerInfo.inGame ? (
            <Button 
              variant="primary" 
              onClick={handleJoinGame}
              disabled={!isConnected || gameState.status === 'finished'}
            >
              进入游戏 (¥{config.entryFee})
            </Button>
          ) : (
            <>
              <div className="round-info">
                {gameState.status === 'running' ? (
                  `第 ${gameState.currentRound} 轮`
                ) : gameState.status === 'finished' ? (
                  '游戏已结束'
                ) : (
                  '等待游戏开始'
                )}
              </div>
              {gameState.status === 'running' && (
                <div className="timer">{timeLeft}s</div>
              )}
            </>
          )}
        </GameStatus>

        {gameState.status === 'finished' ? (
          <GameEndDisplay>
            <div className="title">🎮 本局游戏结束</div>
            <div className="message">
              感谢参与！请等待下一局游戏开始
            </div>
            <div className="timer">
              下一局开始倒计时：{timeLeft}s
            </div>
          </GameEndDisplay>
        ) : (
          <StockGrid>
            {gameState.stocks.map(stock => (
              <StockCard 
                key={stock.code} 
                $priceChange={stock.priceChange}
              >
                <div className="stock-header">
                  <h3>{stock.name}</h3>
                  <div className="stock-price">
                    ¥{stock.price}
                    <span className="price-change">
                      ({stock.priceChange > 0 ? '+' : ''}{stock.priceChange}%)
                    </span>
                  </div>
                </div>
                <div className="stock-position">
                  持仓：{stock.position || 0} 股
                  {stock.position > 0 && (
                    <span className="avg-price">
                      均价：¥{stock.averagePrice}
                    </span>
                  )}
                </div>
                <div className="trade-buttons">
                  <Button 
                    variant="primary" 
                    onClick={() => handleTrade(stock.code, 'buy')}
                    disabled={gameState.status !== 'running' || gameState.playerInfo.cash < stock.price}
                  >
                    买入1股
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => handleTrade(stock.code, 'sell')}
                    disabled={gameState.status !== 'running' || !stock.position}
                  >
                    卖出1股
                  </Button>
                </div>
              </StockCard>
            ))}
          </StockGrid>
        )}
      </div>

      <Leaderboard gameState={gameState} />
    </GameLayout>
  );
};

export default GameInterface; 