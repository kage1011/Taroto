import { tarotDeck } from './data.js';

/* ==========================================================
   TAROTO HOUSE - ENGINE & CONTROLLER
   ========================================================== */

// STATE
let currentSpreadMode = 1; // 1 hoặc 3 lá
let shuffledDeck = [];
let pickedCards = []; // Mảng lưu các lá người dùng tự tay chọn từ bộ xòe
let activeFanCards = []; // Các lá bài hiển thị trên quạt
let flippedCount = 0;
let isAIInProgress = false;
let soundEnabled = true;

/* ==========================================================
   1. WEB AUDIO API - HIỆU ỨNG ÂM THANH MA THUẬT (0 DEPENDENCY)
   ========================================================== */
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Chuông tiên khi lướt bài
function playChime(freq = 880) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (_) {}
}

// Hợp âm huyền bí khi chọn lá bài
function playPickSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.04);
            gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5 + idx * 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.04);
            osc.stop(ctx.currentTime + 0.55 + idx * 0.04);
        });
    } catch (_) {}
}

// Tiếng lật bài chuông pha lê
function playFlipSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
        osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (_) {}
}

// Tiếng đàn hạc quét nhanh khi xòe bài
function playFanSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.035);
            gain.gain.setValueAtTime(0.035, ctx.currentTime + idx * 0.035);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3 + idx * 0.035);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.035);
            osc.stop(ctx.currentTime + 0.35 + idx * 0.035);
        });
    } catch (_) {}
}

// Cài đặt âm thanh từ nút bấm
function initSoundToggle() {
    const btn = document.getElementById('btn-sound-toggle');
    const icon = document.getElementById('sound-icon');
    const text = document.getElementById('sound-text');
    
    const saved = localStorage.getItem('taroto_sound');
    if (saved !== null) {
        soundEnabled = saved === 'true';
    }

    function updateUI() {
        if (soundEnabled) {
            icon.className = 'fa-solid fa-volume-high';
            text.innerText = 'Âm thanh: Bật';
            btn.style.borderColor = 'var(--gold-primary)';
        } else {
            icon.className = 'fa-solid fa-volume-xmark';
            text.innerText = 'Âm thanh: Tắt';
            btn.style.borderColor = 'rgba(255, 215, 0, 0.2)';
        }
    }

    updateUI();

    btn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('taroto_sound', soundEnabled);
        updateUI();
        if (soundEnabled) playChime(950);
    });
}

/* ==========================================================
   2. HỆ THỐNG HẠT VŨ TRỤ (COSMIC PARTICLE CANVAS)
   ========================================================== */
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let shootingStars = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.4;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.alpha = Math.random() * 0.6 + 0.2;
            this.pulseSpeed = Math.random() * 0.02 + 0.01;
            // Màu sắc vàng kim hoặc tím huyền ảo
            this.color = Math.random() > 0.3 ? '255, 215, 0' : '157, 78, 221';
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha += Math.sin(Date.now() * this.pulseSpeed * 0.05) * 0.01;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.fillStyle = `rgba(${this.color}, ${Math.max(0.1, Math.min(0.85, this.alpha))})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class ShootingStar {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * (canvas.height * 0.5);
            this.length = Math.random() * 80 + 40;
            this.speed = Math.random() * 8 + 6;
            this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
            this.opacity = 1;
            this.active = false;
        }
        trigger() {
            this.reset();
            this.active = true;
        }
        update() {
            if (!this.active) return;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.opacity -= 0.015;
            if (this.opacity <= 0 || this.x > canvas.width || this.y > canvas.height) {
                this.active = false;
            }
        }
        draw() {
            if (!this.active) return;
            ctx.save();
            ctx.strokeStyle = `rgba(255, 240, 150, ${this.opacity})`;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x - Math.cos(this.angle) * this.length,
                this.y - Math.sin(this.angle) * this.length
            );
            ctx.stroke();
            ctx.restore();
        }
    }

    const count = Math.min(80, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }

    const star = new ShootingStar();
    shootingStars.push(star);
    setInterval(() => {
        if (!star.active && Math.random() < 0.6) star.trigger();
    }, 4000);

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        shootingStars.forEach(s => { s.update(); s.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
}

/* ==========================================================
   3. BẮT ĐẦU TRẢI BÀI: XÁO BÀI & XÒE CÁNH CUNG (DECK FAN-OUT)
   ========================================================== */
export function startShuffleAndFan() {
    const questionInput = document.getElementById('user-question');
    const question = questionInput ? questionInput.value.trim() : "";

    // Reset trạng thái
    pickedCards = [];
    flippedCount = 0;
    isAIInProgress = false;

    // Ẩn các khu vực cũ
    document.getElementById('card-details-grid').innerHTML = '';
    const aiSection = document.getElementById('ai-consultation-section');
    aiSection.style.display = 'none';
    document.getElementById('ai-reading-content').style.display = 'none';
    document.getElementById('ai-actions-bar').style.display = 'none';
    document.getElementById('ai-loading-box').style.display = 'flex';

    // Xáo trộn 78 lá bài với thuật toán Fisher-Yates
    shuffledDeck = [...tarotDeck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }

    // Lấy 26 lá bài ngẫu nhiên để xòe lên bàn hình cánh cung
    activeFanCards = shuffledDeck.slice(0, 26);

    // Chuẩn bị khu vực Altar (Bàn trải bài)
    setupAltarSlots();

    // Hiển thị phần xòe bài
    const fanSection = document.getElementById('deck-fan-section');
    fanSection.classList.add('visible');

    // Cập nhật hướng dẫn chọn bài
    updatePickInstruction();

    // Render các lá bài xòe ra hình cánh cung
    renderFannedDeck(activeFanCards);

    // Cuộn mượt mà đến khu vực xòe bài
    setTimeout(() => {
        fanSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

    // Phát âm thanh quét đàn hạc
    playFanSound();
}

// Cài đặt khung vị trí (Slot) trên bàn trải bài
function setupAltarSlots() {
    const altarSection = document.getElementById('spread-altar-section');
    const slotsContainer = document.getElementById('altar-slots-container');
    const headingText = document.getElementById('altar-heading-text');
    slotsContainer.innerHTML = '';

    const positions = currentSpreadMode === 1
        ? ["✨ Thông Điệp & Lời Khuyên"]
        : ["1. Quá Khứ", "2. Hiện Tại", "3. Tương Lai"];

    headingText.innerText = currentSpreadMode === 1 
        ? "Trải 1 Lá: Lời Khuyên Cốt Lõi" 
        : "Trải 3 Lá: Quá Khứ • Hiện Tại • Tương Lai";

    for (let i = 0; i < currentSpreadMode; i++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'altar-slot';
        slotEl.id = `altar-slot-${i}`;
        slotEl.innerHTML = `
            <div class="slot-header">
                <span class="slot-badge">${positions[i]}</span>
            </div>
            <div class="slot-placeholder ${i === 0 ? 'active-target' : ''}" id="placeholder-${i}">
                <i class="fa-solid fa-sparkles"></i>
                <span>Chờ rút lá bài thứ ${i + 1}</span>
            </div>
        `;
        slotsContainer.appendChild(slotEl);
    }

    altarSection.style.display = 'flex';
}

// Render các lá bài xòe thành cánh cung uyển chuyển
function renderFannedDeck(cards) {
    const wrapper = document.getElementById('fan-cards-wrapper');
    wrapper.innerHTML = '';

    const total = cards.length;
    // Góc xòe rộng từ -36 độ đến +36 độ
    const startAngle = -36;
    const endAngle = 36;
    const angleStep = (endAngle - startAngle) / (total - 1);

    // Khoảng cách ngang trải đều
    const maxOffset = window.innerWidth < 768 ? 260 : 380;
    const stepX = (maxOffset * 2) / (total - 1);

    cards.forEach((card, i) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'fan-card';
        cardEl.dataset.index = i;

        const rot = startAngle + i * angleStep;
        const tx = -maxOffset + i * stepX;
        // Độ cong vòm cánh cung Parabol
        const normalized = (i - (total - 1) / 2) / ((total - 1) / 2);
        const ty = Math.pow(normalized, 2) * (window.innerWidth < 768 ? 40 : 55);

        cardEl.style.setProperty('--rot', `${rot}deg`);
        cardEl.style.setProperty('--tx', `${tx}px`);
        cardEl.style.setProperty('--ty', `${ty}px`);
        cardEl.style.zIndex = i + 1;

        cardEl.innerHTML = `<div class="fan-card-inner"></div>`;

        // Âm thanh khi lướt qua lá bài
        cardEl.addEventListener('mouseenter', () => {
            if (!cardEl.classList.contains('picked')) {
                playChime(700 + i * 25);
            }
        });

        // Chọn lá bài khi bấm vào
        cardEl.addEventListener('click', () => onCardPick(i, cardEl));

        wrapper.appendChild(cardEl);
    });
}

// Cập nhật dòng hướng dẫn và thanh đếm
function updatePickInstruction() {
    const label = document.getElementById('pick-instruction-label');
    const badge = document.getElementById('pick-counter-badge');
    const remaining = currentSpreadMode - pickedCards.length;

    badge.innerText = `Đã chọn: ${pickedCards.length}/${currentSpreadMode}`;

    if (remaining > 0) {
        label.innerHTML = `Hãy lắng nghe trực giác và chọn <strong>${remaining}</strong> lá bài tiếp theo mang năng lượng của bạn`;
    } else {
        label.innerHTML = `✨ Bạn đã chọn đủ các lá bài! Hãy kéo xuống bàn trải bài để lật mở.`;
    }
}

/* ==========================================================
   4. NGƯỜI DÙNG CHỌN BÀI TỪ QUẠT (CARD PICK INTERACTION)
   ========================================================== */
function onCardPick(fanIndex, cardEl) {
    if (pickedCards.length >= currentSpreadMode) return;
    if (cardEl.classList.contains('picked')) return;

    // Đánh dấu lá bài đã được rút từ quạt
    cardEl.classList.add('picked');
    playPickSound();

    const currentSlotIndex = pickedCards.length;
    const cardData = activeFanCards[fanIndex];
    // Tỉ lệ bài ngược là ~28% (chuẩn phong cách bói bài truyền thống)
    const isReversed = Math.random() < 0.28;
    const positions = currentSpreadMode === 1
        ? ["Thông Điệp Cốt Lõi"]
        : ["1. Quá Khứ", "2. Hiện Tại", "3. Tương Lai"];

    const pickedItem = {
        card: cardData,
        isReversed: isReversed,
        position: positions[currentSlotIndex],
        slotIndex: currentSlotIndex,
        flipped: false
    };

    pickedCards.push(pickedItem);
    updatePickInstruction();

    // Đặt lá bài vào bàn trải bài (Slot tương ứng)
    placeCardIntoSlot(pickedItem);

    // Cập nhật target tiếp theo
    if (pickedCards.length < currentSpreadMode) {
        const nextPlaceholder = document.getElementById(`placeholder-${pickedCards.length}`);
        if (nextPlaceholder) nextPlaceholder.classList.add('active-target');
    } else {
        // Đã rút đủ bài!
        setTimeout(() => {
            // Thu nhỏ bộ bài xòe để tập trung vào bàn trải bài
            const fanSection = document.getElementById('deck-fan-section');
            fanSection.classList.remove('visible');

            const altarSection = document.getElementById('spread-altar-section');
            altarSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 600);
    }
}

// Đưa lá bài đã rút vào ô trải bài
function placeCardIntoSlot(item) {
    const slotEl = document.getElementById(`altar-slot-${item.slotIndex}`);
    if (!slotEl) return;

    const placeholder = document.getElementById(`placeholder-${item.slotIndex}`);
    if (placeholder) placeholder.remove();

    const cardEl = document.createElement('div');
    cardEl.className = `slot-card ${item.isReversed ? 'is-reversed' : ''}`;
    cardEl.id = `placed-card-${item.slotIndex}`;
    cardEl.innerHTML = `
        <div class="slot-card-face slot-card-front">
            <span class="flip-hint">Chạm để lật</span>
        </div>
        <div class="slot-card-face slot-card-back">
            <span class="card-orientation-badge ${item.isReversed ? 'badge-reversed' : 'badge-upright'}">
                ${item.isReversed ? 'Ngược ↺' : 'Xuôi ✦'}
            </span>
            <img src="${item.card.img}" alt="${item.card.name}" />
        </div>
    `;

    cardEl.addEventListener('click', () => flipSlotCard(item, cardEl));
    slotEl.appendChild(cardEl);
}

/* ==========================================================
   5. LẬT BÀI VÀ HIỂN THỊ Ý NGHĨA (3D FLIP INTERACTION)
   ========================================================== */
function flipSlotCard(item, cardEl) {
    if (item.flipped) return;
    item.flipped = true;
    flippedCount++;

    cardEl.classList.add('flipped');
    playFlipSound();

    // Thêm thẻ diễn giải ý nghĩa ngắn gọn vào grid bên dưới
    renderCardDetailCard(item);

    // Nếu đã lật hết tất cả lá bài, tự động gọi Gemini AI
    if (flippedCount === currentSpreadMode) {
        setTimeout(() => {
            fetchGeminiTarotReading();
        }, 700);
    }
}

// Hiển thị thông tin lá bài đã lật
function renderCardDetailCard(item) {
    const container = document.getElementById('card-details-grid');
    const detailEl = document.createElement('div');
    detailEl.className = 'card-detail-card';
    detailEl.innerHTML = `
        <div class="detail-pos">${item.position}</div>
        <div class="detail-name">
            <span>${item.card.name}</span>
            <span style="font-size: 0.8rem; color: ${item.isReversed ? 'var(--amber-glow)' : 'var(--cyan-glow)'};">
                (${item.isReversed ? 'Lá Bài Ngược' : 'Lá Bài Xuôi'})
            </span>
        </div>
        <div class="detail-keywords">Từ khóa: ${item.card.keywords}</div>
        <div class="detail-desc">
            ${item.isReversed ? item.card.reversed : item.card.upright}
        </div>
    `;
    container.appendChild(detailEl);
}

// Nút lật tất cả
function flipAllCards() {
    pickedCards.forEach((item, idx) => {
        if (!item.flipped) {
            setTimeout(() => {
                const cardEl = document.getElementById(`placed-card-${idx}`);
                if (cardEl) flipSlotCard(item, cardEl);
            }, idx * 250);
        }
    });
}

/* ==========================================================
   6. GỌI GEMINI AI LUẬN GIẢI CHUYÊN SÂU
   ========================================================== */
async function fetchGeminiTarotReading() {
    if (isAIInProgress) return;
    isAIInProgress = true;

    const questionInput = document.getElementById('user-question');
    const question = questionInput ? questionInput.value.trim() : "";

    const aiSection = document.getElementById('ai-consultation-section');
    const loadingBox = document.getElementById('ai-loading-box');
    const contentBox = document.getElementById('ai-reading-content');
    const actionsBar = document.getElementById('ai-actions-bar');
    const copyBtn = document.getElementById('btn-copy-reading');

    aiSection.style.display = 'block';
    loadingBox.style.display = 'flex';
    contentBox.style.display = 'none';
    actionsBar.style.display = 'none';
    copyBtn.style.display = 'none';

    // Cuộn mượt mà xuống phần AI
    setTimeout(() => {
        aiSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);

    try {
        const payload = {
            question: question,
            selectedCards: pickedCards.map(p => ({
                position: p.position,
                isReversed: p.isReversed,
                card: p.card
            }))
        };

        const response = await fetch('/api/tarot-reading', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Lỗi máy chủ (${response.status})`);
        }

        const data = await response.json();

        if (data.success && data.reading) {
            loadingBox.style.display = 'none';
            contentBox.style.display = 'block';
            actionsBar.style.display = 'flex';
            copyBtn.style.display = 'inline-flex';

            // Định dạng Markdown bằng Marked.js nếu có sẵn
            if (window.marked && typeof window.marked.parse === 'function') {
                contentBox.innerHTML = window.marked.parse(data.reading);
            } else {
                contentBox.innerHTML = `<div style="white-space: pre-line;">${data.reading}</div>`;
            }

            playFanSound();
        } else {
            throw new Error(data.error || "Không nhận được phản hồi từ AI.");
        }
    } catch (err) {
        loadingBox.style.display = 'none';
        contentBox.style.display = 'block';
        contentBox.innerHTML = `
            <div style="background: rgba(255, 107, 107, 0.15); border: 1px solid #ff6b6b; padding: 1.2rem; border-radius: 12px; color: #ffb4b4;">
                <p><strong><i class="fa-solid fa-triangle-exclamation"></i> Không thể kết nối với Huyền Giả AI:</strong> ${err.message}</p>
                <p style="margin-top: 8px; font-size: 0.88rem; color: #fff;">Vui lòng kiểm tra chắc chắn rằng bạn đã khởi động server (<code>npm start</code>) và file <code>.env</code> đã có <code>GEMINI_API_KEY</code> hợp lệ.</p>
                <button class="btn-secondary" id="btn-retry-ai" style="margin-top: 12px;">
                    <i class="fa-solid fa-rotate-right"></i> Thử lại
                </button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-ai');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                isAIInProgress = false;
                fetchGeminiTarotReading();
            });
        }
    } finally {
        isAIInProgress = false;
    }
}

/* ==========================================================
   7. THƯ VIỆN KHÁM PHÁ 78 LÁ BÀI & MODAL CHI TIẾT
   ========================================================== */
function initDeckGallery() {
    const toggleBar = document.getElementById('preview-toggle-bar');
    const content = document.getElementById('preview-content');
    const chevron = document.getElementById('preview-chevron');
    const grid = document.getElementById('deck-grid');
    const filterTabs = document.querySelectorAll('.filter-tab');

    // Mở / Đóng thư viện
    toggleBar.addEventListener('click', () => {
        content.classList.toggle('expanded');
        chevron.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Render danh sách lá bài theo danh mục
    function renderGalleryCards(category = 'all') {
        grid.innerHTML = '';
        const list = category === 'all' 
            ? tarotDeck 
            : tarotDeck.filter(c => c.cat === category);

        list.forEach(card => {
            const item = document.createElement('div');
            item.className = 'preview-card-item';
            item.title = card.name;
            item.innerHTML = `<img src="${card.img}" alt="${card.name}" loading="lazy" />`;
            item.addEventListener('click', () => openCardModal(card));
            grid.appendChild(item);
        });
    }

    // Lọc theo danh mục
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderGalleryCards(tab.dataset.cat);
        });
    });

    // Render ban đầu
    renderGalleryCards('all');

    // Nút cuộn xuống thư viện trên thanh top
    const scrollBtn = document.getElementById('btn-scroll-deck');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
            content.classList.add('expanded');
            chevron.style.transform = 'rotate(180deg)';
            document.getElementById('deck-preview-section').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

// Modal xem chi tiết lá bài
function openCardModal(card) {
    const modal = document.getElementById('card-modal');
    document.getElementById('modal-img').src = card.img;
    document.getElementById('modal-title').innerText = card.name;
    document.getElementById('modal-cat').innerText = card.cat;
    document.getElementById('modal-keywords').innerText = `Từ khóa: ${card.keywords}`;
    document.getElementById('modal-upright').innerText = card.upright;
    document.getElementById('modal-reversed').innerText = card.reversed;

    modal.classList.add('active');
    playChime(1000);
}

function initModalClose() {
    const modal = document.getElementById('card-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.remove('active');
    });
}

/* ==========================================================
   8. KHỞI TẠO VÀ GẮN SỰ KIỆN GIAO DIỆN
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hiệu ứng hạt vũ trụ
    initParticles();

    // 2. Âm thanh
    initSoundToggle();

    // 3. Chọn chế độ trải bài (1 lá hoặc 3 lá)
    const mode1 = document.getElementById('mode-1');
    const mode3 = document.getElementById('mode-3');

    mode1.addEventListener('click', () => {
        mode1.classList.add('active');
        mode3.classList.remove('active');
        currentSpreadMode = 1;
        playChime(750);
    });

    mode3.addEventListener('click', () => {
        mode3.classList.add('active');
        mode1.classList.remove('active');
        currentSpreadMode = 3;
        playChime(850);
    });

    // 4. Gợi ý chủ đề nhanh khi bấm vào các tag
    const topicTags = document.querySelectorAll('.topic-tag');
    const questionInput = document.getElementById('user-question');
    topicTags.forEach(tag => {
        tag.addEventListener('click', () => {
            if (questionInput) {
                questionInput.value = tag.dataset.q;
                questionInput.focus();
                playChime(900);
            }
        });
    });

    // 5. Nút chính "Xáo & Xòe Bài"
    const startBtn = document.getElementById('btn-start-spread');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            getAudioContext(); // kích hoạt AudioContext sau cử chỉ người dùng
            startShuffleAndFan();
        });
    }

    // 6. Nút lật tất cả & nút reset
    const flipAllBtn = document.getElementById('btn-flip-all');
    if (flipAllBtn) flipAllBtn.addEventListener('click', flipAllCards);

    const resetBtn = document.getElementById('btn-reset-spread');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            startShuffleAndFan();
        });
    }

    // 7. Nút đặt câu hỏi mới trong khung AI
    const askAnotherBtn = document.getElementById('btn-ask-another');
    if (askAnotherBtn) {
        askAnotherBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (questionInput) {
                questionInput.value = '';
                questionInput.focus();
            }
        });
    }

    // 8. Nút sao chép bài luận giải
    const copyBtn = document.getElementById('btn-copy-reading');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const contentBox = document.getElementById('ai-reading-content');
            if (!contentBox) return;
            const textToCopy = contentBox.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Đã sao chép!`;
                playChime(1200);
                setTimeout(() => {
                    copyBtn.innerHTML = originalHtml;
                }, 2000);
            });
        });
    }

    // 9. Thư viện 78 lá bài & modal
    initDeckGallery();
    initModalClose();
});
