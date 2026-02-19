class BioDefenseGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.ui = {
            health: document.getElementById('base-health'),
            credits: document.getElementById('credits'),
            wave: document.getElementById('wave'),
            kills: document.getElementById('kills'),
            towerList: document.getElementById('tower-list'),
            selectedTowerText: document.getElementById('selected-tower-text'),
            upgradeBtn: document.getElementById('upgrade-btn'),
            sellBtn: document.getElementById('sell-btn'),
            message: document.getElementById('floating-message'),
            modal: document.getElementById('modal'),
            modalTitle: document.getElementById('modal-title'),
            modalText: document.getElementById('modal-text')
        };

        this.path = [
            { x: 0, y: 90 }, { x: 220, y: 90 }, { x: 220, y: 210 },
            { x: 420, y: 210 }, { x: 420, y: 360 }, { x: 670, y: 360 },
            { x: 670, y: 150 }, { x: 900, y: 150 }
        ];

        this.towerSpots = [
            { x: 145, y: 180 }, { x: 300, y: 125 }, { x: 350, y: 295 },
            { x: 540, y: 250 }, { x: 590, y: 430 }, { x: 740, y: 265 },
            { x: 760, y: 80 }, { x: 490, y: 120 }
        ];

        this.towerTypes = [
            { id: 'acid', name: 'Säure-Turm', cost: 70, range: 130, rate: 0.8, damage: 20, color: '#7CFC00' },
            { id: 'pulse', name: 'EMP-Turm', cost: 100, range: 110, rate: 0.5, damage: 35, color: '#2fd3ff' },
            { id: 'flame', name: 'Flammen-Turm', cost: 130, range: 90, rate: 1.6, damage: 14, color: '#ff9f1c' }
        ];

        this.resetGame();
        this.bindEvents();
        this.renderTowerButtons();
        this.loop(0);
    }

    resetGame() {
        this.baseHealth = 20;
        this.credits = 180;
        this.wave = 0;
        this.kills = 0;
        this.speed = 1;
        this.isPaused = false;
        this.isGameOver = false;

        this.enemies = [];
        this.bullets = [];
        this.towers = [];
        this.selectedTowerType = this.towerTypes[0];
        this.selectedPlacedTower = null;

        this.spawnQueue = [];
        this.lastTime = 0;

        this.updateHUD();
        this.hideModal();
        this.selectTowerType(this.selectedTowerType.id);
    }

    bindEvents() {
        document.getElementById('start-wave-btn').addEventListener('click', () => this.startWave());
        document.getElementById('pause-btn').addEventListener('click', (event) => {
            this.isPaused = !this.isPaused;
            event.target.textContent = this.isPaused ? 'Fortsetzen' : 'Pause';
        });

        document.getElementById('speed-btn').addEventListener('click', (event) => {
            this.speed = this.speed === 1 ? 2 : 1;
            event.target.textContent = this.speed === 1 ? '2x Tempo' : '1x Tempo';
        });

        document.getElementById('restart-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('modal-button').addEventListener('click', () => this.resetGame());

        this.ui.upgradeBtn.addEventListener('click', () => this.upgradeTower());
        this.ui.sellBtn.addEventListener('click', () => this.sellTower());

        this.canvas.addEventListener('click', (event) => this.handleCanvasClick(event));
    }

    renderTowerButtons() {
        this.ui.towerList.innerHTML = '';
        this.towerTypes.forEach((tower) => {
            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            btn.dataset.id = tower.id;
            btn.innerHTML = `<strong>${tower.name}</strong><br><small>${tower.cost} Cr • DMG ${tower.damage}</small>`;
            btn.addEventListener('click', () => this.selectTowerType(tower.id));
            this.ui.towerList.appendChild(btn);
        });
    }

    selectTowerType(typeId) {
        this.selectedPlacedTower = null;
        this.selectedTowerType = this.towerTypes.find((t) => t.id === typeId);
        this.ui.towerList.querySelectorAll('.tower-btn').forEach((btn) => {
            btn.classList.toggle('selected', btn.dataset.id === typeId);
        });
        this.updateSelectedTowerPanel();
    }

    startWave() {
        if (this.spawnQueue.length > 0 || this.isGameOver) {
            return;
        }

        this.wave += 1;
        const count = 8 + this.wave * 3;
        for (let i = 0; i < count; i += 1) {
            this.spawnQueue.push({
                delay: i * 0.8,
                hp: 50 + this.wave * 15,
                speed: 45 + this.wave * 4,
                reward: 12 + this.wave
            });
        }
        this.showMessage(`Welle ${this.wave} gestartet!`);
        this.updateHUD();
    }

    spawnEnemy(data) {
        this.enemies.push({
            x: this.path[0].x,
            y: this.path[0].y,
            hp: data.hp,
            maxHp: data.hp,
            speed: data.speed,
            reward: data.reward,
            pathIndex: 0,
            radius: 14
        });
    }

    handleCanvasClick(event) {
        if (this.isGameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);

        const clickedTower = this.towers.find((tower) => Math.hypot(tower.x - x, tower.y - y) <= 22);
        if (clickedTower) {
            this.selectedPlacedTower = clickedTower;
            this.updateSelectedTowerPanel();
            return;
        }

        const spot = this.towerSpots.find((point) => Math.hypot(point.x - x, point.y - y) <= 26);
        if (!spot) return;

        const occupied = this.towers.some((tower) => tower.spotX === spot.x && tower.spotY === spot.y);
        if (occupied) {
            this.showMessage('Dieser Slot ist bereits belegt.');
            return;
        }

        if (this.credits < this.selectedTowerType.cost) {
            this.showMessage('Nicht genug Credits.');
            return;
        }

        this.credits -= this.selectedTowerType.cost;
        this.towers.push({
            ...this.selectedTowerType,
            x: spot.x,
            y: spot.y,
            spotX: spot.x,
            spotY: spot.y,
            cooldown: 0,
            level: 1,
            sellValue: Math.round(this.selectedTowerType.cost * 0.7)
        });

        this.showMessage(`${this.selectedTowerType.name} gebaut.`);
        this.updateHUD();
    }

    upgradeTower() {
        const tower = this.selectedPlacedTower;
        if (!tower) return;

        const price = Math.round(tower.cost * (0.75 + tower.level * 0.35));
        if (this.credits < price) {
            this.showMessage('Upgrade zu teuer.');
            return;
        }

        this.credits -= price;
        tower.level += 1;
        tower.damage = Math.round(tower.damage * 1.28);
        tower.range += 9;
        tower.sellValue += Math.round(price * 0.7);
        this.showMessage(`${tower.name} auf Level ${tower.level}.`);
        this.updateHUD();
        this.updateSelectedTowerPanel();
    }

    sellTower() {
        const tower = this.selectedPlacedTower;
        if (!tower) return;

        this.credits += tower.sellValue;
        this.towers = this.towers.filter((entry) => entry !== tower);
        this.selectedPlacedTower = null;
        this.showMessage('Turm verkauft.');
        this.updateHUD();
        this.updateSelectedTowerPanel();
    }

    updateSelectedTowerPanel() {
        if (!this.selectedPlacedTower) {
            this.ui.selectedTowerText.textContent = this.selectedTowerType
                ? `${this.selectedTowerType.name} ausgewählt (${this.selectedTowerType.cost} Cr).`
                : 'Kein Turm ausgewählt';
            this.ui.upgradeBtn.disabled = true;
            this.ui.sellBtn.disabled = true;
            return;
        }

        const tower = this.selectedPlacedTower;
        const price = Math.round(tower.cost * (0.75 + tower.level * 0.35));
        this.ui.selectedTowerText.textContent = `${tower.name} • Level ${tower.level} • DMG ${tower.damage} • Reichweite ${tower.range} • Upgrade ${price} Cr`;
        this.ui.upgradeBtn.disabled = false;
        this.ui.sellBtn.disabled = false;
    }

    updateHUD() {
        this.ui.health.textContent = this.baseHealth;
        this.ui.credits.textContent = this.credits;
        this.ui.wave.textContent = this.wave;
        this.ui.kills.textContent = this.kills;
    }

    showMessage(text) {
        this.ui.message.textContent = text;
        this.ui.message.classList.add('show');
        clearTimeout(this.messageTimer);
        this.messageTimer = setTimeout(() => this.ui.message.classList.remove('show'), 1300);
    }

    endGame(win = false) {
        this.isGameOver = true;
        this.ui.modalTitle.textContent = win ? 'Sieg! Labor gesichert' : 'Niederlage';
        this.ui.modalText.textContent = win
            ? `Du hast ${this.wave} Wellen überlebt und ${this.kills} Zombies eliminiert.`
            : `Die Zombies haben das Labor überrannt. Erreichte Welle: ${this.wave}.`;
        this.ui.modal.classList.remove('hidden');
    }

    hideModal() {
        this.ui.modal.classList.add('hidden');
    }

    update(dt) {
        if (this.isPaused || this.isGameOver) {
            return;
        }

        const scaledDt = dt * this.speed;

        this.spawnQueue.forEach((item) => {
            item.delay -= scaledDt;
        });
        while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= 0) {
            this.spawnEnemy(this.spawnQueue.shift());
        }

        this.enemies.forEach((enemy) => {
            const next = this.path[enemy.pathIndex + 1];
            if (!next) return;

            const dx = next.x - enemy.x;
            const dy = next.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 2) {
                enemy.pathIndex += 1;
                return;
            }
            enemy.x += (dx / dist) * enemy.speed * scaledDt;
            enemy.y += (dy / dist) * enemy.speed * scaledDt;
        });

        this.enemies = this.enemies.filter((enemy) => {
            const reachedEnd = enemy.pathIndex >= this.path.length - 1;
            if (!reachedEnd) return true;
            this.baseHealth -= 1;
            if (this.baseHealth <= 0) {
                this.baseHealth = 0;
                this.updateHUD();
                this.endGame(false);
            }
            return false;
        });

        this.towers.forEach((tower) => {
            tower.cooldown -= scaledDt;
            if (tower.cooldown > 0) return;

            const target = this.enemies.find((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range);
            if (!target) return;

            tower.cooldown = 1 / tower.rate;
            this.bullets.push({
                x: tower.x,
                y: tower.y,
                target,
                speed: 420,
                damage: tower.damage,
                color: tower.color,
                radius: 4
            });
        });

        this.bullets = this.bullets.filter((bullet) => {
            if (!this.enemies.includes(bullet.target)) {
                return false;
            }

            const dx = bullet.target.x - bullet.x;
            const dy = bullet.target.y - bullet.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 10) {
                bullet.target.hp -= bullet.damage;
                return false;
            }

            bullet.x += (dx / dist) * bullet.speed * scaledDt;
            bullet.y += (dy / dist) * bullet.speed * scaledDt;
            return true;
        });

        const before = this.enemies.length;
        this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
        const killed = before - this.enemies.length;
        if (killed > 0) {
            this.kills += killed;
            this.credits += killed * (12 + Math.floor(this.wave / 2));
        }

        if (this.wave >= 10 && this.enemies.length === 0 && this.spawnQueue.length === 0) {
            this.endGame(true);
        }

        this.updateHUD();
    }

    drawPath() {
        const { ctx } = this;
        ctx.strokeStyle = '#3f5ba8';
        ctx.lineWidth = 44;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i += 1) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#99afe9';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawTowerSpots() {
        this.towerSpots.forEach((spot) => {
            const occupied = this.towers.some((tower) => tower.spotX === spot.x && tower.spotY === spot.y);
            this.ctx.beginPath();
            this.ctx.arc(spot.x, spot.y, 20, 0, Math.PI * 2);
            this.ctx.fillStyle = occupied ? '#2a3154' : 'rgba(255,255,255,0.06)';
            this.ctx.fill();
            this.ctx.strokeStyle = occupied ? '#6f7fc6' : 'rgba(255,255,255,0.25)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }

    render() {
        const { ctx } = this;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawPath();
        this.drawTowerSpots();

        this.towers.forEach((tower) => {
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2);
            ctx.fillStyle = tower.color;
            ctx.fill();
            ctx.strokeStyle = '#0f142b';
            ctx.lineWidth = 3;
            ctx.stroke();

            if (tower === this.selectedPlacedTower) {
                ctx.beginPath();
                ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(47, 211, 255, 0.28)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        this.enemies.forEach((enemy) => {
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#93ff75';
            ctx.fill();

            ctx.fillStyle = '#0a0f1f';
            ctx.fillRect(enemy.x - 16, enemy.y - 24, 32, 4);
            ctx.fillStyle = '#ff4d6d';
            ctx.fillRect(enemy.x - 16, enemy.y - 24, 32 * (enemy.hp / enemy.maxHp), 4);
        });

        this.bullets.forEach((bullet) => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bullet.color;
            ctx.fill();
        });

        ctx.fillStyle = '#c1caee';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Labor-Eingang', 6, 74);
        ctx.fillText('Evakuierungszone', 760, 124);
    }

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.032);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();
        window.requestAnimationFrame((time) => this.loop(time));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new BioDefenseGame();
});
