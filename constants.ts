
export const GRAVITY = 0.45;
export const JUMP_FORCE = -10.5;
export const MOVE_SPEED = 5.5;
export const DASH_SPEED = 14;
export const DASH_DURATION = 12; // frames
export const PLAYER_WIDTH = 42;
export const PLAYER_HEIGHT = 52;
export const COIN_SIZE = 22;
export const ENEMY_SIZE = 38;

export const COLORS = {
  BACKGROUND: '#0a0a0f',
  PLAYER_BODY: '#ffffff',
  PLAYER_SCREEN: '#3d3d3d', // Сделано еще чуть ярче (было #2d2d2d)
  PLATFORM: '#1e293b',
  PLATFORM_GLOW: '#3b82f6',
  COIN: '#fbbf24',
  ENEMY: '#ef4444',
  PARTICLE_GOLD: '#fbbf24',
  PARTICLE_CYAN: '#22d3ee',
  UI_ACCENT: '#3b82f6',
  // Biome Colors
  PHASES: [
    { bg: '#0a0a0f', accent: '#3b82f6', city: '#0f172a' }, // Blue
    { bg: '#0f0a15', accent: '#a855f7', city: '#1e102a' }, // Purple
    { bg: '#0a150f', accent: '#10b981', city: '#062016' }, // Green
    { bg: '#15120a', accent: '#f59e0b', city: '#201806' }  // Gold
  ]
};

export const LEVEL_WIDTH = 5000;
