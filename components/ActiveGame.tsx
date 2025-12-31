import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertTriangle, RotateCcw, Wallet, TrendingUp, TrendingDown, Crown, Coins, Hash } from 'lucide-react';
import { GameState, GameLog } from '../types';

interface ActiveGameProps {
  initialPlayers: string[];
  anteAmount: number;
  onExit: () => void;
}

export const ActiveGame: React.FC<ActiveGameProps> = ({ initialPlayers, anteAmount, onExit }) => {
  const [gameState, setGameState] = useState<GameState>({
    players: initialPlayers.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      isDealer: i === 0,
      roundsPlayed: 0
    })),
    pot: 0,
    ante: anteAmount,
    currentDealerId: null,
    roundActive: false,
    logs: [],
    gameRound: 1,
    playersPlayedThisRound: []
  });

  const [betAmount, setBetAmount] = useState<string>('');
  const [selectedChallengerId, setSelectedChallengerId] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to handle currency math safely
  const toCurrency = (val: number) => Math.round(val * 100) / 100;
  const isApproximatelyZero = (val: number) => Math.abs(val) < 0.01;

  // Initialize first dealer
  useEffect(() => {
    if (!gameState.currentDealerId && gameState.players.length > 0) {
      setGameState(prev => ({ ...prev, currentDealerId: prev.players[0].id }));
    }
  }, [gameState.players, gameState.currentDealerId]);

  const getCurrentDealer = () => gameState.players.find(p => p.id === gameState.currentDealerId);

  // Validate bet amount
  const handleBetChange = (val: string) => {
    setBetAmount(val);
    const amount = parseFloat(val);
    if (!isNaN(amount) && amount > gameState.pot) {
      // Allow slight tolerance for "All In" typing
      if (!isApproximatelyZero(amount - gameState.pot)) {
        setErrorMsg("La puntata non può superare il piatto!");
      } else {
        setErrorMsg(null);
      }
    } else {
      setErrorMsg(null);
    }
  };

  // Helper to find the next eligible challenger
  const getNextChallengerId = (currentReferenceId: string | null): string => {
    const { players, currentDealerId } = gameState;
    if (!players.length || !currentDealerId) return '';

    let startIndex = -1;
    
    if (currentReferenceId) {
      startIndex = players.findIndex(p => p.id === currentReferenceId);
    } else {
      startIndex = players.findIndex(p => p.id === currentDealerId);
    }

    if (startIndex === -1) return '';

    for (let i = 1; i < players.length; i++) {
      const nextIndex = (startIndex + i) % players.length;
      const candidate = players[nextIndex];
      
      if (candidate.id !== currentDealerId) {
        return candidate.id;
      }
    }
    return '';
  };

  const addLog = (message: string, type: GameLog['type'], amount?: number) => {
    setGameState(prev => ({
      ...prev,
      logs: [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        message,
        type,
        amount
      }, ...prev.logs]
    }));
  };

  const startRound = () => {
    const totalAnte = toCurrency(gameState.players.length * gameState.ante);
    const firstChallengerId = getNextChallengerId(null);

    setGameState(prev => ({
      ...prev,
      pot: toCurrency(prev.pot + totalAnte),
      roundActive: true
    }));
    
    setSelectedChallengerId(firstChallengerId);
    addLog(`Tutti pagano la puntata iniziale (€${gameState.ante.toFixed(2)})`, 'ante', totalAnte);
  };

  // Logic to switch dealer (used by Close Bank and Sbancato)
  const performDealerSwitch = (reason: 'collect' | 'sbancato', finalPot: number, challengerName?: string) => {
    const currentIdx = gameState.players.findIndex(p => p.id === gameState.currentDealerId);
    const nextIdx = (currentIdx + 1) % gameState.players.length;
    const nextDealer = gameState.players[nextIdx];
    const currentDealer = gameState.players[currentIdx];

    // Create logs based on reason
    const newLogs: GameLog[] = [];
    
    if (reason === 'sbancato') {
      newLogs.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        message: `SBANCATO! ${challengerName} svuota il piatto. Il turno passa a ${nextDealer.name}.`,
        type: 'loss',
        amount: -finalPot // Shows the loss amount
      });
       // Prepend the specific hand result log as well
       newLogs.push({
        id: crypto.randomUUID(),
        timestamp: Date.now() - 1,
        message: `${challengerName} vince la mano contro il banco`,
        type: 'loss',
        amount: -finalPot
      });
    } else {
      newLogs.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        message: `Fine turno! ${currentDealer.name} incassa il piatto rimanente`,
        type: 'collect',
        amount: finalPot
      });
    }

    setGameState(prev => ({
      ...prev,
      pot: 0,
      roundActive: false,
      currentDealerId: nextDealer.id,
      gameRound: 1, // Reset round for new dealer
      playersPlayedThisRound: [],
      players: prev.players.map(p => ({
        ...p,
        isDealer: p.id === nextDealer.id
      })),
      logs: [...newLogs, ...prev.logs]
    }));

    setSelectedChallengerId('');
    setBetAmount('');
    setErrorMsg(null);
  };

  const handleTransaction = (winner: 'player' | 'dealer') => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Safety check: Player cannot win more than pot (using epsilon for float safety)
    if (winner === 'player' && (amount - gameState.pot) > 0.01) {
      setErrorMsg("Impossibile pagare più del piatto disponibile.");
      return;
    }

    const challenger = gameState.players.find(p => p.id === selectedChallengerId);
    if (!challenger) return;

    if (winner === 'player') {
      const remainingPot = toCurrency(gameState.pot - amount);
      
      // SBANCATO Logic: Check if pot is effectively zero
      if (isApproximatelyZero(remainingPot)) {
        performDealerSwitch('sbancato', amount, challenger.name);
        return; 
      }

      // Normal Player Win
      setGameState(prev => {
        return updateRoundProgress({
          ...prev,
          pot: remainingPot,
          logs: [{
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            message: `${challenger.name} vince la mano contro il banco`,
            type: 'loss',
            amount: -amount
          }, ...prev.logs]
        }, challenger.id);
      });

    } else {
      // Dealer wins
      setGameState(prev => {
        const updatedPot = toCurrency(prev.pot + amount);
        return updateRoundProgress({
          ...prev,
          pot: updatedPot,
          logs: [{
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            message: `${challenger.name} perde. Paga al piatto`,
            type: 'win',
            amount: amount
          }, ...prev.logs]
        }, challenger.id);
      });
    }
    
    // Auto-select next player
    const nextChallengerId = getNextChallengerId(selectedChallengerId);
    setSelectedChallengerId(nextChallengerId);
    setBetAmount('');
    setErrorMsg(null);
  };

  // Helper to handle orbit/round logic
  const updateRoundProgress = (state: GameState, currentPlayerId: string): GameState => {
    // Add current player to the list of played
    const updatedPlayed = [...state.playersPlayedThisRound];
    if (!updatedPlayed.includes(currentPlayerId)) {
      updatedPlayed.push(currentPlayerId);
    }

    const numberOfChallengers = state.players.length - 1; // All players except dealer
    let newGameRound = state.gameRound;
    let newPlayedList = updatedPlayed;
    let newLogs = state.logs;

    // Check if orbit is complete
    if (updatedPlayed.length >= numberOfChallengers) {
      newGameRound += 1;
      newPlayedList = []; // Reset for next orbit
      newLogs = [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        message: `Tutti i giocatori hanno giocato. Inizia il Giro ${newGameRound} per questo mazziere.`,
        type: 'info'
      }, ...state.logs];
    }

    return {
      ...state,
      gameRound: newGameRound,
      playersPlayedThisRound: newPlayedList,
      logs: newLogs
    };
  };

  const closeBank = () => {
    if (!getCurrentDealer()) return;
    performDealerSwitch('collect', gameState.pot);
  };

  const dealer = getCurrentDealer();
  const isAllInDisabled = gameState.gameRound === 1;
  const hasError = !!errorMsg;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto md:px-4 relative">
      {/* Header Info */}
      <div className="bg-green-900/90 text-white p-4 shadow-lg md:rounded-b-xl backdrop-blur-sm sticky top-0 z-20">
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => setShowExitConfirm(true)} 
            className="text-green-200 hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={16} /> Esci
          </button>
          
          <div className="flex gap-4 text-sm font-medium opacity-80">
             <span className="flex items-center gap-1"><Hash size={14}/> Giro Mazziere: {gameState.gameRound}</span>
             <span>Ante: €{gameState.ante.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4">
          <h2 className="text-green-200 text-sm uppercase tracking-wider font-bold mb-1">Piatto Corrente</h2>
          <div className="text-5xl font-mono font-bold text-yellow-400 drop-shadow-lg flex items-start">
            <span className="text-2xl mt-2 mr-1">€</span>
            {gameState.pot.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto pb-24">
        
        {/* Game Actions Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Dealer & Actions */}
          <div className="space-y-6">
            
            {/* Dealer Status */}
            <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-yellow-500">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                  <Crown size={32} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase">Mazziere (Banco)</p>
                  <p className="text-2xl font-bold text-gray-800">{dealer?.name}</p>
                </div>
              </div>
            </div>

            {/* Main Action Card */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              {!gameState.roundActive ? (
                <div className="p-8 text-center bg-gray-50">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Nuovo Giro</h3>
                  <p className="text-gray-600 mb-6">
                    È il turno di <strong>{dealer?.name}</strong>. Tutti i giocatori devono versare la puntata iniziale di €{gameState.ante.toFixed(2)}.
                  </p>
                  <button
                    onClick={startRound}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Coins size={20} />
                    Raccogli Puntate (€{toCurrency(gameState.players.length * gameState.ante).toFixed(2)})
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <TrendingUp className="text-blue-500" />
                    Gestisci Mano
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Sfidante</label>
                      <select
                        value={selectedChallengerId}
                        onChange={(e) => setSelectedChallengerId(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleziona chi gioca contro il banco...</option>
                        {gameState.players
                          .filter(p => !p.isDealer)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Puntata Sfidante</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                        <input
                          type="number"
                          step="0.10"
                          min="0.05"
                          max={gameState.pot}
                          value={betAmount}
                          onChange={(e) => handleBetChange(e.target.value)}
                          placeholder="0.00"
                          className={`w-full pl-8 p-3 bg-gray-50 border rounded-lg outline-none focus:ring-2 font-mono text-lg ${
                            errorMsg ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      {errorMsg && (
                        <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">
                          <AlertTriangle size={12} /> {errorMsg}
                        </p>
                      )}
                      
                      {/* Quick Bet Buttons */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => handleBetChange(gameState.ante.toFixed(2))}
                          disabled={gameState.pot < gameState.ante || hasError}
                          className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Ante (€{gameState.ante.toFixed(2)})
                        </button>
                        <button
                          onClick={() => handleBetChange(Math.max(0, toCurrency(gameState.pot - gameState.ante)).toFixed(2))}
                          disabled={gameState.pot < gameState.ante || hasError}
                          className="text-xs bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Piatto - Ante (€{Math.max(0, toCurrency(gameState.pot - gameState.ante)).toFixed(2)})
                        </button>
                        <button
                          onClick={() => handleBetChange(gameState.pot.toFixed(2))}
                          disabled={isAllInDisabled || hasError}
                          title={isAllInDisabled ? "Non disponibile al primo giro del mazziere" : "Punta tutto il piatto"}
                          className={`text-xs border py-1.5 px-3 rounded-md transition-colors font-bold ${
                            isAllInDisabled || hasError
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed decoration-slice'
                              : 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-800'
                          }`}
                        >
                          Tutto (€{gameState.pot.toFixed(2)})
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handleTransaction('player')}
                        disabled={!selectedChallengerId || !betAmount || hasError}
                        className="flex flex-col items-center justify-center p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <span className="text-red-600 font-bold mb-1 group-hover:scale-105 transition-transform">Vince Sfidante</span>
                        <span className="text-xs text-red-400">Preleva dal piatto</span>
                      </button>
                      
                      <button
                        onClick={() => handleTransaction('dealer')}
                        disabled={!selectedChallengerId || !betAmount || hasError}
                        className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <span className="text-green-700 font-bold mb-1 group-hover:scale-105 transition-transform">Vince Banco</span>
                        <span className="text-xs text-green-500">Paga nel piatto</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <button
                      onClick={closeBank}
                      disabled={hasError}
                      className={`w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${hasError ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <ArrowRight size={18} />
                      Chiudi Banco & Passa Turno
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Il mazziere incassa il residuo del piatto.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Transaction Log */}
          <div className="bg-white/90 rounded-xl shadow-lg flex flex-col h-[500px] overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200">
               <h3 className="font-bold text-gray-700 flex items-center gap-2">
                 <TrendingDown size={20} />
                 Storico Movimenti
               </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {gameState.logs.length === 0 ? (
                 <div className="text-center text-gray-400 mt-10">
                   <p>Nessun movimento registrato</p>
                 </div>
               ) : (
                 gameState.logs.map(log => (
                   <div key={log.id} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                     <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${
                       log.type === 'win' ? 'bg-green-100 text-green-600' :
                       log.type === 'loss' ? 'bg-red-100 text-red-600' :
                       log.type === 'ante' ? 'bg-blue-100 text-blue-600' :
                       log.type === 'info' ? 'bg-gray-100 text-gray-600' :
                       'bg-purple-100 text-purple-600'
                     }`}>
                       {log.type === 'win' && <TrendingUp size={14} />}
                       {log.type === 'loss' && <TrendingDown size={14} />}
                       {log.type === 'ante' && <Coins size={14} />}
                       {log.type === 'collect' && <Wallet size={14} />}
                       {log.type === 'info' && <Hash size={14} />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm text-gray-800 font-medium">{log.message}</p>
                       <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                     </div>
                     {log.amount !== undefined && (
                        <div className={`font-mono font-bold whitespace-nowrap ${
                          log.type === 'loss' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {log.type === 'loss' ? '-' : '+'}€{Math.abs(log.amount).toFixed(2)}
                        </div>
                     )}
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[fade-in_0.2s_ease-out]">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Abbandonare il tavolo?</h3>
              <p className="text-gray-500 text-sm">
                Se esci ora, il piatto corrente e lo storico della partita andranno persi irreversibilmente.
              </p>
            </div>
            <div className="flex border-t border-gray-100 bg-gray-50 p-2 gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={onExit}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};