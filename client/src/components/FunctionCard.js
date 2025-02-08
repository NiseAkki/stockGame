import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import gameService from '../services/gameService';
import { motion, AnimatePresence } from 'framer-motion';
import PositionInfoModal from './PositionInfoModal';

// 更新卡片按钮样式
const CardButton = styled(motion.button)`
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 0.8rem 1.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: 0.5s;
  }

  &:hover:not(:disabled)::before {
    left: 100%;
  }

  &:disabled {
    background: linear-gradient(135deg, #ccc, #999);
    cursor: not-allowed;
    box-shadow: none;
  }
`;

// 更新卡片容器样式
const CardContainer = styled(motion.div)`
  background: linear-gradient(135deg, #fff, #f5f5f5);
  padding: 2rem;
  border-radius: 20px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  h2 {
    color: #FF6B6B;
    text-align: center;
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

// 更新卡片网格样式
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
`;

// 更新单个卡片样式
const Card = styled(motion.div)`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: linear-gradient(90deg, #FF6B6B, #FF8E53);
  }

  h3 {
    color: #FF6B6B;
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  p {
    color: #666;
    font-size: 1rem;
    line-height: 1.5;
  }

  .card-type {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 1.5rem;
  }
`;

// 更新目标选择器样式
const TargetSelector = styled(motion.div)`
  background: white;
  padding: 2rem;
  border-radius: 20px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  h2 {
    color: #FF6B6B;
    text-align: center;
    margin-bottom: 1.5rem;
  }
`;

const TargetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  margin: 1rem 0;
`;

const TargetItem = styled(motion.div)`
  padding: 1rem;
  border-radius: 12px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:hover {
    background: #fff;
    border-color: #FF6B6B;
  }

  &.selected {
    background: #FFE8E8;
    border-color: #FF6B6B;
  }
`;

// 添加卡片效果动画
const CardEffect = styled(motion.div)`
  position: fixed;
  pointer-events: none;
  z-index: 1100;
  font-size: 3rem;
`;

// 添加缺失的基础组件
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const CardDetail = styled(motion.div)`
  background: white;
  padding: 2rem;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  h2 {
    color: #FF6B6B;
    text-align: center;
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  p {
    color: #666;
    margin: 1rem 0;
    font-size: 1.1rem;
    line-height: 1.5;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;

  button {
    min-width: 120px;
  }
`;

// 添加动画变体
const effectVariants = {
  initial: { scale: 1, opacity: 1 },
  animate: { scale: 2, opacity: 0, transition: { duration: 0.5 } }
};

// 动画变体配置
const containerVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  })
};

// 功能卡数据
const cardTypes = {
  SHOW_POSITION: {
    id: 'SHOW_POSITION',
    name: '看看你的',
    target: 'player',
    duration: 1,
    effect: '选择一名排行榜上的玩家，立即显示玩家的持仓信息，持续到本回合结束。',
    timing: 'current'
  },
  FORCE_RISE: {
    id: 'FORCE_RISE',
    name: '涨涨涨',
    target: 'stock',
    duration: 1,
    effect: '选择一支股票，使其下回合必定上涨。',
    timing: 'next'
  }
};

// 添加新的提示组件样式
const Notification = styled(motion.div)`
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 10px;
  border-left: 4px solid ${props => props.type === 'success' ? '#4CAF50' : '#FF6B6B'};

  .icon {
    font-size: 1.5rem;
  }

  .content {
    .title {
      font-weight: bold;
      color: ${props => props.type === 'success' ? '#4CAF50' : '#FF6B6B'};
      margin-bottom: 5px;
    }
    .description {
      color: #666;
      font-size: 0.9rem;
    }
  }
`;

// 添加新卡片提示动画
const notificationVariants = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 }
};

// 修改股票选择器样式组件
const StockSelector = styled(motion.div)`
  background: white;
  padding: 2rem;
  border-radius: 20px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  h3 {
    color: #FF6B6B;
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }

  .stock-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    max-height: 400px;
    overflow-y: auto;
    padding: 1rem;
  }

  .stock-item {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    border: 2px solid transparent;

    &:hover {
      background: #fff;
      border-color: #FF6B6B;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(255, 107, 107, 0.2);
    }

    &.selected {
      background: #FFE8E8;
      border-color: #FF6B6B;
    }
  }

  .button-group {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
  }
`;

const FunctionCard = ({ onUseCard, disabled, gameState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [cards, setCards] = useState([]);  // 玩家持有的卡片
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [usedThisRound, setUsedThisRound] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [effectPosition, setEffectPosition] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [showStockSelector, setShowStockSelector] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);  // 新增：选中的股票
  const [positionInfo, setPositionInfo] = useState(null);

  // 在组件挂载时请求卡片数据
  useEffect(() => {
    gameService.requestCards();
  }, []);

  // 监听游戏状态变化，在新回合开始时重置使用状态
  useEffect(() => {
    if (gameState?.currentRound) {
      setUsedThisRound(false);
    }
  }, [gameState?.currentRound]);

  // 在组件挂载和游戏状态更新时获取 clientId
  useEffect(() => {
    if (gameState?.playerInfo?.clientId) {
      setClientId(gameState.playerInfo.clientId);
    }
  }, [gameState]);

  // 修改卡片更新回调
  useEffect(() => {
    const handleCardsUpdate = (newCards) => {
      const addedCards = newCards.filter(newCard => 
        !cards.some(card => card.instanceId === newCard.instanceId)
      );
      
      setCards(newCards);
      
      // 显示新卡片提示
      addedCards.forEach(card => {
        const notification = {
          id: Date.now() + Math.random(),
          type: 'success',
          title: '获得新卡片',
          description: `${card.name} - ${card.effect}`,
        };
        
        setNotifications(prev => [...prev, notification]);
        
        // 3秒后自动移除提示
        setTimeout(() => {
          setNotifications(prev => 
            prev.filter(n => n.id !== notification.id)
          );
        }, 3000);
      });
    };

    const handleCardUseResult = (result) => {
      if (result.success) {
        setUsedThisRound(true);
        // 可以显示成功提示
      } else {
        // 显示错误提示
      }
    };

    gameService.setCallbacks({
      onCardsUpdate: handleCardsUpdate,
      onCardUseResult: handleCardUseResult
    });

    return () => {
      gameService.setCallbacks({
        onCardsUpdate: null,
        onCardUseResult: null
      });
    };
  }, [cards]);

  useEffect(() => {
    const handleShowPosition = (data) => {
      if (data.type === 'showPosition' && data.payload.success) {
        setPositionInfo(data.payload.positionInfo);
      }
    };

    // 添加消息监听
    gameService.callbacks.onShowPosition = handleShowPosition;

    return () => {
      gameService.callbacks.onShowPosition = null;
    };
  }, []);

  // 修改卡片点击处理函数
  const handleCardClick = (card) => {
    // 如果是金钱卡片，直接使用
    if (card.id === 'SMALL_MONEY' || card.id === 'BIG_MONEY') {
      handleMoneyCard(card);
      return;
    }

    // 股票卡片直接显示股票选择器，不需要确认界面
    if (card.target === 'stock') {
      setSelectedCard(card);
      setShowStockSelector(true);
      return;
    }
  };

  // 金钱卡片的处理函数保持不变
  const handleMoneyCard = async (card) => {
    try {
      console.log('使用金钱卡片:', card.name);
      
      // 使用 gameService
      await gameService.useCard(card.instanceId, null);
      
      // 关闭所有弹窗
      setShowDetail(false);
      setIsOpen(false);
      
      // 使用现有的通知系统
      const notification = {
        id: Date.now() + Math.random(),
        type: 'success',
        title: '使用成功',
        description: `获得 ${card.id === 'SMALL_MONEY' ? '50' : '500'} 元`
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // 3秒后自动移除提示
      setTimeout(() => {
        setNotifications(prev => 
          prev.filter(n => n.id !== notification.id)
        );
      }, 3000);

    } catch (error) {
      console.error('使用金钱卡片失败:', error);
      
      // 错误通知也使用现有的通知系统
      const notification = {
        id: Date.now() + Math.random(),
        type: 'error',
        title: '使用失败',
        description: error.message
      };
      
      setNotifications(prev => [...prev, notification]);
    }
  };

  // 修改卡片渲染函数
  const renderCard = (card) => {
    const isMoneyCard = card.id === 'SMALL_MONEY' || card.id === 'BIG_MONEY';
    
    return (
      <Card
        key={card.instanceId}
        onClick={() => handleCardClick(card)}
        className={isMoneyCard ? 'money-card' : ''}
      >
        <CardHeader>
          <CardName>{card.name}</CardName>
          <CardType>{isMoneyCard ? '💰 金钱卡' : '📈 股票卡'}</CardType>
        </CardHeader>
        <CardEffect>{card.effect}</CardEffect>
      </Card>
    );
  };

  // 修改处理股票点击的函数
  const handleStockClick = (stock) => {
    setSelectedStock(stock);
  };

  // 添加确认选择的函数
  const handleConfirmStockSelect = async () => {
    try {
      if (!selectedCard || !selectedStock) return;
      
      console.log('使用卡片:', {
        card: selectedCard,
        targetStock: selectedStock.code
      });

      await gameService.useCard(selectedCard.instanceId, selectedStock.code);
      setShowStockSelector(false);
      setSelectedCard(null);
      setSelectedStock(null);
      setIsOpen(false);  // 关闭功能卡面板
    } catch (error) {
      console.error('使用卡片失败:', error);
    }
  };

  // 处理目标选择
  const handleTargetSelect = (target) => {
    setSelectedTarget(target);
  };

  // 确认使用卡片
  const handleConfirmUse = () => {
    if (!selectedTarget || usedThisRound) return;

    gameService.useCard(selectedCard.instanceId, selectedTarget.id);
    setShowTargetSelector(false);
    setIsOpen(false);
    setSelectedCard(null);
    setSelectedTarget(null);
  };

  // 处理卡片使用效果
  const handleCardUse = async (card, target) => {
    try {
      // 记录目标元素位置
      const targetElement = document.querySelector(`[data-id="${target.id}"]`);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setEffectPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }

      // 发送使用卡片请求
      await gameService.useCard(card.instanceId, target.id);
      
      // 显示成功消息
      setSuccess(`成功使用 ${card.name}`);
      setTimeout(() => setSuccess(''), 2000);
      
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  // 渲染目标选择器
  const renderTargetSelector = () => {
    const targets = selectedCard.target === 'player' 
      ? gameState.leaderboard
      : gameState.stocks;

    return (
      <Modal onClick={() => setShowTargetSelector(false)}>
        <TargetSelector onClick={e => e.stopPropagation()}>
          <h2>选择{selectedCard.target === 'player' ? '玩家' : '股票'}</h2>
          <TargetList>
            {targets.map(target => (
              <TargetItem
                key={target.id}
                className={selectedTarget?.id === target.id ? 'selected' : ''}
                onClick={() => handleTargetSelect(target)}
              >
                {selectedCard.target === 'player' 
                  ? target.nickname
                  : `${target.name} (${target.code})`
                }
              </TargetItem>
            ))}
          </TargetList>
          <ButtonGroup>
            <CardButton 
              onClick={handleConfirmUse}
              disabled={!selectedTarget}
            >
              确定
            </CardButton>
            <CardButton onClick={() => setShowTargetSelector(false)}>
              取消
            </CardButton>
          </ButtonGroup>
        </TargetSelector>
      </Modal>
    );
  };

  // 修改股票选择器渲染函数
  const renderStockSelector = () => {
    if (!showStockSelector) return null;

    return (
      <Modal onClick={() => setShowStockSelector(false)}>
        <StockSelector
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <h3>✨ 选择目标股票 ✨</h3>
          <div className="stock-list">
            {gameState.stocks.map(stock => (
              <motion.div
                key={stock.code}
                className={`stock-item ${selectedStock?.code === stock.code ? 'selected' : ''}`}
                onClick={() => handleStockClick(stock)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div>{stock.name}</div>
                <div style={{ color: '#666', marginTop: '0.5rem' }}>({stock.code})</div>
                <div style={{ 
                  color: stock.priceChange >= 0 ? '#4CAF50' : '#FF5252',
                  marginTop: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  ¥{stock.price} ({stock.priceChange >= 0 ? '+' : ''}{stock.priceChange}%)
                </div>
              </motion.div>
            ))}
          </div>
          <div className="button-group">
            <CardButton
              onClick={handleConfirmStockSelect}
              disabled={!selectedStock}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              确认使用
            </CardButton>
            <CardButton
              onClick={() => {
                setShowStockSelector(false);
                setSelectedStock(null);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              取消
            </CardButton>
          </div>
        </StockSelector>
      </Modal>
    );
  };

  return (
    <>
      <CardButton
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        disabled={disabled || usedThisRound}
      >
        功能卡
      </CardButton>

      <AnimatePresence>
        {isOpen && (
          <Modal onClick={() => setIsOpen(false)}>
            <CardContainer
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
            >
              <h2>✨ 功能卡仓库 ✨</h2>
              <CardGrid>
                {cards.map((card, i) => (
                  <Card
                    key={card.instanceId}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCardClick(card)}
                  >
                    <span className="card-type">
                      {card.target === 'player' ? '👥' : '📈'}
                    </span>
                    <h3>{card.name}</h3>
                    <p>{card.effect}</p>
                  </Card>
                ))}
              </CardGrid>
            </CardContainer>
          </Modal>
        )}

        {effectPosition && (
          <CardEffect
            variants={effectVariants}
            initial="initial"
            animate="animate"
            onAnimationComplete={() => setEffectPosition(null)}
            style={{
              left: effectPosition.x,
              top: effectPosition.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            ✨
          </CardEffect>
        )}
      </AnimatePresence>

      {showDetail && (
        <Modal onClick={() => setShowDetail(false)}>
          <CardDetail onClick={e => e.stopPropagation()}>
            <h2>{selectedCard.name}</h2>
            <p>作用对象：{selectedCard.target === 'player' ? '玩家' : '股票'}</p>
            <p>持续时间：{selectedCard.duration}回合</p>
            <p>效果：{selectedCard.effect}</p>
            <ButtonGroup>
              <CardButton onClick={() => handleMoneyCard(selectedCard)}>使用</CardButton>
              <CardButton onClick={() => setShowDetail(false)}>取消</CardButton>
            </ButtonGroup>
          </CardDetail>
        </Modal>
      )}

      {showTargetSelector && renderTargetSelector()}
      {renderStockSelector()}

      {/* 添加通知显示 */}
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <Notification
            key={notification.id}
            type={notification.type}
            variants={notificationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ top: `${20 + index * 80}px` }}
          >
            <div className="icon">
              {notification.type === 'success' ? '🎁' : '❌'}
            </div>
            <div className="content">
              <div className="title">{notification.title}</div>
              <div className="description">{notification.description}</div>
            </div>
          </Notification>
        ))}
      </AnimatePresence>

      {positionInfo && (
        <PositionInfoModal
          positionInfo={positionInfo}
          onClose={() => setPositionInfo(null)}
        />
      )}
    </>
  );
};

export default FunctionCard; 