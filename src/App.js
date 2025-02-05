import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from './components/StyledComponents';
import GameInterface from './components/GameInterface';
import GlobalStyle from './GlobalStyle';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <GameInterface />
    </ThemeProvider>
  );
}

export default App; 