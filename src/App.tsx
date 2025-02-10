import React, { useEffect } from 'react';
import './App.css';
import PhaserGame from './game';

function App() {
  useEffect(() => {
    PhaserGame;
  }, []);

  return <div id="game-container"></div>
}

export default App;