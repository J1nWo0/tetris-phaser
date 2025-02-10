import Phaser from "phaser";

class GameOverScene extends Phaser.Scene {
    private finalScore: number = 0; // Store the passed score

    constructor() {
        super({ key: "Game Over" });
    }

    init(data: { score: number }) {
        this.finalScore = data.score; // Receive the score
    }

    // TODO: Add style to the Game Over Scene

    preload() {}

    create() {
        this.add.text(700, 150, "Game Over", {
            fontSize: "32px",
            color: "#fff",
        }).setOrigin(0.5);

        // Display the final score
        this.add.text(690, 200, `Final Score: ${this.finalScore}`, {
            fontSize: "24px",
            color: "#fff",
        }).setOrigin(0.5);

        // Add restart button
        this.add.text(680, 290, "Press Space to Restart", {
            fontSize: "20px",
            color: "#ff0",
        }).setOrigin(0.5);

        this.input.keyboard?.on("keydown-SPACE", () => {
            this.scene.start("Start"); // Restart the game
        });
    }
}

export default GameOverScene;
