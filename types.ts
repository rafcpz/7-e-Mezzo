export interface Player {
  id: string;
  name: string;
  isDealer: boolean;
  roundsPlayed: number;
}

export interface GameLog {
  id: string;
  timestamp: number;
  message: string;
  amount?: number;
  type: 'ante' | 'win' | 'loss' | 'collect' | 'info';
}

export interface GameState {
  players: Player[];
  pot: number;
  ante: number;
  currentDealerId: string | null;
  roundActive: boolean;
  logs: GameLog[];
  gameRound: number;
  playersPlayedThisRound: string[]; // Tracks who played against current dealer in this specific round
}

export enum GameView {
  SETUP = 'SETUP',
  PLAY = 'PLAY'
}