/* ================================================
   SNAKE — Game Engine
   ================================================ */

(function () {
    'use strict';

    // ---- Constants ----
    const GRID_SIZE = 20;
    const SPEEDS = { easy: 140, normal: 100, hard: 65 };
    const LEVEL_THRESHOLD = 5;       // points per level
    const SPEED_INCREASE = 0.92;     // multiplier per level (faster)
    const PARTICLE_COUNT = 12;
    const STORAGE_KEY = 'snake_highscore';

    // ---- Audio Engine (Web Audio API) ----
    class Audio {
        constructor() {
            this.enabled = true;
            this.ctx = null;
        }

        init() {
            if (this.ctx) return;
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }

        play(type) {
            if (!this.enabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            switch (type) {
                case 'eat':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'die':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);
                    break;
                case 'levelup':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523, now);
                    osc.frequency.setValueAtTime(659, now + 0.1);
                    osc.frequency.setValueAtTime(784, now + 0.2);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.start(now);
                    osc.stop(now + 0.35);
                    break;
                case 'move':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, now);
                    gain.gain.setValueAtTime(0.02, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    osc.start(now);
                    osc.stop(now + 0.05);
                    break;
            }
        }

        toggle() {
            this.enabled = !this.enabled;
        }
    }

    // ---- Particle System ----
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.life = 1;
            this.decay = 0.02 + Math.random() * 0.03;
            this.size = 2 + Math.random() * 3;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;
            this.vx *= 0.97;
            this.vy *= 0.97;
        }

        draw(ctx) {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        get dead() {
            return this.life <= 0;
        }
    }

    // ---- Main Game ----
    class SnakeGame {
        constructor() {
            // DOM
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.screens = {
                start: document.getElementById('start-screen'),
                game: document.getElementById('game-screen'),
                gameover: document.getElementById('gameover-screen'),
            };
            this.els = {
                score: document.getElementById('score'),
                level: document.getElementById('level'),
                highscore: document.getElementById('highscore'),
                finalScore: document.getElementById('final-score'),
                finalLength: document.getElementById('final-length'),
                finalLevel: document.getElementById('final-level'),
                gameoverTitle: document.getElementById('gameover-title'),
                newHighscore: document.getElementById('new-highscore'),
                pauseOverlay: document.getElementById('pause-overlay'),
                countdownOverlay: document.getElementById('countdown-overlay'),
                countdownNumber: document.getElementById('countdown-number'),
                soundOn: document.getElementById('sound-on-icon'),
                soundOff: document.getElementById('sound-off-icon'),
            };

            // State
            this.audio = new Audio();
            this.particles = [];
            this.difficulty = 'normal';
            this.highScore = parseInt(localStorage.getItem(STORAGE_KEY)) || 0;
            this.animationId = null;
            this.gameLoopTimer = null;
            this.paused = false;
            this.running = false;
            this.inputQueue = [];

            this.bindEvents();
            this.showScreen('start');
            this.updateHighscoreDisplay();
        }

        // ---- Screen Management ----

        showScreen(name) {
            Object.values(this.screens).forEach(s => s.classList.remove('active'));
            this.screens[name].classList.add('active');
        }

        // ---- Event Binding ----

        bindEvents() {
            // Start
            document.getElementById('btn-start').addEventListener('click', () => this.startGame());

            // Difficulty
            document.querySelectorAll('.diff-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.difficulty = btn.dataset.speed;
                });
            });

            // Game controls
            document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
            document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
            document.getElementById('btn-sound').addEventListener('click', () => this.toggleSound());
            document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
            document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
            document.getElementById('btn-menu').addEventListener('click', () => this.quitToMenu());

            // Keyboard
            document.addEventListener('keydown', (e) => this.handleKey(e));

            // Touch (swipe)
            this.bindTouch();

            // Resize
            window.addEventListener('resize', () => {
                if (this.running) this.resizeCanvas();
            });
        }

        handleKey(e) {
            const key = e.key;

            // Start screen — Enter or Space starts
            if (this.screens.start.classList.contains('active')) {
                if (key === 'Enter' || key === ' ') {
                    e.preventDefault();
                    this.startGame();
                }
                return;
            }

            // Game over screen — Enter or Space retries
            if (this.screens.gameover.classList.contains('active')) {
                if (key === 'Enter' || key === ' ') {
                    e.preventDefault();
                    this.startGame();
                }
                return;
            }

            if (!this.running) return;

            // Pause
            if (key === ' ' || key === 'Escape') {
                e.preventDefault();
                this.togglePause();
                return;
            }

            if (this.paused) return;

            // Direction
            const dirMap = {
                ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
                ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
                ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
                ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
            };

            const newDir = dirMap[key];
            if (newDir) {
                e.preventDefault();
                this.queueDirection(newDir);
            }
        }

        queueDirection(dir) {
            // Allow queuing up to 2 moves for responsive turning
            if (this.inputQueue.length >= 2) return;

            const lastDir = this.inputQueue.length > 0
                ? this.inputQueue[this.inputQueue.length - 1]
                : this.direction;

            // Prevent 180-degree turns
            if (lastDir.x + dir.x === 0 && lastDir.y + dir.y === 0) return;
            // Prevent duplicate
            if (lastDir.x === dir.x && lastDir.y === dir.y) return;

            this.inputQueue.push(dir);
        }

        bindTouch() {
            let startX, startY;
            const minSwipe = 30;

            this.canvas.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
            }, { passive: true });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });

            this.canvas.addEventListener('touchend', (e) => {
                if (!this.running || this.paused) return;
                const touch = e.changedTouches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;

                if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

                let dir;
                if (Math.abs(dx) > Math.abs(dy)) {
                    dir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
                } else {
                    dir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
                }
                this.queueDirection(dir);
            }, { passive: true });
        }

        // ---- Game Lifecycle ----

        startGame() {
            this.audio.init();
            this.resizeCanvas();
            this.resetState();
            this.showScreen('game');
            this.els.pauseOverlay.classList.add('hidden');
            this.countdown(() => {
                this.running = true;
                this.lastTick = performance.now();
                this.scheduleGameLoop();
                this.renderLoop();
            });
        }

        resetState() {
            const cols = Math.floor(this.canvas.width / this.cellSize);
            const rows = Math.floor(this.canvas.height / this.cellSize);
            this.cols = cols;
            this.rows = rows;

            const cx = Math.floor(cols / 2);
            const cy = Math.floor(rows / 2);
            this.snake = [
                { x: cx, y: cy },
                { x: cx - 1, y: cy },
                { x: cx - 2, y: cy },
            ];
            this.direction = { x: 1, y: 0 };
            this.inputQueue = [];
            this.food = null;
            this.score = 0;
            this.level = 1;
            this.paused = false;
            this.running = false;
            this.particles = [];
            this.currentSpeed = SPEEDS[this.difficulty];
            this.foodPulse = 0;

            this.updateHUD();
            this.spawnFood();
        }

        resizeCanvas() {
            const wrapper = this.canvas.parentElement;
            const maxW = wrapper.clientWidth - 32;
            const maxH = wrapper.clientHeight - 32;

            // Calculate cell size to fit nicely
            const cellSize = Math.floor(Math.min(maxW, maxH) / GRID_SIZE);
            this.cellSize = Math.max(cellSize, 12); // minimum 12px cells

            this.canvas.width = this.cellSize * GRID_SIZE;
            this.canvas.height = this.cellSize * GRID_SIZE;

            if (this.cols) {
                this.cols = GRID_SIZE;
                this.rows = GRID_SIZE;
            }
        }

        countdown(callback) {
            const overlay = this.els.countdownOverlay;
            const numEl = this.els.countdownNumber;
            overlay.classList.remove('hidden');

            let count = 3;
            const tick = () => {
                if (count <= 0) {
                    overlay.classList.add('hidden');
                    callback();
                    return;
                }
                numEl.textContent = count;
                // Re-trigger animation
                numEl.style.animation = 'none';
                numEl.offsetHeight; // reflow
                numEl.style.animation = '';
                count--;
                setTimeout(tick, 800);
            };
            tick();
        }

        scheduleGameLoop() {
            if (!this.running || this.paused) return;
            this.gameLoopTimer = setTimeout(() => {
                this.tick();
                this.scheduleGameLoop();
            }, this.currentSpeed);
        }

        stopGameLoop() {
            clearTimeout(this.gameLoopTimer);
            cancelAnimationFrame(this.animationId);
        }

        // ---- Game Tick ----

        tick() {
            // Process input queue
            if (this.inputQueue.length > 0) {
                this.direction = this.inputQueue.shift();
            }

            const head = this.snake[0];
            const newHead = {
                x: head.x + this.direction.x,
                y: head.y + this.direction.y,
            };

            // Wall collision
            if (newHead.x < 0 || newHead.x >= this.cols ||
                newHead.y < 0 || newHead.y >= this.rows) {
                this.gameOver();
                return;
            }

            // Self collision
            if (this.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
                this.gameOver();
                return;
            }

            this.snake.unshift(newHead);

            // Food collision
            if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
                this.eatFood();
            } else {
                this.snake.pop();
            }
        }

        eatFood() {
            this.score++;
            this.audio.play('eat');

            // Particles at food position
            const px = this.food.x * this.cellSize + this.cellSize / 2;
            const py = this.food.y * this.cellSize + this.cellSize / 2;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                this.particles.push(new Particle(px, py, '#ff6b6b'));
            }

            // Level up
            const newLevel = Math.floor(this.score / LEVEL_THRESHOLD) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.currentSpeed = Math.max(40, SPEEDS[this.difficulty] * Math.pow(SPEED_INCREASE, this.level - 1));
                this.audio.play('levelup');

                // Extra particles for level up
                for (let i = 0; i < 20; i++) {
                    this.particles.push(new Particle(px, py, '#feca57'));
                }
            }

            this.updateHUD();
            this.spawnFood();
        }

        spawnFood() {
            const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
            const free = [];
            for (let x = 0; x < this.cols; x++) {
                for (let y = 0; y < this.rows; y++) {
                    if (!occupied.has(`${x},${y}`)) {
                        free.push({ x, y });
                    }
                }
            }
            if (free.length === 0) {
                this.gameOver();
                return;
            }
            this.food = free[Math.floor(Math.random() * free.length)];
        }

        gameOver() {
            this.running = false;
            this.stopGameLoop();
            this.audio.play('die');

            // Death particles from head
            const head = this.snake[0];
            const px = head.x * this.cellSize + this.cellSize / 2;
            const py = head.y * this.cellSize + this.cellSize / 2;
            for (let i = 0; i < 30; i++) {
                this.particles.push(new Particle(px, py, '#a29bfe'));
            }

            // Flash the canvas briefly
            setTimeout(() => {
                // Update high score
                const isNew = this.score > this.highScore;
                if (isNew) {
                    this.highScore = this.score;
                    localStorage.setItem(STORAGE_KEY, this.highScore);
                }

                // Show game over screen
                this.els.finalScore.textContent = this.score;
                this.els.finalLength.textContent = this.snake.length;
                this.els.finalLevel.textContent = this.level;
                this.els.newHighscore.classList.toggle('hidden', !isNew);
                this.els.gameoverTitle.textContent = isNew ? 'Neuer Rekord!' : 'Game Over';
                this.els.gameoverTitle.style.color = isNew ? '#feca57' : '#ff6b6b';
                this.updateHighscoreDisplay();
                this.showScreen('gameover');
            }, 600);
        }

        togglePause() {
            if (!this.running) return;
            this.paused = !this.paused;
            this.els.pauseOverlay.classList.toggle('hidden', !this.paused);

            if (this.paused) {
                clearTimeout(this.gameLoopTimer);
            } else {
                this.scheduleGameLoop();
                this.renderLoop();
            }
        }

        toggleSound() {
            this.audio.toggle();
            this.els.soundOn.classList.toggle('hidden', !this.audio.enabled);
            this.els.soundOff.classList.toggle('hidden', this.audio.enabled);
        }

        quitToMenu() {
            this.running = false;
            this.paused = false;
            this.stopGameLoop();
            this.showScreen('start');
            this.updateHighscoreDisplay();
        }

        // ---- HUD ----

        updateHUD() {
            this.animateStat(this.els.score, this.score);
            this.animateStat(this.els.level, this.level);
        }

        updateHighscoreDisplay() {
            this.els.highscore.textContent = this.highScore;
        }

        animateStat(el, value) {
            el.textContent = value;
            el.classList.remove('bump');
            el.offsetHeight; // reflow
            el.classList.add('bump');
        }

        // ---- Rendering ----

        renderLoop() {
            if (!this.running && this.particles.length === 0) return;

            this.foodPulse += 0.06;
            this.draw();
            this.animationId = requestAnimationFrame(() => this.renderLoop());
        }

        draw() {
            const ctx = this.ctx;
            const cs = this.cellSize;
            const w = this.canvas.width;
            const h = this.canvas.height;

            // Background
            ctx.fillStyle = '#12121a';
            ctx.fillRect(0, 0, w, h);

            // Grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
            ctx.lineWidth = 1;
            for (let x = 0; x <= this.cols; x++) {
                ctx.beginPath();
                ctx.moveTo(x * cs, 0);
                ctx.lineTo(x * cs, h);
                ctx.stroke();
            }
            for (let y = 0; y <= this.rows; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * cs);
                ctx.lineTo(w, y * cs);
                ctx.stroke();
            }

            // Food
            if (this.food) {
                this.drawFood(ctx, cs);
            }

            // Snake
            this.drawSnake(ctx, cs);

            // Particles
            this.updateParticles(ctx);
        }

        drawFood(ctx, cs) {
            const fx = this.food.x * cs + cs / 2;
            const fy = this.food.y * cs + cs / 2;
            const pulse = 1 + Math.sin(this.foodPulse) * 0.15;
            const radius = (cs / 2 - 2) * pulse;

            // Glow
            const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, cs * 1.5);
            glow.addColorStop(0, 'rgba(255, 107, 107, 0.2)');
            glow.addColorStop(1, 'rgba(255, 107, 107, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(fx, fy, cs * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Food body
            ctx.fillStyle = '#ff6b6b';
            ctx.shadowColor = '#ff6b6b';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(fx, fy, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(fx - radius * 0.25, fy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }

        drawSnake(ctx, cs) {
            const snake = this.snake;
            const gap = 1;

            for (let i = snake.length - 1; i >= 0; i--) {
                const seg = snake[i];
                const x = seg.x * cs + gap;
                const y = seg.y * cs + gap;
                const s = cs - gap * 2;

                if (i === 0) {
                    // Head — brighter + glow
                    ctx.fillStyle = '#6c5ce7';
                    ctx.shadowColor = '#6c5ce7';
                    ctx.shadowBlur = 10;
                    this.roundRect(ctx, x, y, s, s, 5);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Eyes
                    this.drawEyes(ctx, seg, cs);
                } else {
                    // Body gradient: fade from bright to dim
                    const t = i / snake.length;
                    const r = Math.round(162 - t * 60);
                    const g = Math.round(155 - t * 60);
                    const b = Math.round(254 - t * 40);
                    const alpha = 1 - t * 0.4;
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

                    const radius = Math.max(2, 4 - t * 3);
                    this.roundRect(ctx, x, y, s, s, radius);
                    ctx.fill();
                }
            }
        }

        drawEyes(ctx, head, cs) {
            const dir = this.direction;
            const cx = head.x * cs + cs / 2;
            const cy = head.y * cs + cs / 2;
            const eyeOff = cs * 0.2;
            const eyeR = cs * 0.1;
            const pupilR = cs * 0.05;

            let e1x, e1y, e2x, e2y;
            if (dir.x === 1) {       // right
                e1x = cx + eyeOff; e1y = cy - eyeOff;
                e2x = cx + eyeOff; e2y = cy + eyeOff;
            } else if (dir.x === -1) { // left
                e1x = cx - eyeOff; e1y = cy - eyeOff;
                e2x = cx - eyeOff; e2y = cy + eyeOff;
            } else if (dir.y === -1) { // up
                e1x = cx - eyeOff; e1y = cy - eyeOff;
                e2x = cx + eyeOff; e2y = cy - eyeOff;
            } else {                   // down
                e1x = cx - eyeOff; e1y = cy + eyeOff;
                e2x = cx + eyeOff; e2y = cy + eyeOff;
            }

            // Eye whites
            ctx.fillStyle = '#e8e8f0';
            ctx.beginPath();
            ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#0a0a0f';
            ctx.beginPath();
            ctx.arc(e1x + dir.x * pupilR, e1y + dir.y * pupilR, pupilR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(e2x + dir.x * pupilR, e2y + dir.y * pupilR, pupilR, 0, Math.PI * 2);
            ctx.fill();
        }

        roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        updateParticles(ctx) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                p.draw(ctx);
                if (p.dead) {
                    this.particles.splice(i, 1);
                }
            }
        }
    }

    // ---- Initialize ----
    document.addEventListener('DOMContentLoaded', () => {
        new SnakeGame();
    });
})();
