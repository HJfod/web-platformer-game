
// @ts-check

const GRID_SIZE = 32;

/**
 * Clamp a value to be between min and max
 * @param {number} num 
 * @param {number} min 
 * @param {number} max 
 * @returns number
 */
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * @typedef {{ x: number, y: number }} GridPoint
 * @typedef {{ x: number, y: number }} Vec2
 */

/**
 * An object hitbox, potentially rotated
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} angle
 */
class Hitbox {
    x;
    y;
    width;
    height;
    angle;

    /**
     * Construct a new hitbox
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @param {number} angle 
     */
    constructor(x, y, width, height, angle) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.angle = angle;
    }

    left() {
        return this.x;
    }
    right() {
        return this.x + this.width;
    }
    top() {
        return this.y + this.height;
    }
    bottom() {
        return this.y;
    }
    midY() {
        return this.y + this.height / 2;
    }
    midX() {
        return this.x + this.width / 2;
    }
}

const inputManager = {
    left: false,
    right: false,
    up: false,
};
document.addEventListener('keydown', e => {
    switch (e.code) {
        case 'ArrowLeft':  case 'KeyA':                  inputManager.left = true; break;
        case 'ArrowRight': case 'KeyD':                  inputManager.right = true; break;
        case 'ArrowUp':    case 'KeyW': case 'KeySpace': inputManager.up = true; break;
    }
});
document.addEventListener('keyup', e => {
    switch (e.code) {
        case 'ArrowLeft':  case 'KeyA':                  inputManager.left = false; break;
        case 'ArrowRight': case 'KeyD':                  inputManager.right = false; break;
        case 'ArrowUp':    case 'KeyW': case 'KeySpace': inputManager.up = false; break;
    }
});

/**
 * @typedef {'block' | 'spike' | 'player' | 'particles'} ObjectType
 * @typedef {'deco' | 'solid' | 'deadly'} ObjectCollision
 * @typedef {{ tick(delta: number): void, render(ctx: CanvasRenderingContext2D): void }} Renderable
 */

/**
 * An object within a level
 * @abstract
 * @implements {Renderable}
 */
class GameObject {
    /**
     * Construct a new GameObject
     * @param {ObjectType} type 
     * @param {Level} level 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(type, level, x = 0, y = 0) {
        /**
         * @type {ObjectType}
         */
        this.type = type;
        /**
         * @type {Level | undefined}
         */
        this.level = level;
        /**
         * @type {GridPoint}
         */
        this.gridPosition = { x: x / GRID_SIZE, y: y / GRID_SIZE };
        /**
         * @type {number}
         */
        this.x = x;
        /**
         * @type {number}
         */
        this.y = y;
        /**
         * @type {number}
         */
        this.rotation = 0;
        /**
         * @type {GameObject[]}
         */
        this.children = [];
        /**
         * @type {ObjectCollision}
         */
        this.collision = 'deco';

        this.init();

        level.objects.push(this);
    }

    /**
     * Initialize this GameObject
     */
    init() {}
    
    removeThis() {
        if (this.level) {
            this.level.objects = this.level.objects.filter(obj => obj !== this);
            this.level = undefined;
        }
    }

    /**
     * Get the hitbox translated to world coordinates
     * @returns {Hitbox | undefined}
     */
    abshitbox() {
        const box = this.hitbox();
        if (box) {
            box.x += this.x;
            box.y += this.y;
            return box;
        }
        return undefined;
    }

    /**
     * Get the hitbox of the object. By default the object has no hitbox 
     * (represented by `undefined`)
     * @returns {Hitbox | undefined}
     */
    hitbox() {
        return undefined;
    }
    /**
     * Tick the physics of the object. The object should use `delta` to 
     * calculate how much time has passed between `tick()` calls to ensure 
     * physics are consistent across framerates
     * @type {Renderable['tick']}
     */
    tick(delta) {}
    /**
     * Tick the physics of the object. The object should use `delta` to 
     * calculate how much time has passed between `tick()` calls to ensure 
     * physics are consistent across framerates
     * @type {Renderable['render']}
     */
    render(ctx) {}
}

/**
 * @typedef {{ x: number, y: number, speed: Vec2, angle: number, angleSpeed: number, life: number }} Particle
 */

/**
 * An object that generates particles. The object is automatically removed once 
 * the particle animation is finished
 */
class ParticleObject extends GameObject {
    /**
     * Construct a new particle generator object
     * @param {Level} level 
     * @param {number} count 
     * @param {number} life 
     * @param {string} color 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(level, count, life, color, x, y) {
        super('particles', level, x, y);

        /**
         * @type {string}
         */
        this.color = color;
        /**
         * @type {Particle[]}
         */
        this.particles = [];

        console.log(`${this.x}, ${this.y}`);

        for (let i = 0; i < count; i += 1) {
            this.particles.push({
                x: 0, y: 0,
                speed: { x: 3 * (Math.random() - 0.5), y: 2 * (Math.random() / 2 + 0.5) },
                angle: 0,
                angleSpeed: (Math.random() - 0.5) / 20,
                life: life * (Math.random() / 2 + 0.5),
            });
        }
    }

    /** @type {GameObject['init']} */
    init() {}

    /** @type {GameObject['hitbox']} */
    hitbox() {
        return undefined;
    }
    
    /** @type {GameObject['tick']} */
    tick(delta) {
        this.particles.forEach(p => {
            p.speed.y -= 0.1 * delta;
            p.x += p.speed.x;
            p.y += p.speed.y;
            p.angle += p.angleSpeed;
            p.life -= delta;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        if (this.particles.length == 0) {
            this.removeThis();
        }
    }

    /** @type {GameObject['render']} */
    render(ctx) {
        this.particles.forEach(p => {
            ctx.save();
    
            ctx.fillStyle = this.color;
            
            ctx.translate(this.x + p.x, this.y + p.y);
            ctx.scale(p.life / 15, p.life / 15);
            ctx.rotate(p.angle);
            ctx.fillRect(-3, -3, 6, 6);

            ctx.restore();
        });
    }
}

/**
 * A standard block object. Looks like a rectangle, hits like a rectangle
 */
class BlockObject extends GameObject {
    /** @type {GameObject['init']} */
    init() {
        this.collision = 'solid';
    }
    /** @type {GameObject['hitbox']} */
    hitbox() {
        return new Hitbox(0, 0, GRID_SIZE, GRID_SIZE, this.rotation);
    }

    /** @type {GameObject['render']} */
    render(ctx) {
        ctx.save();

        ctx.translate(this.x + GRID_SIZE / 2, this.y + GRID_SIZE / 2);
        ctx.rotate(this.rotation);

        const gradient = ctx.createLinearGradient(0, GRID_SIZE / 2, 0, -GRID_SIZE);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-GRID_SIZE / 2, -GRID_SIZE / 2, GRID_SIZE, GRID_SIZE, 3);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * A standard spike object. Kills the player when touched
 */
class SpikeObject extends GameObject {
    /** @type {GameObject['init']} */
    init() {
        this.collision = 'deadly';
    }

    /** @type {GameObject['hitbox']} */
    hitbox() {
        return new Hitbox(GRID_SIZE / 4, 0, GRID_SIZE / 2, GRID_SIZE / 2, this.rotation);
    }
    
    /** @type {GameObject['render']} */
    render(ctx) {
        ctx.save();

        ctx.translate(this.x + GRID_SIZE / 2, this.y + GRID_SIZE / 2);
        ctx.rotate(this.rotation);

        const gradient = ctx.createLinearGradient(0, GRID_SIZE / 2, 0, -GRID_SIZE);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-GRID_SIZE / 2, -GRID_SIZE / 2);
        ctx.lineTo(0, +GRID_SIZE / 2);
        ctx.lineTo(GRID_SIZE / 2, -GRID_SIZE / 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * The player
 */
class PlayerObject extends GameObject {
    /**
     * Construct a new player
     * @param {Level} level 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(level, x, y) {
        super('player', level, x, y);
        /**
         * @type {Vec2}
         */
        this.speed = { x: 0, y: 0 };
        /**
         * @type {Vec2}
         */
        this.acc = { x: 0, y: 0 };
        /**
         * @type {Vec2}
         */
        this.squish = { x: 0, y: 0 };
        /**
         * @type {number | undefined}
         */
        this.collidingBlockAbove = undefined;
        /**
         * @type {number | undefined}
         */
        this.collidingBlockBelow = undefined;
        /**
         * @type {number | undefined}
         */
        this.collidingBlockLeft = undefined;
        /**
         * @type {number | undefined}
         */
        this.collidingBlockRight = undefined;
    }

    checkCollisions() {
        // Make sure we are in a level
        const level = this.level;
        if (!level) return;

        this.collidingBlockAbove = undefined;
        this.collidingBlockBelow = undefined;
        this.collidingBlockLeft = undefined;
        this.collidingBlockRight = undefined;

        // The player will always have a hitbox
        const player = /** @type {Hitbox} */ (this.abshitbox());

        const OBJ_HITBOX_SIZE = 8;

        // Check all objects (no way there would be so many that this would be laggy haha)
        for (const obj_ of level.objects) {
            if (obj_.type === 'player') continue;
            
            const obj = obj_.abshitbox();
            if (obj) {
                const sameX = player.right() > obj.left() && player.left() < obj.right();
                const sameY = player.top() > obj.bottom() && player.bottom() < obj.top();
                if (Math.abs(player.bottom() - obj.top() + OBJ_HITBOX_SIZE) < OBJ_HITBOX_SIZE && sameX) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockBelow = obj.top(); break;
                        case 'deadly': this.kill(); break;
                    }
                }
                else if (Math.abs(player.left() - obj.right() + OBJ_HITBOX_SIZE) < OBJ_HITBOX_SIZE && sameY) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockLeft = obj.right();break;
                        case 'deadly': this.kill(); break;
                    }
                }
                else if (Math.abs(player.right() - obj.left() - OBJ_HITBOX_SIZE) < OBJ_HITBOX_SIZE && sameY) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockRight = obj.left();break;
                        case 'deadly': this.kill(); break;
                    }
                }
                else if (Math.abs(player.top() - obj.bottom() - OBJ_HITBOX_SIZE) < OBJ_HITBOX_SIZE && sameX) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockAbove = obj.bottom();break;
                        case 'deadly': this.kill(); break;
                    }
                }
            }
        }

        // Check level borders
        if (player.top() > level.height - GRID_SIZE) {
            this.collidingBlockAbove = level.height - GRID_SIZE;
        }
        if (player.bottom() < GRID_SIZE) {
            this.collidingBlockBelow = GRID_SIZE;
        }
        if (player.right() > level.width - GRID_SIZE) {
            this.collidingBlockRight = level.width - GRID_SIZE;
        }
        if (player.left() < GRID_SIZE) {
            this.collidingBlockLeft = GRID_SIZE;
        }
    }

    kill() {
        if (this.level) {
            new ParticleObject(this.level, 15, 60, "#f07", this.x, this.y);
        }
        
        this.acc.x = 0;
        this.acc.y = 0;
        this.speed.x = 0;
        this.speed.y = 0;
        this.rotation = 0;
        this.collidingBlockBelow = undefined;
        this.collidingBlockAbove = undefined;
        this.collidingBlockLeft  = undefined;
        this.collidingBlockRight = undefined;
        this.level?.reset();
    }

    /** @type {GameObject['hitbox']} */
    hitbox() {
        return new Hitbox(0, 0, GRID_SIZE, GRID_SIZE, this.rotation);
    }

    /** @type {GameObject['tick']} */
    tick(delta) {
        if (!this.level) return;

        this.checkCollisions();

        const SPEED_SLOW_DOWN = this.collidingBlockBelow !== undefined ? 0.45 : 0.25;
        const SPEED_ACC_X     = this.collidingBlockBelow !== undefined ? 2.5  : 1.9;
        const SPEED_CAP_X     = 6.8;
        const SPEED_CAP_Y     = 14;

        // Gravity :3
        this.acc.y = -1.35;

        // Update left/right movement acceleration based on input
        if (inputManager.left && inputManager.right) {
            this.acc.x = 0;
        }
        else if (inputManager.left) {
            this.acc.x = -SPEED_ACC_X;
        }
        else if (inputManager.right) {
            this.acc.x = +SPEED_ACC_X;
        }
        else {
            this.acc.x = 0;
        }

        // Update speed based on acceleration
        this.speed.x += this.acc.x * delta;
        this.speed.y += this.acc.y * delta;

        // Slow down x speed if no buttons are pressed
        if (!inputManager.left && !inputManager.right) {
            if (this.speed.x < 0) {
                this.speed.x += SPEED_SLOW_DOWN;
            }
            else if (this.speed.x > 0) {
                this.speed.x -= SPEED_SLOW_DOWN;
            }
            if (Math.abs(this.speed.x) <= SPEED_SLOW_DOWN) {
                this.speed.x = 0;
            }
        }

        // Update jump speed based on inputs
        if (inputManager.up && this.speed.y <= 0 && this.collidingBlockBelow !== undefined) {
            this.speed.y = SPEED_CAP_Y;
        }

        // Speed caps
        this.speed.x = clamp(this.speed.x, -SPEED_CAP_X, +SPEED_CAP_X);
        this.speed.y = clamp(this.speed.y, -SPEED_CAP_Y, +SPEED_CAP_Y * 2);

        if (this.collidingBlockBelow !== undefined) {
            if (this.y < this.collidingBlockBelow) {
                this.y = this.collidingBlockBelow;
            }
            if (this.speed.y < 0) this.speed.y = 0;

            // Snap rotation if not jumping
            if (!inputManager.up) {
                const target = Math.round(this.rotation / (0.5 * Math.PI)) * (0.5 * Math.PI);
                if (this.rotation < target) {
                    this.rotation += Math.abs(this.rotation - target) / 2;
                }
                else if (this.rotation > target) {
                    this.rotation -= Math.abs(this.rotation - target) / 2;
                }
                if (Math.abs(this.rotation - target) <= 0.1) {
                    this.rotation = target;
                }
            }
        }
        else if (this.collidingBlockAbove !== undefined) {
            if (this.y > this.collidingBlockAbove - GRID_SIZE) {
                this.y = this.collidingBlockAbove - GRID_SIZE;
            }
            if (this.speed.y > 0) this.speed.y = 0;
        }
        if (this.collidingBlockLeft !== undefined) {
            if (this.x < this.collidingBlockLeft) {
                this.x = this.collidingBlockLeft;
            }
            if (this.speed.x < 0) this.speed.x = 0;
        }
        else if (this.collidingBlockRight !== undefined) {
            if (this.x > this.collidingBlockRight - GRID_SIZE) {
                this.x = this.collidingBlockRight - GRID_SIZE;
            }
            if (this.speed.x > 0) this.speed.x = 0;
        }

        // Update position based on speed
        this.x += this.speed.x * delta;
        this.y += this.speed.y * delta;

        if (this.collidingBlockBelow === undefined) {
            this.rotation -= this.speed.x / 40 * delta;
        }
    }

    /** @type {GameObject['render']} */
    render(ctx) {
        ctx.save();

        if (this.squish.y < this.speed.y) {
            this.squish.y += 2.3;
        }
        else if (this.squish.y > this.speed.y) {
            this.squish.y -= 2.3;
        }
        if (Math.abs(this.squish.y - this.speed.y) <= 2.3) {
            this.squish.y = this.speed.y;
        }

        ctx.translate(this.x + GRID_SIZE / 2, this.y + GRID_SIZE / 2);
        ctx.scale(
            1 - clamp(this.squish.y * 0.02, -0.1, 0.5),
            1 - clamp(this.squish.x * 0.02, -0.1, 0.5)
        );
        ctx.rotate(this.rotation);

        const gradient = ctx.createLinearGradient(0, +GRID_SIZE / 2, 0, -GRID_SIZE);
        gradient.addColorStop(0, "#f07");
        gradient.addColorStop(1, "#07f");

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-GRID_SIZE / 2, -GRID_SIZE / 2, GRID_SIZE, GRID_SIZE, 3);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * @typedef {{ x: number, y: number, type: ObjectType }} LevelDataObject
 * @typedef {{ playerX: number, playerY: number, objects: LevelDataObject[] }} LevelData
 */

/**
 * A game level
 * @implements {Renderable}
 */
class Level {
    /**
     * Load a new level from data into a canvas
     * @param {LevelData} data 
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(data, canvas) {
        /**
         * @type {number}
         */
        this.width = canvas.width;
        /**
         * @type {number}
         */
        this.height = canvas.height;
        /**
         * @type {GameObject[]}
         */
        this.objects = [];
        /**
         * @type {PlayerObject | undefined}
         */
        this.player = undefined;
        /**
         * @type {LevelData | undefined}
         */
        this.data = undefined;

        this.loadLevel(data);
    }

    /**
     * Load level data
     * @param {LevelData} data 
     */
    loadLevel(data) {
        this.objects.forEach(obj => obj.level = undefined);
        this.objects = [];
        this.player = undefined;
        this.data = data;

        this.player = new PlayerObject(this, data.playerX * GRID_SIZE, data.playerY * GRID_SIZE);

        data.objects.forEach(obj => {
            switch (obj.type) {
                default: case 'block': {
                    new BlockObject(obj.type, this, obj.x * GRID_SIZE, obj.y * GRID_SIZE);
                } break;

                case 'spike': {
                    new SpikeObject(obj.type, this, obj.x * GRID_SIZE, obj.y * GRID_SIZE);
                } break;

                case 'player': {
                    console.error(`Illegal object type ${obj.type}`);
                } break;
            }
        });
    }

    reset() {
        if (this.player && this.data) {
            this.player.x = this.data.playerX * GRID_SIZE;
            this.player.y = this.data.playerY * GRID_SIZE;
        }
    }

    /** @type {Renderable['tick']} */
    tick(delta) {
        this.objects.forEach(obj => obj.tick(delta));
    }
    /** @type {Renderable['render']} */
    render(ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.width, GRID_SIZE);
        ctx.fillRect(0, this.height - GRID_SIZE, this.width, GRID_SIZE);
        ctx.fillRect(0, 0, GRID_SIZE, this.height);
        ctx.fillRect(this.width - GRID_SIZE, 0, GRID_SIZE, this.height);

        this.objects.forEach(obj => obj.render(ctx));
    }
}

/** @type {number | undefined} */
let runningAnimationFrameFunc = undefined;

/**
 * Set the rendering source for a canvas. This begins calls to `tick` and 
 * `render` every frame 
 * @param {HTMLCanvasElement} canvas 
 * @param {Renderable} obj 
 */
function setGlobalRenderObject(canvas, obj) {
    if (runningAnimationFrameFunc) {
        cancelAnimationFrame(runningAnimationFrameFunc);
    }

    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    ctx.setTransform(1, 0, 0, -1, 0, canvas.height - 1);

    let prevFrame = 0;
    const schedule = (/** @type {number} */ frameStamp) => {
        const delta = (frameStamp - prevFrame) * 60 / 1000;

        // Physics run at a constant tick rate
        obj.tick(delta);

        // Render every frame you can
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        obj.render(ctx);

        prevFrame = frameStamp;
        runningAnimationFrameFunc = requestAnimationFrame(schedule);
    };
    requestAnimationFrame(schedule);
}

/**
 * Load a new level into a canvas, replacing any existing level
 * @param {HTMLCanvasElement} canvas 
 * @param {LevelData} data 
 */
export function loadLevel(canvas, data) {
    setGlobalRenderObject(canvas, new Level(data, canvas));
}

/**
 * Load the built-in test level into a canvas, replacing any existing level
 * @param {HTMLCanvasElement} canvas 
 */
export function loadTestLevel(canvas) {
    return loadLevel(canvas, {
        playerX: 3,
        playerY: 10,
        objects: [
            { type: 'block', x: 6, y: 2 },
            { type: 'block', x: 10, y: 3 },
            { type: 'block', x: 14, y: 4 },
            { type: 'block', x: 15, y: 4 },
            { type: 'block', x: 16, y: 4 },
            { type: 'spike', x: 16, y: 5 },
            { type: 'block', x: 17, y: 4 },
            { type: 'block', x: 18, y: 4 },
            { type: 'block', x: 20, y: 3 },
            { type: 'block', x: 20, y: 2 },
            { type: 'block', x: 20, y: 1 },
        ]
    });
}
