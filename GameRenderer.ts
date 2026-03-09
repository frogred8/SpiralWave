import Phaser from 'phaser';
import { GameStats } from './GameStats';

export class GameRenderer {
    private scene: Phaser.Scene;
    private stats: GameStats;
    private worldContainer: Phaser.GameObjects.Container;
    private uiContainer: Phaser.GameObjects.Container;
    
    private boundaryGraphics: Phaser.GameObjects.Graphics;
    private roboticArmGraphics: Phaser.GameObjects.Graphics;
    private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
    private spiralCenter: Phaser.Math.Vector2;
    private blackHole!: Phaser.GameObjects.Arc;
    private glow!: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene, worldContainer: Phaser.GameObjects.Container, uiContainer: Phaser.GameObjects.Container, stats: GameStats, spiralCenter: Phaser.Math.Vector2) {
        this.scene = scene;
        this.worldContainer = worldContainer;
        this.uiContainer = uiContainer;
        this.stats = stats;
        this.spiralCenter = spiralCenter;

        this.boundaryGraphics = this.scene.add.graphics();
        this.roboticArmGraphics = this.scene.add.graphics();
        this.worldContainer.add([this.boundaryGraphics, this.roboticArmGraphics]);

        this.createBackground();
        this.createSpiralVisuals();
        this.sparks = this.createParticleEmitter();
    }

    private createBackground() {
        const { width, height } = this.scene.scale;
        const starCount = 300;
        const stars = this.scene.add.graphics();
        for (let i = 0; i < starCount; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const radius = Phaser.Math.FloatBetween(0.2, 1.2);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.9);
            stars.fillStyle(0xffffff, alpha);
            stars.fillCircle(x, y, radius);
        }
        this.worldContainer.add(stars);
    }

    private createSpiralVisuals() {
        this.blackHole = this.scene.add.circle(this.spiralCenter.x, this.spiralCenter.y, 8, 0x000000, 1);
        this.glow = this.scene.add.circle(this.spiralCenter.x, this.spiralCenter.y, 18, 0xffffff, 0.2);
        this.worldContainer.add([this.blackHole, this.glow]);
        
        this.scene.tweens.add({
            targets: this.glow,
            alpha: 0.5,
            scale: 1.3,
            duration: 1500,
            yoyo: true,
            loop: -1
        });
    }

    public updateSpiralPosition() {
        if (this.blackHole && this.glow) {
            this.blackHole.setPosition(this.spiralCenter.x, this.spiralCenter.y);
            this.glow.setPosition(this.spiralCenter.x, this.spiralCenter.y);
        }
    }

    private createParticleEmitter(): Phaser.GameObjects.Particles.ParticleEmitter {
        const sparkGraphics = this.scene.make.graphics({ x: 0, y: 0 });
        sparkGraphics.fillStyle(0xffffff);
        sparkGraphics.fillCircle(2, 2, 2);
        sparkGraphics.generateTexture('spark', 4, 4);
        sparkGraphics.destroy();

        const emitter = this.scene.add.particles(0, 0, 'spark', {
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            tint: [0xffff00, 0xff8800, 0xffffff],
            blendMode: 'ADD',
            emitting: false
        });
        this.worldContainer.add(emitter);
        return emitter;
    }

    public drawBoundaries(radiusMultiplier: number) {
        this.boundaryGraphics.clear();
        const effectiveRadius = this.stats.radius * radiusMultiplier;
        const isBoostActive = radiusMultiplier > 1.0;
        const color = isBoostActive ? 0x00ffff : 0xffffff;
        const alpha = isBoostActive ? 0.3 + (radiusMultiplier - 1.0) * 0.3 : 0.3;

        this.boundaryGraphics.lineStyle(2, color, alpha).setAlpha(0.5);
        this.boundaryGraphics.strokeCircle(this.spiralCenter.x, this.spiralCenter.y, effectiveRadius);
        
        this.boundaryGraphics.lineStyle(2, 0x00ffff, 0.3);
        this.boundaryGraphics.strokeCircle(this.spiralCenter.x, this.spiralCenter.y, 15);
    }

    public clearArmGraphics() {
        this.roboticArmGraphics.clear();
    }

    public drawArm(startX: number, startY: number, endX: number, endY: number) {
        this.roboticArmGraphics.lineStyle(3, 0x999999, 0.8);
        this.roboticArmGraphics.lineBetween(startX, startY, endX, endY);
        this.roboticArmGraphics.fillStyle(0xcccccc, 1);
        this.roboticArmGraphics.fillCircle(endX, endY, 8);
    }

    public emitCollectionParticles(x: number, y: number, isHighDim: boolean, tint: number) {
        const angle = Phaser.Math.Angle.Between(this.spiralCenter.x, this.spiralCenter.y, x, y);
        const angleDeg = Phaser.Math.RadToDeg(angle);
        
        this.sparks.setConfig({
            angle: { min: angleDeg - 30, max: angleDeg + 30 },
            speed: { min: 50, max: 150 },
            scale: { start: isHighDim ? 2.5 : 1.2, end: 0 },
            lifespan: isHighDim ? 500 : 300,
            tint: tint
        });
        
        const px = (x - this.spiralCenter.x) / 2 + this.spiralCenter.x;
        const py = (y - this.spiralCenter.y) / 2 + this.spiralCenter.y;
        this.sparks.emitParticle(isHighDim ? 25 : 5, px, py);
    }

    public emitCollisionSpark(x: number, y: number) {
        this.sparks.emitParticle(2, x, y);
    }

    public emitWhiteHoleSpawn(x: number, y: number) {
        this.sparks.setConfig({
            angle: { min: 0, max: 360 },
            speed: { min: 200, max: 500 },
            scale: { start: 2, end: 0 },
            lifespan: 400,
            tint: 0xffffff
        });
        this.sparks.emitParticle(30, x, y);
    }

    public drawNet(startX: number, startY: number, targetX: number, targetY: number) {
        const graphics = this.scene.add.graphics();
        this.worldContainer.add(graphics);

        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        const distance = 300; // 그물 사거리
        const spread = Math.PI / 4; // 45도

        this.scene.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: 500,
            onUpdate: (tween) => {
                const p = (tween as any).getValue();
                graphics.clear();
                graphics.lineStyle(2, 0x00ffff, 1 - p);
                graphics.fillStyle(0x00ffff, (1 - p) * 0.2);

                graphics.beginPath();
                graphics.moveTo(startX, startY);
                graphics.arc(startX, startY, distance * p, angle - spread / 2, angle + spread / 2);
                graphics.closePath();
                graphics.fillPath();
                graphics.strokePath();
            },
            onComplete: () => {
                graphics.destroy();
            }
        });
    }
}
