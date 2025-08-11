// game.js

// Global Variables
let canvas;
let context;
let lastTimestamp = 0;
let gameSpeed = 5;
let speedIncrementTimer = 0;
let speedIncrementInterval = 5000;
let obstacles = [];
let obstacleSpawnTimer = 0;
let obstacleSpawnInterval = 1500; // Initial interval
let minSpawnInterval = 1000;  // Minimum interval between obstacles
let maxSpawnInterval = 2000; // Maximum interval between obstacles
let username = "";
let gameID = "";
let score = 0;
let highScore = 0;
let dino;
let gravity = 0.45;
let groundYPosition;
let isGameOver = false;
let isGameStarted = false;

// Variables to keep track of obstacles passed
let obstaclesPassed = {
    cactus_standard: 0,
    cactus_tall: 0,
    cactus_wide: 0,
    cactus_tall_wide: 0,
    bird_low: 0,
    bird_mid: 0,
    bird_high: 0
};

// Variable to keep track of the obstacle that killed the player
let obstacleThatKilled = null;

// Images
let dinoRunImages = [];
let dinoDuckImages = [];
let birdImages = [];
let cactusImages = {};
let backgroundImage;

// Background variables
let backgroundX = 0;

// Generate a random GUID for the game
function generateGameID() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function() {
        return Math.floor(Math.random() * 9).toString();
    });
}

// Load JSON data with adjectives and nouns
async function loadUsernameData() {
    try {
        const response = await fetch('/static/assets/data.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading username data:', error);
        return null;
    }
}

// Function to generate or retrieve username
async function getUsername() {
    // Check if username is stored in cookies
    let username = getCookie('username');
    if (username) {
        return username;
    } else {
        // Generate new username
        const data = await loadUsernameData();
        if (!data) return "Anonymous";

        const adjectives = data.adjectives;
        const nouns = data.nouns;

        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        username = `${randomAdjective}${randomNoun}`;

        // Store in cookies
        setCookie('username', username, 365); // Expires in 1 year
        return username;
    }
}

// Cookie helper functions
function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days*864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}
function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=')
        return parts[0] === name ? decodeURIComponent(parts[1]) : r
    }, '');
}

// Dino Class
class Dino {
    constructor() {
        this.x = 50;
        this.y = groundYPosition;
        this.width = 88; 
        this.height = 94;
        this.velocityY = 0;
        this.onGround = true;
        this.isDucking = false;

        this.runImages = dinoRunImages; // running images
        this.duckImages = dinoDuckImages; // ducking images
        this.currentRunImageIndex = 0;
        this.animationTime = 0;
        this.animationInterval = 100; // Swap images every 100 milliseconds
    }

    jump() {
        if (this.onGround && !this.isDucking) {
            this.velocityY = -15;
            this.onGround = false;
        }
    }

    duck() {
        if (this.onGround) {
            this.isDucking = true;
            this.height = 60;
        }
    }

    standUp() {
        this.isDucking = false;
        this.height = 94; // Reset to standing height
    }

    reset() {
        this.y = groundYPosition;
        this.velocityY = 0;
        this.onGround = true;
        this.isDucking = false;
        this.height = 94;
        this.currentRunImageIndex = 0;
        this.animationTime = 0;
    }

    update(deltaTime) {
        // Apply gravity
        this.velocityY += gravity;
        this.y += this.velocityY;

        // Check if on the ground
        if (this.y >= groundYPosition) {
            this.y = groundYPosition;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Update animation timer
        this.animationTime += deltaTime;
        if (this.animationTime > this.animationInterval) {
            this.animationTime = 0;
            // Swap to the next image
            this.currentRunImageIndex = (this.currentRunImageIndex + 1) % this.runImages.length;
        }
    }

    draw(context) {
        if (this.isDucking) {
            // Draw ducking animation
            context.drawImage(this.duckImages[this.currentRunImageIndex], this.x, this.y - this.height, this.width, this.height);
        } else if (!this.onGround) {
            // Draw jumping image (use first run image)
            context.drawImage(this.runImages[0], this.x, this.y - this.height, this.width, this.height);
        } else {
            // Draw running animation
            context.drawImage(this.runImages[this.currentRunImageIndex], this.x, this.y - this.height, this.width, this.height);
        }
    }
}

// Obstacle Class
class Obstacle {
    constructor(type, speed) {
        this.type = type; // 'cactus' or 'bird'
        this.speed = speed;
        this.x = canvas.width;
        this.variant = '';

        if (this.type === 'cactus') {
            this.y = groundYPosition;
            // Randomly decide size of cactus
            const sizes = [
                {width: 40, height: 71, variant: 'cactus_standard'}, // normal size
                {width: 48, height: 95, variant: 'cactus_tall'},     // taller
                {width: 105, height: 71, variant: 'cactus_wide'},     // wider
                {width: 102, height: 95, variant: 'cactus_tall_wide'} // wider and taller
            ];
            const size = sizes[Math.floor(Math.random() * sizes.length)];
            this.width = size.width;
            this.height = size.height;
            this.variant = size.variant;

            this.image = cactusImages[this.variant];
        } else {
            // Bird can have different heights
            const birdVariants = [
                {y: groundYPosition - 20, variant: 'bird_low'},
                {y: groundYPosition - 50, variant: 'bird_mid'},
                {y: groundYPosition - 80, variant: 'bird_high'}
            ];
            const bird = birdVariants[Math.floor(Math.random() * birdVariants.length)];
            this.y = bird.y;
            this.width = 97;
            this.height = 68;
            this.variant = bird.variant;

            this.animationTime = 0;
            this.animationInterval = 200; // Bird flaps wings every 200ms
            this.currentImageIndex = 0;
        }
    }

    update(deltaTime) {
        this.x -= this.speed;

        if (this.type === 'bird') {
            // Update bird animation
            this.animationTime += deltaTime;
            if (this.animationTime > this.animationInterval) {
                this.animationTime = 0;
                this.currentImageIndex = (this.currentImageIndex + 1) % birdImages.length;
            }
        }
    }

    draw(context) {
        if (this.type === 'cactus') {
            context.drawImage(this.image, this.x, this.y - this.height, this.width, this.height);
        } else if (this.type === 'bird') {
            context.drawImage(birdImages[this.currentImageIndex], this.x, this.y - this.height, this.width, this.height);
        }
    }
}

// Collision Detection Function
function checkCollision(rect1, rect2, margin = 0.05) {
    // Calculate adjusted dimensions for rect1 (Dino)
    const rect1X = rect1.x + rect1.width * margin;
    const rect1Y = rect1.y - rect1.height + rect1.height * margin;
    const rect1Width = rect1.width * (1 - 2 * margin);
    const rect1Height = rect1.height * (1 - 2 * margin);

    // Calculate adjusted dimensions for rect2 (Obstacle)
    const rect2X = rect2.x + rect2.width * margin;
    const rect2Y = rect2.y - rect2.height + rect2.height * margin;
    const rect2Width = rect2.width * (1 - 2 * margin);
    const rect2Height = rect2.height * (1 - 2 * margin);

    // Check for collision between adjusted rectangles
    return (
        rect1X < rect2X + rect2Width &&
        rect1X + rect1Width > rect2X &&
        rect1Y < rect2Y + rect2Height &&
        rect1Y + rect1Height > rect2Y
    );
}

// Update Obstacles
function updateObstacles(deltaTime) {
    obstacleSpawnTimer += deltaTime;

    // Adjust min and max spawn intervals over time to increase difficulty
    if (minSpawnInterval > 500) {
        minSpawnInterval -= 0.005 * deltaTime;
    }
    if (maxSpawnInterval > 1200) {
        maxSpawnInterval -= 0.005 * deltaTime;
    }

    if (obstacleSpawnTimer > obstacleSpawnInterval) {
        // Ensure obstacles are not impossibly close
        if (obstacles.length === 0 || canvas.width - obstacles[obstacles.length - 1].x > minimumObstacleSpacing()) {
            // Randomly decide between 'cactus' and 'bird'
            const obstacleType = Math.random() < 0.5 ? 'cactus' : 'bird';
            const obstacleSpeed = gameSpeed;
            obstacles.push(new Obstacle(obstacleType, obstacleSpeed));
        }

        // Reset the timer
        obstacleSpawnTimer = 0;

        // Randomize the next spawn interval
        obstacleSpawnInterval = minSpawnInterval + Math.random() * (maxSpawnInterval - minSpawnInterval);
    }

    // Update and draw obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.update(deltaTime);
        obstacle.draw(context);

        // Remove obstacles that have moved off-screen
        if (obstacle.x + obstacle.width < 0) {
            // Increment obstacle passed count
            if (obstaclesPassed.hasOwnProperty(obstacle.variant)) {
                obstaclesPassed[obstacle.variant]++;
            }
            obstacles.splice(index, 1);
        }
    });
}

// Minimum obstacle spacing based on game speed
function minimumObstacleSpacing() {
    return 50 + 50 / gameSpeed; // Reduced minimum spacing to allow quick succession
}

// Update Game Speed
function updateGameSpeed(deltaTime) {
    speedIncrementTimer += deltaTime;

    if (speedIncrementTimer > speedIncrementInterval) {
        gameSpeed += 0.5;
        speedIncrementTimer = 0;

        // Cap the maximum speed
        if (gameSpeed > 20) {
            gameSpeed = 20;
        }
    }
}

// Update Score
function updateScore(deltaTime) {
    score += deltaTime * 0.01;

    if (score > highScore) {
        highScore = score;
    }

    updateScoreDisplay();
}

// Update Score Display
function updateScoreDisplay() {
    document.getElementById('score').innerText = `Score: ${Math.floor(score)}`;
    document.getElementById('highScore').innerText = `High Score: ${Math.floor(highScore)}`;
}

// Game Over Function
function gameOver() {
    isGameOver = true;

    // Display game over message
    context.fillStyle = '#000';
    context.font = '48px sans-serif';
    context.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);

    // Send game data to the server
    sendGameData(Math.floor(score), username, gameID);
}

// Send game data
async function sendGameData(score, username, gameID) {
    try {
        const response = await fetch('/submit_game_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                score: score,
                username: username,
                gameID: gameID,
                timestamp: new Date().toISOString(),
                obstaclesPassed: obstaclesPassed,
                obstacleThatKilled: obstacleThatKilled
            }),
        });
        const result = await response.json();
        console.log("Data saved successfully:", result);
    } catch (error) {
        console.error("Error sending game data:", error);
    }
}

// Background drawing function
function drawBackground() {
    // Move background
    backgroundX -= gameSpeed / 8;

    // Reset background position to create looping effect
    if (backgroundX <= -backgroundImage.width) {
        backgroundX = 0;
    }

    // Draw two images to create a seamless loop
    context.drawImage(backgroundImage, backgroundX, 0);
    context.drawImage(backgroundImage, backgroundX + backgroundImage.width, 0);
}

// Main Game Loop
function gameLoop(timestamp) {
    if (!isGameStarted) return;
    if (isGameOver) return;

    // Calculate deltaTime
    let deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

    // Update game elements
    updateGameSpeed(deltaTime);
    updateObstacles(deltaTime);
    dino.update(deltaTime);
    dino.draw(context);
    updateScore(deltaTime);

    // Draw ground
    context.strokeStyle = '#000';
    context.beginPath();
    context.moveTo(0, groundYPosition + 1);
    context.lineTo(canvas.width, groundYPosition + 1);
    context.stroke();

    // Check for collisions
    obstacles.forEach(obstacle => {
        let obstacleMargin = 0.05;
        if (obstacle.type === 'bird') {
            obstacleMargin = 0.05;
        } else if (obstacle.type === 'cactus') {
            obstacleMargin = 0.05;
        }
        if (checkCollision(dino, obstacle, 0.1, obstacleMargin)) {
            obstacleThatKilled = obstacle.variant;
            gameOver();
        }
});

    // Request the next frame
    requestAnimationFrame(gameLoop);
}

// Handle User Input
document.addEventListener('keydown', function(event) {
    if (!isGameStarted) {
        // Start the game on any key press
        isGameStarted = true;
        resetGame();
        requestAnimationFrame(gameLoop);
        return;
    }
    if (isGameOver) {
        // Restart the game on any key press after game over
        isGameOver = false;
        resetGame();
        requestAnimationFrame(gameLoop);
        return;
    }
    if (event.code === 'Space' || event.code === 'ArrowUp') {
        dino.jump();
    } else if (event.code === 'ArrowDown') {
        dino.duck();
    }
});

document.addEventListener('keyup', function(event) {
    if (event.code === 'ArrowDown') {
        dino.standUp();
    }
});

// Load images
function loadImages() {
    return new Promise((resolve, reject) => {
        let imagesLoaded = 0;
        const totalImages = 10;

        let runImageLeft = new Image();
        runImageLeft.src = '/static/assets/dino_left.png';
        runImageLeft.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        let runImageRight = new Image();
        runImageRight.src = '/static/assets/dino_right.png';
        runImageRight.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        dinoRunImages.push(runImageLeft, runImageRight);

        let duckImageLeft = new Image();
        duckImageLeft.src = '/static/assets/dino_duck_left.png';
        duckImageLeft.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        let duckImageRight = new Image();
        duckImageRight.src = '/static/assets/dino_duck_right.png';
        duckImageRight.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        dinoDuckImages.push(duckImageLeft, duckImageRight);

        let birdUpImage = new Image();
        birdUpImage.src = '/static/assets/bird_up.png';
        birdUpImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        let birdDownImage = new Image();
        birdDownImage.src = '/static/assets/bird_down.png';
        birdDownImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        birdImages.push(birdUpImage, birdDownImage);

        let cactusStandardImage = new Image();
        cactusStandardImage.src = '/static/assets/cactus_standard.png';
        cactusStandardImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        cactusImages['cactus_standard'] = cactusStandardImage;

        let cactusTallImage = new Image();
        cactusTallImage.src = '/static/assets/cactus_tall.png';
        cactusTallImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        cactusImages['cactus_tall'] = cactusTallImage;

        let cactusWideImage = new Image();
        cactusWideImage.src = '/static/assets/cactus_wide.png';
        cactusWideImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        cactusImages['cactus_wide'] = cactusWideImage;

        let cactusTallWideImage = new Image();
        cactusTallWideImage.src = '/static/assets/cactus_tall_wide.png';
        cactusTallWideImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
        cactusImages['cactus_tall_wide'] = cactusTallWideImage;

        backgroundImage = new Image();
        backgroundImage.src = '/static/assets/background.png';
        backgroundImage.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) resolve();
        };
    });
}

// Initialize the Game
async function initGame() {
    canvas = document.getElementById('gameCanvas');
    context = canvas.getContext('2d');
    groundYPosition = canvas.height - 50;

    username = await getUsername();
    // Generate initial gameID
    gameID = generateGameID();

    document.getElementById('username').innerText = `Username: ${username}`;
    document.getElementById('gameID').innerText = `Game ID: ${gameID}`;

    highScore = localStorage.getItem('highScore') || 0;

    await loadImages();

    dino = new Dino();

    // Display message to start game
    context.fillStyle = '#000';
    context.font = '24px sans-serif';
    context.fillText('Press any key to start', canvas.width / 2 - 100, canvas.height / 2);

    updateScoreDisplay();
}

// Reset Game Function
function resetGame() {
    // Reset game variables
    obstacles = [];
    gameSpeed = 5;
    speedIncrementTimer = 0;
    obstacleSpawnTimer = 0;
    obstacleSpawnInterval = 1500;
    minSpawnInterval = 800;
    maxSpawnInterval = 2000;
    score = 0;
    lastTimestamp = performance.now();
    obstaclesPassed = {
        cactus_standard: 0,
        cactus_tall: 0,
        cactus_wide: 0,
        cactus_tall_wide: 0,
        bird_low: 0,
        bird_mid: 0,
        bird_high: 0
    };
    obstacleThatKilled = null;
    backgroundX = 0;

    dino.reset();

    // Generate new gameID
    gameID = generateGameID();
    document.getElementById('gameID').innerText = `Game ID: ${gameID}`;
}

// Update High Score in Local Storage on unload
window.addEventListener('beforeunload', function() {
    if (score > highScore) {
        localStorage.setItem('highScore', Math.floor(score));
    }
});

// Start the game after loading
window.onload = initGame;
