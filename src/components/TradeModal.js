import React, { useState, useEffect } from 'react';
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
  padding: 30px;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);

  h2 {
    margin-bottom: 20px;
    color: ${props => props.theme.text};
  }
`;

const TradeInfo = styled.div`
  margin: 15px 0;
  padding: 15px;
  background: ${props => props.theme.background};
  border-radius: 10px;

  .price {
    font-size: 24px;
    font-weight: bold;
    color: ${props => props.theme.primary};
  }

  .total {
    margin-top: 10px;
    font-weight: bold;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid ${props => props.theme.secondary};
  border-radius: 10px;
  font-size: 16px;
  margin: 10px 0;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const TradeModal = ({ stock, action, onClose, onTrade, cash }) => {
  const [quantity, setQuantity] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(Number(quantity) * stock.price || 0);
  }, [quantity, stock.price]);

  const handleTrade = () => {
    const amount = Number(quantity);
    if (amount <= 0) {
      alert('请输入有效的数量');
      return;
    }

    if (action === 'buy') {
      if (total > cash) {
        alert('可用资金不足');
        return;
      }
    } else {
      if (amount > stock.position) {
        alert('持仓不足');
        return;
      }
    }

    onTrade(stock.code, action, amount);
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <h2>{action === 'buy' ? '买入' : '卖出'} {stock.name}</h2>
        <TradeInfo>
          <div>当前价格：<span className="price">¥{stock.price}</span></div>
          <div>可用资金：¥{cash}</div>
          {action === 'sell' && <div>当前持仓：{stock.position}股</div>}
          <div className="total">交易总额：¥{total.toFixed(2)}</div>
        </TradeInfo>
        
        <Input
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="请输入交易数量"
        />

        <ButtonGroup>
          <Button variant="primary" onClick={handleTrade}>
            确认{action === 'buy' ? '买入' : '卖出'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TradeModal; 