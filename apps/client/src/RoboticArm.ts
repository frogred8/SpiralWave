import Phaser from 'phaser';
import { GameStats } from './GameStats';
import { GameRenderer } from './GameRenderer';
import { Utils } from './Utils';
import { Collectible, ArmState } from './Types';
import { DURATIONS } from '@shared/Constants';

export class RoboticArm {
    public state: ArmState = 'idle';
    public target: Phaser.Math.Vector2;
    public grabbedResource: Collectible | null = null;
    public extensionProgress: number = 0;
    public lastFireTime: number = 0;
    public idleBeginTime: number = 0;

    private scene: Phaser.Scene;
    private stats: GameStats;
    private spiralCenter: Phaser.Math.Vector2;

    constructor(scene: Phaser.Scene, stats: GameStats, spiralCenter: Phaser.Math.Vector2) {
        this.scene = scene;
        this.stats = stats;
        this.spiralCenter = spiralCenter;
        this.target = new Phaser.Math.Vector2(spiralCenter.x, spiralCenter.y);
    }

    public update(time: number, delta: number, renderer: GameRenderer, collectCallback: (res: Collectible, byArm: boolean) => void) {
        if (this.state === 'extending') {
            this.handleExtending(delta, collectCallback, renderer);
        } else if (this.state === 'retracting') {
            this.handleRetracting(time, delta, collectCallback);
        }

        if (this.state === 'idle') return;

        renderer.drawArm(this.spiralCenter.x, this.spiralCenter.y, this.target.x, this.target.y);
        
        if (this.state === 'retracting' && this.grabbedResource) {
            (this.grabbedResource as any).setPosition(this.target.x, this.target.y);
        }
    }

    private handleExtending(delta: number, collectCallback: (res: Collectible, byArm: boolean) => void, renderer: GameRenderer) {
        if (!this.grabbedResource || !this.grabbedResource.active) {
            this.retractWithoutResource(renderer);
            return;
        }

        const factor = this.stats.armSpeedFactor;
        const distanceToTarget = Utils.getDistance(this.spiralCenter.x, this.spiralCenter.y, this.grabbedResource.x, this.grabbedResource.y);
        const baseExtendSpeed = DURATIONS.ARM_EXTEND_BASE;
        const extensionStep = (baseExtendSpeed * factor * (delta / 1000)) / Math.max(distanceToTarget, 1);
        
        this.extensionProgress = Math.min(1, this.extensionProgress + extensionStep);
        this.target.x = this.spiralCenter.x + (this.grabbedResource.x - this.spiralCenter.x) * this.extensionProgress;
        this.target.y = this.spiralCenter.y + (this.grabbedResource.y - this.spiralCenter.y) * this.extensionProgress;

        if (this.extensionProgress >= 1) {
            this.startRetracting(collectCallback);
        }
    }

    private handleRetracting(time: number, delta: number, collectCallback: (res: Collectible, byArm: boolean) => void) {
        const factor = this.stats.armSpeedFactor;
        const isHighDim = this.grabbedResource?.isHighDim || false;
        const baseRetractSpeed = DURATIONS.ARM_RETRACT_BASE;
        const speedMultiplier = isHighDim ? 0.50 : 1.0;
        const speed = baseRetractSpeed * factor * speedMultiplier;

        const distance = Utils.getDistance(this.target.x, this.target.y, this.spiralCenter.x, this.spiralCenter.y);
        const moveStep = (speed * delta) / 1000;

        if (distance <= moveStep) {
            this.target.copy(this.spiralCenter);
            if (this.grabbedResource) {
                collectCallback(this.grabbedResource, true);
                this.grabbedResource = null;
            }
            this.state = 'idle';
            this.idleBeginTime = time;
            this.extensionProgress = 0;
        } else {
            const dirX = (this.spiralCenter.x - this.target.x) / distance;
            const dirY = (this.spiralCenter.y - this.target.y) / distance;
            this.target.x += dirX * moveStep;
            this.target.y += dirY * moveStep;
        }
    }

    private retractWithoutResource(renderer: GameRenderer) {
        this.state = 'retracting';
        this.grabbedResource = null;
    }

    private startRetracting(collectCallback: (res: Collectible, byArm: boolean) => void) {
        this.state = 'retracting';
        if (!this.grabbedResource) return;

        this.grabbedResource.body.setEnable(false);
    }

    public fire(target: Collectible, time: number) {
        this.state = 'extending';
        this.grabbedResource = target;
        if (target.obstacleType === 'spaceJunk') {
            (target as any).lastAggroX = target.x;
            (target as any).lastAggroY = target.y;
        }
        this.extensionProgress = 0;
        this.target.copy(this.spiralCenter);
        this.lastFireTime = time;
    }

    public reset() {
        this.state = 'idle';
        this.grabbedResource = null;
        this.extensionProgress = 0;
        this.lastFireTime = 0;
        this.idleBeginTime = 0;
        this.target.copy(this.spiralCenter);
    }
}
