import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { CommonButton } from './StyledComponents';
import { stories, images } from '../data/luckyDrawContent';
import LuckyDrawResult from './LuckyDrawResult';

// 遮罩层 - 确保全屏覆盖并居中内容
const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);  // 稍微加深背景
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 九宫格容器 - 移除固定定位，使用 flex 布局
const DrawContainer = styled(motion.div)`
  background: white;
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 400px;
  margin: auto;  // 居中
`;

// 九宫格网格 - 调整大小和间距
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;  // 增加格子间距
  margin: 1.5rem 0;  // 调整上下间距
  padding: 10px;  // 添加内边距
`;

// 单个格子 - 优化样式
const Cell = styled.div`
  aspect-ratio: 1;
  background: ${props => props.isActive ? '#FF69B4' : '#f5f5f5'};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: ${props => props.isActive ? 'bold' : 'normal'};
  color: ${props => props.isActive ? 'white' : '#666'};
  transition: all 0.3s ease;
  box-shadow: ${props => props.isActive ? '0 0 15px rgba(255,105,180,0.5)' : 'none'};
  padding: 15px;
  text-align: center;
  
  &:hover {
    transform: ${props => props.isActive ? 'scale(1.05)' : 'none'};
  }
`;

// 标题 - 优化样式
const Title = styled.h2`
  text-align: center;
  color: #FF69B4;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
`;

// 抽奖按钮 - 优化样式
const DrawButton = styled(CommonButton)`
  width: 100%;
  padding: 1.2rem;
  font-size: 1.2rem;
  background: ${props => props.disabled ? '#ccc' : 'linear-gradient(45deg, #FF69B4, #FF1493)'};
  border-radius: 15px;
  margin-top: 1rem;
`;

const LuckyDraw = ({ isOpen, onClose, onDraw, disabled }) => {
  const [cells, setCells] = useState(Array(9).fill({ text: '神秘奖品', active: false }));
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(50);
  const [rounds, setRounds] = useState(0);
  const [finalIndex] = useState(() => Math.floor(Math.random() * 9));
  const [showResult, setShowResult] = useState(false);
  const [drawResult, setDrawResult] = useState(null);

  // 重置抽奖状态
  const resetDraw = useCallback(() => {
    setCells(Array(9).fill({ text: '神秘奖品', active: false }));
    setIsDrawing(false);
    setCurrentIndex(0);
    setSpeed(50);
    setRounds(0);
  }, []);

  // 处理抽奖动画
  useEffect(() => {
    let timer;
    if (isDrawing) {
      timer = setTimeout(() => {
        // 更新所有格子状态
        setCells(prev => prev.map((cell, idx) => ({
          ...cell,
          active: idx === currentIndex
        })));

        // 更新当前索引
        setCurrentIndex(prev => (prev + 1) % 9);

        // 根据轮数调整速度
        if (currentIndex === 8) {
          setRounds(prev => prev + 1);
          if (rounds >= 1) {
            // 速度变化更快
            setSpeed(prev => Math.min(prev * 1.3, 200));
          }
        }

        // 在第2轮后停止（原来是第4轮）
        if (rounds >= 2 && currentIndex === finalIndex) {
          setIsDrawing(false);
          handleDrawComplete(finalIndex);
        }
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [isDrawing, currentIndex, rounds, speed, onDraw, finalIndex]);

  // 开始抽奖
  const startDraw = () => {
    if (disabled || isDrawing) return;
    
    // 重置状态
    setSpeed(50);
    setRounds(0);
    setCurrentIndex(0);
    setIsDrawing(true);
    
    // 清除所有活跃状态
    setCells(prev => prev.map(cell => ({
      ...cell,
      active: false
    })));
  };

  // 关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      resetDraw();
    }
  }, [isOpen, resetDraw]);

  // 修改抽奖完成的处理
  const handleDrawComplete = (index) => {
    // 简化随机选择逻辑
    const randomStory = stories[Math.floor(Math.random() * stories.length)];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    
    setDrawResult({
      story: randomStory,
      image: randomImage
    });
    
    setShowResult(true);
    onDraw(index);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <DrawContainer
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <Title>✨ 幸运抽奖 ✨</Title>
            <Grid>
              {cells.map((cell, index) => (
                <Cell
                  key={index}
                  isActive={cell.active}
                >
                  {cell.text}
                </Cell>
              ))}
            </Grid>
            <DrawButton
              onClick={startDraw}
              disabled={disabled || isDrawing}
            >
              {isDrawing ? '抽奖中...' : '开始抽奖！'}
            </DrawButton>
          </DrawContainer>
        </Overlay>
      </AnimatePresence>
      <LuckyDrawResult 
        isOpen={showResult}
        onClose={() => {
          setShowResult(false);
          onClose();
        }}
        result={drawResult}
      />
    </>
  );
};

export default LuckyDraw; 