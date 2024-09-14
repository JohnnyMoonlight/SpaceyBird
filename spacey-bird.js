class Pipe extends Path2D {
  constructor(
    game,
    pipeWidth = 50,
    pipeHeight = 80,
    xPosition = 300,
    speed = 3,
    color = "black"
  ) {
    super();
    this.game = game;
    this.soundManager = this.game.soundManager;
    this.soundManager.registerSoundEvent(new Event("pipePassed"));
    this.gameHeight = this.game.gameHeight;
    this.gameWidth = this.game.gameWidth;
    this.speed = speed;
    this.color = color;
    // Number of the recently shown pipe. As soon as one pipe is passed, this value is incremented.
    this.number = 0;
    this.pipeWidth = pipeWidth;
    this.pipeHeight = game.gameHeight / 2 - pipeHeight;
    this.xPosition = xPosition;
  }

  move(ctx) {
    this.xPosition -= this.speed;
    if (this.xPosition < -this.pipeWidth) {
      this.xPosition = this.gameWidth;
      ctx.canvas.dispatchEvent(new Event("pipePassed"));
      this.number++;
      this._setRandomColor();
    }
  }

  _setRandomColor() {
    this.color = globalColorList[this.number % 140];
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.xPosition,
      this.gameHeight - this.pipeHeight,
      this.pipeWidth,
      this.pipeHeight
    );
    ctx.fillRect(this.xPosition, 0, this.pipeWidth, this.pipeHeight);
  }

  hitPlayer(player) {
    const hitbox = player.getHitBox();
    // If the tip or the back part of the triangle are within the pipes, we need to check for collision.
    if (
      (hitbox[0][0] > this.xPosition &&
        hitbox[0][0] < this.xPosition + this.pipeWidth) ||
      (hitbox[1][0] > this.xPosition &&
        hitbox[1][0] < this.xPosition + this.pipeWidth)
    ) {
      let upperLineY1 = hitbox[0][1];
      let upperLineY2 = hitbox[1][1];
      // The hitbox is formed as triangle.
      // The player is hit, if the upper or lower line of the triangle hit the pipe.
      // The pipe is hit, if any integer y-pixel has a value in the range of the pipe-heights.
      for (
        let pixelOnUpperLine = upperLineY1;
        pixelOnUpperLine < upperLineY2;
        pixelOnUpperLine++
      ) {
        if (pixelOnUpperLine < this.pipeHeight) return true;
        if (pixelOnUpperLine > this.gameHeight - this.pipeHeight) return true;
      }
      let lowerLineY1 = hitbox[2][1];
      let lowerLineY2 = hitbox[1][1];

      for (
        let pixelOnLowerLine = lowerLineY1;
        pixelOnLowerLine < lowerLineY2;
        pixelOnLowerLine++
      ) {
        if (pixelOnLowerLine < this.pipeHeight) return true;
        if (pixelOnLowerLine > this.gameHeight - this.pipeHeight) return true;
      }
      return false;
    }
  }
}

class Game {
  GAME_STATES = {
    MENU: 1,
    PAUSE: 2,
    PLAY: 3,
    END: 4,
  };
  gameWidth = 400;
  gameHeight = 400;

  score = 0;

  gameState;

  constructor() {
    this.gameState = this.GAME_STATES.MENU;
    this.canvas = document.getElementById("gameContainer");
    this.ctx = this.canvas.getContext("2d");

    this.debug = true;

    this.fpsCtx = this.canvas.getContext("2d");

    this.scoreCtx = this.canvas.getContext("2d");

    this.soundManager = new SoundManager();
  }

  init() {
    this.canvas.setAttribute("tabindex", 0);
    this.canvas.focus();
    document
      .getElementById("gameContainer")
      .setAttribute("width", this.gameWidth);
    document
      .getElementById("gameContainer")
      .setAttribute("height", this.gameHeight);
    this.draw();
  }

  getGameState() {
    return this.gameState;
  }

  startGame() {
    this.gameState = this.GAME_STATES.PLAY;
    this.player = new Player(this.canvas, this);
    this.pipe = new Pipe(this);
  }

  endGame() {
    this.player = null;
    this.pipe = null;
    this.gameState = this.GAME_STATES.END;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);

    if (this.getGameState() == this.GAME_STATES.MENU) {
      let menuEntries = [
        new MenuEntry("START", () => this.startGame()),
        new MenuEntry("Credits", () => console.log("Credits")),
      ];
      let menu = new Menu(
        this.canvas,
        this.ctx,
        this,
        () => this.draw(),
        menuEntries,
        "Welcome to Spacey Bird"
      );
      menu.draw(this.ctx);
    }

    if (this.getGameState() == this.GAME_STATES.PLAY) {
      if (this.debug) {
        this.ctx.clearRect(0, 0, 200, 400);
        this.fpsCtx.font = "10px Arial";
        this.fpsCtx.fillText(
          `${this.player.playerX}, ${Number.parseInt(
            this.player.playerY
          )}, ${Number.parseInt(this.player.verticalAcceleration)}`,
          250,
          20
        );
      }
      this.scoreCtx.font = "10px Arial";
      this.scoreCtx.fillText(`Score:${this.points}`, 250, 10);

      if (
        this.pipe.hitPlayer(this.player) ||
        this.player.playerY > this.gameHeight
      ) {
        this.player.canvas.removeEventListener(
          "click",
          this.player._flapHandle
        );
        this.score = this.pipe.number;
        this.endGame();
      } else {
        this.player.move();
        this.player.draw(this.ctx);
        this.pipe.move(this.ctx);
        this.pipe.draw(this.ctx);
        this.points += this.speed;
        window.requestAnimationFrame(() => this.draw());
      }
    }

    if (this.getGameState() == this.GAME_STATES.END) {
      let menuEntries = [
        new MenuEntry("You loose.", () => console.log("End game")),
        new MenuEntry("Retry", () => {
          this.startGame();
        }),
      ];

      let endScreen = new Menu(
        this.canvas,
        this.ctx,
        this,
        () => this.draw(),
        menuEntries,
        `Your score: ${this.score}`
      );
      endScreen.draw(this.ctx);
    }
  }
}

class MenuEntry {
  constructor(title, callback, color = "#000000") {
    this.title = title;
    this.callback = callback;
    this.color = color;
  }
}

class Menu extends Path2D {
  constructor(canvas, context, game, callback, menuEntries, heading) {
    super();
    this.canvas = canvas;
    this.context = context;
    this.game = game;
    this.initListeners(this.canvas);
    this.callback = callback;
    this.menuEntries = menuEntries;
    this.cursor = 0;
    this.startEvent = new Event("start");
    this.navEvent = new Event("navEvent");
    this.game.soundManager.registerSoundEvent(this.navEvent);
    this.game.soundManager.registerSoundEvent(this.startEvent);
    this.heading = heading;
  }

  draw(ctx) {
    ctx.clearRect(0, 0, this.game.gameWidth, this.game.gameHeight);
    ctx.lineWidth = 10;
    ctx.fillStyle = "black";
    ctx.strokeRect(100, 100, 200, 200);
    ctx.font = "20px serif";
    ctx.fillText(this.heading, 80, 40);
    ctx.font = "10px sans-serif";

    for (let menuEntryId in this.menuEntries) {
      if (this.cursor == menuEntryId) {
        ctx.fillStyle = "orange";
      } else {
        ctx.fillStyle = "black";
      }
      ctx.fillText(
        this.menuEntries[menuEntryId].title,
        175,
        150 + menuEntryId * 30
      );
    }
    ctx.stroke();
  }
  handleMenuInput(event, canvas) {
    const key = event.key;
    if (key == "ArrowUp" || key == "ArrowDown" || key == "Enter") {
      switch (key) {
        case "ArrowUp":
          if (this.cursor > 0) this.cursor--;
          this.canvas.dispatchEvent(this.navEvent);
          this.draw(this.context);
          break;
        case "ArrowDown":
          if (this.cursor < this.menuEntries.length - 1) this.cursor++;
          this.draw(this.context);
          this.canvas.dispatchEvent(this.navEvent);
          break;
        case "Enter":
          this.menuEntries[this.cursor].callback();
          this.canvas.dispatchEvent(this.startEvent);
          this.callback();
          this._releaseListeners(this.canvas);
      }
    }
  }
  _handleMenuInput = (event, canvas) => this.handleMenuInput(event, canvas);

  initListeners(canvas) {
    canvas.addEventListener("keyup", this._handleMenuInput);
  }
  _releaseListeners(canvas) {
    canvas.removeEventListener("keyup", this._handleMenuInput);
  }
}

class Player extends Path2D {
  constructor(canvas, game, playerX = 20, playerY = 10) {
    super();
    this.game = game;
    this.playerX = playerX;
    this.playerY = playerY;
    this.verticalAcceleration = -1;
    this.flapPower = -8;
    this.gravity = 0.2;
    this.canvas = canvas;
    this.soundManager = game.soundManager;
    this.flapEvent = new Event("flap");
    this.image = new Image();
    this.image.src = "./resources/rocket.png";
    this.soundManager.registerSoundEvent(this.flapEvent);
    this.canvas.addEventListener("click", this._flapHandle);
  }
  _flapHandle = (event, canvas) => {
    this.flap();
  };
  draw(ctx) {
    ctx.drawImage(this.image, this.playerX, this.playerY, 35, 35);
    if (this.game.debug) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "red";
      const poly = this.getHitBox();
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i][0], poly[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }
  /**
   * Returns array of x,y coordinate pairs.
   * The first coordinate is top-left, the second the nose/tip of the player, the third is the bottom-left coordinate.
   */
  getHitBox() {
    let hitbox = [
      [this.playerX, this.playerY],
      [this.playerX + 35, this.playerY + 17.5],
      [this.playerX, this.playerY + 35],
    ];
    return hitbox;
  }
  move() {
    if (this.playerY < this.game.gameHeight && this.playerY >= 0) {
      this.verticalAcceleration += this.gravity;
    } else if (this.playerY < 0) {
      this.verticalAcceleration = 0;
      this.playerY = 0;
    }
    this.playerY = this.playerY + this.verticalAcceleration;
  }
  flap() {
    this.verticalAcceleration = this.flapPower;
    this.canvas.dispatchEvent(this.flapEvent);
  }
}

class SoundManager {
  constructor() {
    this.canvas = document.getElementById("gameContainer");
    this.soundMap = new Map();
    this.eventToSoundMap = new Map();
    this.start = "./resources/start.mp3";
    this.flap = "./resources/flap.wav";
    this.navSound = "./resources/flap.wav";
    this.idea = "./resources/idea.wav";
    this.addSound("navEvent", this.navSound);
    this.addSound("start", this.start);
    this.addSound("flap", this.flap);
    this.addSound("pipePassed", this.idea);
  }

  addSound(soundName, sound) {
    this.soundMap.set(soundName, sound);
  }

  registerSoundEvent(event, sound) {
    if (this.eventToSoundMap.has(event.type)) {
      return;
    } else {
      this.eventToSoundMap.set(event.type, sound);
    }
    let selectedSound;
    if (sound == null) {
      selectedSound = this.soundMap.get(event.type);
    } else {
      selectedSound = sound;
    }
    this.canvas.addEventListener(event.type, () =>
      new Audio(selectedSound).play()
    );
  }
}

let game = new Game();
game.init();
