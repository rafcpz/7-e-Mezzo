import { useState } from 'react';
import { GameSetup } from './components/GameSetup';
import { ActiveGame } from './components/ActiveGame';
import { GameView } from './types';

function App() {
  const [currentView, setCurrentView] = useState<GameView>(GameView.SETUP);
  const [players, setPlayers] = useState<string[]>([]);
  const [ante, setAnte] = useState<number>(0.20);

  const handleStartGame = (playerNames: string[], anteAmount: number) => {
    setPlayers(playerNames);
    setAnte(anteAmount);
    setCurrentView(GameView.PLAY);
  };

  const handleExit = () => {
    setCurrentView(GameView.SETUP);
  };

  return (
    <div className="min-h-screen bg-[#0f3d24] bg-[radial-gradient(#14532d_1px,transparent_1px)] [background-size:16px_16px]">
      {currentView === GameView.SETUP ? (
        <GameSetup onStartGame={handleStartGame} />
      ) : (
        <ActiveGame 
          initialPlayers={players} 
          anteAmount={ante} 
          onExit={handleExit}
        />
      )}
      
    </div>
  );
}

export default App;