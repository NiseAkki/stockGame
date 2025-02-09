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
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
`;

const ResultContainer = styled(motion.div)`
  background: linear-gradient(135deg, #fff6f6, #fff);
  padding: 2rem;
  border-radius: 25px;
  width: 90%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  border: 3px solid #FFB6C1;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 8px;
    background: linear-gradient(90deg, #FF69B4, #FFB6C1);
  }

  h2 {
    color: #FF69B4;
    font-size: 2rem;
    margin-bottom: 1.5rem;
    text-shadow: 2px 2px 4px rgba(255, 105, 180, 0.2);
    font-weight: bold;
  }

  h3 {
    color: #FF1493;
    font-size: 1.6rem;
    margin: 1rem 0;
    font-weight: bold;
  }
`;

const ImageContainer = styled.div`
  width: 280px;
  height: 280px;
  margin: 1.5rem auto;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(255, 105, 180, 0.2);
  border: 3px solid #FFB6C1;
  background: white;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 0.3s ease;
    
    &:hover {
      transform: scale(1.05);
    }
  }
`;

const Content = styled.div`
  background: rgba(255, 182, 193, 0.1);
  padding: 1.5rem;
  border-radius: 15px;
  margin: 1.5rem 0;
  text-align: left;
  line-height: 1.8;
  font-size: 1.2rem;
  color: #666;
  border: 2px dashed #FFB6C1;

  p {
    white-space: pre-line;
    margin: 0;
  }
`;

const StyledButton = styled(CommonButton)`
  background: linear-gradient(45deg, #FF69B4, #FF1493);
  padding: 1rem 2.5rem;
  font-size: 1.2rem;
  border-radius: 25px;
  margin-top: 1rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(255, 105, 180, 0.3);
  }
`;

const LuckyDrawResult = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <ResultContainer
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <h2>✨ 恭喜中奖 ✨</h2>
          <ImageContainer>
            <img 
              src={`/images/lucky_draw/${result.image}.png`} 
              alt="抽奖图片"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/lucky_draw/default.png';
              }}
            />
          </ImageContainer>
          <Content>
            <h3>{result.story.title}</h3>
            <p>{result.story.content}</p>
          </Content>
          <StyledButton onClick={onClose}>
            关闭
          </StyledButton>
        </ResultContainer>
      </Overlay>
    </AnimatePresence>
  );
};

export default LuckyDrawResult; 