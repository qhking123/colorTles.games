// - 步骤 1：目标检测 —— 确认玩家点击的是否为灰色空位。
// - 步骤 2：十字扫描 —— 分别向 上、下、左、右 四个方向寻找直线路径上第一个遇到的色块。
// - 步骤 3：颜色汇总 —— 收集这四个方向找到的色块信息。
// - 步骤 4：消除判定 —— 判断哪些颜色出现了 2 次或以上（满足消除条件）。
// - 步骤 5：执行操作 —— 将符合条件的色块变为空位，并统计消除数量。
// - 步骤 6：反馈更新 —— 实时更新分数、重绘画面，并检查是否已清空全场。

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// const startGameButton = document.getElementById('startGameButton'); // Removed unused ID
const scoreDisplay = document.getElementById('scoreDisplay');
const timerDisplay = document.getElementById('timerDisplay');
let gameOverOverlay = document.getElementById('game-over-overlay');
let finalScoreDisplay = document.getElementById('final-score');
let restartButton = document.getElementById('restart-button');
let resetGameButton = document.getElementById('resetGameButton');
let playPauseButton = document.getElementById('playPauseButton');
const gameStartOverlay = document.getElementById('game-start-overlay');
const startOverlayButton = document.getElementById('start-overlay-button');

const TILE_SIZE = 50; // 设置为 50，对应 1000px 总宽，这是网页游戏的主流黄金尺寸
const BOARD_ROWS = 10;
const BOARD_COLS = 20;
const INITIAL_TIME = 30; // seconds
const COLORS = [
    ['#4285F4', '#1967D2'], // Google Blue
    ['#EA4335', '#C5221F'], // Google Red
    ['#FBBC05', '#F29900'], // Google Yellow
    ['#34A853', '#188038'], // Google Green
    ['#AF5CF7', '#8430CE']  // Modern Purple
]; 
const BLANK_COLOR = '#E8EAED'; // 浅灰色，更符合现代 UI 的背景感
const BLANK_CHANCE = 0.3; 
const GAME_DURATION = 120; 

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
                // Ensure we store the color value, not an array index or anything else
                const colorSet = COLORS[Math.floor(Math.random() * COLORS.length)];
                board[i][j] = colorSet[0]; 
            }
        }
    }
    drawBoard();
    updateGameInfo();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const tileRadius = 10; 
    const margin = 4; // 方块之间的间距，让网格感更强

    for (let i = 0; i < BOARD_ROWS; i++) {
        for (let j = 0; j < BOARD_COLS; j++) {
            const x = j * TILE_SIZE + margin;
            const y = i * TILE_SIZE + margin;
            const w = TILE_SIZE - margin * 2;
            const h = TILE_SIZE - margin * 2;
            const tileColor = board[i][j];

            if (tileColor === BLANK_COLOR) {
                // --- 绘制空位 (凹陷感槽位) ---
                ctx.save();
                // 绘制轻微内阴影背景
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, tileRadius);
                ctx.fillStyle = '#F1F3F4';
                ctx.fill();
                
                // 绘制虚线边框
                ctx.strokeStyle = '#BDC1C6';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.stroke();

                // 中心点 (呼吸感)
                ctx.restore();
                ctx.save();
                ctx.fillStyle = blinkState ? '#DADCE0' : '#E8EAED';
                ctx.beginPath();
                ctx.arc(x + w/2, y + h/2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // --- 绘制有色方块 (3D 立体质感) ---
                const colorIndex = COLORS.findIndex(c => c[0] === tileColor);
                const baseColor = tileColor;
                const darkColor = COLORS[colorIndex] ? COLORS[colorIndex][1] : tileColor;

                ctx.save();
                
                // 1. 绘制底部阴影 (深度感)
                ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 4;

                // 2. 绘制主体渐变
                const gradient = ctx.createLinearGradient(x, y, x, y + h);
                gradient.addColorStop(0, baseColor); // 顶部较亮
                gradient.addColorStop(1, darkColor); // 底部较暗
                
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, tileRadius);
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.shadowColor = 'transparent'; // 重置阴影

                // 3. 绘制顶部高光边 (提升立体感)
                ctx.beginPath();
                ctx.moveTo(x + tileRadius, y + 1);
                ctx.lineTo(x + w - tileRadius, y + 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 4. 绘制表面光泽 (Glossy overlay)
                const gloss = ctx.createLinearGradient(x, y, x, y + h / 2);
                gloss.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gloss;
                ctx.beginPath();
                ctx.roundRect(x, y, w, h / 2, { tl: tileRadius, tr: tileRadius, bl: 0, br: 0 });
                ctx.fill();

                ctx.restore();
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
    gameStartOverlay.classList.remove('hidden'); // Show start overlay on reset
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
    console.log("startGame called. gameStarted:", gameStarted, "isPaused:", isPaused);
    if (gameStarted && !isPaused) return; 
    
    // 不要在这里调用 initGame()，除非我们需要重新开始一个全新的游戏。
    // 初始化已经在页面加载或 resetGame 时完成。
    if (!gameStarted) {
        gameStarted = true;
    }
    if (gameStartOverlay) {
        console.log("Hiding gameStartOverlay");
        gameStartOverlay.classList.add('hidden');
    } else {
        console.error("gameStartOverlay element not found!");
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
        // Only start game via overlay play button as requested
        return;
    }
    if (isPaused) return; 
    const rect = canvas.getBoundingClientRect();
    // 考虑 Canvas 的缩放，计算实际在 1280x640 画布上的坐标
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    console.log(`Click coordinates: clientX=${event.clientX}, clientY=${event.clientY} | rect.left=${rect.left}, rect.top=${rect.top} | rect.width=${rect.width}, rect.height=${rect.height} | scaleX=${scaleX}, scaleY=${scaleY} | x=${x}, y=${y} | Grid: row=${row}, col=${col}`);

    if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
        // 【游戏核心玩法逻辑步骤说明】
        
        // 步骤 1: 检查点击的目标是否为空位 (BLANK_COLOR)
        // 只有点击空白区域才能触发消除。
        const clickedTile = board[row][col];
        
        if (clickedTile === BLANK_COLOR) {
            let totalCleared = 0;
            const foundTiles = [];

            // 步骤 2: 向十字方向（上、下、左、右）扫描最近的非空色块
            // 每个方向只找第一个遇到的色块，如果中间隔着空白位，可以跨越。
            
            // --- 扫描上方 ---
            for (let r = row - 1; r >= 0; r--) {
                if (board[r][col] !== BLANK_COLOR) {
                    foundTiles.push({ r: r, c: col, color: board[r][col] });
                    break;
                }
            }
            // --- 扫描下方 ---
            for (let r = row + 1; r < BOARD_ROWS; r++) {
                if (board[r][col] !== BLANK_COLOR) {
                    foundTiles.push({ r: r, c: col, color: board[r][col] });
                    break;
                }
            }
            // --- 扫描左侧 ---
            for (let c = col - 1; c >= 0; c--) {
                if (board[row][c] !== BLANK_COLOR) {
                    foundTiles.push({ r: row, c: c, color: board[row][c] });
                    break;
                }
            }
            // --- 扫描右侧 ---
            for (let c = col + 1; c < BOARD_COLS; c++) {
                if (board[row][c] !== BLANK_COLOR) {
                    foundTiles.push({ r: row, c: c, color: board[row][c] });
                    break;
                }
            }

            // 步骤 3: 统计四个方向找到的色块颜色
            // 我们需要找出哪些颜色出现了 2 次或更多次。
            const colorCounts = {};
            for (const tile of foundTiles) {
                colorCounts[tile.color] = (colorCounts[tile.color] || 0) + 1;
            }

            // 步骤 4: 判定需要消除的颜色
            // 只有当某一颜色在扫描到的色块中出现 >= 2 次时，该颜色的色块才会被消除。
            const colorsToClear = [];
            for (const color in colorCounts) {
                if (colorCounts[color] >= 2) {
                    colorsToClear.push(color);
                }
            }

            // 步骤 5: 执行消除并计算分数
            // 将符合条件的色块设为 BLANK_COLOR，并增加分数。
            if (colorsToClear.length > 0) {
                for (const tile of foundTiles) {
                    if (colorsToClear.includes(tile.color)) {
                        board[tile.r][tile.c] = BLANK_COLOR;
                        totalCleared++;
                    }
                }
            }

            // 步骤 6: 视觉反馈与状态检查
            // 如果发生了消除，重绘画布、更新分数，并检查是否通关。
            if (totalCleared > 0) {
                score += totalCleared;
                drawBoard();
                updateGameInfo();
                if (checkAllTilesCleared()) {
                    endGame();
                }
            }
        }
        updateGameInfo();
    }
});

playPauseButton.addEventListener('click', playPauseHandler);
restartButton.addEventListener('click', resetGame);
resetGameButton.addEventListener('click', resetGame);
startOverlayButton.addEventListener('click', () => {
    console.log("startOverlayButton clicked");
    startGame();
});

function checkAllTilesCleared() {
    for (let i = 0; i < BOARD_ROWS; i++) {
        for (let j = 0; j < BOARD_COLS; j++) {
            if (board[i][j] !== BLANK_COLOR) {
                return false;
            }
        }
    }
    return true;
}

canvas.width = BOARD_COLS * TILE_SIZE;
canvas.height = BOARD_ROWS * TILE_SIZE;
initGame(); // Initialize game on page load
