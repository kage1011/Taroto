import { tarotDeck } from './data.js';

let selectedCards = [];

// KHỞI TẠO LƯỚI BÀI 78 LÁ
export function initFullDeckPreview() {
    const categoriesContainer = document.getElementById('deck-categories');
    if (!categoriesContainer) return;
    
    categoriesContainer.innerHTML = '';
    const categories = [...new Set(tarotDeck.map(card => card.cat))];

    categories.forEach(cat => {
        const catTitle = document.createElement('div');
        catTitle.className = 'category-title';
        catTitle.innerText = cat;
        categoriesContainer.appendChild(catTitle);

        const grid = document.createElement('div');
        grid.className = 'grid-cards';

        tarotDeck.filter(c => c.cat === cat).forEach(card => {
            const img = document.createElement('img');
            img.src = card.img;
            img.alt = card.name;
            img.title = card.name;
            img.className = 'preview-card-img';
            grid.appendChild(img);
        });

        categoriesContainer.appendChild(grid);
    });
}

// BẮT ĐẦU TRẢI BÀI
export function startSpread(count) {
    const display = document.getElementById('cards-display');
    const readings = document.getElementById('readings-container');
    display.innerHTML = '';
    readings.innerHTML = '';
    selectedCards = [];

    const shuffled = [...tarotDeck].sort(() => 0.5 - Math.random());
    const positions = count === 1 
        ? ["Thông điệp dành cho bạn"] 
        : ["1. Quá Khứ", "2. Hiện Tại", "3. Tương Lai"];

    for (let i = 0; i < count; i++) {
        const isReversed = Math.random() < 0.3;
        selectedCards.push({
            card: shuffled[i],
            isReversed: isReversed,
            position: positions[i]
        });

        const slot = document.createElement('div');
        slot.className = 'card-slot';
        slot.innerHTML = `
            <div class="slot-title">${positions[i]}</div>
            <div class="card ${isReversed ? 'is-reversed' : ''}">
                <div class="card-face card-front"></div>
                <div class="card-face card-back">
                    <img src="${shuffled[i].img}" alt="${shuffled[i].name}" class="card-face-image">
                </div>
            </div>
        `;
        
        // Gán sự kiện click lật bài
        const cardEl = slot.querySelector('.card');
        cardEl.addEventListener('click', () => flipCard(cardEl, i));

        display.appendChild(slot);
    }
}

// LẬT BÀI
function flipCard(cardEl, index) {
    if (cardEl.classList.contains('flipped')) return;
    cardEl.classList.add('flipped');
    setTimeout(() => { showReading(index); }, 500);
}

// HIỂN THỊ LỜI GIẢI
function showReading(index) {
    const data = selectedCards[index];
    const container = document.getElementById('readings-container');

    const readingCard = document.createElement('div');
    readingCard.className = 'reading-card';
    readingCard.innerHTML = `
        <span class="position-tag">${data.position}</span>
        <h3>${data.card.name} (${data.isReversed ? 'Lá Bài Ngược' : 'Lá Bài Xuôi'})</h3>
        <p><strong>Từ khóa:</strong> ${data.card.keywords}</p>
        <p style="margin-top: 8px;">${data.isReversed ? data.card.reversed : data.card.upright}</p>
    `;
    container.appendChild(readingCard);
}

// HIỆU ỨNG PARTICLE NỀN
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.alpha = Math.random() * 0.7 + 0.1;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) { this.reset(); }
        }
        draw() {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.alpha})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    for (let i = 0; i < 70; i++) { particles.push(new Particle()); }
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

// LỚP KHỞI TẠO TỰ ĐỘNG
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initFullDeckPreview();
    startSpread(1);

    // Gán sự kiện cho các nút bấm
    const btn1 = document.getElementById('btn-spread-1');
    const btn3 = document.getElementById('btn-spread-3');
    if (btn1) btn1.addEventListener('click', () => startSpread(1));
    if (btn3) btn3.addEventListener('click', () => startSpread(3));
});