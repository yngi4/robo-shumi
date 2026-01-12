
export interface Vector {
  x: number;
  y: number;
}

export interface Particle {
  pos: Vector;
  vel: Vector;
  life: number;
  color: string;
  size: number;
}

export interface FloatingText {
  pos: Vector;
  text: string;
  life: number;
  color: string;
}

export interface Entity {
  pos: Vector;
  width: number;
  height: number;
}

export interface Player extends Entity {
  vel: Vector;
  grounded: boolean;
  facingRight: boolean;
  score: number;
  squash: number;
  stretch: number;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  jumpCount: number;
}

export interface Platform extends Entity {
  type: 'normal' | 'moving' | 'vanishing';
}

export interface Coin extends Entity {
  collected: boolean;
  floatOffset: number;
}

export interface Enemy extends Entity {
  type: 'patrol' | 'flyer' | 'turret';
  vel: Vector;
  range: [number, number];
  isDead: boolean;
  timer?: number;
}

export interface Projectile extends Entity {
  vel: Vector;
  active: boolean;
}

export interface Checkpoint extends Entity {
  active: boolean;
}

export type GameStatus = 'START' | 'PLAYING' | 'GAMEOVER' | 'WIN';
