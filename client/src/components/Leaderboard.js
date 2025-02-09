import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const LeaderboardContainer = styled(motion.div)`
  background: linear-gradient(135deg, #FFE4E1, #FFF0F5);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(255, 182, 193, 0.2);
  border: 3px solid #FFB6C1;
  min-width: 300px;
  max-width: 400px;

  h2 {
    color: #FF69B4;
    text-align: center;
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(255, 105, 180, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
`;

const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const LeaderboardItem = styled(motion.div)`
  background: white;
  padding: 1rem;
  border-radius: 12px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 10px rgba(255, 182, 193, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(255, 182, 193, 0.2);
  }

  .rank {
    width: 30px;
    height: 30px;
    background: ${props => {
      if (props.$rank === 1) return 'linear-gradient(135deg, #FFD700, #FFA500)';
      if (props.$rank === 2) return 'linear-gradient(135deg, #C0C0C0, #A9A9A9)';
      if (props.$rank === 3) return 'linear-gradient(135deg, #CD7F32, #8B4513)';
      return '#f0f0f0';
    }};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.$rank <= 3 ? 'white' : '#666'};
    font-weight: bold;
    font-size: 0.9rem;
    box-shadow: ${props => props.$rank <= 3 ? '0 4px 8px rgba(0,0,0,0.1)' : 'none'};
  }

  .nickname {
    color: #444;
    font-weight: 500;
    font-size: 1rem;
  }

  .total-value {
    color: #FF69B4;
    font-weight: bold;
    font-size: 1.1rem;
  }
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: #999;
  padding: 2rem;
  font-style: italic;
`;

const Leaderboard = ({ gameState }) => {
  // 添加调试日志
  React.useEffect(() => {
    console.log('Leaderboard 组件收到的数据:', {
      leaderboard: gameState.leaderboard,
      status: gameState.status,
      playerInfo: gameState.playerInfo
    });
  }, [gameState]);

  const leaderboard = gameState?.leaderboard || [];

  return (
    <LeaderboardContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2>
        🏆 排行榜
      </h2>
      <LeaderboardList>
        {leaderboard.length > 0 ? (
          leaderboard.map((player, index) => (
            <LeaderboardItem
              key={player.clientId}
              $rank={index + 1}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="rank">{index + 1}</div>
              <div className="nickname">{player.nickname}</div>
              <div className="total-value">
                ¥{typeof player.totalValue === 'number' 
                    ? player.totalValue.toFixed(2) 
                    : Number(player.totalValue || 0).toFixed(2)}
              </div>
            </LeaderboardItem>
          ))
        ) : (
          <EmptyMessage>暂无玩家参与...</EmptyMessage>
        )}
      </LeaderboardList>
    </LeaderboardContainer>
  );
};

export default Leaderboard; 