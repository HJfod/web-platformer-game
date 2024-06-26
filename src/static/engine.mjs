// @ts-check

import { api } from "./api.mjs";

const OBJECT_UNIT = 32;

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

    /**
     * @param {number} x 
     * @param {number} y 
     */
    contains(x, y) {
        return x >= this.left() && x <= this.right() && y >= this.bottom() && y <= this.top();
    }
}

const inputManager = {
    left: false,
    right: false,
    up: false,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
};
document.addEventListener('keydown', e => {
    switch (e.code) {
        case 'ArrowLeft':  case 'KeyA':               inputManager.left = true; break;
        case 'ArrowRight': case 'KeyD':               inputManager.right = true; break;
        case 'ArrowUp':    case 'KeyW': case 'Space': inputManager.up = true; break;
    }
});
document.addEventListener('keyup', e => {
    switch (e.code) {
        case 'ArrowLeft':  case 'KeyA':               inputManager.left = false; break;
        case 'ArrowRight': case 'KeyD':               inputManager.right = false; break;
        case 'ArrowUp':    case 'KeyW': case 'Space': inputManager.up = false; break;
    }
});
document.addEventListener('mousemove', e => {
    inputManager.mouseX = e.clientX;
    inputManager.mouseY = e.clientY;
});
document.addEventListener('mousedown', e => {
    inputManager.mouseDown = true;
});
document.addEventListener('mouseup', e => {
    inputManager.mouseDown = false;
});

/**
 * @typedef {'block' | 'spike' | 'ground-spike' | 'goal' | 'player' | 'particles'} ObjectType
 * @typedef {'deco' | 'solid' | 'deadly' | 'goal'} ObjectCollision
 * @typedef {'gradient' | 'smile' | 'troll' | 'ball'} PlayerIcon
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
     * @param {string} color
     */
    constructor(type, level, x = 0, y = 0, color = '#000') {
        /**
         * @type {ObjectType}
         */
        this.type = type;
        /**
         * @type {Level | undefined}
         */
        this.level = level;
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
         * @type {string}
         */
        this.color = color;
        /**
         * @type {number}
         */
        this.opacity = 1;
        /**
         * @type {number}
         */
        this.scale = 1;
        /**
         * @type {'to-delete' | 'to-edit' | 'moving' | undefined}
         */
        this.hovered = undefined;
        /**
         * @type {GameObject[]}
         */
        this.children = [];
        /**
         * @type {ObjectCollision}
         */
        this.collision = 'deco';
        /**
         * @type {boolean}
         */
        this.deletable = true;

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
     * Get the hitbox of the object. By default the object has no hitbox 
     * (represented by `undefined`)
     * @returns {Hitbox | undefined}
     */
    hitbox() {
        return undefined;
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
     * Get the relative grid-sized hitbox in world coordinates
     * @returns {Hitbox}
     */
    absgridhitbox() {
        return new Hitbox(this.x, this.y, OBJECT_UNIT, OBJECT_UNIT, this.rotation);
    }

    /**
     * Tick the physics of the object. The object should use `delta` to 
     * calculate how much time has passed between `tick()` calls to ensure 
     * physics are consistent across framerates
     * @type {Renderable['tick']}
     */
    tick(delta) {}
    /**
     * Render the object. Subclasses should NOT override this method; instead, 
     * they should override `doRender`.
     * @type {Renderable['render']}
     */
    render(ctx) {
        ctx.save();

        ctx.translate(this.x + OBJECT_UNIT / 2, this.y + OBJECT_UNIT / 2);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;

        switch (this.hovered) {
            case 'to-delete': ctx.strokeStyle = '#f00'; break;
            case 'to-edit':   ctx.strokeStyle = '#0fa'; break;
            case 'moving':    ctx.strokeStyle = '#0af'; break;
        }
        this.doRender(ctx);

        ctx.restore();
    }
    /**
     * Render the object. The context has been translated to the right place
     * @type {Renderable['render']}
     */
    doRender(ctx) {}
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
        super('particles', level, x, y, color);

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
    /** @type {GameObject['doRender']} */
    doRender(ctx) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.translate(p.x, p.y);
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
        return new Hitbox(0, 0, OBJECT_UNIT, OBJECT_UNIT, this.rotation);
    }

    /** @type {GameObject['doRender']} */
    doRender(ctx) {
        const gradient = ctx.createLinearGradient(0, OBJECT_UNIT / 2, 0, -OBJECT_UNIT);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(-OBJECT_UNIT / 2, -OBJECT_UNIT / 2, OBJECT_UNIT, OBJECT_UNIT, 3);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
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
        return new Hitbox(OBJECT_UNIT / 4, 0, OBJECT_UNIT / 2, OBJECT_UNIT / 2, this.rotation);
    }
    
    /** @type {GameObject['doRender']} */
    doRender(ctx) {
        const gradient = ctx.createLinearGradient(0, OBJECT_UNIT / 2, 0, -OBJECT_UNIT);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-OBJECT_UNIT / 2, -OBJECT_UNIT / 2);
        ctx.lineTo(0, +OBJECT_UNIT / 2);
        ctx.lineTo(OBJECT_UNIT / 2, -OBJECT_UNIT / 2);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }
}

/**
 * A ground spike object. Deadlifies the floor
 */
class GroundSpikeObject extends GameObject {
    /** @type {GameObject['init']} */
    init() {
        this.collision = 'deadly';
    }

    /** @type {GameObject['hitbox']} */
    hitbox() {
        return new Hitbox(OBJECT_UNIT / 4, 0, OBJECT_UNIT / 2, OBJECT_UNIT / 3, this.rotation);
    }
    
    /** @type {GameObject['doRender']} */
    doRender(ctx) {
        const gradient = ctx.createLinearGradient(0, -OBJECT_UNIT / 6, 0, -OBJECT_UNIT);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
        gradient.addColorStop(0, "rgba(0, 0, 0, 1.0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-OBJECT_UNIT / 2, -OBJECT_UNIT / 2);
        ctx.lineTo(-OBJECT_UNIT / 2, -OBJECT_UNIT / 6);
        ctx.lineTo(-OBJECT_UNIT / 4, 0);
        ctx.lineTo(0, -OBJECT_UNIT / 6);
        ctx.lineTo(+OBJECT_UNIT / 4, 0);
        ctx.lineTo(+OBJECT_UNIT / 2, -OBJECT_UNIT / 6);
        ctx.lineTo(+OBJECT_UNIT / 2, -OBJECT_UNIT / 2);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }
}

/**
 * The level end object. Touching this clears the level
 */
class GoalObject extends GameObject {
    /**
     * Construct a new end object
     * @param {Level} level 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(level, x, y) {
        super('goal', level, x, y);
    }

    /** @type {GameObject['init']} */
    init() {
        this.collision = 'goal';
        this.deletable = false;
    }

    /** @type {GameObject['hitbox']} */
    hitbox() {
        return new Hitbox(0, 0, OBJECT_UNIT, OBJECT_UNIT, this.rotation);
    }

    /** @type {GameObject['tick']} */
    tick(delta) {
        this.rotation += 0.03 * delta;
    }
    
    /** @type {GameObject['doRender']} */
    doRender(ctx) {
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        if (this.hovered === undefined) {
            const gradient = ctx.createLinearGradient(0, OBJECT_UNIT / 2, 0, -OBJECT_UNIT);
            gradient.addColorStop(0, "rgba(0, 255, 0, 1)");
            gradient.addColorStop(1, "rgba(0, 0, 255, 0.6)");
            ctx.strokeStyle = gradient;
        }
        for (let i = 0; i < Math.PI * 2; i += Math.PI / 4) {
            ctx.beginPath();
            ctx.rotate(i);
            ctx.moveTo(-OBJECT_UNIT / 2, -OBJECT_UNIT / 2);
            ctx.bezierCurveTo(-OBJECT_UNIT / 4, -OBJECT_UNIT / 2, OBJECT_UNIT / 10, -OBJECT_UNIT / 4, 0, 0);
            ctx.stroke();
            ctx.closePath();
        }
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
         * @type {PlayerIcon}
         */
        this.icon = 'gradient';
        /**
         * @type {string}
         */
        this.particleColor = '#000';
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
        /**
         * @type {Vec2 | undefined}
         */
        this.winning = undefined;

        this.deletable = false;

        // Fetch selected player icon asynchronously
        api.get('/api/user/icon').then(res => {
            if (res.ok) {
                this.icon = /** @type {PlayerIcon} */ (res.value);
            }
            console.log(res);
        });
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

        const hitboxTouching = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ speed) => {
            return Math.abs(a - b) < Math.max(speed, 4);
        }

        // Check all objects (no way there would be so many that this would be laggy haha)
        for (const obj_ of level.objects) {
            if (obj_.type === 'player') continue;
            
            const obj = obj_.abshitbox();
            if (obj) {
                const sameX = player.right() > obj.left() && player.left() < obj.right();
                const sameY = player.top() > obj.bottom() && player.bottom() < obj.top();
                if (hitboxTouching(player.bottom(), obj.top(), this.speed.y) && sameX) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockBelow = obj.top(); break;
                        case 'deadly': this.kill(); break;
                        case 'goal': this.win(obj.x, obj.y); break;
                    }
                }
                if (hitboxTouching(player.top(), obj.bottom(), this.speed.y) && sameX) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockAbove = obj.bottom(); break;
                        case 'deadly': this.kill(); break;
                        case 'goal': this.win(obj.x, obj.y); break;
                    }
                }
                if (hitboxTouching(player.left(), obj.right(), this.speed.x) && sameY) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockLeft = obj.right(); break;
                        case 'deadly': this.kill(); break;
                        case 'goal': this.win(obj.x, obj.y); break;
                    }
                }
                if (hitboxTouching(player.right(), obj.left(), this.speed.x) && sameY) {
                    switch (obj_.collision) {
                        case 'solid': this.collidingBlockRight = obj.left(); break;
                        case 'deadly': this.kill(); break;
                        case 'goal': this.win(obj.x, obj.y); break;
                    }
                }
            }
        }

        // Check level borders
        if (hitboxTouching(player.top(), level.height - OBJECT_UNIT, this.speed.y)) {
            this.collidingBlockAbove = level.height - OBJECT_UNIT;
        }
        if (hitboxTouching(player.bottom(), OBJECT_UNIT, this.speed.y)) {
            this.collidingBlockBelow = OBJECT_UNIT;
        }
        if (hitboxTouching(player.right(), level.width - OBJECT_UNIT, this.speed.x)) {
            this.collidingBlockRight = level.width - OBJECT_UNIT;
        }
        if (hitboxTouching(player.left(), OBJECT_UNIT, this.speed.x)) {
            this.collidingBlockLeft = OBJECT_UNIT;
        }
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.acc.x = 0;
        this.acc.y = 0;
        this.speed.x = 0;
        this.speed.y = 0;
        this.rotation = 0;
        this.scale = 1;
        this.collidingBlockBelow = undefined;
        this.collidingBlockAbove = undefined;
        this.collidingBlockLeft  = undefined;
        this.collidingBlockRight = undefined;
        this.winning = undefined;
    }
    kill() {
        if (this.level) {
            new ParticleObject(this.level, 15, 60, this.particleColor, this.x, this.y);
        }
        this.level?.reset();
    }
    /**
     * @param {number} x 
     * @param {number} y 
     */
    win(x, y) {
        this.acc = { x: 0, y: 0 };
        this.speed = { x: 0, y: 0 };
        this.winning = { x, y };
        if (this.level) {
            new ParticleObject(this.level, 25, 90, "#0af", x, y);
            this.level.win();
        }
    }

    /** @type {GameObject['hitbox']} */
    hitbox() {
        return new Hitbox(0, 0, OBJECT_UNIT, OBJECT_UNIT, this.rotation);
    }

    /** @type {GameObject['tick']} */
    tick(delta) {
        if (!this.level || (this.level.editorMode && !this.level.playtesting)) return;
        if (this.winning !== undefined) {
            if (this.x > this.winning.x) {
                this.x -= 1 * delta;
            }
            if (this.x < this.winning.x) {
                this.x += 1 * delta;
            }
            if (this.y > this.winning.y) {
                this.y -= 1 * delta;
            }
            if (this.y < this.winning.y) {
                this.y += 1 * delta;
            }
            if (this.scale > 0) {
                this.scale -= 0.03 * delta;
            }
            this.rotation -= 0.03 * delta;
            return;
        }

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
            if (this.speed.y <= 0) {
                this.y = this.collidingBlockBelow;
                this.speed.y = 0;
            }

            // Snap rotation if not jumping
            if (!inputManager.up && this.icon !== 'ball') {
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
        if (this.collidingBlockAbove !== undefined) {
            if (this.speed.y > 0) {
                this.y = this.collidingBlockAbove - OBJECT_UNIT;
                this.speed.y = 0;
            }
        }
        if (this.collidingBlockLeft !== undefined) {
            if (this.speed.x < 0) {
                this.x = this.collidingBlockLeft;
                this.speed.x = 0;
            }
        }
        if (this.collidingBlockRight !== undefined) {
            if (this.speed.x > 0) {
                this.x = this.collidingBlockRight - OBJECT_UNIT;
                this.speed.x = 0;
            }
        }

        // Update position based on speed
        this.x += this.speed.x * delta;
        this.y += this.speed.y * delta;

        if (this.collidingBlockBelow === undefined || this.icon === 'ball') {
            this.rotation -= this.speed.x / 40 * delta;
        }
    }

    /** @type {GameObject['doRender']} */
    doRender(ctx) {
        if (this.squish.y < this.speed.y) {
            this.squish.y += 2.3;
        }
        else if (this.squish.y > this.speed.y) {
            this.squish.y -= 2.3;
        }
        if (Math.abs(this.squish.y - this.speed.y) <= 2.3) {
            this.squish.y = this.speed.y;
        }

        ctx.scale(
            1 - clamp(this.squish.y * 0.02, -0.1, 0.5),
            1 - clamp(this.squish.x * 0.02, -0.1, 0.5)
        );

        ctx.globalAlpha = (this.level?.editorMode && !this.level?.playtesting) ? 0.3 : 1;

        switch (this.icon) {
            default:
            case 'gradient': {
                const gradient = ctx.createLinearGradient(0, +OBJECT_UNIT / 2, 0, -OBJECT_UNIT);
                gradient.addColorStop(0, "#f07");
                gradient.addColorStop(1, "#07f");
                this.particleColor = '#f07';
        
                ctx.fillStyle = gradient;

                ctx.beginPath();
                ctx.roundRect(-OBJECT_UNIT / 2, -OBJECT_UNIT / 2, OBJECT_UNIT, OBJECT_UNIT, 3);
                ctx.fill();
                ctx.stroke();
                ctx.closePath();
            } break;

            case 'smile': {
                const gradient = ctx.createRadialGradient(0, 0, OBJECT_UNIT / 2, 0, OBJECT_UNIT / 8, OBJECT_UNIT / 4);
                gradient.addColorStop(0, "#de2");
                gradient.addColorStop(1, "#ffa");

                ctx.fillStyle = gradient;
                this.particleColor = '#df3';
                
                ctx.beginPath();
                ctx.roundRect(-OBJECT_UNIT / 2, -OBJECT_UNIT / 2, OBJECT_UNIT, OBJECT_UNIT, 3);
                ctx.fill();
                ctx.stroke();
                ctx.closePath();

                ctx.fillStyle = this.color;

                ctx.beginPath();
                ctx.moveTo(-OBJECT_UNIT / 4, 0);
                ctx.bezierCurveTo(
                    -OBJECT_UNIT / 4, -OBJECT_UNIT / 3,
                    +OBJECT_UNIT / 4, -OBJECT_UNIT / 3,
                    +OBJECT_UNIT / 4, 0
                );
                ctx.stroke();
                ctx.closePath();

                ctx.beginPath();
                ctx.arc(-OBJECT_UNIT / 4, OBJECT_UNIT / 4, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
                
                ctx.beginPath();
                ctx.arc(+OBJECT_UNIT / 4, OBJECT_UNIT / 4, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
                
                ctx.fillStyle = '#fff';

                ctx.beginPath();
                ctx.arc(-OBJECT_UNIT / 4 - 1, OBJECT_UNIT / 4 + 1, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
                
                ctx.beginPath();
                ctx.arc(+OBJECT_UNIT / 4 - 1, OBJECT_UNIT / 4 + 1, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            } break;

            case 'troll': {
                ctx.fillStyle = '#eee';
                this.particleColor = '#eee';
                
                ctx.beginPath();
                ctx.roundRect(-OBJECT_UNIT / 2, -OBJECT_UNIT / 2, OBJECT_UNIT, OBJECT_UNIT, 3);
                ctx.fill();
                ctx.stroke();
                ctx.closePath();

                ctx.fillStyle = this.color;

                ctx.beginPath();
                ctx.moveTo(-OBJECT_UNIT / 3, 0);
                ctx.bezierCurveTo(
                    -OBJECT_UNIT / 2, -OBJECT_UNIT / 3,
                    +OBJECT_UNIT / 4, -OBJECT_UNIT / 3,
                    +OBJECT_UNIT / 3, 0
                );
                ctx.lineTo(-OBJECT_UNIT / 3, 0);
                ctx.stroke();
                ctx.closePath();

                ctx.moveTo(-OBJECT_UNIT / 3, -OBJECT_UNIT / 3.5);
                ctx.bezierCurveTo(
                    -OBJECT_UNIT / 2, -OBJECT_UNIT / 2.5,
                    +OBJECT_UNIT / 4, -OBJECT_UNIT / 2.5,
                    +OBJECT_UNIT / 6, -OBJECT_UNIT / 3.5
                );
                ctx.stroke();
                
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -OBJECT_UNIT / 4 + 1);
                ctx.stroke();
                
                ctx.moveTo(-OBJECT_UNIT / 5, 0);
                ctx.lineTo(-OBJECT_UNIT / 5, -OBJECT_UNIT / 4 + 1);
                ctx.stroke();
                
                ctx.moveTo(+OBJECT_UNIT / 5, 0);
                ctx.lineTo(+OBJECT_UNIT / 5, -OBJECT_UNIT / 5);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(-OBJECT_UNIT / 4, OBJECT_UNIT / 6, 4, 0, Math.PI);
                ctx.fill();
                ctx.closePath();
                
                ctx.beginPath();
                ctx.arc(+OBJECT_UNIT / 4, OBJECT_UNIT / 6, 4, 0, Math.PI);
                ctx.fill();
                ctx.closePath();
                
                ctx.fillStyle = '#fff';

                ctx.beginPath();
                ctx.arc(-OBJECT_UNIT / 4 - 1, OBJECT_UNIT / 6 + 1, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
                
                ctx.beginPath();
                ctx.arc(+OBJECT_UNIT / 4 - 1, OBJECT_UNIT / 6 + 1, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            } break;
        
            case 'ball': {
                ctx.beginPath();
                const gradient = ctx.createConicGradient(0, 0, 0);
                gradient.addColorStop(0 / 5, "#f00");
                gradient.addColorStop(1 / 5, "#ff0");
                gradient.addColorStop(2 / 5, "#0f0");
                gradient.addColorStop(3 / 5, "#0ff");
                gradient.addColorStop(4 / 5, "#00f");
                gradient.addColorStop(5 / 5, "#f0f");
                ctx.fillStyle = gradient;
                this.particleColor = '#fff';
                ctx.arc(0, 0, OBJECT_UNIT / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.closePath();
            } break;
        }
    }
}

/**
 * @typedef {{ x: number, y: number, type: ObjectType }} LevelDataObject
 * @typedef {{ playerX: number | undefined, playerY: number | undefined, endX: number | undefined, endY: number | undefined, objects: LevelDataObject[] | undefined }} LevelData
 * @typedef {'place' | 'edit' | 'eraser'} EditorTool
 */

/**
 * A game level
 * @implements {Renderable}
 */
class Level {
    /**
     * Load a new level from data into a canvas
     * @param {HTMLCanvasElement} canvas 
     * @param {string} id
     * @param {boolean} editor
     */
    constructor(canvas, id, editor) {
        /**
         * @type {string}
         */
        this.id = id;
        /**
         * @type {HTMLCanvasElement}
         */
        this.canvas = canvas;
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
         * @type {GoalObject | undefined}
         */
        this.goal = undefined;
        /**
         * @type {LevelData | undefined}
         */
        this.data = undefined;
        /**
         * @type {string | undefined}
         */
        this.errorMessage = undefined;
        /**
         * @type {boolean}
         */
        this.editorMode = editor;
        /**
         * @type {boolean}
         */
        this.playtesting = false;
        /**
         * @type {GameObject | undefined}
         */
        this.editorGhostObject = undefined;
        /**
         * @type {boolean}
         */
        this.editorSnapToGrid = true;
        /**
         * @type {boolean}
         */
        this.editorShowGrid = true;
        /**
         * @type {GameObject | undefined}
         */
        this.editorClickedObj = undefined;
        /**
         * @type {EditorTool}
         */
        this.editorTool = 'edit';
        /**
         * @type {boolean}
         */
        this.editorHasUnsavedChanges = false;
        /**
         * @type {((hasUnsavedChanges: boolean) => void) | undefined}
         */
        this.onEditorChange = undefined;
        /**
         * @type {((playtesting: boolean) => void) | undefined}
         */
        this.onEditorPlaytest = undefined;
        /**
         * @type {boolean}
         */
        this.winning = false;
        /**
         * @type {boolean}
         */
        this.debug = false;

        this.scheduleRender(canvas);

        window.addEventListener('beforeunload', e => {
            if (this.editorMode && this.editorHasUnsavedChanges) {
                e.preventDefault();
            }
        });
    }

    /**
     * Start rendering this level to a canvas
     * @param {HTMLCanvasElement} canvas 
     */
    scheduleRender(canvas) {
        // Remove any existing renderers on this canvas
        const currentRenderer = /** @type {number | null} */ (canvas.getAttribute('renderer'));
        if (currentRenderer !== null) {
            cancelAnimationFrame(currentRenderer);
        }

        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
        ctx.setTransform(1, 0, 0, -1, 0, canvas.height - 1);

        let prevFrame = 0;
        const schedule = (/** @type {number} */ frameStamp) => {
            const delta = (frameStamp - prevFrame) * 60 / 1000;

            // Physics run at a constant tick rate
            this.tick(delta);

            // Render every frame you can
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Background
            const gradient = ctx.createLinearGradient(0, this.height, 0, 0);
            gradient.addColorStop(0, "#9cf");
            gradient.addColorStop(1, "#afe");
    
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Render the level
            this.render(ctx);

            prevFrame = frameStamp;
            canvas.setAttribute('renderer', requestAnimationFrame(schedule).toString());
        };
        requestAnimationFrame(schedule);
    }

    /**
     * @returns {[number, number]}
     */
    playerOrig() {
        return [this.data?.playerX ?? this.width / 2, this.data?.playerY ?? this.height / 2]
    }

    /**
     * @returns {[number, number]}
     */
    endOrig() {
        return [this.data?.endX ?? this.width / 2 - OBJECT_UNIT * 5, this.data?.endY ?? this.height / 2]
    }

    /**
     * @param {ObjectType} type 
     * @param {number} x 
     * @param {number} y 
     * @returns {GameObject | undefined}
     */
    createObject(type, x, y) {
        switch (type) {
            default: case 'block': {
                return new BlockObject(type, this, x, y);
            };

            case 'spike': {
                return new SpikeObject(type, this, x, y);
            };

            case 'ground-spike': {
                return new GroundSpikeObject(type, this, x, y);
            };

            case 'player': case 'goal': case 'particles': {
                console.error(`Illegal object type ${type}`);
                return undefined;
            };
        }
    }

    /**
     * Load level data
     * @param {LevelData} data 
     */
    loadData(data) {
        this.objects.forEach(obj => obj.level = undefined);
        this.objects = [];
        this.player = undefined;
        this.data = data;

        const [x, y] = this.playerOrig();
        this.player = new PlayerObject(this, x, y);

        const [ex, ey] = this.endOrig();
        this.goal = new GoalObject(this, ex, ey);

        data.objects?.forEach(obj => {
            if (obj.type !== 'goal') {
                this.createObject(obj.type, obj.x, obj.y);
            }
        });
    }

    reset() {
        if (this.player && this.data) {
            const [x, y] = this.playerOrig();
            this.player.reset(x, y);
            this.editorClickedObj = undefined;
        }
    }
    win() {
        if (this.editorMode) {
            this.setPlaytesting(false);
        }
        else {
            this.winning = true;
            this.canvas.parentElement?.querySelector('.overlay')?.classList.remove('hidden');
            api.post(`/api/levels/${this.id}/mark-as-cleared`);
        }
    }

    /** @type {Renderable['tick']} */
    tick(delta) {
        if (this.editorGhostObject) {
            this.editorGhostObject.collision = 'deco';
            this.editorGhostObject.opacity = 0; // this is overridden later if needed
        }
        
        if (this.editorMode) {
            const rect = this.canvas.getBoundingClientRect();

            let x = inputManager.mouseX - rect.left;
            let y = rect.bottom - inputManager.mouseY;
            let gridX = x;
            let gridY = y;

            if (x >= 0 && x <= this.width && y >= 0 && y <= this.height) {
                if (this.editorSnapToGrid) {
                    gridX = Math.floor(x / OBJECT_UNIT) * OBJECT_UNIT;
                    gridY = Math.floor(y / OBJECT_UNIT) * OBJECT_UNIT;
                }
                else {
                    gridX -= OBJECT_UNIT / 2;
                    gridY -= OBJECT_UNIT / 2;
                }
    
                if (this.editorGhostObject && this.editorTool == 'place') {
                    this.editorGhostObject.x = gridX;
                    this.editorGhostObject.y = gridY;
                    this.editorGhostObject.opacity = 0.3;
                    if (inputManager.mouseDown && (
                        !this.editorClickedObj || !this.editorClickedObj.absgridhitbox()?.contains(x, y)
                    )) {
                        let obj = this.createObject(
                            this.editorGhostObject.type,
                            this.editorGhostObject.x,
                            this.editorGhostObject.y
                        );
                        this.editorClickedObj = obj;
                        this.dirtify();
                    }
                }
    
                let hoveredObj = undefined;
                for (const obj of this.objects) {
                    const hovered = obj.absgridhitbox()?.contains(x, y);
                    if (this.editorTool == 'eraser' && hovered && !hoveredObj) {
                        obj.hovered = 'to-delete';
                        hoveredObj = obj;
                    }
                    else if (this.editorTool == 'edit' && hovered && !hoveredObj) {
                        obj.hovered = 'to-edit';
                        hoveredObj = obj;
                    }
                    else {
                        obj.hovered = undefined;
                    }
                }
    
                if (hoveredObj && inputManager.mouseDown) {
                    if (this.editorTool == 'eraser') {
                        if (hoveredObj.deletable) {
                            hoveredObj.removeThis();
                        }
                    }
                    this.editorClickedObj = hoveredObj;
                    this.dirtify();
                }
    
                if (inputManager.mouseDown && this.editorClickedObj) {
                    if (this.editorTool == 'edit') {
                        this.editorClickedObj.hovered = 'moving';
                        this.editorClickedObj.x = gridX;
                        this.editorClickedObj.y = gridY;
                    }
                }
            }

            if (!inputManager.mouseDown) {
                this.editorClickedObj = undefined;
            }
        }

        this.objects.forEach(obj => obj.tick(delta));
    }
    /** @type {Renderable['render']} */
    render(ctx) {
        // Render grid in editor
        if (this.editorMode && !this.playtesting && this.editorShowGrid) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 0.5;
            for (let x = OBJECT_UNIT; x < this.width; x += OBJECT_UNIT) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.height);
            }
            for (let y = OBJECT_UNIT; y < this.height; y += OBJECT_UNIT) {
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
            }
            ctx.stroke();
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.width, OBJECT_UNIT);
        ctx.fillRect(0, this.height - OBJECT_UNIT, this.width, OBJECT_UNIT);
        ctx.fillRect(0, 0, OBJECT_UNIT, this.height);
        ctx.fillRect(this.width - OBJECT_UNIT, 0, OBJECT_UNIT, this.height);

        if (!this.data || this.errorMessage) {
            ctx.resetTransform();
            ctx.font = '2rem sans-serif';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(this.errorMessage ?? 'Loading level...', this.width / 2, this.height / 2);
            ctx.setTransform(1, 0, 0, -1, 0, this.height - 1);
        }

        if (this.debug) {
            ctx.resetTransform();
            ctx.font = '.5rem sans-serif';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(`above: ${this.player?.collidingBlockAbove}`, OBJECT_UNIT * 2, OBJECT_UNIT * 2);
            ctx.fillText(`left: ${this.player?.collidingBlockLeft}`, OBJECT_UNIT * 2, OBJECT_UNIT * 3);
            ctx.fillText(`right: ${this.player?.collidingBlockRight}`, OBJECT_UNIT * 2, OBJECT_UNIT * 4);
            ctx.fillText(`below: ${this.player?.collidingBlockBelow}`, OBJECT_UNIT * 2, OBJECT_UNIT * 5);
            ctx.setTransform(1, 0, 0, -1, 0, this.height - 1);
        }
        
        this.objects.forEach(obj => {
            ctx.globalAlpha = obj.opacity;
            obj.render(ctx);
            ctx.globalAlpha = 1;
        });
    }

    dirtify() {
        this.editorHasUnsavedChanges = true;
        if (this.onEditorChange) {
            this.onEditorChange(true);
        }
    }
    updateData() {
        if (!this.editorMode || !this.data || !this.player) return;

        this.data.playerX = this.player.x;
        this.data.playerY = this.player.y;

        this.data.endX = this.goal?.x;
        this.data.endY = this.goal?.y;

        this.data.objects = [];
        for (const obj of this.objects) {
            if (obj == this.editorGhostObject || obj == this.player) {
                continue;
            }
            this.data.objects?.push({
                type: obj.type,
                x: obj.x,
                y: obj.y,
            });
        }
    }
    async serverAction(action) {
        try {
            await this.saveToServer();
            const res = await api.post(`/api/levels/wip/${this.id}/${action}`, this.data);
            if (!res.ok) {
                throw res.error;
            }
        }
        catch(e) {
            alert(`Error syncing level to servers: ${e}`);
        }
    }
    async saveToServer() {
        try {
            this.updateData();
            const res = await api.post(`/api/levels/wip/${this.id}/update-data`, this.data);
            if (!res.ok) {
                throw res.error;
            }
            this.editorHasUnsavedChanges = false;
            if (this.onEditorChange) {
                this.onEditorChange(false);
            }
        }
        catch(e) {
            alert(`Error saving level: ${e}`);
        }
    }

    /**
     * @param {string | undefined} msg 
     */
    setError(msg = undefined) {
        this.errorMessage = msg;
    }
    /**
     * @param {boolean} mode 
     */
    setPlaytesting(mode) {
        this.playtesting = mode;
        if (mode) {
            this.updateData();
        }
        this.reset();
        if (this.onEditorPlaytest) {
            this.onEditorPlaytest(mode);
        }
    }
    toggleEditorPlaytesting() {
        this.setPlaytesting(!this.playtesting);
        return this.playtesting;
    }
    /**
     * @param {EditorTool} tool 
     */
    setEditorTool(tool) {
        this.editorTool = tool;
    }
    /**
     * @param {ObjectType} obj 
     */
    setEditorObj(obj) {
        if (this.editorGhostObject) {
            this.editorGhostObject.removeThis();
        }
        this.editorGhostObject = this.createObject(obj, 0, 0);
    }
    /**
     * @param {boolean} show 
     */
    setEditorShowGrid(show) {
        this.editorShowGrid = show;
    }
    /**
     * @param {boolean} align 
     */
    setEditorGridAlign(align) {
        this.editorSnapToGrid = align;
    }
    /**
     * @param {((hasUnsavedChanges: boolean) => void) | undefined} target 
     */
    setEditorOnChange(target) {
        this.onEditorChange = target;
    }
    /**
     * @param {((playtesting: boolean) => void) | undefined} target 
     */
    setEditorOnPlaytest(target) {
        this.onEditorPlaytest = target;
    }
}

/**
 * Load a new level into a canvas by fetching it from an URL, replacing any existing level
 * @param {HTMLCanvasElement} canvas 
 * @param {string} id 
 * @returns {Promise<Level>}
 */
export async function loadLevelByID(canvas, id) {
    const level = new Level(canvas, id, false);

    const res = await api.get(`/api/levels/${id}/data`);
    if (!res.ok) {
        level.setError('Level not found');
        return Promise.reject('Level not found');
    }
    else {
        const data = /** @type {LevelData} */ (await res.value);
        level.loadData(data);
        api.post(`/api/levels/${id}/mark-as-played`);
        return level;
    }
}

/**
 * Load a new level into a canvas by fetching it from an URL, replacing any existing level
 * @param {HTMLCanvasElement} canvas 
 * @param {string} id 
 * @returns {Promise<Level>}
 */
export async function loadEditorByID(canvas, id) {
    const level = new Level(canvas, id, true);

    const res = await api.get(`/api/levels/wip/${id}/data`);
    if (!res.ok) {
        level.setError('Level not found');
        return Promise.reject('Level not found');
    }
    else {
        const data = /** @type {LevelData} */ (await res.value);
        level.loadData(data);
        return level;
    }
}
