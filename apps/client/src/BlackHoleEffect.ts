import Phaser from 'phaser';
import { DURATIONS, PHYSICS_CONFIG } from '@shared/Constants';
import { Collectible } from './Types';
import { Utils } from './Utils';

export class BlackHoleEffect {
    public readonly center: Phaser.Math.Vector2;

    private readonly scene: Phaser.Scene;
    private readonly container: Phaser.GameObjects.Container;
    private readonly radius: number;
    private readonly force: number;
    private elapsed: number = 0;
    private active: boolean = true;

    constructor(scene: Phaser.Scene, worldContainer: Phaser.GameObjects.Container, x: number, y: number, radius: number, force: number) {
        this.scene = scene;
        this.radius = radius;
        this.force = force;
        this.center = new Phaser.Math.Vector2(x, y);

        const outer = this.scene.add.circle(0, 0, radius, 0x111111, 0.18)
            .setStrokeStyle(2, 0x8b5cf6, 0.8);
        const ring = this.scene.add.circle(0, 0, radius * 0.45, 0x0f172a, 0.55)
            .setStrokeStyle(2, 0x22d3ee, 0.75);
        const core = this.scene.add.circle(0, 0, 16, 0x000000, 0.95)
            .setStrokeStyle(2, 0xffffff, 0.7);

        this.container = this.scene.add.container(x, y, [outer, ring, core]);
        worldContainer.add(this.container);

        this.scene.tweens.add({
            targets: ring,
            scale: 1.35,
            alpha: 0.25,
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.scene.tweens.add({
            targets: core,
            scale: 1.45,
            duration: 360,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public update(delta: number, resources: Phaser.GameObjects.GameObject[]) {
        if (!this.active) return;

        this.elapsed += delta;
        const remainingRatio = Phaser.Math.Clamp(1 - this.elapsed / DURATIONS.ARM_BLACK_HOLE_ACTIVE, 0, 1);
        this.container.setAlpha(Math.max(0.15, remainingRatio));
        this.container.setRotation(this.container.rotation + delta * 0.004);

        resources.forEach(child => {
            const res = child as Collectible;
            if (!res.active || !res.body || !res.body.enable) return;

            const dist = Utils.getDistance(res.x, res.y, this.center.x, this.center.y);
            if (dist > this.radius) return;

            Utils.applyGravityToPoint(
                res,
                dist,
                this.radius,
                this.center.x,
                this.center.y,
                this.force,
                PHYSICS_CONFIG.ARM_BLACK_HOLE_ACCEL_BASE,
                PHYSICS_CONFIG.DRAG_BASE
            );
        });

        if (this.elapsed >= DURATIONS.ARM_BLACK_HOLE_ACTIVE) {
            this.destroy();
        }
    }

    public isActive() {
        return this.active;
    }

    public destroy() {
        if (!this.active) return;
        this.active = false;
        this.scene.tweens.killTweensOf(this.container.getAll());
        this.container.destroy();
    }
}
