
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Platform, Coin, Enemy, Particle, FloatingText, Vector, Checkpoint, Projectile } from '../types';
import { 
  GRAVITY, JUMP_FORCE, MOVE_SPEED, DASH_SPEED, DASH_DURATION, 
  PLAYER_WIDTH, PLAYER_HEIGHT, COLORS, LEVEL_WIDTH, COIN_SIZE, ENEMY_SIZE 
} from '../constants';

// --- Sound Engine ---
const playSound = (type: 'jump' | 'coin' | 'dash' | 'hit' | 'win' | 'checkpoint') => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'jump':
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'coin':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'dash':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'hit':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(10, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    case 'checkpoint':
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case 'win':
      osc.type = 'square';
      [440, 554, 659, 880].forEach((freq, i) => {
        const time = now + i * 0.1;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.1, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(time);
        o.stop(time + 0.2);
      });
      break;
  }
};

interface GameProps {
  level: number;
  initialScore: number;
  onGameOver: (score: number) => void;
  onWin: (score: number) => void;
}

const Game: React.FC<GameProps> = ({ level, initialScore, onGameOver, onWin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef({ left: false, right: false, jump: false, dash: false });
  const internalInputState = useRef({ jumpPressed: false, lastJumpBtn: false });
  
  const state = useRef({
    player: {
      pos: { x: 100, y: 300 },
      vel: { x: 0, y: 0 },
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      grounded: false,
      facingRight: true,
      score: initialScore,
      squash: 1,
      stretch: 1,
      isDashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      jumpCount: 0
    } as Player,
    platforms: [] as Platform[],
    coins: [] as Coin[],
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    checkpoints: [] as Checkpoint[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    lastActiveCheckpointPos: null as Vector | null,
    cameraX: 0,
    viewport: { w: 0, h: 0 },
    isGameOver: false,
    isFinished: false,
    respawnTimer: 0,
    frame: 0,
    shake: 0,
    currentPhase: level - 1
  });

  const createParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      state.current.particles.push({
        pos: { x, y },
        vel: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 },
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    state.current.floatingTexts.push({
      pos: { x, y },
      text,
      life: 1.0,
      color
    });
  };

  const addCoinCluster = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      state.current.coins.push({
        pos: { x: x + i * 40, y: y - 40 },
        width: COIN_SIZE,
        height: COIN_SIZE,
        collected: false,
        floatOffset: Math.random() * Math.PI * 2
      });
    }
  };

  const initLevel = useCallback(() => {
    const s = state.current;
    s.lastActiveCheckpointPos = null;
    s.projectiles = [];
    s.coins = [];
    s.platforms = [];
    s.enemies = [];
    s.checkpoints = [];
    s.isFinished = false;
    s.isGameOver = false;

    if (level === 1) {
      s.platforms = [
        { pos: { x: 0, y: 500 }, width: 800, height: 200, type: 'normal' },
        { pos: { x: 950, y: 400 }, width: 400, height: 40, type: 'normal' },
        { pos: { x: 1450, y: 550 }, width: 1200, height: 200, type: 'normal' },
        { pos: { x: 2800, y: 500 }, width: 800, height: 200, type: 'normal' },
        { pos: { x: 3800, y: 550 }, width: 1200, height: 200, type: 'normal' },
        { pos: { x: 300, y: 320 }, width: 150, height: 20, type: 'normal' },
        { pos: { x: 600, y: 220 }, width: 150, height: 20, type: 'normal' },
      ];
      s.enemies = [
        { type: 'patrol', pos: { x: 600, y: 462 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 2, y: 0 }, range: [200, 750], isDead: false },
        { type: 'flyer', pos: { x: 2000, y: 200 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 2, y: 0 }, range: [1800, 2400], isDead: false, timer: 0 },
      ];
      s.checkpoints = [{ pos: { x: 2500, y: 380 }, width: 40, height: 120, active: false }];
      addCoinCluster(320, 320, 3);
      addCoinCluster(620, 220, 3);
      addCoinCluster(1000, 400, 4);
      addCoinCluster(3000, 500, 5);
    } else if (level === 2) {
      s.platforms = [
        { pos: { x: 0, y: 500 }, width: 600, height: 200, type: 'normal' },
        { pos: { x: 700, y: 350 }, width: 300, height: 40, type: 'normal' },
        { pos: { x: 1100, y: 200 }, width: 300, height: 40, type: 'normal' },
        { pos: { x: 1500, y: 350 }, width: 300, height: 40, type: 'normal' },
        { pos: { x: 1900, y: 500 }, width: 800, height: 200, type: 'normal' },
        { pos: { x: 2800, y: 400 }, width: 400, height: 40, type: 'normal' },
        { pos: { x: 3300, y: 250 }, width: 250, height: 20, type: 'normal' },
        { pos: { x: 3700, y: 500 }, width: 1300, height: 200, type: 'normal' },
      ];
      s.enemies = [
        { type: 'turret', pos: { x: 1200, y: 150 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 0, y: 0 }, range: [0, 0], isDead: false, timer: 60 },
        { type: 'flyer', pos: { x: 2200, y: 150 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 3, y: 0 }, range: [1900, 2600], isDead: false, timer: 0 },
        { type: 'patrol', pos: { x: 4000, y: 462 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 4, y: 0 }, range: [3800, 4500], isDead: false },
      ];
      s.checkpoints = [{ pos: { x: 2300, y: 380 }, width: 40, height: 120, active: false }];
      addCoinCluster(750, 350, 4);
      addCoinCluster(1150, 200, 4);
      addCoinCluster(2900, 400, 5);
      addCoinCluster(3350, 250, 3);
    } else {
      s.platforms = [
        { pos: { x: 0, y: 500 }, width: 400, height: 200, type: 'normal' },
        { pos: { x: 500, y: 400 }, width: 150, height: 20, type: 'normal' },
        { pos: { x: 750, y: 300 }, width: 150, height: 20, type: 'normal' },
        { pos: { x: 1000, y: 200 }, width: 150, height: 20, type: 'normal' },
        { pos: { x: 1300, y: 350 }, width: 400, height: 40, type: 'normal' },
        { pos: { x: 1800, y: 250 }, width: 400, height: 40, type: 'normal' },
        { pos: { x: 2300, y: 150 }, width: 400, height: 40, type: 'normal' },
        { pos: { x: 2800, y: 500 }, width: 2200, height: 200, type: 'normal' },
      ];
      s.enemies = [
        { type: 'turret', pos: { x: 1450, y: 300 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 0, y: 0 }, range: [0, 0], isDead: false, timer: 60 },
        { type: 'turret', pos: { x: 1950, y: 200 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 0, y: 0 }, range: [0, 0], isDead: false, timer: 120 },
        { type: 'flyer', pos: { x: 3000, y: 200 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 5, y: 0 }, range: [2800, 3800], isDead: false, timer: 0 },
        { type: 'patrol', pos: { x: 4000, y: 462 }, width: ENEMY_SIZE, height: ENEMY_SIZE, vel: { x: 10, y: 0 }, range: [3500, 4800], isDead: false },
      ];
      s.checkpoints = [{ pos: { x: 2500, y: 380 }, width: 40, height: 120, active: false }];
      addCoinCluster(520, 400, 3);
      addCoinCluster(770, 300, 3);
      addCoinCluster(1350, 350, 5);
      addCoinCluster(1850, 250, 5);
      addCoinCluster(2350, 150, 5);
    }
  }, [level]);

  const handleDeath = useCallback(() => {
    const s = state.current;
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если уровень завершен, смерть невозможна
    if (s.isFinished || s.isGameOver) return; 

    if (s.lastActiveCheckpointPos) {
      playSound('hit');
      s.respawnTimer = 60;
      s.shake = 15;
      s.projectiles = []; 
      createParticles(s.player.pos.x + s.player.width/2, s.player.pos.y + s.player.height/2, COLORS.ENEMY, 30);
    } else {
      playSound('hit');
      s.isGameOver = true;
      onGameOver(s.player.score);
    }
  }, [onGameOver]);

  const update = useCallback(() => {
    const s = state.current;
    if (s.isGameOver) return;
    
    if (s.respawnTimer > 0) {
      s.respawnTimer--;
      if (s.respawnTimer === 0) {
        if (s.lastActiveCheckpointPos) {
          s.player.pos = { ...s.lastActiveCheckpointPos };
          s.player.vel = { x: 0, y: 0 };
          s.player.isDashing = false;
          s.player.jumpCount = 0;
          s.cameraX = s.player.pos.x - s.viewport.w / 3;
        }
      }
      return;
    }

    s.frame++;
    if (s.shake > 0) s.shake *= 0.9;

    const { player, platforms, coins, enemies, projectiles, checkpoints } = s;
    const c = controls.current;

    // После победы управление блокируется, робот замирает для безопасности перехода
    if (s.isFinished) {
      player.vel.x *= 0.8;
      player.vel.y = 0;
      player.pos.x += player.vel.x;
      // Частицы победы
      if (s.frame % 5 === 0) {
        createParticles(player.pos.x + Math.random() * 40, player.pos.y + Math.random() * 40, COLORS.UI_ACCENT, 2);
      }
      return;
    }

    const progress = player.pos.x / LEVEL_WIDTH;
    s.currentPhase = (level - 1) + Math.floor(progress * 2);

    if (c.dash && !player.isDashing && player.dashCooldown <= 0) {
      playSound('dash');
      player.isDashing = true;
      player.dashTimer = DASH_DURATION;
      player.dashCooldown = 40;
      player.stretch = 1.5;
      player.squash = 0.6;
      s.shake = 5;
      createParticles(player.pos.x, player.pos.y + player.height/2, COLORS.UI_ACCENT, 15);
    }

    if (player.isDashing) {
      player.vel.x = player.facingRight ? DASH_SPEED : -DASH_SPEED;
      player.vel.y = 0;
      player.dashTimer--;
      if (player.dashTimer <= 0) player.isDashing = false;
    } else {
      if (c.left) {
        player.vel.x = -MOVE_SPEED;
        player.facingRight = false;
      } else if (c.right) {
        player.vel.x = MOVE_SPEED;
        player.facingRight = true;
      } else {
        player.vel.x *= 0.85;
      }

      const jumpJustPressed = c.jump && !internalInputState.current.lastJumpBtn;
      internalInputState.current.lastJumpBtn = c.jump;

      if (jumpJustPressed) {
        if (player.grounded) {
          playSound('jump');
          player.vel.y = JUMP_FORCE;
          player.grounded = false;
          player.jumpCount = 1;
          player.stretch = 1.3;
          player.squash = 0.7;
          createParticles(player.pos.x + player.width/2, player.pos.y + player.height, '#ffffff55', 5);
        } else if (player.jumpCount < 2) {
          playSound('jump');
          player.vel.y = JUMP_FORCE * 0.9;
          player.jumpCount = 2;
          player.stretch = 1.4;
          player.squash = 0.6;
          s.shake = 3;
          createParticles(player.pos.x + player.width/2, player.pos.y + player.height, COLORS.PHASES[s.currentPhase % 4].accent, 12);
        }
      }
      player.vel.y += GRAVITY;
    }

    if (player.dashCooldown > 0) player.dashCooldown--;

    player.pos.x += player.vel.x;
    player.pos.y += player.vel.y;

    player.squash += (1 - player.squash) * 0.2;
    player.stretch += (1 - player.stretch) * 0.2;

    player.grounded = false;
    platforms.forEach(plat => {
      if (
        player.pos.x + player.width*0.2 < plat.pos.x + plat.width &&
        player.pos.x + player.width*0.8 > plat.pos.x &&
        player.pos.y + player.height > plat.pos.y &&
        player.pos.y + player.height < plat.pos.y + plat.height + 15 &&
        player.vel.y >= 0
      ) {
        if (!player.grounded && player.vel.y > 5) {
            player.squash = 1.4;
            player.stretch = 0.6;
            s.shake = 2;
        }
        player.pos.y = plat.pos.y - player.height;
        player.vel.y = 0;
        player.grounded = true;
        player.jumpCount = 0;
      }
    });

    checkpoints.forEach(cp => {
      if (!cp.active &&
        player.pos.x < cp.pos.x + cp.width &&
        player.pos.x + player.width > cp.pos.x &&
        player.pos.y < cp.pos.y + cp.height &&
        player.pos.y + player.height > cp.pos.y
      ) {
        playSound('checkpoint');
        cp.active = true;
        s.lastActiveCheckpointPos = { ...cp.pos, y: cp.pos.y + cp.height - player.height };
        addFloatingText(cp.pos.x, cp.pos.y, 'SAVED', COLORS.PHASES[s.currentPhase % 4].accent);
        createParticles(cp.pos.x + cp.width/2, cp.pos.y + cp.height/2, COLORS.PHASES[s.currentPhase % 4].accent, 15);
      }
    });

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.pos.x += p.vel.x; p.pos.y += p.vel.y;
      if (p.pos.x < s.cameraX - 100 || p.pos.x > s.cameraX + s.viewport.w + 100) { projectiles.splice(i, 1); continue; }
      if (player.pos.x < p.pos.x + p.width && player.pos.x + player.width > p.pos.x &&
          player.pos.y < p.pos.y + p.height && player.pos.y + player.height > p.pos.y) {
        if (player.isDashing) {
          projectiles.splice(i, 1);
          createParticles(p.pos.x, p.pos.y, COLORS.UI_ACCENT, 10);
          addFloatingText(p.pos.x, p.pos.y, 'PARRY!', COLORS.UI_ACCENT);
        } else {
          handleDeath();
          projectiles.splice(i, 1);
          return;
        }
      }
    }

    enemies.forEach(enemy => {
        if (enemy.isDead) return;
        if (enemy.type === 'patrol') {
          enemy.pos.x += enemy.vel.x;
          if (enemy.pos.x < enemy.range[0] || enemy.pos.x > enemy.range[1]) enemy.vel.x *= -1;
        } else if (enemy.type === 'flyer') {
          enemy.pos.x += enemy.vel.x; enemy.pos.y += Math.sin((enemy.timer || 0)) * 2;
          if (enemy.pos.x < enemy.range[0] || enemy.pos.x > enemy.range[1]) enemy.vel.x *= -1;
          enemy.timer = (enemy.timer || 0) + 0.05;
        } else if (enemy.type === 'turret') {
          enemy.timer = (enemy.timer || 0) - 1;
          if (enemy.timer <= 0) {
            enemy.timer = 120;
            const dir = player.pos.x < enemy.pos.x ? -1 : 1;
            projectiles.push({ pos: { x: enemy.pos.x + (dir === 1 ? enemy.width : 0), y: enemy.pos.y + 5 }, vel: { x: dir * 5, y: 0 }, width: 12, height: 12, active: true });
          }
        }

        if (player.pos.x < enemy.pos.x + enemy.width && player.pos.x + player.width > enemy.pos.x &&
            player.pos.y < enemy.pos.y + enemy.height && player.pos.y + player.height > enemy.pos.y) {
            if ((player.vel.y > 0 && player.pos.y + player.height < enemy.pos.y + 20) || player.isDashing) {
                enemy.isDead = true; playSound('coin');
                if (!player.isDashing) { player.vel.y = JUMP_FORCE * 0.7; player.jumpCount = 1; }
                player.score += 100; addFloatingText(enemy.pos.x, enemy.pos.y, '+100', COLORS.ENEMY);
                s.shake = 8; createParticles(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, COLORS.ENEMY, 20);
            } else {
                handleDeath();
            }
        }
    });

    coins.forEach(coin => {
      if (!coin.collected && player.pos.x < coin.pos.x + coin.width && player.pos.x + player.width > coin.pos.x &&
          player.pos.y < coin.pos.y + coin.height && player.pos.y + player.height > coin.pos.y) {
        playSound('coin'); coin.collected = true; player.score += 10;
        addFloatingText(coin.pos.x, coin.pos.y, '+10', COLORS.COIN);
        createParticles(coin.pos.x + coin.width/2, coin.pos.y + coin.height/2, COLORS.COIN, 8);
      }
    });

    s.particles.forEach((p, i) => { p.pos.x += p.vel.x; p.pos.y += p.vel.y; p.life -= 0.02; if (p.life <= 0) s.particles.splice(i, 1); });
    s.floatingTexts.forEach((t, i) => { t.pos.y -= 1.5; t.life -= 0.02; if (t.life <= 0) s.floatingTexts.splice(i, 1); });

    if (player.pos.y > 1000) handleDeath();
    
    // Финишная черта
    if (player.pos.x > LEVEL_WIDTH - 250 && !s.isFinished) {
      s.isFinished = true;
      playSound('win');
      onWin(player.score);
    }

    const targetCamX = player.pos.x - s.viewport.w / 3;
    s.cameraX += (targetCamX - s.cameraX) * 0.08;
    s.cameraX = Math.max(0, Math.min(s.cameraX, LEVEL_WIDTH - s.viewport.w));
  }, [onGameOver, onWin, level, handleDeath]);

  // Drawing helpers
  const drawCheckpoint = (ctx: CanvasRenderingContext2D, cp: Checkpoint, accent: string) => {
    const { x, y } = cp.pos;
    const s = state.current;
    ctx.save();
    ctx.fillStyle = cp.active ? accent : '#334155';
    ctx.fillRect(x + cp.width/2 - 2, y, 4, cp.height);
    if (cp.active) {
      const pulse = Math.sin(s.frame * 0.1) * 5;
      ctx.fillStyle = accent;
      ctx.shadowBlur = 15 + pulse;
      ctx.shadowColor = accent;
      ctx.beginPath();
      ctx.moveTo(x + cp.width/2, y);
      ctx.lineTo(x + cp.width/2 + 30, y + 15);
      ctx.lineTo(x + cp.width/2, y + 30);
      ctx.fill();
    } else {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x + cp.width/2, y);
      ctx.lineTo(x + cp.width/2 + 20, y + 10);
      ctx.lineTo(x + cp.width/2, y + 20);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    if (enemy.isDead) return;
    const { x, y } = enemy.pos;
    const { width, height } = enemy;
    const s = state.current;
    ctx.save();
    ctx.fillStyle = COLORS.ENEMY;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.ENEMY;
    if (enemy.type === 'patrol') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      const eyeX = enemy.vel.x > 0 ? x + width - 12 : x + 4;
      ctx.fillRect(eyeX, y + 8, 8, 8);
    } else if (enemy.type === 'flyer') {
      const hover = Math.sin(s.frame * 0.1) * 5;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y + hover);
      ctx.lineTo(x + width, y + height / 2 + hover);
      ctx.lineTo(x + width / 2, y + height + hover);
      ctx.lineTo(x, y + height / 2 + hover);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.ENEMY + 'aa';
      const wingHeight = Math.abs(Math.sin(s.frame * 0.2)) * 15;
      ctx.fillRect(x - 5, y + height/2 + hover - wingHeight/2, 5, wingHeight);
      ctx.fillRect(x + width, y + height/2 + hover - wingHeight/2, 5, wingHeight);
    } else if (enemy.type === 'turret') {
      ctx.beginPath();
      ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(x + width/2, y + height/2, width/4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawRobot = (ctx: CanvasRenderingContext2D, player: Player) => {
    const s = state.current;
    if (s.respawnTimer > 30) return;
    const { x, y } = player.pos;
    if (player.isDashing) { ctx.globalAlpha = 0.3; ctx.fillStyle = COLORS.UI_ACCENT; ctx.fillRect(x - player.vel.x * 2, y, player.width, player.height); ctx.globalAlpha = 1.0; }
    const currentW = player.width * player.squash;
    const currentH = player.height * player.stretch;
    const offsetX = (player.width - currentW) / 2;
    const offsetY = (player.height - currentH);
    ctx.save();
    ctx.translate(x + offsetX, y + offsetY);
    const p = 4;
    
    // ОБНОВЛЕННЫЙ ЦВЕТ ЭКРАНА
    const roboBlack = COLORS.PLAYER_SCREEN;

    ctx.fillStyle = roboBlack;
    ctx.fillRect(p, -p, currentW - p*2, p*2);
    ctx.fillRect(-p, p, p*2.5, p*6);
    ctx.fillRect(currentW - p*1.5, p, p*2.5, p*6);
    ctx.fillStyle = COLORS.PLAYER_BODY;
    ctx.beginPath(); ctx.roundRect(0, 0, currentW, currentH * 0.55, 8); ctx.fill();
    ctx.fillStyle = player.isDashing ? COLORS.UI_ACCENT : roboBlack;
    ctx.beginPath(); ctx.roundRect(p, p, currentW - p*2, currentH * 0.4, 6); ctx.fill();
    ctx.fillStyle = player.isDashing ? '#fff' : COLORS.PHASES[s.currentPhase % 4].accent;
    if (Math.sin(s.frame * 0.1) < 0.8) { ctx.fillRect(p*3, p*2.5, p*2, p); ctx.fillRect(currentW - p*5, p*2.5, p*2, p); }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(p, currentH * 0.6, currentW - p*2, currentH * 0.3, 4); ctx.fill();
    ctx.fillStyle = roboBlack; ctx.font = `900 italic ${8 * player.squash}px Inter, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('ШУМ', currentW/2, currentH * 0.82);
    ctx.fillRect(p, currentH - p*2, p*3, p*2); ctx.fillRect(currentW - p*4, currentH - p*2, p*3, p*2);
    ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = state.current;
    const phase = COLORS.PHASES[s.currentPhase % 4];
    ctx.fillStyle = phase.bg; ctx.fillRect(0, 0, s.viewport.w, s.viewport.h);
    ctx.fillStyle = phase.city;
    for(let i=0; i<12; i++) {
        const x = (i * 600) - (s.cameraX * 0.2);
        ctx.fillRect(x, 150, 300, 800);
        ctx.fillStyle = phase.accent + '11'; ctx.fillRect(x + 50, 100, 150, 900); ctx.fillStyle = phase.city;
    }
    ctx.save();
    if (s.shake > 0.1) ctx.translate((Math.random()-0.5)*s.shake, (Math.random()-0.5)*s.shake);
    ctx.translate(-s.cameraX, 0);
    s.platforms.forEach(plat => {
      const grad = ctx.createLinearGradient(plat.pos.x, plat.pos.y, plat.pos.x, plat.pos.y + plat.height);
      grad.addColorStop(0, '#1e293b'); grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(plat.pos.x, plat.pos.y, plat.width, plat.height, 6); ctx.fill();
      ctx.strokeStyle = phase.accent + '66'; ctx.lineWidth = 2; ctx.stroke();
    });
    s.checkpoints.forEach(cp => drawCheckpoint(ctx, cp, phase.accent));
    s.projectiles.forEach(p => {
      ctx.fillStyle = COLORS.ENEMY; ctx.shadowBlur = 10; ctx.shadowColor = COLORS.ENEMY;
      ctx.beginPath(); ctx.arc(p.pos.x + p.width/2, p.pos.y + p.height/2, p.width/2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    });
    s.coins.forEach(coin => {
      if (coin.collected) return;
      const hover = Math.sin(s.frame * 0.1 + coin.floatOffset) * 6;
      ctx.fillStyle = COLORS.COIN; ctx.shadowBlur = 15; ctx.shadowColor = COLORS.COIN;
      ctx.beginPath(); ctx.arc(coin.pos.x + coin.width/2, coin.pos.y + coin.height/2 + hover, coin.width/2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    });
    s.enemies.forEach(enemy => drawEnemy(ctx, enemy));
    s.particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.pos.x, p.pos.y, p.size, p.size); });
    s.floatingTexts.forEach(t => { ctx.globalAlpha = t.life; ctx.fillStyle = t.color; ctx.font = '900 italic 20px Inter, sans-serif'; ctx.fillText(t.text, t.pos.x, t.pos.y); });
    ctx.globalAlpha = 1.0; ctx.fillStyle = '#10b981'; ctx.fillRect(LEVEL_WIDTH - 250, 0, 15, 900);
    ctx.fillStyle = '#fff'; ctx.font = '900 italic 30px Inter, sans-serif'; ctx.fillText('ФИНИШ', LEVEL_WIDTH - 230, 150);
    drawRobot(ctx, s.player); ctx.restore();
    if (s.respawnTimer > 0) { ctx.fillStyle = `rgba(0, 0, 0, ${Math.sin((s.respawnTimer / 60) * Math.PI)})`; ctx.fillRect(0, 0, s.viewport.w, s.viewport.h); }
    // HUD
    ctx.fillStyle = '#fff'; ctx.font = '900 italic 36px Inter, sans-serif'; ctx.fillText(s.player.score.toString().padStart(6, '0'), 30, 50);
    ctx.font = '900 italic 18px Inter, sans-serif'; ctx.fillStyle = phase.accent; ctx.fillText(`УРОВЕНЬ ${level}`, 30, 85);
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(30, 100, 100, 6);
    ctx.fillStyle = s.player.dashCooldown <= 0 ? COLORS.UI_ACCENT : '#ffffff44'; ctx.fillRect(30, 100, (1 - s.player.dashCooldown / 40) * 100, 6);
    for(let i=0; i<2; i++) { ctx.fillStyle = s.player.jumpCount <= i ? phase.accent : '#ffffff22'; ctx.beginPath(); ctx.arc(145 + i*15, 103, 4, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = '#ffffff11'; ctx.fillRect(30, s.viewport.h - 40, s.viewport.w - 60, 4);
    ctx.fillStyle = phase.accent; ctx.fillRect(30, s.viewport.h - 40, (s.player.pos.x / LEVEL_WIDTH) * (s.viewport.w - 60), 4);
  }, [level]);

  useEffect(() => {
    initLevel();
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; state.current.viewport = { w: window.innerWidth, h: window.innerHeight }; } };
    window.addEventListener('resize', handleResize); handleResize();
    let frameId: number;
    const loop = () => { update(); draw(); frameId = requestAnimationFrame(loop); };
    loop();
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(frameId); };
  }, [update, draw, initLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'ArrowLeft') controls.current.left = true; if (e.code === 'ArrowRight') controls.current.right = true; if (e.code === 'ArrowUp') controls.current.jump = true; if (e.code === 'Space') controls.current.dash = true; };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'ArrowLeft') controls.current.left = false; if (e.code === 'ArrowRight') controls.current.right = false; if (e.code === 'ArrowUp') controls.current.jump = false; if (e.code === 'Space') controls.current.dash = false; };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  return (
    <div className="w-full h-full touch-none relative overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between items-center pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <button onPointerDown={() => controls.current.left = true} onPointerUp={() => controls.current.left = false} onPointerLeave={() => controls.current.left = false} className="w-16 h-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center active:scale-90 active:bg-white/20 transition-all shadow-lg"><svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg></button>
          <button onPointerDown={() => controls.current.right = true} onPointerUp={() => controls.current.right = false} onPointerLeave={() => controls.current.right = false} className="w-16 h-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-center active:scale-90 active:bg-white/20 transition-all shadow-lg"><svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></button>
        </div>
        <div className="flex flex-col gap-4 items-center pointer-events-auto">
          <button onPointerDown={() => controls.current.dash = true} onPointerUp={() => controls.current.dash = false} className="w-20 h-14 bg-purple-500/20 backdrop-blur-xl rounded-xl border border-purple-500/30 flex items-center justify-center active:scale-90 active:bg-purple-500/40 transition-all shadow-md"><span className="text-white font-black italic text-[10px] uppercase tracking-tighter">РЫВОК</span></button>
          <button onPointerDown={() => controls.current.jump = true} onPointerUp={() => controls.current.jump = false} className="w-24 h-24 bg-blue-500 rounded-full border-4 border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.6)] flex items-center justify-center active:scale-90 transition-all transform -translate-y-2"><span className="text-white font-black italic text-lg uppercase">ПРЫЖОК</span></button>
        </div>
      </div>
    </div>
  );
};

export default Game;
