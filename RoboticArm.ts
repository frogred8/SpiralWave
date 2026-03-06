import Phaser from 'phaser';
import { GameStats } from './GameStats';
import { GameRenderer } from './GameRenderer';

export type Collectible = Phaser.GameObjects.GameObject & { 
    x: number; 
    y: number; 
    active: boolean; 
    body: Phaser.Physics.Arcade.Body;
    resourceType?: 'rock' | 'wood' | 'iron';
    isHighDim?: boolean;
    itemType?: 'special';
    specialType?: 'whitehole' | 'boost';
};

export class RoboticArm {
    public state: 'idle' | 'extending' | 'retracting' = 'idle';
    public target: Phaser.Math.Vector2;
    public grabbedResource: Collectible | null = null;
    public extensionProgress: number = 0;
    public lastFireTime: number = 0;

    private scene: Phaser.Scene;
    private stats: GameStats;
    private spiralCenter: Phaser.Math.Vector2;

    constructor(scene: Phaser.Scene, stats: GameStats, spiralCenter: Phaser.Math.Vector2) {
        this.scene = scene;
        this.stats = stats;
        this.spiralCenter = spiralCenter;
        this.target = new Phaser.Math.Vector2(spiralCenter.x, spiralCenter.y);
    }

    public update(delta: number, renderer: GameRenderer, collectCallback: (res: Collectible, byArm: boolean) => void) {
        if (this.state === 'extending') {
            this.handleExtending(delta, collectCallback, renderer);
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
        const distanceToTarget = Phaser.Math.Distance.Between(this.spiralCenter.x, this.spiralCenter.y, this.grabbedResource.x, this.grabbedResource.y);
        const baseExtendSpeed = 600;
        const extensionStep = (baseExtendSpeed * factor * (delta / 1000)) / Math.max(distanceToTarget, 1);
        
        this.extensionProgress = Math.min(1, this.extensionProgress + extensionStep);
        this.target.x = this.spiralCenter.x + (this.grabbedResource.x - this.spiralCenter.x) * this.extensionProgress;
        this.target.y = this.spiralCenter.y + (this.grabbedResource.y - this.spiralCenter.y) * this.extensionProgress;

        if (this.extensionProgress >= 1) {
            this.startRetracting(collectCallback);
        }
    }

    private retractWithoutResource(renderer: GameRenderer) {
        this.state = 'retracting';
        this.grabbedResource = null;
        const distance = Phaser.Math.Distance.Between(this.target.x, this.target.y, this.spiralCenter.x, this.spiralCenter.y);
        const factor = this.stats.armSpeedFactor;
        const retractDuration = (distance / (800 * factor)) * 1000;

        this.scene.tweens.add({
            targets: this.target,
            x: this.spiralCenter.x,
            y: this.spiralCenter.y,
            duration: retractDuration,
            ease: 'Linear',
            onComplete: () => {
                this.state = 'idle';
                this.extensionProgress = 0;
            }
        });
    }

    private startRetracting(collectCallback: (res: Collectible, byArm: boolean) => void) {
        this.state = 'retracting';
        if (!this.grabbedResource) return;

        // 특수 아이템(화이트홀, 부스트)인 경우 즉시 콜백을 실행하고 빈 손으로 돌아옴
        if (this.grabbedResource.itemType === 'special') {
            const res = this.grabbedResource;
            this.grabbedResource = null; // 잡은 자원 해제
            collectCallback(res, true);
            this.retractWithoutResource(null as any); // 빈 팔로 회수
            return;
        }

        this.grabbedResource.body.setEnable(false);
        const isHighDim = this.grabbedResource.isHighDim || false;
        const distance = Phaser.Math.Distance.Between(this.target.x, this.target.y, this.spiralCenter.x, this.spiralCenter.y);
        const factor = this.stats.armSpeedFactor;
        const speedMultiplier = isHighDim ? 0.25 : 1.0;
        const retractDuration = (distance / (800 * factor * speedMultiplier)) * 1000;

        this.scene.tweens.add({
            targets: this.target,
            x: this.spiralCenter.x,
            y: this.spiralCenter.y,
            duration: retractDuration,
            ease: 'Linear',
            onComplete: () => {
                if (this.grabbedResource) {
                    collectCallback(this.grabbedResource, true);
                    this.grabbedResource = null;
                }
                this.state = 'idle';
                this.extensionProgress = 0;
            }
        });
    }

    public fire(target: Collectible, time: number) {
        this.state = 'extending';
        this.grabbedResource = target;
        this.extensionProgress = 0;
        this.target.copy(this.spiralCenter);
        this.lastFireTime = time;
    }
}
