import styled from 'styled-components';

// 主题色彩
export const theme = {
  primary: '#FF6B6B',     // 活力红
  secondary: '#4ECDC4',   // 清新蓝绿
  accent: '#FFE66D',      // 明亮黄
  background: '#F7F7F7',  // 浅灰背景
  text: '#2C3E50',        // 深色文字
  success: '#6BD968',     // 成功绿
  danger: '#FF7675',      // 警告红
};

// 卡通风格按钮
export const Button = styled.button`
  padding: 12px 24px;
  border-radius: 25px;
  border: none;
  background: ${props => props.variant === 'primary' ? props.theme.primary : props.theme.secondary};
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 0 ${props => props.variant === 'primary' ? '#E64C4C' : '#3DBDB5'};
  transition: all 0.2s;

  &:hover {
    transform: translateY(2px);
    box-shadow: 0 2px 0 ${props => props.variant === 'primary' ? '#E64C4C' : '#3DBDB5'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// 游戏容器
export const GameContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: ${props => props.theme.background};
  min-height: 100vh;
`;

// 信息卡片
export const Card = styled.div`
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

// 股票列表容器
export const StockGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
`;

// 股票卡片
export const StockCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 15px;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .stock-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      font-size: 20px;
      color: ${props => props.theme.text};
    }
  }

  .stock-price {
    font-size: 24px;
    font-weight: bold;
    color: ${props => props.priceChange >= 0 ? props.theme.success : props.theme.danger};
    
    .price-change {
      font-size: 16px;
      margin-left: 8px;
    }
  }

  .stock-position {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: ${props => props.theme.background};
    border-radius: 10px;
    
    .avg-price {
      color: ${props => props.theme.secondary};
    }
  }

  .trade-buttons {
    display: flex;
    gap: 10px;
    
    button {
      flex: 1;
    }
  }
`; 