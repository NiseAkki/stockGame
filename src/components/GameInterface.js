import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  GameContainer, 
  Card, 
  StockGrid, 
  StockCard, 
  Button 
} from './StyledComponents';
import TradeModal from './TradeModal';
import gameService from '../services/gameService';

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

const GameInterface = () => {
  const [gameState, setGameState] = useState({
    status: 'waiting',
    currentRound: 0,
    nextRoundTime: null,
    stocks: [
      {
        code: 'AAPL',
        name: '苹果',
        price: 180.5,
        priceChange: 2.3,
        position: 0,
        averagePrice: 0
      },
      {
        code: 'GOOGL',
        name: '谷歌',
        price: 2750.8,
        priceChange: -1.2,
        position: 0,
        averagePrice: 0
      },
      {
        code: 'MSFT',
        name: '微软',
        price: 338.5,
        priceChange: 0.8,
        position: 0,
        averagePrice: 0
      }
    ],
    playerInfo: {
      nickname: '测试玩家',
      totalAsset: 10000,  // 设置为等同于入场费的金额
      cash: 10000,       // 同样设置为入场费金额
      positions: []
    }
  });

  const [tradeModal, setTradeModal] = useState({
    visible: false,
    stock: null,
    action: null
  });

  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    gameService.connect();
    gameService.setCallbacks({
      onGameStateUpdate: handleGameStateUpdate,
      onStockUpdate: handleStockUpdate,
      onTradeResult: handleTradeResult
    });
  }, []);

  const handleGameStateUpdate = (newState) => {
    setGameState(newState);
  };

  const handleStockUpdate = (stockUpdates) => {
    setGameState(prev => ({
      ...prev,
      stocks: prev.stocks.map(stock => {
        const update = stockUpdates.find(u => u.code === stock.code);
        if (update) {
          return {
            ...stock,
            price: update.price,
            priceChange: update.priceChange
          };
        }
        return stock;
      })
    }));
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
    const stock = gameState.stocks.find(s => s.code === stockCode);
    setTradeModal({
      visible: true,
      stock,
      action
    });
  };

  const executeTrade = (stockCode, action, quantity) => {
    gameService.trade(stockCode, action, quantity);
  };

  const handleJoinGame = () => {
    gameService.joinGame();
  };

  // 倒计时逻辑
  useEffect(() => {
    if (gameState.status === 'running') {
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.status]);

  return (
    <GameContainer>
      <Header>
        <div className="user-info">
          <span className="nickname">{gameState.playerInfo.nickname}</span>
          <span className="asset">总资产: ¥{gameState.playerInfo.totalAsset}</span>
          <span className="cash">可用资金: ¥{gameState.playerInfo.cash}</span>
        </div>
        {gameState.status === 'waiting' && (
          <Button variant="primary" onClick={handleJoinGame}>
            加入游戏 (¥{10000})
          </Button>
        )}
      </Header>

      <GameStatus>
        <div className="round-info">
          第 {gameState.currentRound} / 20 回合
        </div>
        <div className="timer">
          {timeLeft}s
        </div>
      </GameStatus>

      <StockGrid>
        {gameState.stocks.map(stock => (
          <StockCard key={stock.code} priceChange={stock.priceChange}>
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
                disabled={gameState.status !== 'running'}
              >
                买入
              </Button>
              <Button 
                variant="secondary"
                onClick={() => handleTrade(stock.code, 'sell')}
                disabled={gameState.status !== 'running' || !stock.position}
              >
                卖出
              </Button>
            </div>
          </StockCard>
        ))}
      </StockGrid>

      {tradeModal.visible && (
        <TradeModal
          stock={tradeModal.stock}
          action={tradeModal.action}
          onClose={() => setTradeModal({ visible: false, stock: null, action: null })}
          onTrade={executeTrade}
          cash={gameState.playerInfo.cash}
        />
      )}
    </GameContainer>
  );
};

export default GameInterface; 