import React from 'react';
import { createRoot } from 'react-dom/client';
import GameInterface from './components/GameInterface';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GameInterface />
  </React.StrictMode>
); 