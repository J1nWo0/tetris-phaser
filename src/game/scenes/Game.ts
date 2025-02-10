import Phaser from "phaser";

const TETRIMINOS = [
    { shape: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]], color: 0x00ffff }, // I
    { shape: [[1, 1], [1, 1]], color: 0xffff00 }, // O
    { shape: [[0, 1, 0], [1, 1, 1]], color: 0x800080 }, // T
    { shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]], color: 0xffa500 }, // L
    { shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]], color: 0x0000ff }, // J
    { shape: [[0, 1, 1], [1, 1, 0]], color: 0x00ff00 }, // S
    { shape: [[1, 1, 0], [0, 1, 1]], color: 0xff0000 }  // Z
];

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const BLOCK_SIZE = 25;
const coorX = 500;
const coorY = 0;

class Game extends Phaser.Scene {
    private currentTetromino!: { shape: number[][]; color: number };
    private currentPosition!: { x: number; y: number };
    private graphics!: Phaser.GameObjects.Graphics;
    private lockedGraphics!: Phaser.GameObjects.Graphics;
    private grid!: number[][];
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private heldTetromino: { shape: number[][]; color: number } | null = null;
    private holdGraphics!: Phaser.GameObjects.Graphics;
    private canHold: boolean = true; // Prevent multiple swaps in a row
    private nextTetrominos: { shape: number[][]; color: number }[] = [];
    private nextGraphics!: Phaser.GameObjects.Graphics;
    private tetriminoBag: { shape: number[][]; color: number }[] = [];
    private ghostGraphics!: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: "Game" });
    }

    // TODO: Add style to the Game Scene

    preload() {}

    create() {
        console.log("Game Scene Loaded");
        this.grid = this.generateGrid();
        this.graphics = this.add.graphics();
        this.lockedGraphics = this.add.graphics(); // Separate graphics for locked Tetriminos
        this.drawGrid();
        // Create graphics for the held Tetromino
        this.holdGraphics = this.add.graphics();
        this.add.text(300, 50, "Hold", { fontSize: "20px", color: "#fff" });

        // Create graphics for the next Tetromino queue
        this.nextGraphics = this.add.graphics();
        this.add.text(900, 30, "Next", { fontSize: "20px", color: "#fff" });

        // Generate the first three Tetrominos in the queue
        for (let i = 0; i < 3; i++) {
            this.nextTetrominos.push(this.getRandomTetromino());
        }
        this.spawnTetromino();
        this.ghostGraphics = this.add.graphics();

        // Add score text
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            color: '#fff'
        });

        // Add event to move down every second
        this.time.addEvent({
            delay: 995,
            callback: this.moveDown,
            callbackScope: this,
            loop: true
        });

        // Add event listeners for keyboard input
        this.input.keyboard?.on('keydown-LEFT', () => this.moveLeft());
        this.input.keyboard?.on('keydown-A', () => this.moveLeft());
        this.input.keyboard?.on('keydown-RIGHT', () => this.moveRight());
        this.input.keyboard?.on('keydown-D', () => this.moveRight());
        this.input.keyboard?.on('keydown-DOWN', () => this.moveDown());
        this.input.keyboard?.on('keydown-S', () => this.moveDown());
        this.input.keyboard?.on('keydown-UP', () => this.rotateTetromino());
        this.input.keyboard?.on('keydown-W', () => this.rotateTetromino());
        this.input.keyboard?.on('keydown-SPACE', () => this.hardDrop());
        this.input.keyboard?.on("keydown-SHIFT", () => this.holdTetromino());
        this.input.keyboard?.on("keydown-P", () => this.togglePause());
    }

    /**
     * Draws a grid on the game scene.
     * 
     * This method creates a grid using the specified grid height and width, 
     * and draws each cell with a specified block size. The grid lines are 
     * styled with a line color and thickness.
     * 
     * @remarks
     * This method uses the `graphics` object to draw the grid lines.
     * 
     * @param {number} GRID_HEIGHT - The height of the grid in number of cells.
     * @param {number} GRID_WIDTH - The width of the grid in number of cells.
     * @param {number} BLOCK_SIZE - The size of each block in the grid.
     * @param {number} coorX - The x-coordinate offset for the grid.
     * @param {number} coorY - The y-coordinate offset for the grid.
     */
    drawGrid() {
        let graphics = this.add.graphics();
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                graphics.lineStyle(1, 0xf0e7e5);
                graphics.strokeRect(x * BLOCK_SIZE + coorX, y * BLOCK_SIZE + coorY, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    /**
     * Generates a grid for the game with the specified height and width.
     * 
     * @returns {number[][]} A 2D array representing the game grid, initialized with zeros.
     */
    generateGrid() {
        return Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_WIDTH).fill(0));
    }

    /**
     * Spawns the next Tetromino in the game.
     * 
     * This function performs the following steps:
     * 1. Retrieves the next Tetromino from the queue and sets it as the current Tetromino.
     * 2. Adds a new random Tetromino to the queue.
     * 3. Sets the initial position of the current Tetromino at the top center of the grid.
     * 4. Checks if the new Tetromino can be spawned without colliding with existing blocks.
     *    - If a collision is detected, it clears the next Tetrominos queue, starts the "Game Over" scene, and resets the score.
     * 5. Draws the next Tetrominos in the queue.
     * 
     * @returns {void}
     */
    spawnTetromino() {
        this.currentTetromino = this.nextTetrominos.shift()!; // Get the next Tetromino
        this.nextTetrominos.push(this.getRandomTetromino()); // Add a new one to the queue
        this.currentPosition = { x: Math.floor(GRID_WIDTH / 2 - this.currentTetromino.shape[0].length / 2), y: -1 };

        // Check if the new Tetromino can be spawned without colliding
        if (!this.isValidMove(0, 0)) {
            this.nextTetrominos = []
            this.scene.start("Game Over", { score: this.score });
            this.score = 0;
            // this.gameOver();
            return;
        }

        this.drawNextTetrominos();
    }

    /**
     * Retrieves a random Tetromino from the tetriminoBag. If the bag is empty,
     * it refills the bag with all Tetrominos and shuffles them before returning one.
     *
     * @returns {Tetromino} A random Tetromino from the tetriminoBag.
     */
    getRandomTetromino() {
        if (this.tetriminoBag.length === 0) {
            this.tetriminoBag = [...TETRIMINOS];
            this.shuffleArray(this.tetriminoBag);
        }
        return this.tetriminoBag.pop()!;
        // return TETRIMINOS[Math.floor(Math.random() * TETRIMINOS.length)];
    }

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * 
     * @param array - The array to be shuffled.
     */
    shuffleArray(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }


    /**
     * Draws the current Tetromino on the game board.
     * 
     * This method clears the previous graphics and then fills the new Tetromino shape
     * with the specified color at the current position.
     * 
     * @remarks
     * The Tetromino is drawn based on its shape and color properties. Each block of the
     * Tetromino is drawn as a filled rectangle on the game board.
     * 
     * @example
     * Assuming currentTetromino has a shape and color defined
     * game.drawTetromino();
     * 
     * @privateRemarks
     * This method assumes that `this.graphics`, `this.currentTetromino`, `this.currentPosition`,
     * `BLOCK_SIZE`, `coorX`, and `coorY` are defined and properly initialized.
     */
    drawTetromino() {
        const { shape, color } = this.currentTetromino;
        this.graphics.clear();
        this.graphics.fillStyle(color);

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.graphics.fillRect(
                        (x + this.currentPosition.x) * BLOCK_SIZE + coorX,
                        (y + this.currentPosition.y) * BLOCK_SIZE + coorY,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                }
            }
        }
    }

    /**
     * Draws the next Tetrominos in the queue on the game screen.
     * 
     * This method clears the previous graphics and iterates through the 
     * `nextTetrominos` array to draw each Tetromino with its respective shape 
     * and color. The Tetrominos are drawn with a vertical offset to ensure 
     * they are spaced appropriately.
     * 
     * @remarks
     * - The `nextGraphics` property is used to clear and draw the Tetrominos.
     * - The `nextTetrominos` array contains the Tetrominos to be drawn, each 
     *   with a `shape` and `color`.
     * - The `BLOCK_SIZE` constant is used to determine the size of each block 
     *   in the Tetromino shapes.
     * 
     * @example
     * // Assuming `nextTetrominos` is an array of Tetromino objects:
     * // [
     * //   { shape: [[1, 1], [1, 1]], color: 'red' },
     * //   { shape: [[0, 1, 0], [1, 1, 1]], color: 'blue' }
     * // ]
     * 
     * drawNextTetrominos();
     */
    drawNextTetrominos() {
        this.nextGraphics.clear();
    
        for (let i = 0; i < this.nextTetrominos.length; i++) {
            const { shape, color } = this.nextTetrominos[i];
            const yOffset = 70 + i * 125; // Adjust vertical spacing
    
            this.nextGraphics.fillStyle(color);
    
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        this.nextGraphics.fillRect(900 + x * BLOCK_SIZE, yOffset + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            }
        }
    }

    /**
     * Calculates and returns the Y-coordinate of the ghost piece's position.
     * The ghost piece is a visual aid that shows where the current piece will land if it is dropped.
     *
     * @returns {number} The Y-coordinate of the ghost piece's position.
     */
    getGhostPosition() {
        let ghostY = this.currentPosition.y;
        while (this.isValidMove(0, ghostY - this.currentPosition.y + 1)) {
            ghostY++;
        }
        return ghostY;
    }
    
    /**
     * Draws the ghost piece on the game board.
     * The ghost piece is a translucent representation of where the current Tetromino will land.
     * 
     * This method clears the previous ghost piece, calculates the ghost position,
     * and then draws the ghost piece using the current Tetromino's shape and color with transparency.
     * 
     * @private
     */
    drawGhostPiece() {
        this.ghostGraphics.clear();
        const ghostY = this.getGhostPosition();
        const { shape, color } = this.currentTetromino;
    
        this.ghostGraphics.fillStyle(color, 0.5); // Ghost color with transparency
    
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.ghostGraphics.fillRect(
                        (x + this.currentPosition.x) * BLOCK_SIZE + coorX,
                        (y + ghostY) * BLOCK_SIZE + coorY,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                }
            }
        }
    }    
    
    /**
     * Moves the current Tetromino down by one unit if the move is valid.
     * If the move is not valid, it locks the Tetromino in place,
     * clears any completed lines, and spawns a new Tetromino.
     */
    moveDown() {
        if (this.isValidMove(0, 1)) {
            this.currentPosition.y += 1;
            this.drawTetromino();
            this.drawGhostPiece(); 
        } else {
            this.lockTetromino();
            this.clearLines();
            this.spawnTetromino();
        }
    }

    /**
     * Moves the current tetromino one unit to the left if the move is valid.
     * It checks if the move is valid by calling `isValidMove` with the offset (-1, 0).
     * If the move is valid, it updates the `currentPosition.x` by decrementing it by 1
     * and then redraws the tetromino by calling `drawTetromino`.
     */
    moveLeft() {
        if (this.isValidMove(-1, 0)) {
            this.currentPosition.x -= 1;
            this.drawTetromino();
            this.drawGhostPiece(); 
        }
    }

    /**
     * Moves the current tetromino one unit to the right if the move is valid.
     * It checks the validity of the move by calling `isValidMove` with the
     * horizontal offset of 1 and vertical offset of 0. If the move is valid,
     * it updates the `currentPosition.x` by incrementing it by 1 and then
     * redraws the tetromino in the new position by calling `drawTetromino`.
     */
    moveRight() {
        if (this.isValidMove(1, 0)) {
            this.currentPosition.x += 1;
            this.drawTetromino();
            this.drawGhostPiece(); 
        }
    }

    /**
     * Rotates the current Tetromino shape. If the rotated shape is valid,
     * it updates the current Tetromino's shape and redraws it.
     */
    rotateTetromino() {
        const rotatedShape = this.rotateMatrix(this.currentTetromino.shape);
        if (this.isValidRotation(rotatedShape)) {
            this.currentTetromino.shape = rotatedShape;
            this.drawTetromino();
            this.drawGhostPiece(); 
        }
    }

    /**
     * Performs a hard drop of the current tetromino.
     * The tetromino is moved downwards until it can no longer move.
     * After the drop, the tetromino is drawn, locked in place, any complete lines are cleared,
     * and a new tetromino is spawned.
     */
    hardDrop() {
        while (this.isValidMove(0, 1)) {
            this.currentPosition.y += 1;
        }
        this.drawTetromino();
        this.lockTetromino();
        this.clearLines();
        this.spawnTetromino();
        this.drawGhostPiece(); 
    }

    /**
     * Toggles the pause state of the game.
     * 
     * When the game is paused, it updates the score text to "Paused" and disables all keyboard inputs except for the 'P' key,
     * which can be used to resume the game.
     * 
     * When the game is resumed, it updates the score text to display the current score and re-enables all relevant keyboard inputs
     * for controlling the game.
     * 
     * @remarks
     * This method modifies the `this.time.paused` property to toggle the pause state and updates the keyboard event listeners accordingly.
     */
    togglePause() {
        this.time.paused = !this.time.paused;
        if (this.time.paused) {
            this.scoreText.setText(`Paused`);
            this.input.keyboard?.removeAllListeners(); // Disable keyboard input except 'P'
            this.input.keyboard?.on("keydown-P", () => this.togglePause()); // Re-enable 'P' for pause
        } else {
            this.scoreText.setText(`Score: ${this.score}`);
            this.input.keyboard?.removeAllListeners();
            const keyActions: { [key: string]: () => void } = {
                'LEFT': this.moveLeft,
                'A': this.moveLeft,
                'RIGHT': this.moveRight,
                'D': this.moveRight,
                'DOWN': this.moveDown,
                'S': this.moveDown,
                'UP': this.rotateTetromino,
                'W': this.rotateTetromino,
                'SPACE': this.hardDrop,
                'SHIFT': this.holdTetromino,
                'P': this.togglePause
            };

            Object.keys(keyActions).forEach(key => {
                this.input.keyboard?.on(`keydown-${key}`, keyActions[key], this);
            });
        }
    }

    /**
     * Checks if the current Tetromino can be moved by the given delta values without colliding with the grid boundaries or other blocks.
     *
     * @param deltaX - The change in the x-coordinate.
     * @param deltaY - The change in the y-coordinate.
     * @returns `true` if the move is valid, `false` otherwise.
     */
    isValidMove(deltaX: number, deltaY: number) {
        const { shape } = this.currentTetromino;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newX = this.currentPosition.x + x + deltaX;
                    const newY = this.currentPosition.y + y + deltaY;
                    if (newX < 0 || newX >= GRID_WIDTH || newY >= GRID_HEIGHT || (newY >= 0 && this.grid[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Checks if the rotated shape is in a valid position within the game grid.
     *
     * @param rotatedShape - A 2D array representing the shape after rotation.
     * @returns `true` if the rotated shape is in a valid position, `false` otherwise.
     */
    isValidRotation(rotatedShape: number[][]) {
        return rotatedShape.every((row, y) =>
            row.every((cell, x) =>
                !cell || (this.currentPosition.x + x >= 0 &&
                          this.currentPosition.x + x < GRID_WIDTH &&
                          this.currentPosition.y + y < GRID_HEIGHT &&
                          (this.currentPosition.y + y < 0 || !this.grid[this.currentPosition.y + y][this.currentPosition.x + x])
                )
            )
        );
    }

    /**
     * Rotates a given 2D matrix 90 degrees clockwise.
     *
     * @param matrix - The 2D array of numbers to be rotated.
     * @returns A new 2D array representing the rotated matrix.
     */
    rotateMatrix(matrix: number[][]) {
        return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
    }

    /**
     * Locks the current Tetromino in place on the grid.
     * Iterates through the shape of the current Tetromino and updates the grid with its color.
     * If any part of the Tetromino is above the top of the grid, it will not be placed.
     * After locking the Tetromino, the grid is redrawn and holding a new piece is allowed.
     */
    lockTetromino() {
        const { shape, color } = this.currentTetromino;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const gridX = this.currentPosition.x + x;
                    const gridY = this.currentPosition.y + y;
                    if (gridY >= 0) {
                        this.grid[gridY][gridX] = color;
                    }
                }
            }
        }
        this.redrawGrid();
        this.canHold = true; // Allow holding a new piece after locking
    }

    /**
     * Redraws the grid on the game scene.
     * 
     * This method clears the locked graphics and iterates through the grid.
     * For each cell that is occupied, it sets the fill style to the color of the cell
     * and draws a filled rectangle at the corresponding position.
     * 
     * @remarks
     * - `GRID_HEIGHT` and `GRID_WIDTH` are constants representing the dimensions of the grid.
     * - `BLOCK_SIZE` is a constant representing the size of each block in the grid.
     * - `coorX` and `coorY` are offsets for the x and y coordinates respectively.
     * - `this.grid` is a 2D array representing the game grid.
     * - `this.lockedGraphics` is the graphics object used to draw the locked blocks.
     */
    redrawGrid() {
        this.lockedGraphics.clear();
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (this.grid[y][x]) {
                    this.lockedGraphics.fillStyle(this.grid[y][x]);
                    this.lockedGraphics.fillRect(
                        x * BLOCK_SIZE + coorX,
                        y * BLOCK_SIZE + coorY,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                }
            }
        }
    }

    /**
     * Clears completed lines from the game grid.
     * 
     * This method iterates through each row of the grid and checks if all cells in the row are filled (non-zero).
     * If a row is completely filled, it is removed from the grid, and a new empty row is added at the top.
     * The score is increased based on the number of lines cleared, and the score display is updated.
     * Finally, the grid is redrawn to reflect the changes.
     * 
     * @returns {void}
     */
    clearLines() {
        let linesCleared = 0;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            if (this.grid[y].every(cell => cell !== 0)) {
                this.grid.splice(y, 1);
                this.grid.unshift(new Array(GRID_WIDTH).fill(0));
                linesCleared++;
            }
        }
        if (linesCleared > 0) {
            this.score += linesCleared * 10; // Increase score by 10 for each line cleared
            this.scoreText.setText(`Score: ${this.score}`);
        }
        this.redrawGrid();
    }

    /**
     * Handles the logic for holding and swapping the current Tetromino piece.
     * 
     * - If holding is allowed (`canHold` is true), the function will either store the current Tetromino
     *   as the held piece (if no piece is currently held) or swap the current Tetromino with the held piece.
     * - After holding or swapping, the function will prevent further holds until the current piece is placed.
     * - The function also updates the position of the current Tetromino and draws the held Tetromino.
     * 
     * @remarks
     * This function ensures that the player cannot hold multiple times without placing the current piece.
     */
    holdTetromino() {
        if (!this.canHold) return; // Prevent holding multiple times without placing
    
        if (!this.heldTetromino) {
            // First time holding: store the current piece and spawn a new one
            this.heldTetromino = this.currentTetromino;
            this.spawnTetromino();
        } else {
            // Swap the held piece with the active one
            [this.currentTetromino, this.heldTetromino] = [this.heldTetromino, this.currentTetromino];
            this.currentPosition = { x: Math.floor(GRID_WIDTH / 2 - this.currentTetromino.shape[0].length / 2), y: 0 };
        }
    
        this.canHold = false; // Prevent multiple swaps before placing
        this.drawHeldTetromino();
    }
    
    /**
     * Draws the held Tetromino on the hold graphics canvas.
     * Clears the previous drawing and checks if there is a held Tetromino.
     * If there is a held Tetromino, it draws the Tetromino's shape with the specified color.
     * 
     * The Tetromino is drawn starting at a fixed position (300, 80) on the canvas.
     * Each block of the Tetromino is drawn with a size of BLOCK_SIZE.
     * 
     * @returns {void} This method does not return anything.
     */
    drawHeldTetromino() {
        this.holdGraphics.clear();
        if (!this.heldTetromino) return;
    
        const { shape, color } = this.heldTetromino;
        this.holdGraphics.fillStyle(color);
    
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.holdGraphics.fillRect(300 + x * BLOCK_SIZE, 80 + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }    

    gameOver() {
        this.scoreText.setText(`Game Over! ${'\n'}Final Score: ${this.score}`);
        this.time.removeAllEvents(); // Stop the game loop
        this.input.keyboard?.removeAllListeners(); // Disable keyboard input
    }
}

export default Game;