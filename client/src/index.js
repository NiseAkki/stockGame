import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import { theme } from './components/StyledComponents';
import GameInterface from './components/GameInterface';
import LoginForm from './components/LoginForm';

const App = () => {
  const [user, setUser] = useState(null);

  return (
    <ThemeProvider theme={theme}>
      {user ? (
        <GameInterface user={user} />
      ) : (
        <LoginForm onLogin={setUser} />
      )}
    </ThemeProvider>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 