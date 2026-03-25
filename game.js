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

// --- Debug Parameters ---
// If DEBUG_START_LEVEL is a value between 1-12, the game will start from that level.
// If -1, it starts from Level 1 normally.
const DEBUG_START_LEVEL = -1; 

// --- 关卡系统配置 (12 关梯度难度) ---
const LEVEL_CONFIGS = [
    { level: 1,  time: 60, colors: 3, blankChance: 0.40, targetScore: 100, name: "Easy Start", passRate: "98.5%" },
    { level: 2,  time: 55, colors: 3, blankChance: 0.38, targetScore: 100, name: "Gentle Flow", passRate: "85.2%" },
    { level: 3,  time: 50, colors: 4, blankChance: 0.35, targetScore: 100, name: "Steady Pace", passRate: "62.8%" },
    { level: 4,  time: 48, colors: 4, blankChance: 0.32, targetScore: 100, name: "Fast Thinking", passRate: "45.1%" },
    { level: 5,  time: 45, colors: 4, blankChance: 0.30, targetScore: 100, name: "Path Finder", passRate: "28.4%" },
    { level: 6,  time: 42, colors: 5, blankChance: 0.28, targetScore: 100, name: "Color Burst", passRate: "15.7%" },
    { level: 7,  time: 40, colors: 5, blankChance: 0.25, targetScore: 100, name: "Expert Mode", passRate: "8.3%" },
    { level: 8,  time: 38, colors: 6, blankChance: 0.22, targetScore: 100, name: "Master Reflex", passRate: "3.5%" },
    { level: 9,  time: 25, colors: 6, blankChance: 0.18, targetScore: 100, name: "Nightmare", passRate: "0.8%" },
    { level: 10, time: 20, colors: 7, blankChance: 0.15, targetScore: 100, name: "Chaos Theory", passRate: "0.1%" },
    { level: 11, time: 15, colors: 7, blankChance: 0.12, targetScore: 100, name: "Near Zero", passRate: "0.01%" },
    { level: 12, time: 12, colors: 8, blankChance: 0.08, targetScore: 100, name: "True Hell", passRate: "0%" }
];

const COLORS = [
    ['#4285F4', '#1967D2'], // Google Blue
    ['#EA4335', '#C5221F'], // Google Red
    ['#FBBC05', '#F29900'], // Google Yellow
    ['#34A853', '#188038'], // Google Green
    ['#AF5CF7', '#8430CE'], // Modern Purple
    ['#FF6D01', '#E65100'], // Deep Orange
    ['#00B8D4', '#0097A7'], // Cyan
    ['#FF4081', '#C2185B']  // Pink
]; 
const BLANK_COLOR = '#E8EAED'; 

// 根据测试参数设置初始关卡
let currentLevel = (DEBUG_START_LEVEL >= 1 && DEBUG_START_LEVEL <= 12) ? DEBUG_START_LEVEL : 1;
let board = [];
let score = 0;
let timeLeft = LEVEL_CONFIGS[currentLevel - 1].time;
let gameInterval;
let timerInterval;
let gameStarted = false;
let isPaused = false;
let blinkState = true;
let blinkInterval;

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
    const config = LEVEL_CONFIGS[currentLevel - 1];
    
    // 准备本关的时间
    timeLeft = config.time;
    // 每一关开始都重置本关分数
    score = 0;
    
    // 生成新棋盘
    board = [];
    const activeColors = COLORS.slice(0, config.colors).map(c => c[0]);

    for (let i = 0; i < BOARD_ROWS; i++) {
        let row = [];
        for (let j = 0; j < BOARD_COLS; j++) {
            if (Math.random() < config.blankChance) {
                row.push(BLANK_COLOR);
            } else {
                const randomColor = activeColors[Math.floor(Math.random() * activeColors.length)];
                row.push(randomColor);
            }
        }
        board.push(row);
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
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (timerDisplay) timerDisplay.textContent = timeLeft + 's';
    
    const levelDisplay = document.getElementById('currentLevel');
    if (levelDisplay) {
        levelDisplay.textContent = currentLevel;
    }

    // Update Pass Rate Stunt
    const passRateText = document.getElementById('pass-rate-text');
    if (passRateText) {
        const config = LEVEL_CONFIGS[currentLevel - 1];
        if (config.level === 12) {
            passRateText.textContent = "So far, no one has beat Level 12";
        } else {
            passRateText.textContent = `Only ${config.passRate} cleared Level ${config.level}`;
        }
    }
}

function checkLevelUp() {
    const config = LEVEL_CONFIGS[currentLevel - 1];
    if (score >= config.targetScore) {
        if (currentLevel < LEVEL_CONFIGS.length) {
            nextLevel();
        } else {
            winGame();
        }
    }
}

function nextLevel() {
    clearInterval(timerInterval);
    gameStarted = false;
    
    currentLevel++;
    
    // 显示过关蒙层或提示
    if (gameStartOverlay) {
        gameStartOverlay.classList.remove('hidden');
        const startButton = document.getElementById('start-overlay-button');
        const overlayContent = gameStartOverlay.querySelector('.overlay-content');
        
        if (startButton) {
            startButton.innerHTML = `<span class="play-icon">▶</span> Start Level ${currentLevel}`;
        }
        
        // 提示信息
        let overlayTitle = gameStartOverlay.querySelector('h2');
        if (!overlayTitle) {
            overlayTitle = document.createElement('h2');
            if (overlayContent) {
                overlayContent.insertBefore(overlayTitle, overlayContent.firstChild);
            } else {
                gameStartOverlay.insertBefore(overlayTitle, gameStartOverlay.firstChild);
            }
        }
        overlayTitle.textContent = `Level ${currentLevel - 1} Clear!`;
        overlayTitle.style.color = '#34A853';
    }

    initGame(); // 准备下一关的面板
}

function winGame() {
    clearInterval(timerInterval);
    clearInterval(gameInterval);
    gameStarted = false;
    alert(`Congratulations! You've conquered all 12 levels! Final Score: ${score}`);
    currentLevel = 1;
    resetGame();
}

// Function to end the game
function endGame() {
    clearInterval(timerInterval);
    clearInterval(blinkInterval);
    gameStarted = false;
    isPaused = false;
    
    playPauseButton.textContent = 'Play';
    
    // 显示失败提示并允许重试当前关卡
    if (gameStartOverlay) {
        gameStartOverlay.classList.remove('hidden');
        const startButton = document.getElementById('start-overlay-button');
        const overlayContent = gameStartOverlay.querySelector('.overlay-content');

        if (startButton) {
            startButton.innerHTML = `<span class="play-icon">▶</span> Retry Level ${currentLevel}`;
        }
        
        // 提示信息
        let overlayTitle = gameStartOverlay.querySelector('h2');
        if (!overlayTitle) {
            overlayTitle = document.createElement('h2');
            if (overlayContent) {
                overlayContent.insertBefore(overlayTitle, overlayContent.firstChild);
            } else {
                gameStartOverlay.insertBefore(overlayTitle, gameStartOverlay.firstChild);
            }
        }
        overlayTitle.textContent = `Game Over! (Level ${currentLevel})`;
        overlayTitle.style.color = '#EA4335';
    }
}

// Function to reset the game
function resetGame() {
    clearInterval(timerInterval);
    clearInterval(gameInterval);
    clearInterval(blinkInterval);
    gameStarted = false;
    // score = 0; // initGame will handle this
    
    if (gameStartOverlay) {
        gameStartOverlay.classList.remove('hidden');
        const startButton = document.getElementById('start-overlay-button');
        const overlayContent = gameStartOverlay.querySelector('.overlay-content');
        
        if (startButton) {
            startButton.innerHTML = `<span class="play-icon">▶</span> Start Level ${currentLevel}`;
        }
        
        // 移除过关标题或失败标题
        const overlayTitle = gameStartOverlay.querySelector('h2');
        if (overlayTitle) overlayTitle.remove();
    }
    
    gameOverOverlay.classList.add('hidden');
    isPaused = false;
    playPauseButton.textContent = 'Play';
    
    initGame();
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        updateGameInfo();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function startGame() {
    // 如果游戏已经在运行且未暂停，则不执行
    if (gameStarted && !isPaused) return;
    
    // 如果是暂停状态，则恢复游戏
    if (isPaused) {
        resumeGame();
        return;
    }

    // --- 开始新关卡或重试关卡 ---
    gameStarted = true;
    isPaused = false;
    
    if (gameStartOverlay) {
        gameStartOverlay.classList.add('hidden');
        // 清理蒙层上的标题信息
        const overlayTitle = gameStartOverlay.querySelector('h2');
        if (overlayTitle) overlayTitle.remove();
    }
    
    playPauseButton.textContent = 'Pause';
    
    initGame();
    startTimer();
    startBlinking();
}

function resumeGame() {
    if (!isPaused) return;
    
    isPaused = false;
    gameStarted = true;
    playPauseButton.textContent = 'Pause';
    
    if (gameStartOverlay) {
        gameStartOverlay.classList.add('hidden');
    }
    
    startTimer();
    startBlinking();
}

function pauseGame() {
    if (!gameStarted || isPaused) return;
    
    clearInterval(timerInterval);
    clearInterval(blinkInterval);
    isPaused = true;
    playPauseButton.textContent = 'Play';
    drawBoard(); 
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
                checkLevelUp(); // 每次得分后检查是否达到过关分数
                if (checkAllTilesCleared()) {
                    timeLeft += 10; // 清屏奖金时间
                    updateGameInfo();
                    initGame();
                }
            }
        }
        updateGameInfo();
    }
});

playPauseButton.addEventListener('click', playPauseHandler);
restartButton.addEventListener('click', resetGame);
resetGameButton.addEventListener('click', resetGame);
const restartLevel1Button = document.getElementById('restart-level-1-button');
if (restartLevel1Button) {
    restartLevel1Button.addEventListener('click', () => {
        currentLevel = 1;
        score = 0;
        startGame();
    });
}

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

// If a debug level is set, automatically update the button text
if (DEBUG_START_LEVEL >= 1 && DEBUG_START_LEVEL <= 12) {
    if (startOverlayButton) {
        startOverlayButton.innerHTML = `<span class="play-icon">▶</span> Start Level ${DEBUG_START_LEVEL}`;
    }
}
