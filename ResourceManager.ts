import Phaser from 'phaser';
import { GameStats } from './GameStats';
import { GameRenderer } from './GameRenderer';
import { Utils } from './Utils';
import { DURATIONS, RESOURCE_CONFIG, INITIAL_STATS } from './Constants';
import { Resource, SpecialItem, Collectible } from './Types';

export class ResourceManager {
    private scene: Phaser.Scene;
    private stats: GameStats;
    private renderer: GameRenderer;
    private resources: Phaser.Physics.Arcade.Group;
    private worldContainer: Phaser.GameObjects.Container;
    private spiralCenter: Phaser.Math.Vector2;
    private whiteHoles: Phaser.GameObjects.Container[] = [];
    private smallBlackHoles: Phaser.GameObjects.Container[] = [];
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

    public getWhiteHoles(): Phaser.GameObjects.Container[] {
        return this.whiteHoles;
    }

    public getSmallBlackHoles(): Phaser.GameObjects.Container[] {
        return this.smallBlackHoles;
    }

    public spawnResource(count: number = 2) {
        if (this.resources.getLength() >= INITIAL_STATS.MAX_RESOURCES) return;

        const { width, height } = this.scene.scale;
        for (let i = 0; i < count; i++) {
            const { x, y } = Utils.getRandomEdgePosition(width, height);
            this.createResourceAt(x, y);
        }
    }

    public spawnMeteor() {
        const { width, height } = this.scene.scale;
        
        // 무작위 시작 지점과 목표 지점 설정 (화면 밖에서 시작해서 밖으로)
        const side = Phaser.Math.Between(0, 3);
        let startX, startY, endX, endY;
        
        if (side === 0) { // Bottom to Top
            startX = Phaser.Math.Between(0, width); startY = height + 50;
            endX = Phaser.Math.Between(0, width); endY = -50;
        } else if (side === 1) { // Top to Bottom
            startX = Phaser.Math.Between(0, width); startY = -50;
            endX = Phaser.Math.Between(0, width); endY = height + 50;
        } else if (side === 2) { // Right to Left
            startX = width + 50; startY = Phaser.Math.Between(0, height);
            endX = -50; endY = Phaser.Math.Between(0, height);
        } else { // Left to Right
            startX = -50; startY = Phaser.Math.Between(0, height);
            endX = width + 50; endY = Phaser.Math.Between(0, height);
        }

        const meteor = this.scene.add.text(startX, startY, '☄️', { fontSize: '80px' }).setOrigin(0.5);
        this.worldContainer.add(meteor);
        this.meteors.push(meteor);

        // 진행 방향으로 회전 (기존 대비 180도 반전하여 머리가 앞으로 오게 수정)
        const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
        meteor.setRotation(angle + 3 * Math.PI / 4); 

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
        
        const angle = isWhiteHole ? Math.random() * Math.PI * 2 : Utils.getAngle(x, y, Math.random() * this.scene.scale.width, Math.random() * this.scene.scale.height);
        const baseSpeed = isWhiteHole ? Phaser.Math.Between(150, 250) * 1.5 : Phaser.Math.Between(150, 250);
        const speed = baseSpeed * (isHighDim ? 0.5 : 1);
        
        res.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        res.body.setAngularVelocity(Phaser.Math.Between(45, 180));
    }

    public spawnSpecialItem() {
        const { width, height } = this.scene.scale;
        const { x, y } = Utils.getRandomEdgePosition(width, height);

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
        const { width, height } = this.scene.scale;
        let targetX = x;
        let targetY = y;

        if (targetX === undefined || targetY === undefined) {
            let dist;
            do {
                targetX = Phaser.Math.Between(200, width - 200);
                targetY = Phaser.Math.Between(200, height - 200);
                dist = Utils.getDistance(targetX, targetY, this.spiralCenter.x, this.spiralCenter.y);
            } while (dist < this.stats.radius || dist > 600);
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
        const { width, height } = this.scene.scale;
        let targetX, targetY;

        let dist;
        do {
            targetX = Phaser.Math.Between(150, width - 150);
            targetY = Phaser.Math.Between(150, height - 150);
            dist = Utils.getDistance(targetX, targetY, this.spiralCenter.x, this.spiralCenter.y);
        } while (dist < this.stats.radius || dist > 600);

        const sbh = this.scene.add.container(targetX, targetY);
        // 외곽 경계선 (중력 범위 표시)
        const boundary = this.scene.add.circle(0, 0, 150, 0x333333, 0.1).setStrokeStyle(1, 0x666666, 0.3);
        const core = this.scene.add.circle(0, 0, 25, 0x000000, 1.0).setStrokeStyle(2, 0x444444);
        const swirl = this.scene.add.circle(0, 0, 30, 0x111111, 0.5).setStrokeStyle(1, 0x666666);
        sbh.add([boundary, swirl, core]);
        this.worldContainer.add(sbh);

        // 회전 애니메이션
        this.scene.tweens.add({
            targets: swirl,
            angle: 360,
            duration: 2000,
            loop: -1
        });

        // 경계선 깜빡임 효과
        this.scene.tweens.add({
            targets: boundary,
            alpha: 0.2,
            duration: 1000,
            yoyo: true,
            loop: -1
        });

        sbh.setScale(0);
        this.scene.tweens.add({ targets: sbh, scale: 1.0, duration: 500, ease: 'Back.Out' });
        this.smallBlackHoles.push(sbh);

        // 3초 유지 후 2초간 축소하며 제거
        this.scene.time.delayedCall(DURATIONS.SMALL_BLACK_HOLE_ACTIVE, () => {
            this.scene.tweens.add({ 
                targets: sbh, 
                scale: 0, 
                alpha: 0, 
                duration: DURATIONS.SMALL_BLACK_HOLE_SHRINK, 
                onComplete: () => {
                    this.smallBlackHoles = this.smallBlackHoles.filter(h => h !== sbh);
                    sbh.destroy();
                }
            });
        });
    }

    public getIcon(type: string): string {
        return (RESOURCE_CONFIG.ICONS as any)[type] || RESOURCE_CONFIG.ICONS.default;
    }

    public getParticleTint(res: any): number {
        const type = res.resourceType;
        return (RESOURCE_CONFIG.COLORS as any)[type] || RESOURCE_CONFIG.COLORS.default;
    }

    public clear() {
        this.resources.clear(true, true);
        this.whiteHoles.forEach(wh => wh.destroy());
        this.whiteHoles = [];
        
        this.smallBlackHoles.forEach(sbh => sbh.destroy());
        this.smallBlackHoles = [];
        
        this.meteors.forEach(m => m.destroy());
        this.meteors = [];
        
        this.emitters.forEach(e => e.destroy());
        this.emitters = [];
    }
}
