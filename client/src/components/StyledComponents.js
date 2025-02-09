import styled from 'styled-components';

// 主题色彩
export const theme = {
  primary: '#FF6B6B',     // 活力红
  secondary: '#4ECDC4',   // 清新蓝绿
  accent: '#FFE66D',      // 明亮黄
  background: '#F7F7F7',  // 浅灰背景
  text: '#2C3E50',        // 深色文字
  rise: '#FF4444',        // 上涨红
  fall: '#00AA00',        // 下跌绿
};

export const GameContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

export const Card = styled.div`
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

export const StockGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
  margin: 20px 0;
`;

export const StockCard = styled(Card)`
  .stock-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    h3 {
      margin: 0;
      font-size: 20px;
    }

    .stock-price {
      font-size: 18px;
      font-weight: bold;
    }

    .price-change {
      font-size: 14px;
      color: ${props => props.$priceChange >= 0 ? '#FF4444' : '#00AA00'};
      margin-left: 5px;
    }
  }

  .stock-position {
    margin-bottom: 15px;
    color: #666;

    .avg-price {
      margin-left: 10px;
      color: #999;
    }
  }

  .trade-buttons {
    display: flex;
    gap: 10px;
  }
`;

export const Button = styled.button`
  padding: 8px 16px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;

  ${props => props.variant === 'primary' && `
    background: #2196f3;
    color: white;
    &:hover {
      background: #1976d2;
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: #f5f5f5;
    color: #333;
    &:hover {
      background: #e0e0e0;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const GameLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  max-width: 1500px;
  margin: 0 auto;
  padding: 20px;

  .main-content {
    min-width: 0;
    padding-bottom: 40px;
  }
`;

export const LeaderboardCard = styled(Card)`
  position: sticky;
  top: 20px;
  height: fit-content;
  background: #FFF9C4;  // 淡黄色背景
  border: 3px solid #FFB74D;  // 橙色边框
  border-radius: 15px;
  box-shadow: 0 4px 0 #FFB74D;

  h2 {
    color: #FF6B6B;
    text-align: center;
    margin-bottom: 20px;
    font-size: 24px;
    text-shadow: 1px 1px 0 #FFB74D;
  }

  .leaderboard-list {
    .leader-item {
      display: flex;
      align-items: center;
      padding: 10px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 10px;
      transition: transform 0.2s;

      &:hover {
        transform: translateX(5px);
      }

      .rank {
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${props => {
          if (props.$rank === 1) return '#FFD700';  // 金
          if (props.$rank === 2) return '#C0C0C0';  // 银
          if (props.$rank === 3) return '#CD7F32';  // 铜
          return '#E0E0E0';
        }};
        border-radius: 50%;
        margin-right: 10px;
        font-weight: bold;
        color: white;
        font-size: 14px;
      }

      .player-info {
        flex: 1;

        .nickname {
          font-weight: bold;
          color: #2C3E50;
        }

        .total-value {
          font-size: 14px;
          color: #FF6B6B;
        }
      }
    }
  }
`;

export const MatchInterval = styled(Card)`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 20px 40px;
  background: ${props => props.theme.accent};
  border: 3px solid ${props => props.theme.primary};
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  text-align: center;
  
  .message {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
    color: ${props => props.theme.text};
  }
  
  .timer {
    font-size: 24px;
    font-weight: bold;
    color: ${props => props.theme.primary};
  }
`;

// 添加或更新通用按钮样式
export const CommonButton = styled.button`
  padding: 0.8rem 1.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 25px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  background: ${props => {
    if (props.disabled) return '#cccccc';
    if (props.variant === 'primary') return 'linear-gradient(45deg, #FF69B4, #FF1493)';
    if (props.variant === 'secondary') return 'linear-gradient(45deg, #FFB6C1, #FF69B4)';
    return 'linear-gradient(45deg, #FF69B4, #FF1493)';
  }};
  color: white;
  box-shadow: ${props => props.disabled ? 'none' : '0 4px 15px rgba(255,105,180,0.3)'};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;

  &:before {
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

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255,105,180,0.4);
    
    &:before {
      left: 100%;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 10px rgba(255,105,180,0.3);
  }
`; 