import styled from 'styled-components';

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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
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
      color: ${props => props.priceChange >= 0 ? '#4caf50' : '#f44336'};
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