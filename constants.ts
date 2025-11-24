// Canvas Dimensions
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

// Physics
export const INITIAL_GRAVITY = 0.3;
export const JUMP_STRENGTH = -6;
export const AIR_RESISTANCE = 0.98; // Slightly reduced resistance for smoother fall with new gravity
export const BASE_PIPE_SPEED = 2;
export const SPEED_INCREASE_RATE = 0.2;
export const SPEED_INCREASE_INTERVAL = 10;

// Entity Dimensions
export const BIRD_RADIUS = 20;
export const BIRD_X_POSITION = 100; // Fixed X position of the bird
export const PIPE_WIDTH = 60;
export const MIN_PIPE_GAP = 120;
export const MAX_PIPE_GAP = 180;
export const PIPE_SPAWN_DISTANCE = 220; // Distance between pipes horizontally
export const GROUND_HEIGHT = 50; // Height of the scrolling floor

// Colors
export const COLOR_SKY = '#70c5ce';
export const COLOR_BIRD = '#fbbf24'; // Tailwind amber-400
export const COLOR_BIRD_BORDER = '#b45309'; // Tailwind amber-700
export const COLOR_PIPE = '#22c55e'; // Tailwind green-500
export const COLOR_PIPE_BORDER = '#15803d'; // Tailwind green-700
export const COLOR_GROUND = '#dce0a5';
export const COLOR_GROUND_BORDER = '#a3a676';

// Local Storage Keys
export const STORAGE_HIGH_SCORE = 'flappy_react_high_score';