"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  startMenu: document.getElementById("startMenu"),
  pauseMenu: document.getElementById("pauseMenu"),
  gameOverMenu: document.getElementById("gameOverMenu"),
  clearMenu: document.getElementById("clearMenu"),
  helpMenu: document.getElementById("helpMenu"),
  clearVideoOverlay: document.getElementById("clearVideoOverlay"),
  clearVideo: document.getElementById("clearVideo"),
  clearResultPanel: document.getElementById("clearResultPanel"),
  hud: document.getElementById("hud"),
  skillPad: document.getElementById("skillPad"),
  pauseButton: document.getElementById("pauseButton"),
  scoreText: document.getElementById("scoreText"),
  finalScore: document.getElementById("finalScore"),
  clearScore: document.getElementById("clearScore"),
  healthBar: document.getElementById("healthBar"),
  levelText: document.getElementById("levelText"),
  startButton: document.getElementById("startButton"),
  helpButton: document.getElementById("helpButton"),
  closeHelpButton: document.getElementById("closeHelpButton"),
  resumeButton: document.getElementById("resumeButton"),
  restartButton: document.getElementById("restartButton"),
  homeButton: document.getElementById("homeButton"),
  continueButton: document.getElementById("continueButton"),
  restartFromPauseButton: document.getElementById("restartFromPauseButton"),
  homeFromPauseButton: document.getElementById("homeFromPauseButton"),
  homeFromClearButton: document.getElementById("homeFromClearButton")
};

const state = {
  mode: "menu",
  width: 0,
  height: 0,
  scale: 1,
  lastTime: 0,
  score: 0,
  level: 1,
  clearTarget: 650,
  clearTimer: 0,
  clearDuration: 1.25,
  clearVideoTimeout: null,
  scoreRollFrame: null,
  spawnTimer: 0,
  shootTimer: 0,
  hurtTimer: 0,
  stars: [],
  bullets: [],
  enemies: [],
  particles: [],
  keys: new Set(),
  pointer: {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0
  },
  player: {
    x: 0,
    y: 0,
    radius: 22,
    health: 100,
    maxHealth: 100,
    speed: 420
  }
};

/** 将数值限制在指定范围内。 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** 返回两个数之间的随机浮点数。 */
function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/** 根据屏幕尺寸返回适合当前设备的基础缩放值。 */
function getGameScale() {
  return clamp(Math.min(state.width, state.height) / 720, 0.72, 1.25);
}

/** 调整 Canvas 像素尺寸，并同步游戏内宽高。 */
function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.scale = getGameScale();
  canvas.width = Math.floor(state.width * pixelRatio);
  canvas.height = Math.floor(state.height * pixelRatio);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  state.player.x = clamp(state.player.x || state.width / 2, 34, state.width - 34);
  state.player.y = clamp(state.player.y || state.height * 0.78, 72, state.height - 34);
  createStars();
}

/** 创建用于背景滚动的星点。 */
function createStars() {
  const total = Math.floor((state.width * state.height) / 15000);
  state.stars = Array.from({ length: total }, () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    size: randomRange(0.7, 2.2),
    speed: randomRange(22, 96),
    alpha: randomRange(0.35, 0.95)
  }));
}

/** 重置所有游戏对象和分数。 */
function resetGame() {
  state.score = 0;
  state.level = 1;
  state.clearTarget = 650;
  state.clearTimer = 0;
  clearVideoTimer();
  cancelScoreRoll();
  ui.clearVideoOverlay.classList.remove("is-visible");
  ui.clearVideoOverlay.classList.remove("is-result");
  ui.clearVideo.pause();
  ui.clearResultPanel.classList.remove("is-visible");
  state.spawnTimer = 0;
  state.shootTimer = 0;
  state.hurtTimer = 0;
  state.bullets = [];
  state.enemies = [];
  state.particles = [];
  state.player.x = state.width / 2;
  state.player.y = state.height * 0.78;
  state.player.health = state.player.maxHealth;
  updateHud();
}

/** 显示指定界面并隐藏其他界面。 */
function showScreen(name) {
  [ui.startMenu, ui.pauseMenu, ui.gameOverMenu, ui.clearMenu, ui.helpMenu].filter(Boolean).forEach((screen) => {
    screen.classList.remove("screen--active");
  });
  if (name) {
    ui[name].classList.add("screen--active");
  }
}

/** 切换 HUD 与暂停按钮的显示状态。 */
function setGameUiVisible(visible) {
  ui.hud.classList.toggle("is-visible", visible);
  ui.skillPad.classList.toggle("is-visible", visible);
  ui.pauseButton.classList.toggle("is-visible", visible);
}

/** 开始一局新游戏。 */
function startGame() {
  resetGame();
  state.mode = "playing";
  showScreen(null);
  setGameUiVisible(true);
}

/** 暂停正在进行的游戏。 */
function pauseGame() {
  if (state.mode !== "playing") return;
  state.mode = "paused";
  showScreen("pauseMenu");
}

/** 从暂停状态恢复游戏。 */
function resumeGame() {
  if (state.mode !== "paused") return;
  state.mode = "playing";
  state.lastTime = performance.now();
  showScreen(null);
}

/** 返回主菜单并隐藏游戏 HUD。 */
function goHome() {
  state.mode = "menu";
  clearVideoTimer();
  cancelScoreRoll();
  ui.clearVideoOverlay.classList.remove("is-visible");
  ui.clearVideoOverlay.classList.remove("is-result");
  ui.clearVideo.pause();
  ui.clearResultPanel.classList.remove("is-visible");
  showScreen("startMenu");
  setGameUiVisible(false);
}

/** 结束游戏并显示最终得分。 */
function endGame() {
  state.mode = "gameover";
  ui.finalScore.textContent = state.score;
  showScreen("gameOverMenu");
  setGameUiVisible(false);
}

/** 触发通关动画并清理仍在场上的敌机。 */
function triggerStageClear() {
  state.mode = "clearAnimation";
  state.clearTimer = 0;
  state.pointer.active = false;
  state.enemies.forEach((enemy) => createExplosion(enemy.x, enemy.y, "#facc15", 18));
  state.enemies = [];
  state.bullets = [];
  setGameUiVisible(false);
}

/** 动画结束后显示通关结果界面。 */
function showStageClearMenu() {
  clearVideoTimer();
  cancelScoreRoll();
  state.mode = "clear";
  ui.clearVideo.pause();
  ui.clearVideoOverlay.classList.add("is-visible");
  ui.clearVideoOverlay.classList.add("is-result");
  ui.clearResultPanel.classList.add("is-visible");
  ui.clearScore.textContent = "0";
  rollClearScore(state.score);
}

/** 让通关评分从 0 平滑滚动到最终分数。 */
function rollClearScore(targetScore) {
  const duration = 1500;
  const startTime = performance.now();
  const tick = (time) => {
    const progress = clamp((time - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ui.clearScore.textContent = Math.floor(targetScore * eased);
    if (progress < 1) {
      state.scoreRollFrame = requestAnimationFrame(tick);
    } else {
      ui.clearScore.textContent = targetScore;
      state.scoreRollFrame = null;
    }
  };
  state.scoreRollFrame = requestAnimationFrame(tick);
}

/** 取消正在进行的通关评分滚动动画。 */
function cancelScoreRoll() {
  if (state.scoreRollFrame) {
    cancelAnimationFrame(state.scoreRollFrame);
    state.scoreRollFrame = null;
  }
}

/** 显示并播放通关视频，播放失败时使用 Canvas 通关动画兜底。 */
function playClearVideo() {
  clearVideoTimer();
  cancelScoreRoll();
  state.mode = "clearVideo";
  ui.clearResultPanel.classList.remove("is-visible");
  ui.clearVideoOverlay.classList.remove("is-result");
  ui.clearVideoOverlay.classList.add("is-visible");
  ui.clearVideo.currentTime = 0;
  const playPromise = ui.clearVideo.play();
  state.clearVideoTimeout = window.setTimeout(showStageClearMenu, 9000);
  if (playPromise) {
    playPromise.catch(() => {
      clearVideoTimer();
      showStageClearMenu();
    });
  }
}

/** 清除通关视频的兜底计时器，避免重复弹出界面。 */
function clearVideoTimer() {
  if (state.clearVideoTimeout) {
    window.clearTimeout(state.clearVideoTimeout);
    state.clearVideoTimeout = null;
  }
}

/** 从通关界面进入更高难度的下一轮挑战。 */
function continueChallenge() {
  state.mode = "playing";
  state.clearTarget += 650;
  state.clearTimer = 0;
  clearVideoTimer();
  cancelScoreRoll();
  ui.clearVideoOverlay.classList.remove("is-visible");
  ui.clearVideoOverlay.classList.remove("is-result");
  ui.clearVideo.pause();
  ui.clearResultPanel.classList.remove("is-visible");
  state.player.health = state.player.maxHealth;
  state.player.x = state.width / 2;
  state.player.y = state.height * 0.78;
  state.spawnTimer = 0.45;
  state.shootTimer = 0;
  showScreen(null);
  setGameUiVisible(true);
  updateHud();
}

/** 更新页面上的分数、血量和等级显示。 */
function updateHud() {
  ui.scoreText.textContent = state.score;
  ui.levelText.textContent = state.level;
  ui.healthBar.style.width = `${clamp(state.player.health, 0, state.player.maxHealth)}%`;
}

/** 生成一架从屏幕上方进入的敌机。 */
function spawnEnemy() {
  const size = randomRange(22, 38) * state.scale;
  const speed = randomRange(92, 160) + state.level * 14;
  state.enemies.push({
    x: randomRange(size, state.width - size),
    y: -size,
    radius: size,
    speed,
    health: Math.ceil(size / 13) + Math.floor(state.level / 3),
    value: Math.floor(size * 4)
  });
}

/** 创建玩家自动发射的子弹。 */
function shootBullet() {
  const spread = state.level >= 4 ? 16 : 0;
  state.bullets.push(createBullet(state.player.x, state.player.y - 28, 0));
  if (spread) {
    state.bullets.push(createBullet(state.player.x - spread, state.player.y - 20, -70));
    state.bullets.push(createBullet(state.player.x + spread, state.player.y - 20, 70));
  }
}

/** 构造一颗子弹对象。 */
function createBullet(x, y, drift) {
  return {
    x,
    y,
    drift,
    radius: 5 * state.scale,
    speed: 650
  };
}

/** 在指定位置创建爆炸粒子。 */
function createExplosion(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: randomRange(-180, 180),
      vy: randomRange(-180, 180),
      life: randomRange(0.28, 0.72),
      maxLife: 0.72,
      size: randomRange(2, 6) * state.scale,
      color
    });
  }
}

/** 计算两个圆形对象是否发生碰撞。 */
function isCircleColliding(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.hypot(dx, dy);
  return distance < a.radius + b.radius;
}

/** 根据键盘和触摸输入移动玩家飞机。 */
function updatePlayer(delta) {
  let dx = 0;
  let dy = 0;
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) dx -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) dx += 1;
  if (state.keys.has("ArrowUp") || state.keys.has("KeyW")) dy -= 1;
  if (state.keys.has("ArrowDown") || state.keys.has("KeyS")) dy += 1;
  if (state.pointer.active) {
    dx += clamp((state.pointer.x - state.pointer.startX) / 42, -1, 1);
    dy += clamp((state.pointer.y - state.pointer.startY) / 42, -1, 1);
  }
  const length = Math.hypot(dx, dy) || 1;
  state.player.x += (dx / length) * state.player.speed * delta;
  state.player.y += (dy / length) * state.player.speed * delta;
  state.player.x = clamp(state.player.x, 28, state.width - 28);
  state.player.y = clamp(state.player.y, 88, state.height - 28);
}

/** 更新背景星点的位置。 */
function updateStars(delta) {
  state.stars.forEach((star) => {
    star.y += star.speed * delta;
    if (star.y > state.height) {
      star.y = -8;
      star.x = Math.random() * state.width;
    }
  });
}

/** 更新子弹、敌机、粒子和生成计时器。 */
function updateObjects(delta) {
  state.shootTimer -= delta;
  state.spawnTimer -= delta;
  state.hurtTimer = Math.max(0, state.hurtTimer - delta);
  state.level = 1 + Math.floor(state.score / 650);
  if (state.shootTimer <= 0) {
    shootBullet();
    state.shootTimer = clamp(0.22 - state.level * 0.012, 0.11, 0.22);
  }
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = clamp(0.92 - state.level * 0.055, 0.32, 0.92);
  }
  state.bullets.forEach((bullet) => {
    bullet.y -= bullet.speed * delta;
    bullet.x += bullet.drift * delta;
  });
  state.enemies.forEach((enemy) => {
    enemy.y += enemy.speed * delta;
  });
  state.particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
  });
  state.bullets = state.bullets.filter((bullet) => bullet.y > -30);
  state.enemies = state.enemies.filter((enemy) => enemy.y < state.height + 80 && enemy.health > 0);
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

/** 更新通关动画的计时、星流速度和战机冲刺位置。 */
function updateStageClear(delta) {
  state.clearTimer += delta;
  state.player.x += (state.width / 2 - state.player.x) * Math.min(delta * 4, 1);
  state.player.y -= (280 + state.clearTimer * 220) * delta;
  if (state.player.y < state.height * 0.32) {
    state.player.y += (state.height * 0.32 - state.player.y) * Math.min(delta * 3, 1);
  }
  state.stars.forEach((star) => {
    star.y += (star.speed * 5 + state.clearTimer * 90) * delta;
    if (star.y > state.height) {
      star.y = -8;
      star.x = Math.random() * state.width;
    }
  });
  state.particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);
  if (state.clearTimer >= state.clearDuration) {
    playClearVideo();
  }
}

/** 检查子弹击中敌人与玩家碰撞敌机。 */
function handleCollisions() {
  state.bullets.forEach((bullet) => {
    state.enemies.forEach((enemy) => {
      if (!bullet.hit && isCircleColliding(bullet, enemy)) {
        bullet.hit = true;
        enemy.health -= 1;
        createExplosion(bullet.x, bullet.y, "#7dd3fc", 5);
        if (enemy.health <= 0) {
          state.score += enemy.value;
          createExplosion(enemy.x, enemy.y, "#fb923c", 24);
          if (state.score >= state.clearTarget && state.mode === "playing") {
            triggerStageClear();
          }
        }
      }
    });
  });
  state.bullets = state.bullets.filter((bullet) => !bullet.hit);
  state.enemies.forEach((enemy) => {
    if (!enemy.crashed && isCircleColliding(state.player, enemy)) {
      enemy.crashed = true;
      enemy.health = 0;
      state.hurtTimer = 0.42;
      state.player.health -= 20;
      createExplosion(enemy.x, enemy.y, "#ef4444", 28);
      if (state.player.health <= 0) {
        state.player.health = 0;
        endGame();
      }
    }
  });
  updateHud();
}

/** 绘制深空和星舰甲板风格背景。 */
function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.55, "#0f172a");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.strokeStyle = "rgba(14, 165, 233, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 0; y < state.height; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y + 22);
    ctx.stroke();
  }
  state.stars.forEach((star) => {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(star.x, star.y, star.size, star.size * 2.4);
  });
  ctx.globalAlpha = 1;
}

/** 绘制玩家飞机。 */
function drawPlayer() {
  const p = state.player;
  const s = state.scale;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (state.hurtTimer > 0 && Math.floor(state.hurtTimer * 24) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 18 * s;
  ctx.fillStyle = "rgba(14, 165, 233, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 12 * s, 36 * s, 54 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const wingGradient = ctx.createLinearGradient(-42 * s, -8 * s, 42 * s, 20 * s);
  wingGradient.addColorStop(0, "#dbeafe");
  wingGradient.addColorStop(0.36, "#38bdf8");
  wingGradient.addColorStop(0.5, "#0f172a");
  wingGradient.addColorStop(0.64, "#f8fafc");
  wingGradient.addColorStop(1, "#7dd3fc");
  ctx.fillStyle = wingGradient;
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(0, -38 * s);
  ctx.lineTo(19 * s, -6 * s);
  ctx.lineTo(46 * s, 18 * s);
  ctx.lineTo(15 * s, 14 * s);
  ctx.lineTo(8 * s, 36 * s);
  ctx.lineTo(0, 20 * s);
  ctx.lineTo(-8 * s, 36 * s);
  ctx.lineTo(-15 * s, 14 * s);
  ctx.lineTo(-46 * s, 18 * s);
  ctx.lineTo(-19 * s, -6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const bodyGradient = ctx.createLinearGradient(0, -42 * s, 0, 38 * s);
  bodyGradient.addColorStop(0, "#f8fafc");
  bodyGradient.addColorStop(0.36, "#93c5fd");
  bodyGradient.addColorStop(0.72, "#1d4ed8");
  bodyGradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(0, -46 * s);
  ctx.bezierCurveTo(13 * s, -18 * s, 16 * s, 12 * s, 0, 35 * s);
  ctx.bezierCurveTo(-16 * s, 12 * s, -13 * s, -18 * s, 0, -46 * s);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 16 * s;
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.ellipse(0, -18 * s, 5 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = 14 * s;
  ctx.fillStyle = "#e0f2fe";
  ctx.fillRect(-28 * s, 12 * s, 8 * s, 5 * s);
  ctx.fillRect(20 * s, 12 * s, 8 * s, 5 * s);

  const flameGradient = ctx.createLinearGradient(0, 24 * s, 0, 64 * s);
  flameGradient.addColorStop(0, "#f8fafc");
  flameGradient.addColorStop(0.32, "#38bdf8");
  flameGradient.addColorStop(0.68, "#f97316");
  flameGradient.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = flameGradient;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 20 * s;
  ctx.beginPath();
  ctx.moveTo(-9 * s, 27 * s);
  ctx.lineTo(0, (54 + Math.sin(performance.now() / 80) * 8) * s);
  ctx.lineTo(9 * s, 27 * s);
  ctx.fill();
  ctx.restore();
}

/** 绘制单个敌机。 */
function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = "#475569";
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, enemy.radius);
  ctx.lineTo(enemy.radius * 0.72, -enemy.radius * 0.45);
  ctx.lineTo(0, -enemy.radius * 0.15);
  ctx.lineTo(-enemy.radius * 0.72, -enemy.radius * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 绘制所有子弹。 */
function drawBullets() {
  state.bullets.forEach((bullet) => {
    const gradient = ctx.createLinearGradient(bullet.x, bullet.y + 14, bullet.x, bullet.y - 18);
    gradient.addColorStop(0, "rgba(14, 165, 233, 0)");
    gradient.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(bullet.x - 3, bullet.y - 18, 6, 28, 4);
    ctx.fill();
  });
}

/** 绘制爆炸和命中特效粒子。 */
function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/** 绘制手机虚拟摇杆。 */
function drawJoystick() {
  if (!state.pointer.active && state.mode !== "playing") return;
  const baseX = state.pointer.active ? state.pointer.startX : 86;
  const baseY = state.pointer.active ? state.pointer.startY : state.height - 92;
  const knobX = state.pointer.active ? state.pointer.x : baseX;
  const knobY = state.pointer.active ? state.pointer.y : baseY;
  ctx.save();
  ctx.globalAlpha = 0.74;
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(baseX, baseY, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(14, 165, 233, 0.22)";
  ctx.beginPath();
  ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 绘制一圈通关能量环。 */
function drawClearRing(progress, offset, color) {
  const ringProgress = clamp((progress - offset) / 0.42, 0, 1);
  if (ringProgress <= 0 || ringProgress >= 1) return;
  const radius = ringProgress * Math.max(state.width, state.height) * 0.55;
  ctx.save();
  ctx.globalAlpha = (1 - ringProgress) * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = (8 + 18 * (1 - ringProgress)) * state.scale;
  ctx.shadowBlur = 26;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(state.width / 2, state.height * 0.45, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** 绘制通关时的文字、扫光和爆闪特效。 */
function drawStageClear() {
  const progress = clamp(state.clearTimer / state.clearDuration, 0, 1);
  const pulse = 0.5 + Math.sin(state.clearTimer * 12) * 0.5;
  drawClearRing(progress, 0.04, "#38bdf8");
  drawClearRing(progress, 0.18, "#facc15");
  drawClearRing(progress, 0.32, "#e0f2fe");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const beam = ctx.createLinearGradient(0, 0, state.width, state.height);
  beam.addColorStop(0, "rgba(56, 189, 248, 0)");
  beam.addColorStop(0.5, `rgba(250, 204, 21, ${0.1 + pulse * 0.18})`);
  beam.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = beam;
  ctx.translate(state.width * (progress * 1.8 - 0.6), 0);
  ctx.rotate(-0.28);
  ctx.fillRect(-80, -state.height * 0.2, 160, state.height * 1.5);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 24 + pulse * 18;
  ctx.fillStyle = `rgba(224, 242, 254, ${clamp(progress * 2.8, 0, 1)})`;
  ctx.font = `900 ${Math.floor(clamp(state.width * 0.075, 42, 92))}px Arial, Microsoft YaHei`;
  ctx.fillText("关卡通过", state.width / 2, state.height * 0.42);
  ctx.shadowColor = "#facc15";
  ctx.fillStyle = `rgba(250, 204, 21, ${clamp((progress - 0.18) * 2.8, 0, 1)})`;
  ctx.font = `800 ${Math.floor(clamp(state.width * 0.026, 18, 34))}px Arial, Microsoft YaHei`;
  ctx.fillText("CLEAR  SCORE  " + state.score, state.width / 2, state.height * 0.52);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = clamp((progress - 0.08) * 2, 0, 0.8);
  ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 0.22 - Math.abs(progress - 0.55) * 0.6)})`;
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.restore();
}

/** 绘制一帧完整游戏画面。 */
function draw() {
  drawBackground();
  drawBullets();
  state.enemies.forEach(drawEnemy);
  drawPlayer();
  drawParticles();
  drawJoystick();
  if (state.mode === "clearAnimation") {
    drawStageClear();
  }
}

/** 主循环：计算帧间隔、更新状态并绘制画面。 */
function gameLoop(time) {
  const delta = Math.min((time - state.lastTime) / 1000 || 0, 0.033);
  state.lastTime = time;
  if (state.mode === "playing") {
    updateStars(delta);
    updatePlayer(delta);
    updateObjects(delta);
    handleCollisions();
  } else if (state.mode === "clearAnimation") {
    updateStageClear(delta);
  } else {
    updateStars(delta);
  }
  draw();
  requestAnimationFrame(gameLoop);
}

/** 处理键盘按下事件。 */
function handleKeyDown(event) {
  if (event.code === "Space") {
    event.preventDefault();
    state.mode === "playing" ? pauseGame() : resumeGame();
    return;
  }
  state.keys.add(event.code);
}

/** 处理键盘松开事件。 */
function handleKeyUp(event) {
  state.keys.delete(event.code);
}

/** 开始记录触摸或鼠标拖动输入。 */
function handlePointerDown(event) {
  if (state.mode !== "playing") return;
  state.pointer.active = true;
  state.pointer.id = event.pointerId;
  state.pointer.startX = event.clientX;
  state.pointer.startY = event.clientY;
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
}

/** 更新触摸或鼠标拖动输入的位置。 */
function handlePointerMove(event) {
  if (!state.pointer.active || state.pointer.id !== event.pointerId) return;
  const dx = event.clientX - state.pointer.startX;
  const dy = event.clientY - state.pointer.startY;
  const distance = Math.hypot(dx, dy);
  const limit = 52;
  const ratio = distance > limit ? limit / distance : 1;
  state.pointer.x = state.pointer.startX + dx * ratio;
  state.pointer.y = state.pointer.startY + dy * ratio;
}

/** 停止记录触摸或鼠标拖动输入。 */
function handlePointerUp(event) {
  if (state.pointer.id !== event.pointerId) return;
  state.pointer.active = false;
  state.pointer.id = null;
}

/** 绑定按钮、键盘、触摸和窗口尺寸事件。 */
function bindEvents() {
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  ui.clearVideo.addEventListener("ended", showStageClearMenu);
  ui.clearVideo.addEventListener("error", () => {
    clearVideoTimer();
    showStageClearMenu();
  });
  ui.startButton.addEventListener("click", startGame);
  ui.pauseButton.addEventListener("click", pauseGame);
  ui.resumeButton.addEventListener("click", resumeGame);
  ui.restartButton.addEventListener("click", startGame);
  ui.continueButton.addEventListener("click", continueChallenge);
  ui.restartFromPauseButton.addEventListener("click", startGame);
  ui.homeButton.addEventListener("click", goHome);
  ui.homeFromPauseButton.addEventListener("click", goHome);
  ui.homeFromClearButton.addEventListener("click", goHome);
  ui.helpButton.addEventListener("click", () => showScreen("helpMenu"));
  ui.closeHelpButton.addEventListener("click", () => showScreen("startMenu"));
}

/** 初始化游戏尺寸、事件和动画循环。 */
function init() {
  resizeCanvas();
  bindEvents();
  ui.clearVideoOverlay.classList.remove("is-visible");
  ui.clearVideo.pause();
  setGameUiVisible(false);
  requestAnimationFrame(gameLoop);
}

init();
