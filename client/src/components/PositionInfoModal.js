import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { CommonButton } from './StyledComponents';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
`;

const ModalContainer = styled(motion.div)`
  background: white;
  padding: 2rem;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h3`
  color: #333;
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
`;

const PositionList = styled.div`
  display: grid;
  gap: 1rem;
  margin: 1.5rem 0;
`;

const PositionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 10px;

  > div {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const CashInfo = styled.div`
  text-align: right;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  font-weight: bold;
`;

const PositionInfoModal = ({ positionInfo, onClose }) => {
  if (!positionInfo) return null;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <ModalContainer
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <Title>📊 {positionInfo.nickname} 的持仓信息</Title>
          <PositionList>
            {positionInfo.positions.map(pos => (
              <PositionItem key={pos.code}>
                <div>
                  <div>{pos.code}</div>
                  <div>持仓: {pos.quantity} 股</div>
                </div>
                <div>
                  <div>均价: ¥{pos.averagePrice.toFixed(2)}</div>
                </div>
              </PositionItem>
            ))}
          </PositionList>
          <CashInfo>
            现金: ¥{positionInfo.cash.toFixed(2)}
          </CashInfo>
          <CommonButton onClick={onClose} style={{ width: '100%', marginTop: '1rem' }}>
            关闭
          </CommonButton>
        </ModalContainer>
      </Overlay>
    </AnimatePresence>
  );
};

export default PositionInfoModal; 