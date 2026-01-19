class PaintByNumbers {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.palette = document.getElementById('palette');
        this.progressBar = document.getElementById('progress');
        this.progressText = document.getElementById('progress-text');
        this.completionMessage = document.getElementById('completion-message');

        this.selectedColor = null;
        this.regions = [];
        this.colors = [];

        this.initColors();
        this.initRegions();
        this.renderPalette();
        this.renderCanvas();
        this.attachEventListeners();
    }

    initColors() {
        this.colors = [
            { number: 1, color: '#FF6B6B', name: 'Rot' },
            { number: 2, color: '#4ECDC4', name: 'Türkis' },
            { number: 3, color: '#FFE66D', name: 'Gelb' },
            { number: 4, color: '#95E1D3', name: 'Mint' },
            { number: 5, color: '#F38181', name: 'Rosa' },
            { number: 6, color: '#AA96DA', name: 'Lila' },
        ];
    }

    initRegions() {
        // Create a simple geometric pattern with numbered regions
        const patterns = [
            // Center star
            { x: 300, y: 200, width: 150, height: 120, number: 1, type: 'rect' },
            { x: 200, y: 250, width: 120, height: 150, number: 2, type: 'rect' },
            { x: 380, y: 250, width: 120, height: 150, number: 3, type: 'rect' },

            // Top sections
            { x: 150, y: 100, width: 140, height: 100, number: 4, type: 'rect' },
            { x: 310, y: 100, width: 140, height: 100, number: 5, type: 'rect' },

            // Bottom sections
            { x: 150, y: 420, width: 140, height: 100, number: 6, type: 'rect' },
            { x: 310, y: 420, width: 140, height: 100, number: 1, type: 'rect' },

            // Side sections
            { x: 80, y: 250, width: 100, height: 120, number: 3, type: 'rect' },
            { x: 520, y: 250, width: 100, height: 120, number: 2, type: 'rect' },

            // Corner sections
            { x: 100, y: 100, width: 80, height: 80, number: 2, type: 'circle' },
            { x: 520, y: 100, width: 80, height: 80, number: 4, type: 'circle' },
            { x: 100, y: 520, width: 80, height: 80, number: 5, type: 'circle' },
            { x: 520, y: 520, width: 80, height: 80, number: 6, type: 'circle' },

            // Additional small sections
            { x: 250, y: 150, width: 70, height: 70, number: 6, type: 'circle' },
            { x: 380, y: 150, width: 70, height: 70, number: 1, type: 'circle' },
            { x: 250, y: 400, width: 70, height: 70, number: 4, type: 'circle' },
            { x: 380, y: 400, width: 70, height: 70, number: 3, type: 'circle' },
        ];

        this.regions = patterns.map((pattern, index) => ({
            id: index,
            ...pattern,
            filled: false,
            currentColor: null
        }));
    }

    renderPalette() {
        this.palette.innerHTML = '';

        this.colors.forEach(colorData => {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-item';
            colorItem.dataset.number = colorData.number;

            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = colorData.color;

            const number = document.createElement('div');
            number.className = 'color-number';
            number.textContent = colorData.number;

            colorItem.appendChild(swatch);
            colorItem.appendChild(number);

            colorItem.addEventListener('click', () => {
                document.querySelectorAll('.color-item').forEach(item => {
                    item.classList.remove('selected');
                });
                colorItem.classList.add('selected');
                this.selectedColor = colorData.number;
            });

            this.palette.appendChild(colorItem);
        });
    }

    renderCanvas() {
        this.canvas.innerHTML = '';

        this.regions.forEach(region => {
            const colorData = this.colors.find(c => c.number === region.number);

            let element;
            if (region.type === 'circle') {
                element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                element.setAttribute('cx', region.x + region.width / 2);
                element.setAttribute('cy', region.y + region.height / 2);
                element.setAttribute('r', region.width / 2);
            } else {
                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                element.setAttribute('x', region.x);
                element.setAttribute('y', region.y);
                element.setAttribute('width', region.width);
                element.setAttribute('height', region.height);
                element.setAttribute('rx', 10);
            }

            element.setAttribute('class', 'region');
            element.setAttribute('data-region-id', region.id);

            if (region.filled) {
                element.setAttribute('fill', colorData.color);
                element.classList.add('filled');
            } else {
                element.setAttribute('fill', '#f5f5f5');
            }

            element.addEventListener('click', () => this.fillRegion(region.id));

            this.canvas.appendChild(element);

            // Add number label
            if (!region.filled) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('class', 'region-number');

                if (region.type === 'circle') {
                    text.setAttribute('x', region.x + region.width / 2);
                    text.setAttribute('y', region.y + region.height / 2);
                } else {
                    text.setAttribute('x', region.x + region.width / 2);
                    text.setAttribute('y', region.y + region.height / 2);
                }

                text.textContent = region.number;
                this.canvas.appendChild(text);
            }
        });
    }

    fillRegion(regionId) {
        const region = this.regions.find(r => r.id === regionId);

        if (!region || region.filled) {
            return;
        }

        if (this.selectedColor === null) {
            this.showMessage('Bitte wählen Sie zuerst eine Farbe aus der Palette!');
            return;
        }

        if (this.selectedColor !== region.number) {
            this.showMessage('Falsche Farbe! Versuchen Sie es mit Farbe ' + region.number);
            this.shakeRegion(regionId);
            return;
        }

        region.filled = true;
        region.currentColor = this.selectedColor;

        this.renderCanvas();
        this.updateProgress();
        this.checkCompletion();
        this.updatePalette();
    }

    shakeRegion(regionId) {
        const element = this.canvas.querySelector(`[data-region-id="${regionId}"]`);
        element.style.animation = 'shake 0.5s';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    showMessage(message) {
        // Create temporary message
        const msg = document.createElement('div');
        msg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 999;
            font-weight: bold;
            color: #333;
        `;
        msg.textContent = message;
        document.body.appendChild(msg);

        setTimeout(() => {
            msg.remove();
        }, 2000);
    }

    updateProgress() {
        const total = this.regions.length;
        const filled = this.regions.filter(r => r.filled).length;
        const percentage = Math.round((filled / total) * 100);

        this.progressBar.style.width = percentage + '%';
        this.progressText.textContent = percentage + '% fertig';
    }

    updatePalette() {
        this.colors.forEach(colorData => {
            const remaining = this.regions.filter(r =>
                r.number === colorData.number && !r.filled
            ).length;

            const colorItem = this.palette.querySelector(`[data-number="${colorData.number}"]`);
            if (remaining === 0) {
                colorItem.classList.add('completed');
            }
        });
    }

    checkCompletion() {
        if (this.regions.every(r => r.filled)) {
            setTimeout(() => {
                this.completionMessage.classList.remove('hidden');
            }, 500);
        }
    }

    reset() {
        this.regions.forEach(region => {
            region.filled = false;
            region.currentColor = null;
        });
        this.selectedColor = null;
        this.completionMessage.classList.add('hidden');
        this.renderCanvas();
        this.renderPalette();
        this.updateProgress();
    }

    hint() {
        const unfilledRegions = this.regions.filter(r => !r.filled);
        if (unfilledRegions.length === 0) return;

        const randomRegion = unfilledRegions[Math.floor(Math.random() * unfilledRegions.length)];

        // Highlight the region briefly
        const element = this.canvas.querySelector(`[data-region-id="${randomRegion.id}"]`);
        const originalFill = element.getAttribute('fill');

        element.setAttribute('fill', '#FFD700');
        setTimeout(() => {
            element.setAttribute('fill', originalFill);
        }, 1000);

        this.showMessage(`Hinweis: Suchen Sie nach Region mit Nummer ${randomRegion.number}`);
    }

    attachEventListeners() {
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        document.getElementById('hint-btn').addEventListener('click', () => this.hint());
        document.getElementById('new-game-btn').addEventListener('click', () => this.reset());
    }
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PaintByNumbers();
});
