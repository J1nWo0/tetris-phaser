import Phaser from "phaser";

class Start extends Phaser.Scene {
	constructor() {
		super({ key: "Start" });
	}

	// TODO: Add style to the Start Scene

	preload() {}

	create() {
		console.log("Start Scene Loaded");
		this.add
			.text(400, 300, "Press Space to Start Tetris", {
				fontSize: "32px",
				color: "#fff",
			})
			.setOrigin(0.5);
	}

	update() {
		let keyObject = this.input.keyboard.addKey(32); // Get key object for spacebar
		console.log(keyObject.isDown);
		if (keyObject.isDown) {
			this.scene.start("Game");
		}
	}
}

export default Start;
