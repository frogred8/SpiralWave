import Phaser from 'phaser';
import { GameStats } from './GameStats';
import { SkillTreeUI } from './SkillTreeUI';
import { GameRenderer } from './GameRenderer';
import { RoboticArm, Collectible } from './RoboticArm';

interface Resource extends Phaser.GameObjects.Text {
    resourceType: 'rock' | 'wood' | 'iron';
    isHighDim: boolean;
    body: Phaser.Physics.Arcade.Body;
}

interface SpecialItem extends Phaser.GameObjects.Text {
    itemType: 'special';
    specialType: 'whitehole' | 'boost';
    body: Phaser.Physics.Arcade.Body;
}

const WHITE_HOLE_DURATION = 2000; // 화이트홀 유지 시간 (ms)

export class GameScene extends Phaser.Scene {
    private spiralCenter!: Phaser.Math.Vector2;
    private resources!: Phaser.Physics.Arcade.Group;
    private worldContainer!: Phaser.GameObjects.Container;
    private uiContainer!: Phaser.GameObjects.Container;
    private gameStats!: GameStats;
    private skillTreeUI!: SkillTreeUI;
    private gameRenderer!: GameRenderer;
    private arms: RoboticArm[] = [];
    private whiteHoles: Phaser.GameObjects.Container[] = [];
    private radiusMultiplier: number = 1.0;
    private boostTimerEvent?: Phaser.Time.TimerEvent;
    private spawnTimer!: Phaser.Time.TimerEvent;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private netTimerAccumulator: number = 0;

    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.json('skillTreeData', 'SKILLTREE.json');
    }

    create() {
        const { width, height } = this.scale;
        this.spiralCenter = new Phaser.Math.Vector2(width / 2, height / 2);

        const skillData = this.cache.json.get('skillTreeData');
        this.gameStats = new GameStats(skillData);

        this.worldContainer = this.add.container(0, 0);
        this.uiContainer = this.add.container(0, 0);

        // Renderer 초기화 (모든 시각 요소 위임)
        this.gameRenderer = new GameRenderer(this, this.worldContainer, this.uiContainer, this.gameStats, this.spiralCenter);

        // 로봇팔 초기화
        this.arms = [];
        for (let i = 0; i < 5; i++) {
            this.arms.push(new RoboticArm(this, this.gameStats, this.spiralCenter));
        }

        this.cameras.add(0, 0, width, height).setName('UI').ignore(this.worldContainer);
        this.cameras.main.ignore(this.uiContainer);

        this.setupPhysics();
        this.setupTimers();
        this.setupUI(skillData);

        this.input.on('pointerdown', this.handleInput, this);
        this.gameStats.on('skillUpgraded', this.updateSpawnTimer, this);
        
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }
    }

    private setupPhysics() {
        this.resources = this.physics.add.group({
            bounceX: 0.8,
            bounceY: 0.8,
            collideWorldBounds: false
        });

        this.physics.add.collider(this.resources, this.resources, (obj1, obj2) => {
            const r1 = obj1 as any;
            this.gameRenderer.emitCollisionSpark(r1.x, r1.y);
            
            const angle = Phaser.Math.Angle.Between(r1.x, r1.y, (obj2 as any).x, (obj2 as any).y);
            const pushForce = 150;
            r1.body.velocity.x -= Math.cos(angle) * pushForce;
            r1.body.velocity.y -= Math.sin(angle) * pushForce;
            (obj2 as any).body.velocity.x += Math.cos(angle) * pushForce;
            (obj2 as any).body.velocity.y += Math.sin(angle) * pushForce;
        });

        (this.physics.world as any).OVERLAP_BIAS = 100;
    }

    private setupTimers() {
        this.spawnTimer = this.time.addEvent({ 
            delay: Math.max(100, 1000 / (this.gameStats.spawnRateFactor || 1)), 
            callback: this.spawnResource, 
            callbackScope: this, 
            loop: true 
        });
        
        this.time.addEvent({ 
            delay: 5000, 
            callback: this.spawnWhiteHole, 
            callbackScope: this, 
            loop: true 
        });

        this.time.addEvent({ 
            delay: 15000, 
            callback: this.spawnSpecialItem, 
            callbackScope: this, 
            loop: true 
        });
    }

    private updateSpawnTimer() {
        if (this.spawnTimer) {
            this.spawnTimer.remove();
        }
        this.spawnTimer = this.time.addEvent({
            delay: Math.max(100, 1000 / (this.gameStats.spawnRateFactor || 1)),
            callback: this.spawnResource,
            callbackScope: this,
            loop: true
        });
    }

    private setupUI(skillData: any) {
        const infoText = this.add.text(20, 20, '', { fontSize: '18px', color: '#00ffff', fontStyle: 'bold' }).setScrollFactor(0);
        this.uiContainer.add(infoText);

        this.skillTreeUI = new SkillTreeUI(this, this.uiContainer, this.gameStats, skillData);

        this.gameStats.on('updateScore', () => {
            infoText.setText(`[ WOOD: ${this.gameStats.collected.wood} ]  [ ROCK: ${this.gameStats.collected.rock} ]  [ IRON: ${this.gameStats.collected.iron} ] | Radius: ${Math.floor(this.gameStats.radius)} | Arms: ${this.gameStats.maxArms} | Speed: ${this.gameStats.armSpeedFactor.toFixed(1)}x`);
        });

        this.gameStats.once('colorsUnlocked', () => {
            this.cameras.main.flash(1000, 255, 255, 255);
            this.resources.getChildren().forEach(child => (child as any).clearTint());
        });

        this.gameStats.emit('updateScore');
    }

    private handleInput(pointer: Phaser.Input.Pointer) {
        const activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
        if (activeArmsCount >= this.gameStats.maxArms) return;

        const arm = this.arms.find(a => a.state === 'idle');
        if (!arm) return;

        let closest: Collectible | null = null;
        let minDistance = 200;

        this.resources.getChildren().forEach(child => {
            const res = child as Collectible;
            if (!res.active || this.arms.some(a => a.grabbedResource === res)) return;
            const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, res.x, res.y);
            if (dist < minDistance) { minDistance = dist; closest = res; }
        });

        if (closest) arm.fire(closest, this.time.now);
    }

    update(time: number, delta: number) {
        this.gameStats.update(delta, this.cache.json.get('skillTreeData'));

        // 화살표 키로 블랙홀 이동
        if (this.cursors) {
            const moveSpeed = this.gameStats.moveSpeed;
            if (this.cursors.left.isDown) this.spiralCenter.x -= moveSpeed;
            if (this.cursors.right.isDown) this.spiralCenter.x += moveSpeed;
            if (this.cursors.up.isDown) this.spiralCenter.y -= moveSpeed;
            if (this.cursors.down.isDown) this.spiralCenter.y += moveSpeed;
            
            // 화면 경계 제한
            this.spiralCenter.x = Phaser.Math.Clamp(this.spiralCenter.x, 50, this.scale.width - 50);
            this.spiralCenter.y = Phaser.Math.Clamp(this.spiralCenter.y, 50, this.scale.height - 50);
            
            this.gameRenderer.updateSpiralPosition();
        }

        // 자동 그물 로직 (5초마다 커서 방향으로)
        if (this.gameStats.isNetEnabled) {
            this.netTimerAccumulator += delta;
            if (this.netTimerAccumulator >= 1000) {
                this.fireNet(this.input.activePointer.worldX, this.input.activePointer.worldY, 800);
                this.netTimerAccumulator = 0;
            }
        }

        // 화이트 홀 로직
        this.whiteHoles.forEach(wh => {
            //wh.setScale(1 + Math.sin(time / 1000) * 0.1);
            if (time > (wh as any).lastSpawnTime + 100) {
                this.createResourceAt(wh.x, wh.y, true);
                (wh as any).lastSpawnTime = time;
            }
        });

        // 로봇팔 업데이트
        this.gameRenderer.clearArmGraphics();
        this.arms.forEach(arm => arm.update(delta, this.gameRenderer, this.collectResource.bind(this)));

        // 자동 로봇팔 로직
        if (this.gameStats.isAutoArmEnabled) {
            const activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
            if (activeArmsCount < this.gameStats.maxArms) {
                this.arms.forEach(arm => {
                    // 발사 가능한(idle이며 쿨타임이 지난) 팔 탐색
                    if (arm.state === 'idle' && time > arm.lastFireTime + 8000) {
                        let bestHighDim: Collectible | null = null;
                        let bestNormal: Collectible | null = null;
                        let minHighDimDist = 400;
                        let minNormalDist = 400;

                        this.resources.getChildren().forEach((child) => {
                            const collectible = child as Collectible;
                            if (!collectible.active) return;
                            
                            // 이미 다른 팔에 잡힌 자원은 제외
                            const isAlreadyGrabbed = this.arms.some(a => a.grabbedResource === collectible);
                            if (isAlreadyGrabbed) return;

                            const distance = Phaser.Math.Distance.Between(this.spiralCenter.x, this.spiralCenter.y, collectible.x, collectible.y);
                            const isHighDim = (collectible as any).isHighDim || false;

                            if (isHighDim) {
                                if (distance < minHighDimDist) {
                                    minHighDimDist = distance;
                                    bestHighDim = collectible;
                                }
                            } else {
                                if (distance < minNormalDist) {
                                    minNormalDist = distance;
                                    bestNormal = collectible;
                                }
                            }
                        });

                        // 큰 자원 우선, 없으면 일반 자원 발사
                        const targetResource = bestHighDim || bestNormal;
                        if (targetResource) {
                            arm.fire(targetResource, time);
                        }
                    }
                });
            }
        }

        // 시각 요소 업데이트
        this.gameRenderer.drawBoundaries(this.radiusMultiplier);

        // 물리 및 수집 로직
        this.processResources();
    }

    getCurrentRadius() {
        return this.gameStats.radius * this.radiusMultiplier;
    }

    private processResources() {
        const effectiveRadius = this.getCurrentRadius();

        this.resources.getChildren().forEach(child => {
            const res = child as any;
            if (!res.active || this.arms.some(a => a.grabbedResource === res)) return;

            if (res.itemType === 'special') {
                if (Phaser.Math.Distance.BetweenPoints(res, this.spiralCenter) > 1200) res.destroy();
                return;
            }

            const dist = Phaser.Math.Distance.BetweenPoints(res, this.spiralCenter);
            if (dist < effectiveRadius) {
                this.applyGravity(res, dist, effectiveRadius);
            }

            const collectionRadius = res.isHighDim ? 45 : 30;
            if (dist < collectionRadius) {
                this.collectResource(res);
            } else if (dist > 1200) {
                res.destroy();
            } else {
                this.limitSpeed(res, dist);
            }
        });
    }

    private applyGravity(res: any, dist: number, radius: number) {
        const dir = new Phaser.Math.Vector2(this.spiralCenter.x - res.x, this.spiralCenter.y - res.y).normalize();
        const tangent = new Phaser.Math.Vector2(-dir.y, dir.x);
        const force = (1 - (dist / radius)) * this.gameStats.force * 90;
        const boost = dist < 150 ? Math.pow((150 - dist) / 150, 2) * 5 : 0;
        const accel = force * (1 + boost);
        const spiral = 0.2 * Math.pow(dist / radius, 2);

        res.body.velocity.x += (dir.x * accel + tangent.x * accel * spiral);
        res.body.velocity.y += (dir.y * accel + tangent.y * accel * spiral);

        if (dist < 150) res.body.setDrag(50 * res.body.mass);
        else res.body.setDrag(0);
    }

    private limitSpeed(res: any, dist: number) {
        const min = dist < 100 ? 10 : 30;
        const max = 240;
        const vel = res.body.velocity;
        const speedSq = vel.lengthSq();

        if (speedSq > max * max) vel.normalize().scale(max);
        else if (speedSq < min * min) {
            if (speedSq === 0) vel.setToPolar(Math.random() * Math.PI * 2, min);
            else vel.normalize().scale(min);
        }
    }

    private collectResource(collectible: any, byArm: boolean = false) {
        if (!collectible.active) return;

        if (collectible.itemType === 'special') {
            this.handleSpecialItem(collectible, byArm);
            return;
        }

        const isHighDim = collectible.isHighDim || false;
        this.gameRenderer.emitCollectionParticles(collectible.x, collectible.y, isHighDim, this.getParticleTint(collectible));
        
        this.gameStats.addCollected(collectible.resourceType, isHighDim ? 5 : 1);
        
        if (byArm && this.gameStats.researchBonus > 0) {
            this.gameStats.reduceResearchTime(this.gameStats.researchBonus);
        }
        
        if (!this.gameStats.isColorUnlocked) this.gameStats.unlockColors();

        collectible.destroy();
    }

    private fireNet(targetX: number, targetY: number, distance: number) {
        this.gameRenderer.drawNet(this.spiralCenter.x, this.spiralCenter.y, targetX, targetY, distance);

        const angleToTarget = Phaser.Math.Angle.Between(this.spiralCenter.x, this.spiralCenter.y, targetX, targetY);
        const spread = Math.PI / 4;

        this.resources.getChildren().forEach((child) => {
            const res = child as any;
            if (!res.active) return;

            const dist = Phaser.Math.Distance.BetweenPoints(res, this.spiralCenter);
            if (dist > distance) return;

            const angleToRes = Phaser.Math.Angle.Between(this.spiralCenter.x, this.spiralCenter.y, res.x, res.y);
            const diff = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(angleToTarget), Phaser.Math.RadToDeg(angleToRes));

            if (Math.abs(diff) <= Phaser.Math.RadToDeg(spread) / 2) {
                // 물리 엔진 정지 및 중심으로 끌어당기기
                res.body.setEnable(false);
                
                this.tweens.add({
                    targets: res,
                    x: this.spiralCenter.x,
                    y: this.spiralCenter.y,
                    duration: 600, // 로봇팔보다는 빠르게 끌어옴
                    ease: 'Power2',
                    onComplete: () => {
                        if (res.active) {
                            this.collectResource(res, true);
                        }
                    }
                });
            }
        });
    }

    private handleSpecialItem(item: SpecialItem, byArm: boolean) {
        if (!byArm) {
            item.destroy();
            this.cameras.main.shake(100, 0.005);
            return;
        }

        if (item.specialType === 'whitehole') this.spawnWhiteHole();
        else if (item.specialType === 'boost') this.triggerRadiusBoost();
        
        item.destroy();
        this.cameras.main.shake(100, 0.005);
    }

    private triggerRadiusBoost() {
        // 기존 축소 애니메이션 제거
        this.tweens.killTweensOf(this);

        // 기존에 대기 중인 타이머가 있다면 제거 (중첩 실행 방지)
        if (this.boostTimerEvent) {
            this.boostTimerEvent.remove();
        }

        this.radiusMultiplier = 2.0;
        // this.cameras.main.flash(500, 0, 255, 255);

        // 5초 대기 후 서서히 축소 시작
        this.boostTimerEvent = this.time.delayedCall(5000, () => {
            this.tweens.add({ 
                targets: this, 
                radiusMultiplier: 1.0, 
                duration: 2000, 
                ease: 'Power1' 
            });
            this.boostTimerEvent = undefined;
        });
    }

    private spawnSpecialItem() {
        const { width, height } = this.scale;
        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0;
        if (edge === 0) { x = Phaser.Math.Between(0, width); y = 0; }
        else if (edge === 1) { x = width; y = Phaser.Math.Between(0, height); }
        else if (edge === 2) { x = Phaser.Math.Between(0, width); y = height; }
        else { x = 0; y = Phaser.Math.Between(0, height); }

        const type = Math.random() > 0.5 ? 'whitehole' : 'boost';
        const item = this.add.text(x, y, this.getIcon(type), { fontSize: '40px' }).setOrigin(0.5) as SpecialItem;
        item.itemType = 'special';
        item.specialType = type;
        
        this.physics.add.existing(item);
        this.resources.add(item);
        this.worldContainer.add(item);
        item.body.setCircle(20);

        // 블랙홀 중심이 아닌, radius 경계면 위의 무작위 지점을 목표로 설정
        const randomAngle = Math.random() * Math.PI * 2;
        const targetX = this.spiralCenter.x + Math.cos(randomAngle) * this.gameStats.radius;
        const targetY = this.spiralCenter.y + Math.sin(randomAngle) * this.gameStats.radius;
        
        const dir = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
        const speed = 120;
        item.body.setVelocity(dir.x * speed, dir.y * speed);
        item.body.setAngularVelocity(90);

        this.tweens.add({ targets: item, scale: 1.3, alpha: 0.7, duration: 800, yoyo: true, loop: -1 });
    }

    private spawnWhiteHole(x?: number, y?: number) {
        const { width, height } = this.scale;
        let targetX = x;
        let targetY = y;

        if (targetX === undefined || targetY === undefined) {
            let dist;
            do {
                targetX = Phaser.Math.Between(200, width - 200);
                targetY = Phaser.Math.Between(200, height - 200);
                dist = Phaser.Math.Distance.Between(targetX, targetY, this.spiralCenter.x, this.spiralCenter.y);
            } while (dist < this.gameStats.radius || dist > 600);
        }

        const wh = this.add.container(targetX, targetY);
        wh.add([this.add.circle(0, 0, 15, 0xcfcfcf, 0.8), this.add.circle(0, 0, 20, 0xffffff, 0.2).setStrokeStyle(2, 0xffffff)]);
        this.worldContainer.add(wh);
        
        // 빅뱅 파티클 효과 방출
        this.gameRenderer.emitWhiteHoleSpawn(targetX, targetY);
        
        wh.setScale(0);
        this.tweens.add({ targets: wh, scale: 1, duration: 500, ease: 'Back.Out' });
        (wh as any).lastSpawnTime = 0;
        this.whiteHoles.push(wh);

        const shrinkDuration = 500;
        this.time.delayedCall(WHITE_HOLE_DURATION - shrinkDuration, () => {
            this.tweens.add({ targets: wh, scale: 0, alpha: 0, duration: shrinkDuration, onComplete: () => {
                this.whiteHoles = this.whiteHoles.filter(h => h !== wh);
                wh.destroy();
            }});
        });
    }

    private spawnResource() {
        if (this.resources.getLength() >= 300) return;

        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0;
        if (edge === 0) { x = Phaser.Math.Between(0, this.scale.width); y = 0; }
        else if (edge === 1) { x = this.scale.width; y = Phaser.Math.Between(0, this.scale.height); }
        else if (edge === 2) { x = Phaser.Math.Between(0, this.scale.width); y = this.scale.height; }
        else { x = 0; y = Phaser.Math.Between(0, this.scale.height); }
        this.createResourceAt(x, y);
    }

    private createResourceAt(x: number, y: number, isWhiteHole: boolean = false) {
        const types: ('rock' | 'wood' | 'iron')[] = ['rock', 'wood', 'iron'];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        const isHighDim = Math.random() < this.gameStats.highDimProb;
        const res = this.add.text(x, y, this.getIcon(type), { fontSize: isHighDim ? '60px' : '24px' }).setOrigin(0.5) as Resource;
        
        res.resourceType = type;
        res.isHighDim = isHighDim;
        this.physics.add.existing(res);
        this.resources.add(res);
        this.worldContainer.add(res);
        res.body.setCircle(isHighDim ? 30 : 12);
        if (!this.gameStats.isColorUnlocked) res.setTint(0x444444);
        
        const angle = isWhiteHole ? Math.random() * Math.PI * 2 : Phaser.Math.Angle.Between(x, y, Math.random()*this.scale.width, Math.random()*this.scale.height);
        // const baseSpeed = isWhiteHole ? Phaser.Math.Between(150, 250) * 1.5 : Phaser.Math.Between(50, 100);
        const baseSpeed = isWhiteHole ? Phaser.Math.Between(150, 250) * 1.5 : Phaser.Math.Between(150, 250);
        const speed = baseSpeed * (isHighDim ? 0.5 : 1);
        res.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        res.body.setAngularVelocity(Phaser.Math.Between(45, 180));
    }

    private getIcon(type: string): string {
        switch(type) {
            case 'rock': return '🪨';
            case 'wood': return '🪵';
            case 'iron': return '🪙';
            case 'whitehole': return '🌀';
            case 'boost': return '⚡';
            default: return '✨';
        }
    }

    private getParticleTint(res: any): number {
        const type = res.resourceType;
        switch(type) {
            case 'rock': return 0xaaaaaa;
            case 'wood': return 0x8b4513;
            case 'iron': return 0x778899;
            default: return 0xffffff;
        }
    }
}
