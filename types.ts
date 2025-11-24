export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Bird {
  y: number;
  velocity: number;
  rotation: number;
}

export interface Pipe {
  x: number;
  topHeight: number; // Height of the top pipe
  passed: boolean; // Has the bird passed this pipe?
  gap: number; // Gap size for this specific pipe
}

export interface GameConfig {
  gravity: number;
  jumpStrength: number;
  pipeSpeed: number;
  pipeSpawnRate: number; // Pixels distance between pipes
  pipeGap: number;
}