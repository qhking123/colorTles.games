const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startGameButton = document.getElementById('startGameButton');
const scoreDisplay = document.getElementById('scoreDisplay');
const timerDisplay = document.getElementById('timerDisplay');
let gameOverOverlay = document.getElementById('game-over-overlay');
let finalScoreDisplay = document.getElementById('final-score');
let restartButton = document.getElementById('restart-button');
let resetGameButton = document.getElementById('resetGameButton');
let playPauseButton = document.getElementById('playPauseButton');

const TILE_SIZE = 64; // Changed from 80 to 64 (20% reduction)
const BOARD_ROWS = 10;
const BOARD_COLS = 20;
const INITIAL_TIME = 30; // seconds
const COLORS = [
    ['#DC143C', '#FF6347'], // Crimson to Tomato
    ['#00FF00', '#32CD32'], // Green to LimeGreen
    ['#4169E1', '#6495ED'], // Royal Blue to Cornflower Blue
    ['#FFFF00', '#FFD700'], // Yellow to Gold
    ['#8A2BE2', '#BA55D3']  // Blue Violet to Medium Orchid
]; // Crimson, Green, Royal Blue, Yellow, Blue Violet
const BLANK_COLOR = '#D3D3D3'; // Light gray for blank tiles
const BLANK_CHANCE = 0.3; // 30% chance for a tile to be blank
const GAME_DURATION = 120; // 120 seconds

let board = [];
let score = 0;
let timeLeft = GAME_DURATION;
let gameInterval;
let timerInterval;
let gameStarted = false;
let isPaused = false;
let blinkState = true; // New variable to control blinking dot visibility
let blinkInterval; // New interval for blinking effect

// Helper function to draw a rounded rectangle with shadow and optional stroke
function drawRoundedRect(x, y, width, height, radius, colors, strokeColor, strokeWidth, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY) {
    ctx.save();

    if (shadowColor && shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();

    if (Array.isArray(colors)) {
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        for (let i = 0; i < colors.length; i++) {
            gradient.addColorStop(i / (colors.length - 1), colors[i]);
        }
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = colors;
    }
    ctx.fill();

    if (strokeColor && strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }

    ctx.restore();
}

function initGame() {
    board = [];
    for (let i = 0; i < BOARD_ROWS; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_COLS; j++) {
            if (Math.random() < BLANK_CHANCE) {
                board[i][j] = BLANK_COLOR;
            } else {
                board[i][j] = COLORS[Math.floor(Math.random() * COLORS.length)][0];
            }
        }
    }
    drawBoard();
    updateGameInfo();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const tileRadius = 12; // Radius for rounded corners
    const shadowOffset = 3;
    const shadowBlur = 6;
    const shadowColor = 'rgba(0, 0, 0, 0.4)'; // Darker shadow

    for (let i = 0; i < BOARD_ROWS; i++) {
        for (let j = 0; j < BOARD_COLS; j++) {
            const x = j * TILE_SIZE;
            const y = i * TILE_SIZE;
            const tileColor = board[i][j];

            // Draw the tile with rounded corners, shadow, and a subtle border
            if (tileColor === BLANK_COLOR) {
                // Draw a light gray background for blank tiles
                drawRoundedRect(x + 1, y + 1, TILE_SIZE - 3, TILE_SIZE - 3, tileRadius, tileColor, '#aaa', 1, shadowColor, shadowBlur, shadowOffset, shadowOffset);

                // Draw dotted pattern for blank tiles
                ctx.save();
                ctx.strokeStyle = '#808080'; // Darker gray for dots
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]); // Dotted pattern
                ctx.beginPath();
                ctx.rect(x + 2, y + 2, TILE_SIZE - 6, TILE_SIZE - 6);
                ctx.stroke();
                ctx.restore();

                // Draw a black dot in the center of blank tiles
                ctx.save();
                ctx.fillStyle = blinkState ? '#a7acb5' : '#c0c0c0'; // Alternate between two shades of gray
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 8, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.restore();
            } else {
                const colorIndex = COLORS.findIndex(c => c[0] === tileColor);
                if (colorIndex !== -1) {
                    drawRoundedRect(x + 1, y + 1, TILE_SIZE - 3, TILE_SIZE - 3, tileRadius, COLORS[colorIndex], '#aaa', 1, shadowColor, shadowBlur, shadowOffset, shadowOffset);
                } else {
                    drawRoundedRect(x + 1, y + 1, TILE_SIZE - 3, TILE_SIZE - 3, tileRadius, tileColor, '#aaa', 1, shadowColor, shadowBlur, shadowOffset, shadowOffset);
                }
            }
        }
    }
}

function updateGameInfo() {
    console.log("Updating game info. Score: " + score + ", Time Left: " + timeLeft);
    scoreDisplay.textContent = `Score: ${score}`;
    timerDisplay.textContent = `Time: ${timeLeft}s`;
}

// Function to end the game
function endGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    gameStarted = false;
    isPaused = false; // Ensure game is not paused when ended
    playPauseButton.textContent = 'Play'; // Reset button text
    gameOverOverlay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    clearInterval(blinkInterval); // Clear blinking interval on game end
}

// Function to reset the game
function resetGame() {
    console.log("resetGame function called.");
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    gameInterval = null; // Explicitly clear
    timerInterval = null; // Explicitly clear
    gameOverOverlay.classList.add('hidden');
    score = 0;
    timeLeft = GAME_DURATION;
    gameStarted = false;
    isPaused = false;
    playPauseButton.textContent = 'Play'; // Set button text to Play early
    console.log("Resetting game. Play/Pause button text set to: " + playPauseButton.textContent); // Debugging line
    initGame(); // Re-initialize the board, which also calls drawBoard and updateGameInfo
    clearInterval(blinkInterval); // Clear blinking interval on game reset
    // Do not call startGame() here, wait for user to click Play
}

function startGame() {
    if (gameStarted && !isPaused) return; // If game is already started and not paused, do nothing
    if (!gameStarted) {
        initGame();
        gameStarted = true;
    }
    isPaused = false;
    playPauseButton.textContent = 'Pause';

    timerInterval = setInterval(() => {
        timeLeft--;
        updateGameInfo();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    gameInterval = setInterval(() => {
        // Game logic that runs every 100ms (if any)
    }, 100);
    startBlinking(); // Start blinking when game starts
}

function pauseGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    clearInterval(blinkInterval); // Clear blinking interval on pause
    isPaused = true;
    playPauseButton.textContent = 'Play';
    drawBoard(); // Redraw to show dots in a consistent state when paused
}

function playPauseHandler() {
    if (!gameStarted || isPaused) {
        startGame();
    } else {
        pauseGame();
    }
}

// New function to handle blinking effect
function startBlinking() {
    clearInterval(blinkInterval); // Clear any existing interval
    blinkInterval = setInterval(() => {
        blinkState = !blinkState; // Toggle blink state
        drawBoard(); // Redraw board to reflect blinking state
    }, 10000); // Blink every 10000ms (10 seconds) for a much more subtle effect
}

canvas.addEventListener('click', (event) => {
    if (!gameStarted) {
        if (confirm('Game not started yet. Do you want to start the game?')) {
            startGame();
        }
        return;
    }
    if (isPaused) return; // Prevent interaction when game is paused
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
        const clickedColor = board[row][col];
        let actualColor = clickedColor;
        if (Array.isArray(actualColor)) {
            actualColor = actualColor[0];
        }

        if (actualColor === BLANK_COLOR) {
            let totalCleared = 0;
            const foundTiles = [];

            // Check Up
            for (let r = row - 1; r >= 0; r--) {
                if (board[r][col] !== BLANK_COLOR) {
                    foundTiles.push({ r: r, c: col, color: board[r][col] });
                    break;
                }
            }
            // Check Down
            for (let r = row + 1; r < BOARD_ROWS; r++) {
                if (board[r][col] !== BLANK_COLOR) {
                    foundTiles.push({ r: r, c: col, color: board[r][col] });
                    break;
                }
            }
            // Check Left
            for (let c = col - 1; c >= 0; c--) {
                if (board[row][c] !== BLANK_COLOR) {
                    foundTiles.push({ r: row, c: c, color: board[row][c] });
                    break;
                }
            }
            // Check Right
            for (let c = col + 1; c < BOARD_COLS; c++) {
                if (board[row][c] !== BLANK_COLOR) {
                    foundTiles.push({ r: row, c: c, color: board[row][c] });
                    break;
                }
            }

            const colorCounts = {};
            for (const tile of foundTiles) {
                let tileActualColor = tile.color;
                if (Array.isArray(tileActualColor)) {
                    tileActualColor = tileActualColor[0];
                }
                colorCounts[tileActualColor] = (colorCounts[tileActualColor] || 0) + 1;
            }

            const colorsToClear = [];
            for (const color in colorCounts) {
                if (colorCounts[color] >= 2) {
                    colorsToClear.push(color);
                }
            }

            if (colorsToClear.length > 0) {
                for (const tile of foundTiles) {
                    let tileActualColor = tile.color;
                    if (Array.isArray(tileActualColor)) {
                        tileActualColor = tileActualColor[0];
                    }
                    if (colorsToClear.includes(tileActualColor)) {
                        if (board[tile.r][tile.c] !== BLANK_COLOR) { // Ensure it's not already cleared
                            board[tile.r][tile.c] = BLANK_COLOR;
                            totalCleared++;
                        }
                    }
                }
            }

            if (totalCleared > 0) {
                score += totalCleared * 1; // Adjust score as needed
                drawBoard(); // Draw to show blank spaces
                updateGameInfo();
                if (checkAllTilesCleared()) {
                    endGame();
                }
            }
        } else {
            // Do nothing if a colored tile is clicked
        }
        updateGameInfo();
    }
});

playPauseButton.addEventListener('click', playPauseHandler);
restartButton.addEventListener('click', resetGame);
resetGameButton.addEventListener('click', resetGame);

canvas.width = BOARD_COLS * TILE_SIZE;
canvas.height = BOARD_ROWS * TILE_SIZE;
initGame(); // Initialize game on page load
