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
            showToast('Lỗi kết nối máy chủ!', 'error');
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
        elements.imageLoader.style.display = 'block';
        elements.gameImage.style.opacity = '0';
        elements.gameImage.src = level.imageUrl;
        elements.hintText.classList.add('hidden');
        elements.hintText.textContent = level.hint || "Không có gợi ý.";
        
        // Setup Slots
        setupDropSlots(level.answer);

        // Render Options (Shuffled)
        elements.optionsContainer.innerHTML = '';
        // If options are characters that make up the word, good. 
        // We trust the admin provided sufficient options.
        const shuffledOptions = [...level.options].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach((opt, idx) => {
            const el = createDraggable(opt, idx);
            elements.optionsContainer.appendChild(el);
        });

        // Image Load Handler
        elements.gameImage.onload = () => {
            elements.imageLoader.style.display = 'none';
            elements.gameImage.style.opacity = '1';
        };
        elements.gameImage.onerror = () => {
             elements.imageLoader.style.display = 'none';
             showToast('Không tải được hình ảnh', 'error');
        }
    }

    function setupDropSlots(answer) {
        // Clear previous content
        elements.dropZone.innerHTML = '';
        elements.dropZone.classList.remove('correct', 'wrong');

        // Create container for slots
        const slotsArea = document.createElement('div');
        slotsArea.className = 'answer-slots-area';
        
        // Create N slots based on answer length
        // Note: this assumes answer is a string and "options" are characters.
        // If "options" are words and answer is a sentence, we might need a different heuristic.
        // But per user request "abc" -> "_ _ _", we go with length.
        const slotCount = answer.length; 
        
        for (let i = 0; i < slotCount; i++) {
            const slot = document.createElement('div');
            slot.className = 'answer-slot';
            slot.dataset.index = i;
            
            // Add click listener to clear slot if filled
            slot.addEventListener('click', () => clearSlot(i));
            
            // Drop events for specific slot
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

            slotsArea.appendChild(slot);
        }
        
        elements.dropZone.appendChild(slotsArea);
    }

    function createDraggable(text, id) {
        const div = document.createElement('div');
        div.classList.add('draggable-item');
        div.textContent = text;
        div.setAttribute('draggable', 'true');
        div.id = `opt-${id}`;
        
        div.addEventListener('dragstart', (e) => {
            // Send both text and the element ID so we can mark it as used
            const payload = JSON.stringify({ text: text, elementId: div.id });
            e.dataTransfer.setData('application/json', payload);
            div.classList.add('dragging');
            state.isDragging = true;
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            state.isDragging = false;
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
        if (constructedAnswer === currentLevel.answer) {
             handleVictory();
        } else {
             handleWrong();
        }
    }

    function handleVictory() {
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

    function showEndGame() {
        elements.finalScoreValue.textContent = state.score;
        elements.endGameModal.classList.remove('hidden');
    }

    function restartGame() {
        elements.endGameModal.classList.add('hidden');
        state.score = 0;
        elements.scoreDisplay.textContent = '0';
        // Reuse fetchLevels so logic remains consistent
        fetchLevels(); 
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
