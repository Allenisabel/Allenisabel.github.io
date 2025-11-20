const BOARD_SIZE = 15;
const boardElement = document.getElementById('board');
const statusText = document.getElementById('status-text');
const playerIndicatorDot = document.querySelector('.player-indicator .dot');
const restartBtn = document.getElementById('restart-btn');
const aiModeBtn = document.getElementById('ai-mode-btn');
const aiControls = document.getElementById('ai-controls');
const difficultySelect = document.getElementById('difficulty-select');
const modal = document.getElementById('winner-modal');
const winnerTitle = document.getElementById('winner-title');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

let currentPlayer = 'black'; // 'black' or 'white'
let gameActive = true;
let boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
let gameMode = 'pve'; // 'pvp' or 'pve'
let aiDifficulty = 5;
let isAiThinking = false;

// Initialize Board
function initBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(e) {
    if (!gameActive || isAiThinking) return;

    const cell = e.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    // Check if cell is already occupied
    if (boardState[row][col]) return;

    // Place piece
    placePiece(row, col, cell);

    // Check for win
    if (checkWin(row, col, currentPlayer)) {
        endGame(false);
    } else if (checkDraw()) {
        endGame(true);
    } else {
        switchTurn();
    }
}

function placePiece(row, col, cell) {
    boardState[row][col] = currentPlayer;
    const piece = document.createElement('div');
    piece.classList.add('piece', currentPlayer);
    cell.appendChild(piece);
}

function switchTurn() {
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    statusText.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
    playerIndicatorDot.style.backgroundColor = currentPlayer === 'black' ? 'var(--black-piece)' : 'var(--white-piece)';

    if (gameMode === 'pve' && currentPlayer === 'white' && gameActive) {
        isAiThinking = true;
        statusText.textContent = "AI is thinking...";
        setTimeout(makeAiMove, 500); // Small delay for realism
    }
}

function makeAiMove() {
    if (!gameActive) return;

    const move = getBestMove();
    if (move) {
        const cell = document.querySelector(`.cell[data-row='${move.row}'][data-col='${move.col}']`);
        placePiece(move.row, move.col, cell);

        if (checkWin(move.row, move.col, currentPlayer)) {
            endGame(false);
        } else if (checkDraw()) {
            endGame(true);
        } else {
            isAiThinking = false;
            switchTurn();
        }
    }
}

function getBestMove() {
    // Simple strategy for lower levels, Minimax for higher levels
    if (aiDifficulty <= 3) {
        return getRandomMove();
    } else {
        return getHeuristicMove();
    }
}

function getRandomMove() {
    const emptyCells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!boardState[r][c]) emptyCells.push({ row: r, col: c });
        }
    }
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function getHeuristicMove() {
    let bestScore = -Infinity;
    let bestMoves = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!boardState[r][c]) {
                const score = evaluatePosition(r, c);
                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [{ row: r, col: c }];
                } else if (score === bestScore) {
                    bestMoves.push({ row: r, col: c });
                }
            }
        }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function evaluatePosition(row, col) {
    let score = 0;

    // Prioritize center
    const center = Math.floor(BOARD_SIZE / 2);
    score -= (Math.abs(row - center) + Math.abs(col - center));

    // Check all directions for potential lines
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dx, dy] of directions) {
        // Check for AI (White) potential
        score += evaluateLine(row, col, dx, dy, 'white') * (1 + aiDifficulty * 0.1);
        // Check for Player (Black) threats - Block them!
        score += evaluateLine(row, col, dx, dy, 'black') * (1 + aiDifficulty * 0.2);
    }

    return score;
}

function evaluateLine(row, col, dx, dy, player) {
    let count = 0;
    let blocked = 0;
    let score = 0;

    // Check forward
    for (let i = 1; i < 5; i++) {
        const r = row + dx * i;
        const c = col + dy * i;
        if (!isValidCell(r, c)) {
            blocked++;
            break;
        }
        if (boardState[r][c] === player) {
            count++;
        } else if (boardState[r][c] !== null) {
            blocked++;
            break;
        } else {
            break;
        }
    }

    // Check backward
    for (let i = 1; i < 5; i++) {
        const r = row - dx * i;
        const c = col - dy * i;
        if (!isValidCell(r, c)) {
            blocked++;
            break;
        }
        if (boardState[r][c] === player) {
            count++;
        } else if (boardState[r][c] !== null) {
            blocked++;
            break;
        } else {
            break;
        }
    }

    // Scoring logic
    if (count >= 4) score += 10000; // Win imminent
    else if (count === 3 && blocked === 0) score += 1000; // Open 4
    else if (count === 3 && blocked === 1) score += 100; // Blocked 4
    else if (count === 2 && blocked === 0) score += 100; // Open 3
    else if (count === 2 && blocked === 1) score += 10; // Blocked 3
    else if (count === 1 && blocked === 0) score += 10; // Open 2

    return score;
}

function checkWin(row, col, player) {
    const directions = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal \
        [1, -1]  // Diagonal /
    ];

    for (const [dx, dy] of directions) {
        let count = 1; // Count current piece

        // Check forward direction
        for (let i = 1; i < 5; i++) {
            const r = row + dx * i;
            const c = col + dy * i;
            if (isValidCell(r, c) && boardState[r][c] === player) {
                count++;
            } else {
                break;
            }
        }

        // Check backward direction
        for (let i = 1; i < 5; i++) {
            const r = row - dx * i;
            const c = col - dy * i;
            if (isValidCell(r, c) && boardState[r][c] === player) {
                count++;
            } else {
                break;
            }
        }

        if (count >= 5) return true;
    }
    return false;
}

function isValidCell(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function checkDraw() {
    return boardState.every(row => row.every(cell => cell !== null));
}

function endGame(isDraw) {
    gameActive = false;
    isAiThinking = false;
    if (isDraw) {
        winnerTitle.textContent = "It's a Draw!";
    } else {
        winnerTitle.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} Wins!`;
    }
    modal.classList.remove('hidden');
}

function restartGame() {
    gameActive = true;
    isAiThinking = false;
    currentPlayer = 'black';
    boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    statusText.textContent = "Black's Turn";
    playerIndicatorDot.style.backgroundColor = 'var(--black-piece)';
    modal.classList.add('hidden');
    initBoard();
}

function toggleAiMode() {
    if (gameMode === 'pvp') {
        gameMode = 'pve';
        aiModeBtn.classList.add('active');
        aiControls.classList.remove('hidden');
        aiModeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Play vs Human
        `;
    } else {
        gameMode = 'pvp';
        aiModeBtn.classList.remove('active');
        aiControls.classList.add('hidden');
        aiModeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 6v6l4 2"/>
            </svg>
            Play vs AI
        `;
    }
    restartGame();
}

// Event Listeners
restartBtn.addEventListener('click', restartGame);
modalRestartBtn.addEventListener('click', restartGame);
modalCloseBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});
aiModeBtn.addEventListener('click', toggleAiMode);
difficultySelect.addEventListener('change', (e) => {
    aiDifficulty = parseInt(e.target.value);
});

// Start Game
initBoard();
