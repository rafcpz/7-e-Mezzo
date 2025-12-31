import React, { useState } from 'react';
import { Users, Plus, Trash2, PlayCircle, Coins, GripVertical, Edit2, Check, X } from 'lucide-react';

interface GameSetupProps {
  onStartGame: (players: string[], ante: number) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [names, setNames] = useState<string[]>(['Giocatore 1', 'Giocatore 2']);
  const [ante, setAnte] = useState<number>(0.20);
  const [newName, setNewName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // State for editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      setNames([...names, newName.trim()]);
      setNewName('');
    }
  };

  const removePlayer = (index: number) => {
    setNames(names.filter((_, i) => i !== index));
  };

  // Edit Handlers
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(names[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const updatedNames = [...names];
      updatedNames[editingIndex] = editValue.trim();
      setNames(updatedNames);
      setEditingIndex(null);
    } else {
      cancelEdit();
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleStart = () => {
    if (names.length >= 2) {
      onStartGame(names, ante);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (editingIndex !== null) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    setTimeout(() => target.classList.add('opacity-50'), 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.classList.remove('opacity-50');
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedNames = [...names];
    const [movedItem] = updatedNames.splice(draggedIndex, 1);
    updatedNames.splice(targetIndex, 0, movedItem);

    setNames(updatedNames);
    setDraggedIndex(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-md">7 e Mezzo</h1>
        <p className="text-green-100 text-lg">Configurazione Tavolo</p>
      </div>

      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Coins className="text-yellow-600" />
            Puntata Iniziale (Ante)
          </h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={ante}
                onChange={(e) => setAnte(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-lg font-mono text-gray-800"
              />
            </div>
            <p className="text-sm text-gray-500">
              Ogni giocatore metterà questa somma nel piatto all'inizio del giro.
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" />
              Giocatori ({names.length})
            </h2>
            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Ordine di gioco</span>
          </div>

          <form onSubmit={addPlayer} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome nuovo giocatore..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={24} />
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {names.map((name, idx) => (
              <div
                key={idx}
                draggable={editingIndex !== idx}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                className={`flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-blue-300 transition-all ${
                  draggedIndex === idx ? 'opacity-40 border-dashed border-blue-400' : ''
                } ${editingIndex === idx ? 'ring-2 ring-blue-500 border-transparent bg-blue-50' : 'cursor-move'}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`text-gray-400 ${editingIndex === idx ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:text-gray-600'}`}>
                    <GripVertical size={20} />
                  </div>
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex flex-shrink-0 items-center justify-center text-sm font-bold select-none">
                    {idx + 1}
                  </span>
                  
                  {editingIndex === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-2 animate-[fade-in_0.2s_ease-out]">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-md focus:outline-none text-sm font-medium"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button onClick={saveEdit} className="text-green-600 hover:bg-green-100 p-1 rounded transition-colors" title="Salva">
                        <Check size={18} />
                      </button>
                      <button onClick={cancelEdit} className="text-red-400 hover:bg-red-100 p-1 rounded transition-colors" title="Annulla">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <span 
                      className="font-medium text-gray-700 select-none truncate cursor-text hover:text-blue-600 transition-colors"
                      onClick={() => startEditing(idx)}
                      title="Clicca per modificare"
                    >
                      {name}
                    </span>
                  )}
                  
                  {idx === 0 && editingIndex !== idx && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-yellow-200 whitespace-nowrap hidden sm:inline-block">
                      Primo Mazziere
                    </span>
                  )}
                </div>

                {editingIndex !== idx && (
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(idx);
                      }}
                      className="text-gray-400 hover:text-blue-500 p-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Modifica"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlayer(idx);
                      }}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Rimuovi"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {names.length === 0 && (
              <p className="text-center text-gray-400 italic py-4">Aggiungi almeno 2 giocatori per iniziare</p>
            )}
            {names.length > 0 && names.length < 2 && (
              <p className="text-center text-yellow-600 text-sm py-2">Serve almeno un altro giocatore.</p>
            )}
          </div>
          <p className="text-xs text-center text-gray-400 mt-2">
            Trascina i nomi per cambiare l'ordine dei turni.
          </p>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleStart}
            disabled={names.length < 2 || editingIndex !== null}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <PlayCircle size={24} />
            Inizia Partita
          </button>
        </div>
      </div>
    </div>
  );
};