import React from 'react';
import { LeaderboardCard } from './StyledComponents';

const Leaderboard = ({ gameState }) => {
  // 添加调试日志
  React.useEffect(() => {
    console.log('Leaderboard 组件收到的数据:', {
      leaderboard: gameState.leaderboard,
      status: gameState.status,
      playerInfo: gameState.playerInfo
    });
  }, [gameState]);

  const leaderboard = gameState.leaderboard || [];

  return (
    <LeaderboardCard>
      <h2>🏆 排行榜</h2>
      <div className="leaderboard-list">
        {leaderboard.length > 0 ? (
          leaderboard.map((player, index) => (
            <div key={`${player.clientId}-${index}`} className="leader-item">
              <div className="rank">{index + 1}</div>
              <div className="player-info">
                <div className="nickname">
                  {player.nickname}
                  {player.clientId === gameState.playerInfo?.clientId && ' (你)'}
                </div>
                <div className="total-value">
                  <span>总资产: ¥{player.totalValue.toFixed(2)}</span>
                  <span style={{ marginLeft: '10px' }}>现金: ¥{player.cash.toFixed(2)}</span>
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