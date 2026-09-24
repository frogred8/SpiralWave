import Phaser from 'phaser';
import { RESOURCE_CONFIG } from '@shared/Constants';

export interface MeteorPath {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface MeteorOptions {
    icon: string;
    fontSize: string;
    damage: number;
    duration: number;
    collisionWidth: number;
    collisionHeight: number;
    resourceTrailSteps: number;
    tint?: number;
}

export class BaseMeteor extends Phaser.GameObjects.Container {
    public readonly damage: number;
    public readonly duration: number;
    public readonly resourceTrailSteps: number;

    protected path: MeteorPath;
    protected collisionWidth: number;
    protected collisionHeight: number;
    protected label: Phaser.GameObjects.Text;
    protected baseRotation: number = 0;

    constructor(scene: Phaser.Scene, path: MeteorPath, options: MeteorOptions = {
        icon: RESOURCE_CONFIG.ICONS.meteor,
        fontSize: '70px',
        damage: RESOURCE_CONFIG.METEOR.DAMAGE,
        duration: RESOURCE_CONFIG.METEOR.DURATION,
        collisionWidth: RESOURCE_CONFIG.METEOR.COLLISION_WIDTH,
        collisionHeight: RESOURCE_CONFIG.METEOR.COLLISION_HEIGHT,
        resourceTrailSteps: RESOURCE_CONFIG.METEOR.RESOURCE_TRAIL_STEPS
    }) {
        super(scene, path.startX, path.startY);

        this.path = path;
        this.damage = options.damage;
        this.duration = options.duration;
        this.collisionWidth = options.collisionWidth;
        this.collisionHeight = options.collisionHeight;
        this.resourceTrailSteps = options.resourceTrailSteps;

        this.label = scene.add.text(0, 0, options.icon, { fontSize: options.fontSize }).setOrigin(0.5);
        if (options.tint !== undefined) this.label.setTint(options.tint);
        this.add(this.label);
        this.setSize(this.collisionWidth, this.collisionHeight);
    }

    public setTravelRotation(angle: number) {
        this.baseRotation = angle;
        this.setRotation(angle);
    }

    public updateTravelProgress(progress: number) {
        const x = Phaser.Math.Linear(this.path.startX, this.path.endX, progress);
        const y = Phaser.Math.Linear(this.path.startY, this.path.endY, progress);
        this.setPosition(x, y);
    }

    public getCollisionBounds() {
        return new Phaser.Geom.Rectangle(
            this.x - this.collisionWidth / 2,
            this.y - this.collisionHeight / 2,
            this.collisionWidth,
            this.collisionHeight
        );
    }

    public collidesWithCircle(x: number, y: number, radius: number) {
        const bounds = this.getCollisionBounds();
        const closestX = Phaser.Math.Clamp(x, bounds.left, bounds.right);
        const closestY = Phaser.Math.Clamp(y, bounds.top, bounds.bottom);
        return Phaser.Math.Distance.Squared(x, y, closestX, closestY) <= radius * radius;
    }
}

export class SpikyMeteor extends BaseMeteor {
    private spikeWaveAmplitude = RESOURCE_CONFIG.SPIKY_METEOR.WAVE_AMPLITUDE;
    private spikeWaveFrequency = RESOURCE_CONFIG.SPIKY_METEOR.WAVE_FREQUENCY;

    constructor(scene: Phaser.Scene, path: MeteorPath) {
        super(scene, path, {
            icon: RESOURCE_CONFIG.ICONS.meteor,
            fontSize: '78px',
            damage: RESOURCE_CONFIG.SPIKY_METEOR.DAMAGE,
            duration: RESOURCE_CONFIG.SPIKY_METEOR.DURATION,
            collisionWidth: RESOURCE_CONFIG.SPIKY_METEOR.COLLISION_WIDTH,
            collisionHeight: RESOURCE_CONFIG.SPIKY_METEOR.COLLISION_HEIGHT,
            resourceTrailSteps: RESOURCE_CONFIG.SPIKY_METEOR.RESOURCE_TRAIL_STEPS,
            tint: 0xff4d4d
        });

        const spikes = scene.add.graphics();
        spikes.fillStyle(0xff2a2a, 0.95);
        spikes.lineStyle(2, 0xfff06a, 0.9);
        const spikeCount = 10;
        const innerRadius = 34;
        const outerRadius = 52;
        for (let i = 0; i < spikeCount; i++) {
            const center = (Math.PI * 2 * i) / spikeCount;
            const left = center - 0.16;
            const right = center + 0.16;
            spikes.beginPath();
            spikes.moveTo(Math.cos(left) * innerRadius, Math.sin(left) * innerRadius);
            spikes.lineTo(Math.cos(center) * outerRadius, Math.sin(center) * outerRadius);
            spikes.lineTo(Math.cos(right) * innerRadius, Math.sin(right) * innerRadius);
            spikes.closePath();
            spikes.fillPath();
            spikes.strokePath();
        }
        this.addAt(spikes, 0);
    }

    public updateTravelProgress(progress: number) {
        const baseX = Phaser.Math.Linear(this.path.startX, this.path.endX, progress);
        const baseY = Phaser.Math.Linear(this.path.startY, this.path.endY, progress);
        const travelAngle = Phaser.Math.Angle.Between(this.path.startX, this.path.startY, this.path.endX, this.path.endY);
        const perpendicularX = Math.cos(travelAngle + Math.PI / 2);
        const perpendicularY = Math.sin(travelAngle + Math.PI / 2);
        const wave = Math.sin(progress * Math.PI * 2 * this.spikeWaveFrequency) * this.spikeWaveAmplitude;

        this.setPosition(baseX + perpendicularX * wave, baseY + perpendicularY * wave);
        this.setRotation(this.baseRotation + progress * Math.PI * 4);
    }
}
