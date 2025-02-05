import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import GameInterface from './components/GameInterface';
import LoginForm from './components/LoginForm';

const App = () => {
  const [user, setUser] = useState(null);

  return user ? (
    <GameInterface user={user} />
  ) : (
    <LoginForm onLogin={setUser} />
  );
};

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 