import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from './StyledComponents';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  min-width: 300px;
  max-width: 500px;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
`;

const TradeInfo = styled.div`
  margin: 15px 0;
  
  .label {
    color: #666;
    margin-right: 10px;
  }
  
  .value {
    font-weight: bold;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const TradeModal = ({ stock, action, onClose, onTrade, cash }) => {
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const amount = Number(quantity);
    if (!amount || amount <= 0) {
      setError('请输入有效的数量');
      return;
    }

    const totalCost = stock.price * amount;
    if (action === 'buy' && totalCost > cash) {
      setError('资金不足');
      return;
    }

    onTrade(stock.code, action, amount);
    onClose();
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <h2>{action === 'buy' ? '买入' : '卖出'} {stock.name}</h2>
        
        <TradeInfo>
          <div>
            <span className="label">当前价格:</span>
            <span className="value">¥{stock.price}</span>
          </div>
          <div>
            <span className="label">可用资金:</span>
            <span className="value">¥{cash}</span>
          </div>
          {action === 'buy' && (
            <div>
              <span className="label">最大可买:</span>
              <span className="value">
                {Math.floor(cash / stock.price)} 股
              </span>
            </div>
          )}
          {action === 'sell' && (
            <div>
              <span className="label">可卖数量:</span>
              <span className="value">{stock.position} 股</span>
            </div>
          )}
        </TradeInfo>

        <Input
          type="number"
          placeholder="请输入数量"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            setError('');
          }}
          min="1"
          max={action === 'sell' ? stock.position : Math.floor(cash / stock.price)}
        />
        
        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
        
        <ButtonGroup>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
          >
            确认{action === 'buy' ? '买入' : '卖出'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onClose}
          >
            取消
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TradeModal; 