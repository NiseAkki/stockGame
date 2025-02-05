const wsUrl = process.env.NODE_ENV === 'production'
  ? 'wss://stockgame.onrender.com'  // 使用小写，因为 Render 会自动转换为小写
  : 'ws://localhost:8080'; 