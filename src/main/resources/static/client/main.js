document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        levels: [],
        currentLevelIndex: 0,
        score: 0,
        isDragging: false,
        filledSlots: [] // Array of { index, value, element }
    };

    // --- Elements ---
    const elements = {
        levelDisplay: document.getElementById('level-display'),
        scoreDisplay: document.getElementById('score-display'),
        gameImage: document.getElementById('game-image'),
        imageLoader: document.getElementById('image-loader'),
        dropZone: document.getElementById('drop-zone'),
        // No longer relying on a single 'drop-placeholder' inside dropZone for the game
        // We will create #answer-slots-area dynamically
        optionsContainer: document.getElementById('options-container'),
        hintBtn: document.getElementById('hint-btn'),
        hintText: document.getElementById('hint-text'),
        victoryModal: document.getElementById('victory-modal'),
        endGameModal: document.getElementById('end-game-modal'),
        nextLevelBtn: document.getElementById('next-level-btn'),
        restartBtn: document.getElementById('restart-btn'),
        finalScoreValue: document.getElementById('final-score-value'),
        toast: document.getElementById('toast')
    };

    // --- Initialization ---
    let timerInterval = null; // Declare here
    initGame();

    function initGame() {
        console.log("Initializing Game...");
        fetchLevels();
        setupGlobalEventListeners();
    }

    // --- API Interactions ---
    async function fetchLevels() {
        // Get roomId from URL
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('roomId');

        if (!roomId) {
            showToast('Không tìm thấy phòng!', 'error');
            setTimeout(() => window.location.href = '/client/rooms.html', 2000);
            return;
        }

        // Check status periodically
        const checkStatus = async () => {
             try {
                 const statusRes = await fetch(`/api/rooms/${roomId}/status`);
                 const statusData = await statusRes.json();
                 
                 if (statusData.status === 'PLAYING') {
                     document.getElementById('pending-overlay').classList.add('hidden');
                     document.getElementById('game-container').classList.remove('hidden');
                     startLoadingLevels(roomId);
                 } else if (statusData.status === 'FINISHED') {
                     alert("Phòng đã kết thúc.");
                     window.location.href='/client/rooms.html';
                 } else {
                     setTimeout(checkStatus, 2000); // Poll every 2s
                 }
             } catch(e) { console.error(e); }
        };
        
        // Join Room First
        try {
            const playerName = sessionStorage.getItem('playerName') || 'Guest';
            const joinRes = await fetch(`/api/rooms/${roomId}/join?playerName=${encodeURIComponent(playerName)}`, { method: 'POST' });
            const joinData = await joinRes.json();
            
            if (joinData.error) {
                alert(joinData.error);
                window.location.href='/client/rooms.html';
                return;
            }
            
            state.playerId = joinData.playerId;
            state.roomId = roomId;

            if (joinData.status === 'WAITING') {
                checkStatus();
            } else if (joinData.status === 'PLAYING') {
                 // Should be blocked by Join API but double check
                 alert("Phòng đang chơi!");
                 window.location.href='/client/rooms.html';
            }
        } catch(e) { console.error(e); }
    }

    async function startLoadingLevels(roomId) {
        try {
            const response = await fetch(`/api/game/levels?roomId=${roomId}`);
            if (!response.ok) throw new Error('Failed to fetch levels');
            
            const data = await response.json();
            // Sort levels
            state.levels = data.sort((a, b) => (a.levelOrder || 0) - (b.levelOrder || 0));
            
            if (state.levels.length > 0) {
                loadLevel(0);
            } else {
                showToast('Chưa có màn chơi nào được tạo.', 'error');
            }

        } catch (error) {
            console.error('Error:', error);
            showToast('Lỗi: ' + error.message, 'error');
        }
    }

    // --- Game Logic ---
    function loadLevel(index) {
        state.currentLevelIndex = index;
        state.filledSlots = [];
        const level = state.levels[index];

        if (!level) return;

        // Reset UI
        elements.levelDisplay.textContent = index + 1;
        
        // --- 1. SETUP IMAGE HANDLERS FIRST (Prevent Stuck Spinner) ---
        elements.imageLoader.style.display = 'block';
        elements.gameImage.style.opacity = '0';
        elements.gameImage.onload = () => {
            elements.imageLoader.style.display = 'none';
            elements.gameImage.style.opacity = '1';
        };
        elements.gameImage.onerror = () => {
             elements.imageLoader.style.display = 'none';
             showToast('Không tải được hình ảnh', 'error');
        };
        // Set src AFTER handlers
        elements.gameImage.src = level.imageUrl;

        elements.hintText.classList.add('hidden');
        elements.hintText.textContent = level.hint || "Không có gợi ý.";
        
        // --- 2. SETUP SLOTS ---
        setupDropSlots(level.answer);

        // --- 3. RENDER OPTIONS ---
        elements.optionsContainer.innerHTML = '';
        // Filter out empty, null, undefined, and whitespace-only options
        const validOptions = (level.options || []).filter(opt => {
            if (!opt) return false;
            const trimmed = String(opt).trim();
            return trimmed.length > 0;
        });
        
        console.log('Valid options after filter:', validOptions); // Debug log
        
        const shuffledOptions = [...validOptions].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach((opt, idx) => {
            const el = createDraggable(opt, idx);
            elements.optionsContainer.appendChild(el);
        });

        // --- 4. START TIMER ---
        // Ensure element exists
        if (!elements.timerDisplay) elements.timerDisplay = document.getElementById('timer-display');
        
        if (elements.timerDisplay) {
             const limit = (level.timeLimit !== undefined && level.timeLimit !== null) ? level.timeLimit : 60;
             startTimer(limit);
        } else {
            console.error("Timer Display Element Not Found!");
        }
    }

    function startTimer(seconds) {
        if(timerInterval) clearInterval(timerInterval);
        if (!elements.timerDisplay) return; // Safety

        let timeLeft = seconds;
        elements.timerDisplay.innerText = timeLeft;
        elements.timerDisplay.classList.remove('blink-red');
        
        timerInterval = setInterval(() => {
            timeLeft--;
            elements.timerDisplay.innerText = timeLeft;
            
            if (timeLeft <= 5) {
                elements.timerDisplay.classList.add('blink-red');
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                handleTimeOut();
            }
        }, 1000);
    }

    function stopTimer() {
        if(timerInterval) clearInterval(timerInterval);
        elements.timerDisplay.classList.remove('blink-red');
    }

    function handleTimeOut() {
        showToast('Hết giờ!', 'error');
        // Auto skip or fail logic? Let's just show correct answer or move next.
        // Simple: Mark as Wrong visually then allow manual "Next" or auto.
        // Let's force move next after delay.
        document.querySelectorAll('.answer-slot').forEach(el => el.classList.add('wrong-reveal'));
        elements.dropZone.classList.add('wrong');
        setTimeout(() => {
             elements.dropZone.classList.remove('wrong');
             document.querySelectorAll('.answer-slot').forEach(el => el.classList.remove('wrong-reveal'));
             advanceToNextLevel(); // Force next
        }, 2000);
    }

    function setupDropSlots(answer) {
        // Clear previous content
        elements.dropZone.innerHTML = '';
        elements.dropZone.classList.remove('correct', 'wrong');

        // Create main container
        const slotsArea = document.createElement('div');
        slotsArea.className = 'answer-slots-area';
        
        // Determine sizing class based on answer complexity
        const words = answer.split(' ').filter(w => w.length > 0);
        const wordCount = words.length;
        const maxWordLength = Math.max(...words.map(w => w.length));
        
        // Size logic: 
        // - compact: more than 5 words OR longest word > 6 chars
        // - medium: 4-5 words OR longest word 5-6 chars
        // - large: 1-3 words AND longest word <= 4 chars
        if (wordCount > 5 || maxWordLength > 6) {
            slotsArea.classList.add('size-compact');
        } else if (wordCount >= 4 || maxWordLength >= 5) {
            slotsArea.classList.add('size-medium');
        } else {
            slotsArea.classList.add('size-large');
        }
        
        let currentWordRow = document.createElement('div');
        currentWordRow.className = 'word-row';
        slotsArea.appendChild(currentWordRow);

        const len = answer.length;
        
        for (let i = 0; i < len; i++) {
            const char = answer[i];
            
            if (char === ' ') {
                // Space -> Start new row
                // 1. Auto-fill state for the space
                state.filledSlots[i] = { text: ' ', isSpace: true };
                
                // 2. Only create new row if the current one isn't empty (avoids double rows for double spaces)
                // OR if we want strict mapping 1-1, just close current row.
                // Let's ensure we close the current row and start a new one.
                if (currentWordRow.childElementCount > 0) {
                    currentWordRow = document.createElement('div');
                    currentWordRow.className = 'word-row';
                    slotsArea.appendChild(currentWordRow);
                }
                continue;
            }

            // Normal Character
            const slot = document.createElement('div');
            slot.className = 'answer-slot';
            slot.dataset.index = i;
            
            // Interaction Events
            slot.addEventListener('click', () => clearSlot(i));
            
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!state.filledSlots[i]) {
                    slot.classList.add('active-target');
                }
            });
            
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('active-target');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.remove('active-target');
                const dataRaw = e.dataTransfer.getData('application/json');
                if (dataRaw) {
                    const data = JSON.parse(dataRaw);
                    handleDropOnSlot(i, data);
                }
            });

            currentWordRow.appendChild(slot);
        }
        
        // Remove empty rows if any (e.g. trailing space)
        if (currentWordRow.childElementCount === 0 && slotsArea.children.length > 1) {
            slotsArea.removeChild(currentWordRow);
        }
        
        elements.dropZone.appendChild(slotsArea);
    }

    function createDraggable(text, id) {
        const div = document.createElement('div');
        div.classList.add('draggable-item');
        div.textContent = text;
        div.setAttribute('draggable', 'true');
        div.id = `opt-${id}`;
        
        // Desktop Drag Events
        div.addEventListener('dragstart', (e) => {
            const payload = JSON.stringify({ text: text, elementId: div.id });
            e.dataTransfer.setData('application/json', payload);
            div.classList.add('dragging');
            state.isDragging = true;
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            state.isDragging = false;
        });

        // Mobile Touch Events
        let touchStartX = 0;
        let touchStartY = 0;
        let originalPos = { x: 0, y: 0 };
        
        div.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Stop scrolling
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            // Visuals
            div.classList.add('dragging');
            div.style.position = 'fixed';
            div.style.zIndex = '9999';
            // Center under finger approx
            const rect = div.getBoundingClientRect();
            div.style.left = (touchStartX - rect.width/2) + 'px';
            div.style.top = (touchStartY - rect.height/2) + 'px';
            
            state.isDragging = true;
        }, {passive: false});

        div.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = div.getBoundingClientRect();
            div.style.left = (touch.clientX - rect.width/2) + 'px';
            div.style.top = (touch.clientY - rect.height/2) + 'px';
        }, {passive: false});

        div.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            
            // Hide self to find element underneath
            div.style.display = 'none';
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            div.style.display = ''; // Restore
            
            // Cleanup visuals
            div.classList.remove('dragging');
            div.style.position = '';
            div.style.zIndex = '';
            div.style.left = '';
            div.style.top = '';
            state.isDragging = false;
            
            // Logic
            if (target) {
                // Check Drop Target
                const slot = target.closest('.answer-slot');
                const zone = target.closest('.drop-zone');
                
                const data = { text: text, elementId: div.id };
                
                if (slot) {
                    const idx = parseInt(slot.dataset.index);
                    handleDropOnSlot(idx, data);
                } else if (zone) {
                    handleDropAnywhere(data);
                }
            }
        });

        return div;
    }

    function handleDropOnSlot(slotIndex, data) {
        // If slot is already filled, ignore or replace? Let's ignore for now or swap.
        // Easier: Ignore if filled.
        if (state.filledSlots[slotIndex]) return;

        fillSlot(slotIndex, data);
    }

    function handleDropAnywhere(data) {
        // Find first empty slot
        const currentLevel = state.levels[state.currentLevelIndex];
        const slotCount = currentLevel.answer.length;
        
        for (let i = 0; i < slotCount; i++) {
            if (!state.filledSlots[i]) {
                fillSlot(i, data);
                return;
            }
        }
        showToast("Các ô đã đầy!", "info");
    }

    function fillSlot(index, data) {
        // Update State
        state.filledSlots[index] = { text: data.text, sourceId: data.elementId };
        
        // Update UI
        const slotEl = document.querySelector(`.answer-slot[data-index="${index}"]`);
        slotEl.textContent = data.text;
        slotEl.classList.add('filled');
        
        // Mark source as used
        const sourceEl = document.getElementById(data.elementId);
        if (sourceEl) {
            sourceEl.classList.add('used');
            sourceEl.setAttribute('draggable', 'false');
        }

        checkAnswerIfFull();
    }

    function clearSlot(index) {
        const slotData = state.filledSlots[index];
        if (!slotData) return;

        // Restore the source option
        const sourceEl = document.getElementById(slotData.sourceId);
        if (sourceEl) {
            sourceEl.classList.remove('used');
            sourceEl.setAttribute('draggable', 'true');
        }

        // Clear State
        delete state.filledSlots[index];

        // Clear UI
        const slotEl = document.querySelector(`.answer-slot[data-index="${index}"]`);
        slotEl.textContent = '';
        slotEl.classList.remove('filled', 'correct-reveal', 'wrong-reveal');
        
        // Remove generic wrong/correct classes from container
        elements.dropZone.classList.remove('correct', 'wrong');
    }

    function checkAnswerIfFull() {
        const currentLevel = state.levels[state.currentLevelIndex];
        const requiredLen = currentLevel.answer.length;
        
        // Check if we have filled all slots
        // state.filledSlots is a sparse array, so we check keys or count
        let filledCount = 0;
        let constructedAnswer = "";
        
        for(let i=0; i<requiredLen; i++) {
            if(state.filledSlots[i]) {
                filledCount++;
                constructedAnswer += state.filledSlots[i].text;
            } else {
                return; // Not full yet
            }
        }

        // It is full
        console.log(`Checking: '${constructedAnswer}' vs '${currentLevel.answer}'`);
        
        const cleanConstructed = constructedAnswer.trim().toUpperCase();
        const cleanAnswer = (currentLevel.answer || "").trim().toUpperCase();

        if (cleanConstructed === cleanAnswer) {
             handleVictory();
        } else {
             handleWrong();
        }
    }

    function handleVictory() {
        stopTimer();
        // Visuals
        document.querySelectorAll('.answer-slot').forEach(el => el.classList.add('correct-reveal'));
        
        state.score += 10;
        elements.scoreDisplay.textContent = state.score;

        setTimeout(() => {
            elements.victoryModal.classList.remove('hidden');
        }, 800);
    }

    function handleWrong() {
        // Visuals
        document.querySelectorAll('.answer-slot').forEach(el => el.classList.add('wrong-reveal'));
        elements.dropZone.classList.add('wrong');
        
        showToast('Sai rồi! Nhấp vào ô để bỏ chọn và thử lại.', 'error');
        
        setTimeout(() => {
             elements.dropZone.classList.remove('wrong');
             document.querySelectorAll('.answer-slot').forEach(el => el.classList.remove('wrong-reveal'));
        }, 1000);
    }

    function advanceToNextLevel() {
        elements.victoryModal.classList.add('hidden');
        const nextIndex = state.currentLevelIndex + 1;

        if (nextIndex < state.levels.length) {
            loadLevel(nextIndex);
        } else {
            showEndGame();
        }
    }

    async function showEndGame() {
        elements.finalScoreValue.textContent = state.score;
        elements.endGameModal.classList.remove('hidden');
        
        try {
            await fetch(`/api/rooms/${state.roomId}/finish?playerId=${state.playerId}&score=${state.score}`, {method:'POST'});
            
            // Fetch Leaderboard
            const res = await fetch(`/api/rooms/${state.roomId}/players`);
            const players = await res.json();
             // Sort by Score Desc
             players.sort((a, b) => b.score - a.score);
             
             // Render Leaderboard
             const leaderboardHtml = `
                <div style="margin-top:20px; max-height:200px; overflow-y:auto; width:100%;">
                    <h3 style="margin-bottom:10px; color:var(--accent-color);">Bảng Xếp Hạng</h3>
                    <table style="width:100%; border-collapse:collapse; color:white;">
                        ${players.map((p, i) => {
                            let rankIcon = `#${i+1}`;
                            if(i===0) rankIcon = '🥇';
                            if(i===1) rankIcon = '🥈';
                            if(i===2) rankIcon = '🥉';
                            
                            const isMe = p.id === state.playerId ? 'background:rgba(255,255,255,0.1);' : '';
                            
                            return `
                                <tr style="${isMe} border-bottom:1px solid rgba(255,255,255,0.1);">
                                    <td style="padding:8px; font-size:1.2rem;">${rankIcon}</td>
                                    <td style="padding:8px; text-align:left;">${p.name || 'Unknown'}</td>
                                    <td style="padding:8px; font-weight:bold; color:#ffd700;">${p.score}</td>
                                </tr>
                            `;
                        }).join('')}
                    </table>
                </div>
             `;
             
             // Inject after score
             const scoreEl = document.querySelector('.final-score');
             if(scoreEl) {
                 const existingLb = document.getElementById('leaderboard-container');
                 if(existingLb) existingLb.remove();
                 
                 const div = document.createElement('div');
                 div.id = 'leaderboard-container';
                 div.innerHTML = leaderboardHtml;
                 scoreEl.insertAdjacentElement('afterend', div);
             }

        } catch(e) { console.error(e); }
    }

    function restartGame() {
        // This is actually "Back to Menu" now based on HTML changes
        window.location.href='/client/rooms.html';
    }

    // --- Helpers ---
    function showToast(msg, type = 'info') {
        elements.toast.textContent = msg;
        elements.toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
        elements.toast.classList.remove('hidden');
        
        elements.toast.style.animation = 'none';
        elements.toast.offsetHeight; 
        elements.toast.style.animation = 'slideDown 0.3s forwards';

        setTimeout(() => {
            elements.toast.classList.add('hidden');
        }, 3000);
    }

    function setupGlobalEventListeners() {
        elements.nextLevelBtn.addEventListener('click', advanceToNextLevel);
        elements.restartBtn.addEventListener('click', restartGame);

        elements.hintBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.hintText.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!elements.hintBtn.contains(e.target) && !elements.hintText.contains(e.target)) {
                elements.hintText.classList.add('hidden');
            }
        });

        // Drop Zone Global Listeners
        elements.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        elements.dropZone.addEventListener('drop', (e) => {
             // If dropped on a specific slot, the slot's listener handles it and stops propagation.
             // So if we reach here, it means we dropped in the "gap".
             
             e.preventDefault();
             // Double check just in case stopPropagation wasn't effective (though it should be)
             if (e.target.closest('.answer-slot')) return;

             const dataRaw = e.dataTransfer.getData('application/json');
             if (dataRaw) {
                 const data = JSON.parse(dataRaw);
                 handleDropAnywhere(data);
             }
        });
    }
});
