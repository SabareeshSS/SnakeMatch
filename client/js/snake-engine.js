window.VYW = window.VYW || {};
(function(VYW, win) {
	var REFRESH_RATE = 100;

	/**
	 * Creates a new snake game
	 * @param {object} canvas - The Canvas DOM element
	 * @param {object} [settings] - The game settings
	 * @constructor
	 */
	function SnakeEngine(canvas, settings) {
		this.canvas = canvas;
		this.graphics = new VYW.Graphics(canvas);
		this.settings = new VYW.GameSettings(settings);

		this.gameState = VYW.GameState.Paused;
		this.direction = VYW.Direction.Right;
		this.snake = [];
		this.pellets = [];
		this.board = new VYW.Board(this.canvas.width, this.canvas.height, this.settings.boxSize, this.settings.boardColor);

		// Bind to the window key-down event
		win.onkeydown = this.handleKeyDown.bind(this);
	}

	/**
	 * Starts the game
	 */
	SnakeEngine.prototype.start = function() {
		// Create the snake head, we create it vertically centered
		var startX = this.settings.boxSize * this.settings.initialSnakeSize;
		var startY = this.board.toScreen(this.board.verticalBoxes / 2);
		var snakePart = new VYW.SnakeHead(startX, startY, this.settings.boxSize, this.settings.snakeColor);
		this.snake.push(snakePart);

		// Create the initial snake body
		for (var i = 0; i < this.settings.initialSnakeSize-1; ++i) {
			startX -= this.settings.boxSize;
			snakePart = new VYW.SnakeBody(startX, startY, this.settings.boxSize, this.settings.snakeColor, this.snake[this.snake.length-1]);
			this.snake.push(snakePart);
		}

		// Set the game state to running and run the timer
		this.gameState = VYW.GameState.Running;
		setTimeout(this.update.bind(this), REFRESH_RATE);
	};

	/**
	 * Toggle the game state
	 * @param {boolean} gameOver - Whether the game is over
	 */
	SnakeEngine.prototype.toggleGameState = function(gameOver) {
		// If game over just color the canvas
		if (gameOver) {
			this.canvas.style.borderColor = 'red';
			this.gameState = VYW.GameState.End;
			return;
		}

		// Toggle between Pause/Running
		if (this.gameState === VYW.GameState.Running) {
			this.canvas.style.borderColor = 'orange';
			this.gameState = VYW.GameState.Paused;
		} else if (this.gameState === VYW.GameState.Paused) {
			this.canvas.style.borderColor = 'green';
			this.gameState = VYW.GameState.Running;
			// Important to call update as there is no Timer running
			this.update();
		}
	};

	/**
	 * Starts the game update process
	 */
	SnakeEngine.prototype.update = function() {
		if (this.gameState !== VYW.GameState.Running) {
			return;
		}

		// Draw the board first
		this.board.draw(this.graphics);

		// Update snake location and draw it
		for (var i = 0; i < this.snake.length; ++i) {
			this.snake[i].update(this.direction);
			this.snake[i].draw(this.graphics);
		}

		// Check if the snake collides with itself or out-of-bounds
		var collision = this.checkCollision();
		if (collision) {
			this.toggleGameState(true);
			return;
		}

		// Check if the snake eats a pellet
		this.eatAndAddPellet();

		// Draw the pellets
		for (i = 0; i < this.pellets.length; ++i) {
			this.pellets[i].update();
			this.pellets[i].draw(this.graphics);
		}

		// Reload the timer
		setTimeout(this.update.bind(this), REFRESH_RATE);
	};

	/**
	 * Checks if the snake collides with itself ot out-of-bounds
	 * @returns {boolean} Whether there was a collision
	 */
	SnakeEngine.prototype.checkCollision = function() {
		// Check if the head is out-of-bounds
		if (this.snake[0].location.x < 0 ||
			this.snake[0].location.y < 0 ||
			this.snake[0].location.x + this.snake[0].size > this.canvas.width ||
			this.snake[0].location.y + this.snake[0].size > this.canvas.height) {

			return true;
		}

		// Check if the snake head collides with body
		for (var i = 1; i < this.snake.length; ++i) {
			if (this.snake[0].location.equals(this.snake[i].location)) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Check if the snake eats a pellet, add new ones if necessary
	 */
	SnakeEngine.prototype.eatAndAddPellet = function() {
		// Check if the snake head collides with pellet
		for (var i = 0; i < this.pellets.length; ++i) {
			if (this.snake[0].location.equals(this.pellets[i].location)) {
				// Create a SnakePart that would be the new snake tail
				var currTail = this.snake[this.snake.length-1];
				var newSnakeTail = new VYW.SnakeBody(currTail.prevLocation.x, currTail.prevLocation.y, this.settings.boxSize, this.settings.snakeColor, currTail);
				this.snake.push(newSnakeTail);

				// Remove this pellet
				this.pellets.splice(i, 1);
				break;
			}
		}

		// Check if we should add a new pellet
		if (this.pellets.length < this.settings.maxPellets && Math.random() < this.settings.pelletsProbability) {
			this.addPellet();
		}
	};

	/**
	 * Adds a new pellet to the game
	 */
	SnakeEngine.prototype.addPellet = function() {
		// Keep loop until we found a spot for a pellet (theoretically this can turn into an infinite loop, so a solution could
		// be to stop the random search after X times and look for a spot on the board).
		var keepSearch = true;
		while (keepSearch) {
			keepSearch = false;

			// Take a random spot on the board
			var x = Math.random() * this.board.horizontalBoxes;
			var y = Math.random() * this.board.horizontalBoxes;
			x = this.board.toScreen(x);
			y = this.board.toScreen(y);
			var pellet = new VYW.Pellet(x, y, this.settings.boxSize, this.settings.pelletColor);

			// check if the spot is vacant
			for (var i = 0; i < this.snake.length; ++i) {
				if (this.snake[i].location.equals(pellet.location)) {
					keepSearch = true;
					break;
				}
			}

			if (!keepSearch) {
				// Hooray we can add the pellet
				this.pellets.push(pellet);
			}
		}
	};

	/**
	 * Handles a key down event
	 * @param {object} e - The event args
	 * @private
	 */
	SnakeEngine.prototype.handleKeyDown = function(e) {
		switch (e.keyCode) {
			case VYW.KeyCodes.Pause:
				this.toggleGameState(false);
				break;
			case VYW.KeyCodes.Left:
				this.direction = VYW.Direction.Left;
				break;
			case VYW.KeyCodes.Right:
				this.direction = VYW.Direction.Right;
				break;
			case VYW.KeyCodes.Up:
				this.direction = VYW.Direction.Up;
				break;
			case VYW.KeyCodes.Down:
				this.direction = VYW.Direction.Down;
				break;
		}
	};

	VYW.SnakeEngine = SnakeEngine;

}(window.VYW, window));