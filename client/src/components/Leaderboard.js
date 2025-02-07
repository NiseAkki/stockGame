import React from 'react';
import { LeaderboardCard } from './StyledComponents';

const Leaderboard = ({ gameState }) => {
  // 直接使用服务器计算好的排行榜数据
  const leaderboard = gameState.leaderboard || [];

  return (
    <LeaderboardCard>
      <h2>🏆 排行榜</h2>
      <div className="leaderboard-list">
        {leaderboard.length > 0 ? (
          leaderboard.map((player, index) => (
            <div key={player.nickname} className="leader-item">
              <div className="rank">{index + 1}</div>
              <div className="player-info">
                <div className="nickname">
                  {player.nickname}
                  {player.clientId === gameState.playerInfo?.clientId && ' (你)'}
                </div>
                <div className="total-value">
                  ¥{player.totalValue.toFixed(2)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}>
            暂无玩家参与
          </div>
        )}
      </div>
    </LeaderboardCard>
  );
};

export default Leaderboard; 