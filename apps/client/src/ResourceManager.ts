import Phaser from 'phaser';
import { GameStats } from './GameStats';
import { GameRenderer } from './GameRenderer';
import { Utils } from './Utils';
import { DURATIONS, RESOURCE_CONFIG, INITIAL_STATS, SPAWN_BOUNDARY } from '@shared/Constants';
import { Resource, SpecialItem, Collectible } from './Types';
import { getResourceMetadata } from './ResourceRegistry';

export class ResourceManager {
    private scene: Phaser.Scene;
    private stats: GameStats;
    private renderer: GameRenderer;
    private resources: Phaser.Physics.Arcade.Group;
    private worldContainer: Phaser.GameObjects.Container;
    private spiralCenter: Phaser.Math.Vector2;
    private whiteHoles: Phaser.GameObjects.Container[] = [];
    private smallBlackHoles: Phaser.GameObjects.Container[] = [];
    private armBlackHoles: Phaser.GameObjects.Container[] = [];
    private meteors: Phaser.GameObjects.Text[] = [];
    private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

    constructor(scene: Phaser.Scene, stats: GameStats, renderer: GameRenderer, worldContainer: Phaser.GameObjects.Container, spiralCenter: Phaser.Math.Vector2) {
        this.scene = scene;
        this.stats = stats;
        this.renderer = renderer;
        this.worldContainer = worldContainer;
        this.spiralCenter = spiralCenter;

        this.resources = this.scene.physics.add.group({
            bounceX: 0.8,
            bounceY: 0.8,
            collideWorldBounds: false
        });
    }

    public getGroup(): Phaser.Physics.Arcade.Group {
        return this.resources;
    }

    public getSmallBlackHoles(): Phaser.GameObjects.Container[] {
        return this.smallBlackHoles;
    }

    public getArmBlackHoles(): Phaser.GameObjects.Container[] {
        return this.armBlackHoles;
    }

    public syncSmallBlackHoleDisplayRadius() {
        this.smallBlackHoles.forEach(sbh => {
            const boundary = sbh.getData('boundary') as Phaser.GameObjects.Arc | undefined;
            if (boundary) {
                boundary.setRadius(this.stats.smallBlackHoleRadius);
            }
        });
    }

    private getSpawnBaseDimensions() {
        return {
            width: SPAWN_BOUNDARY.WIDTH,
            height: SPAWN_BOUNDARY.HEIGHT
        };
    }

    private getSpawnDimensions() {
        return {
            width: Math.max(this.scene.scale.width, SPAWN_BOUNDARY.WIDTH),
            height: Math.max(this.scene.scale.height, SPAWN_BOUNDARY.HEIGHT)
        };
    }

    private getMeteorRotationOffset() {
        const defaultOffset = 3 * Math.PI / 4;
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('android')) {
            return defaultOffset + Math.PI / 2;
        }

        return defaultOffset;
    }

    private getRandomPositionAroundCenter(minDist: number, maxDist: number) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Phaser.Math.Between(minDist, maxDist);
        const x = this.spiralCenter.x + Math.cos(angle) * dist;
        const y = this.spiralCenter.y + Math.sin(angle) * dist;
        
        return {
            x: x,
            y: Phaser.Math.Clamp(y, SPAWN_BOUNDARY.Y_MIN, SPAWN_BOUNDARY.Y_MAX)
        };
    }

    private clampPositionToScreen(x: number, y: number) {
        return {
            x: Phaser.Math.Clamp(x, 0, this.scene.scale.width),
            y: Phaser.Math.Clamp(y, 0, this.scene.scale.height)
        };
    }

    public spawnResource(count: number = 2) {
        if (this.resources.getLength() >= INITIAL_STATS.MAX_RESOURCES) return;
        if (this.stats.isFeverMode) {
            count *= 5;
        }

        const { width, height } = this.getSpawnDimensions();
        for (let i = 0; i < count; i++) {
            const { x, y } = Utils.getRandomEdgePosition(width, height);
            // Center the spawn area if it's larger than the screen
            const offsetX = (width - this.scene.scale.width) / 2;
            const offsetY = (height - this.scene.scale.height) / 2;
            this.createResourceAt(x - offsetX, y - offsetY);
        }
    }

    public spawnMeteor() {
        const { width, height } = this.getSpawnDimensions();
        const offsetX = (width - this.scene.scale.width) / 2;
        const offsetY = (height - this.scene.scale.height) / 2;
        
        // 무작위 시작 지점과 목표 지점 설정 (화면 밖에서 시작해서 밖으로)
        const side = Phaser.Math.Between(0, 3);
        let startX, startY, endX, endY;
        
        if (side === 0) { // Bottom to Top
            startX = Phaser.Math.Between(0, width); startY = height + 100;
            endX = Phaser.Math.Between(0, width); endY = -100;
        } else if (side === 1) { // Top to Bottom
            startX = Phaser.Math.Between(0, width); startY = -100;
            endX = Phaser.Math.Between(0, width); endY = height + 100;
        } else if (side === 2) { // Right to Left
            startX = width + 100; startY = Phaser.Math.Between(0, height);
            endX = -100; endY = Phaser.Math.Between(0, height);
        } else { // Left to Right
            startX = -100; startY = Phaser.Math.Between(0, height);
            endX = width + 100; endY = Phaser.Math.Between(0, height);
        }

        // Adjust coordinates relative to actual screen center
        startX -= offsetX; startY -= offsetY;
        endX -= offsetX; endY -= offsetY;

        const meteor = this.scene.add.text(startX, startY, RESOURCE_CONFIG.ICONS.meteor, { fontSize: '70px' }).setOrigin(0.5);
        this.worldContainer.add(meteor);
        this.meteors.push(meteor);

        // 진행 방향으로 회전 (기존 대비 180도 반전하여 머리가 앞으로 오게 수정)
        const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
        meteor.setRotation(angle + this.getMeteorRotationOffset()); 

        // 파티클 효과 (꼬리)
        const emitter = this.scene.add.particles(0, 0, 'spark', {
            speed: { min: 20, max: 100 },
            scale: { start: 1.5, end: 0 },
            lifespan: 600,
            tint: [0xffaa00, 0xff4400, 0xffff00],
            blendMode: 'ADD',
            follow: meteor
        });
        this.worldContainer.add(emitter);
        this.emitters.push(emitter);

        this.scene.tweens.add({
            targets: meteor,
            x: endX,
            y: endY,
            duration: 4000,
            onUpdate: (tween) => {
                // 일정 간격으로 자원 생성 (진행도 1.25% 마다, 기존 5%에서 4배 증가)
                const progress = tween.progress;
                if (Math.floor(progress * 80) > Math.floor((tween as any).lastResourceProgress * 80 || 0)) {
                    this.createResourceAt(meteor.x, meteor.y);
                    (tween as any).lastResourceProgress = progress;
                }
            },
            onComplete: () => {
                emitter.destroy();
                this.emitters = this.emitters.filter(e => e !== emitter);
                meteor.destroy();
                this.meteors = this.meteors.filter(m => m !== meteor);
            }
        });
        (this.scene.tweens.getTweensOf(meteor)[0] as any).lastResourceProgress = 0;
    }

    public createResourceAt(x: number, y: number, isWhiteHole: boolean = false) {
        const types = RESOURCE_CONFIG.TYPES;
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        const isHighDim = Math.random() < this.stats.highDimProb;
        
        const icon = this.getIcon(type);
        const res = this.scene.add.text(x, y, icon, { 
            fontSize: isHighDim ? '60px' : '24px' 
        }).setOrigin(0.5) as Resource;
        
        res.resourceType = type;
        res.isHighDim = isHighDim;
        this.scene.physics.add.existing(res);
        this.resources.add(res);
        this.worldContainer.add(res);
        
        const radius = isHighDim ? 30 : 12;
        res.body.setCircle(radius, (res.width - radius * 2) / 2, (res.height - radius * 2) / 2);
        
        const { width, height } = this.getSpawnDimensions();
        const offsetX = (width - this.scene.scale.width) / 2;
        const offsetY = (height - this.scene.scale.height) / 2;
        const angle = isWhiteHole ? Math.random() * Math.PI * 2 : Utils.getAngle(x, y, Math.random() * width - offsetX, Math.random() * height - offsetY);
        const baseSpeed = isWhiteHole ? Phaser.Math.Between(150, 250) * 1.5 : Phaser.Math.Between(150, 250);
        const speed = baseSpeed * (isHighDim ? 0.5 : 1);
        
        res.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        res.body.setAngularVelocity(Phaser.Math.Between(45, 180));
    }

    public spawnSpecialItem() {
        const { width, height } = this.getSpawnDimensions();
        const offsetX = (width - this.scene.scale.width) / 2;
        const offsetY = (height - this.scene.scale.height) / 2;
        const { x: rawX, y: rawY } = Utils.getRandomEdgePosition(width, height);
        const x = rawX - offsetX;
        const y = rawY - offsetY;

        const type = Math.random() > 0.5 ? 'whitehole' : 'boost';
        const item = this.scene.add.text(x, y, this.getIcon(type), { fontSize: '40px' }).setOrigin(0.5) as SpecialItem;
        item.itemType = 'special';
        item.specialType = type;
        
        this.scene.physics.add.existing(item);
        this.resources.add(item);
        this.worldContainer.add(item);
        item.body.setCircle(20);

        const randomAngle = Math.random() * Math.PI * 2;
        const targetX = this.spiralCenter.x + Math.cos(randomAngle) * this.stats.radius;
        const targetY = this.spiralCenter.y + Math.sin(randomAngle) * this.stats.radius;
        
        const dir = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
        const speed = 120;
        item.body.setVelocity(dir.x * speed, dir.y * speed);
        item.body.setAngularVelocity(90);

        this.scene.tweens.add({ targets: item, scale: 1.3, alpha: 0.7, duration: 800, yoyo: true, loop: -1 });
    }

    public spawnWhiteHole(x?: number, y?: number, isEnhanced: boolean = false) {
        let targetX = x;
        let targetY = y;

        if (targetX === undefined || targetY === undefined) {
            const { x: rx, y: ry } = this.getRandomPositionAroundCenter(
                this.stats.radius + RESOURCE_CONFIG.WHITE_HOLE.MIN_DIST_OFFSET, 
                RESOURCE_CONFIG.WHITE_HOLE.MAX_DIST
            );
            targetX = rx;
            targetY = ry;
        }

        const wh = this.scene.add.container(targetX, targetY);
        const core = this.scene.add.circle(0, 0, 15, 0xcfcfcf, 0.8);
        const glow = this.scene.add.circle(0, 0, 20, 0xffffff, 0.2).setStrokeStyle(2, 0xffffff);
        wh.add([core, glow]);
        this.worldContainer.add(wh);
        
        this.renderer.emitWhiteHoleSpawn(targetX, targetY);
        
        wh.setScale(0);
        const targetScale = isEnhanced ? 2.0 : 1.0;
        this.scene.tweens.add({ targets: wh, scale: targetScale, duration: 500, ease: 'Back.Out' });
        (wh as any).lastSpawnTime = 0;
        (wh as any).isEnhanced = isEnhanced;
        this.whiteHoles.push(wh);

        const duration = isEnhanced ? 5000 : DURATIONS.WHITE_HOLE;
        this.scene.time.delayedCall(duration - DURATIONS.WHITE_HOLE_SHRINK, () => {
            this.scene.tweens.add({ targets: wh, scale: 0, alpha: 0, duration: DURATIONS.WHITE_HOLE_SHRINK, onComplete: () => {
                this.whiteHoles = this.whiteHoles.filter(h => h !== wh);
                wh.destroy();
            }});
        });
    }

    public updateWhiteHoles(time: number) {
        this.whiteHoles.forEach(wh => {
            const spawnInterval = (wh as any).isEnhanced ? 60 : 100;
            if (time > (wh as any).lastSpawnTime + spawnInterval) {
                this.createResourceAt(wh.x, wh.y, true);
                (wh as any).lastSpawnTime = time;
            }
        });
    }

    public spawnSmallBlackHole() {
        const { width, height } = this.getSpawnBaseDimensions();
        const minDist = this.stats.radius + RESOURCE_CONFIG.SMALL_BLACK_HOLE.MIN_DIST_OFFSET;
        const maxDist = Math.max(RESOURCE_CONFIG.SMALL_BLACK_HOLE.MAX_DIST_BASE, width / 2, height / 2);

        let targetX: number = 0, targetY: number = 0;
        let attempts = 0;
        const maxAttempts = 20;

        let isValid = false;
        do {
            const pos = this.getRandomPositionAroundCenter(minDist, maxDist);
            const screenPos = this.clampPositionToScreen(pos.x, pos.y);
            targetX = screenPos.x;
            targetY = screenPos.y;
            
            isValid = this.smallBlackHoles.every(sbh => {
                return Utils.getDistance(targetX, targetY, sbh.x, sbh.y) >= RESOURCE_CONFIG.SMALL_BLACK_HOLE.MIN_GAP;
            });
            attempts++;
        } while (!isValid && attempts < maxAttempts);

        if (!isValid) return; 

        const sbh = this.scene.add.container(targetX, targetY);
        const boundary = this.scene.add.circle(0, 0, this.stats.smallBlackHoleRadius, 0x333333, 0.15).setStrokeStyle(1, 0x666666, 0.6);
        const core = this.scene.add.circle(0, 0, 8, 0x000000, 1);
        const swirl = this.scene.add.circle(0, 0, 18, 0xffffff, 0.2);

        sbh.add([boundary, swirl, core]);
        sbh.setData('boundary', boundary);
        this.worldContainer.add(sbh);

        this.scene.tweens.add({
            targets: swirl,
            angle: 360,
            duration: 2000,
            loop: -1
        });

        sbh.setScale(0);
        this.scene.tweens.add({ targets: sbh, scale: 1.0, duration: 500, ease: 'Back.Out' });
        this.smallBlackHoles.push(sbh);

        this.scene.time.delayedCall(DURATIONS.SMALL_BLACK_HOLE_ACTIVE, () => {
            this.scene.tweens.add({ 
                targets: sbh, 
                scale: 0, 
                duration: DURATIONS.SMALL_BLACK_HOLE_SHRINK, 
                onComplete: () => {
                    this.smallBlackHoles = this.smallBlackHoles.filter(h => h !== sbh);
                    sbh.destroy();
                }
            });
        });
    }

    public spawnArmBlackHole(x: number, y: number) {
        const bh = this.scene.add.container(x, y);
        const boundary = this.scene.add.circle(0, 0, this.stats.armBlackHoleRadius, 0x190033, 0.18).setStrokeStyle(2, 0x8844ff, 0.7);
        const core = this.scene.add.circle(0, 0, 9, 0x000000, 1);
        const swirl = this.scene.add.circle(0, 0, 24, 0xaa66ff, 0.28);
        const ring = this.scene.add.circle(0, 0, 34, 0x000000, 0).setStrokeStyle(2, 0xffffff, 0.25);

        bh.add([boundary, ring, swirl, core]);
        this.worldContainer.add(bh);

        this.scene.tweens.add({
            targets: [ring, swirl],
            angle: 360,
            duration: 900,
            loop: -1
        });

        bh.setScale(0);
        this.scene.tweens.add({ targets: bh, scale: 1, duration: 180, ease: 'Back.Out' });
        this.armBlackHoles.push(bh);

        this.scene.time.delayedCall(DURATIONS.ARM_BLACK_HOLE_ACTIVE, () => {
            this.scene.tweens.add({
                targets: bh,
                scale: 0,
                alpha: 0,
                duration: DURATIONS.ARM_BLACK_HOLE_SHRINK,
                onComplete: () => {
                    this.armBlackHoles = this.armBlackHoles.filter(h => h !== bh);
                    bh.destroy();
                }
            });
        });
    }

    public getIcon(type: string): string {
        return getResourceMetadata(type).icon;
    }

    public getParticleTint(res: any): number {
        if (res.itemType === 'special' && res.specialType) {
            return getResourceMetadata(res.specialType).tint;
        }

        const type = res.resourceType;
        return getResourceMetadata(type).tint;
    }

    public clear() {
        this.resources.clear(true, true);
        this.whiteHoles.forEach(wh => wh.destroy());
        this.whiteHoles = [];
        
        this.smallBlackHoles.forEach(sbh => sbh.destroy());
        this.smallBlackHoles = [];

        this.armBlackHoles.forEach(bh => bh.destroy());
        this.armBlackHoles = [];
        
        this.meteors.forEach(m => m.destroy());
        this.meteors = [];
        
        this.emitters.forEach(e => e.destroy());
        this.emitters = [];
    }
}
