import Phaser from 'phaser';
import { GameStats } from './GameStats';
import { SkillTreeUI } from './SkillTreeUI';
import { GameRenderer } from './GameRenderer';
import { RoboticArm } from './RoboticArm';
import { DURATIONS, RESOURCE_CONFIG, PHYSICS_CONFIG, INITIAL_STATS } from './Constants';
import { Utils } from './Utils';
import { ResourceManager } from './ResourceManager';
import { Resource, SpecialItem, Collectible } from './Types';

export class GameScene extends Phaser.Scene {
    private spiralCenter!: Phaser.Math.Vector2;
    private worldContainer!: Phaser.GameObjects.Container;
    private uiContainer!: Phaser.GameObjects.Container;
    private gameStats!: GameStats;
    private skillTreeUI!: SkillTreeUI;
    private gameRenderer!: GameRenderer;
    private resourceManager!: ResourceManager;
    private arms: RoboticArm[] = [];
    
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

        let skillData = this.cache.json.get('skillTreeData');
        
        // 스킬 트리 랜덤 배치 로직 (12개 스킬을 tree:0~2, row:0~3에 분산)
        if (skillData && skillData.length >= 12) {
            // 1. 위치 풀 생성 (3x4 = 12개)
            const positions: {tree: number, row: number}[] = [];
            for(let r=0; r<4; r++) {
                for(let t=0; t<3; t++) {
                    positions.push({tree: t, row: r});
                }
            }
            
            // 2. 스킬 데이터 셔플
            skillData = Phaser.Utils.Array.Shuffle([...skillData]);
            
            // 3. 스킬에 위치 할당 및 초기 Prerequisites 제거
            skillData.forEach((skill: any, index: number) => {
                const pos = positions[index];
                skill.tree = pos.tree;
                skill.row = pos.row;
                skill.prerequisites = []; // 기존 의존성 초기화
            });

            // 4. 새로운 Prerequisites 생성 로직
            for(let r=1; r<4; r++) {
                // 이 row에 있는 스킬들
                const currentRows = skillData.filter((s: any) => s.row === r);
                // 바로 위 row에 있는 스킬들
                const upperRows = skillData.filter((s: any) => s.row === r - 1);
                
                // 해당 row에서 랜덤하게 하나 선택하여 추가 의존성(2개)을 부여할 대상 선정
                const multiPrereqIndex = Phaser.Math.Between(0, currentRows.length - 1);

                currentRows.forEach((skill: any, index: number) => {
                    // 기본 규칙: 자신의 바로 위 tree의 스킬을 선행 조건으로 포함
                    const directUpper = upperRows.find((s: any) => s.tree === skill.tree);
                    if (directUpper) {
                        skill.prerequisites.push({ id: directUpper.id, level: 1 });
                    }

                    // 랜덤 규칙: row마다 하나는 이웃한 tree의 상위 스킬을 추가로 포함 (이웃: 인덱스 차이가 1)
                    if (index === multiPrereqIndex) {
                        const otherUpper = upperRows.filter((s: any) => Math.abs(s.tree - skill.tree) === 1);
                        if (otherUpper.length > 0) {
                            const randomUpper = Phaser.Utils.Array.GetRandom(otherUpper) as any;
                            skill.prerequisites.push({ id: randomUpper.id, level: 1 });
                        }
                    }
                });

                // 마지막 row(r=3)인 경우, 추가로 이웃한 tree의 연결 하나 더 생성
                if (r === 3) {
                    const randomSkill = Phaser.Utils.Array.GetRandom(currentRows) as any;
                    const otherUpper = upperRows.filter((s: any) => 
                        Math.abs(s.tree - randomSkill.tree) === 1 && 
                        !randomSkill.prerequisites.some((p: any) => p.id === s.id)
                    );
                    if (otherUpper.length > 0) {
                        const extraUpper = Phaser.Utils.Array.GetRandom(otherUpper) as any;
                        randomSkill.prerequisites.push({ id: extraUpper.id, level: 1 });
                    }
                }
            }
        }

        this.gameStats = new GameStats(skillData);

        this.worldContainer = this.add.container(0, 0);
        this.uiContainer = this.add.container(0, 0);

        // Renderer 초기화
        this.gameRenderer = new GameRenderer(this, this.worldContainer, this.uiContainer, this.gameStats, this.spiralCenter);

        // ResourceManager 초기화
        this.resourceManager = new ResourceManager(this, this.gameStats, this.gameRenderer, this.worldContainer, this.spiralCenter);

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
        this.gameStats.on(GameStats.EVENTS.SKILL_UPGRADED, this.updateSpawnTimer, this);
        
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }
    }

    private setupPhysics() {
        const resources = this.resourceManager.getGroup();
        
        this.physics.add.collider(resources, resources, (obj1, obj2) => {
            const r1 = obj1 as any;
            this.gameRenderer.emitCollisionSpark(r1.x, r1.y);
            
            const angle = Utils.getAngle(r1.x, r1.y, (obj2 as any).x, (obj2 as any).y);
            const pushForce = PHYSICS_CONFIG.PUSH_FORCE;
            r1.body.velocity.x -= Math.cos(angle) * pushForce;
            r1.body.velocity.y -= Math.sin(angle) * pushForce;
            (obj2 as any).body.velocity.x += Math.cos(angle) * pushForce;
            (obj2 as any).body.velocity.y += Math.sin(angle) * pushForce;
        });

        (this.physics.world as any).OVERLAP_BIAS = PHYSICS_CONFIG.OVERLAP_BIAS;
    }

    private setupTimers() {
        this.spawnTimer = this.time.addEvent({ 
            delay: Math.max(100, RESOURCE_CONFIG.SPAWN_INTERVAL_BASE / (this.gameStats.spawnRateFactor || 1)), 
            callback: () => this.resourceManager.spawnResource(), 
            callbackScope: this, 
            loop: true 
        });
        
        this.time.addEvent({ 
            delay: 8000, 
            callback: () => this.resourceManager.spawnWhiteHole(), 
            callbackScope: this, 
            loop: true 
        });

        this.time.addEvent({ 
            delay: DURATIONS.SPECIAL_ITEM_SPAWN, 
            callback: () => this.resourceManager.spawnSpecialItem(), 
            callbackScope: this, 
            loop: true 
        });
    }

    private updateSpawnTimer() {
        if (this.spawnTimer) {
            this.spawnTimer.remove();
        }
        this.spawnTimer = this.time.addEvent({
            delay: Math.max(100, RESOURCE_CONFIG.SPAWN_INTERVAL_BASE / (this.gameStats.spawnRateFactor || 1)),
            callback: () => this.resourceManager.spawnResource(),
            callbackScope: this,
            loop: true
        });
    }

    private setupUI(skillData: any) {
        const infoText = this.add.text(20, 20, '', { fontSize: '18px', color: '#00ffff', fontStyle: 'bold' }).setScrollFactor(0);
        this.uiContainer.add(infoText);

        this.skillTreeUI = new SkillTreeUI(this, this.uiContainer, this.gameStats, skillData);

        this.gameStats.on(GameStats.EVENTS.UPDATE_SCORE, () => {
            const current = `[ WOOD: ${this.gameStats.collected.wood} ]  [ ROCK: ${this.gameStats.collected.rock} ]  [ IRON: ${this.gameStats.collected.iron} ]`;
            const total = `(TOTAL - W: ${this.gameStats.totalCollected.wood} R: ${this.gameStats.totalCollected.rock} I: ${this.gameStats.totalCollected.iron})`;
            const stats = `Radius: ${Math.floor(this.gameStats.radius)} | Arms: ${this.gameStats.maxArms} | Speed: ${this.gameStats.armSpeedFactor.toFixed(1)}x`;
            infoText.setText(`${current}\n${total} | ${stats}`);
        });

        this.gameStats.once(GameStats.EVENTS.COLORS_UNLOCKED, () => {
            this.cameras.main.flash(1000, 255, 255, 255);
            this.resourceManager.getGroup().getChildren().forEach(child => (child as any).clearTint());
        });

        this.gameStats.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    private handleInput(pointer: Phaser.Input.Pointer) {
        const activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
        if (activeArmsCount >= this.gameStats.maxArms) return;

        const arm = this.arms.find(a => a.state === 'idle');
        if (!arm) return;

        let closest: Collectible | null = null;
        let minDistance = 200;

        this.resourceManager.getGroup().getChildren().forEach(child => {
            const res = child as Collectible;
            if (!res.active || this.arms.some(a => a.grabbedResource === res)) return;
            const dist = Utils.getDistance(pointer.worldX, pointer.worldY, res.x, res.y);
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

        // 자동 그물 로직
        if (this.gameStats.isNetEnabled) {
            this.netTimerAccumulator += delta;
            if (this.netTimerAccumulator >= DURATIONS.NET_COOLDOWN) {
                this.fireNet(this.input.activePointer.worldX, this.input.activePointer.worldY, DURATIONS.NET_DISTANCE);
                this.netTimerAccumulator = 0;
            }
        }

        // 화이트 홀 로직 위임
        this.resourceManager.updateWhiteHoles(time);

        // 로봇팔 업데이트
        this.gameRenderer.clearArmGraphics();
        this.arms.forEach(arm => arm.update(delta, this.gameRenderer, this.collectResource.bind(this)));

        // 자동 로봇팔 로직
        if (this.gameStats.isAutoArmEnabled) {
            const activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
            if (activeArmsCount < this.gameStats.maxArms) {
                this.arms.forEach(arm => {
                    if (arm.state === 'idle' && time > arm.lastFireTime + DURATIONS.ARM_AUTO_FIRE_COOLDOWN) {
                        let bestHighDim: Collectible | null = null;
                        let bestNormal: Collectible | null = null;
                        let minHighDimDist = 400;
                        let minNormalDist = 400;

                        this.resourceManager.getGroup().getChildren().forEach((child) => {
                            const collectible = child as Collectible;
                            if (!collectible.active || this.arms.some(a => a.grabbedResource === collectible)) return;

                            const distance = Utils.getDistance(this.spiralCenter.x, this.spiralCenter.y, collectible.x, collectible.y);
                            const isHighDim = (collectible as any).isHighDim || false;

                            if (isHighDim) {
                                if (distance < minHighDimDist) { minHighDimDist = distance; bestHighDim = collectible; }
                            } else {
                                if (distance < minNormalDist) { minNormalDist = distance; bestNormal = collectible; }
                            }
                        });

                        const targetResource = bestHighDim || bestNormal;
                        if (targetResource) arm.fire(targetResource, time);
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

        this.resourceManager.getGroup().getChildren().forEach(child => {
            const res = child as any;
            if (!res.active || this.arms.some(a => a.grabbedResource === res)) return;

            if (res.itemType === 'special') {
                if (Utils.getDistance(res.x, res.y, this.spiralCenter.x, this.spiralCenter.y) > 1200) res.destroy();
                return;
            }

            const dist = Utils.getDistance(res.x, res.y, this.spiralCenter.x, this.spiralCenter.y);
            if (dist < effectiveRadius) {
                this.applyGravity(res, dist, effectiveRadius);
            }

            const collectionRadius = res.isHighDim ? RESOURCE_CONFIG.COLLECTION_RADIUS.HIGH_DIM : RESOURCE_CONFIG.COLLECTION_RADIUS.NORMAL;
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
        const force = (1 - (dist / radius)) * this.gameStats.force * PHYSICS_CONFIG.ACCEL_BASE;
        const boost = dist < 150 ? Math.pow((150 - dist) / 150, 2) * 5 : 0;
        const accel = force * (1 + boost);
        const spiral = 0.2 * Math.pow(dist / radius, 2);

        res.body.velocity.x += (dir.x * accel + tangent.x * accel * spiral);
        res.body.velocity.y += (dir.y * accel + tangent.y * accel * spiral);

        if (dist < 150) res.body.setDrag(PHYSICS_CONFIG.DRAG_BASE * res.body.mass);
        else res.body.setDrag(0);
    }

    private limitSpeed(res: any, dist: number) {
        const min = dist < 100 ? PHYSICS_CONFIG.MIN_SPEED_NEAR_CENTER : PHYSICS_CONFIG.MIN_SPEED_NORMAL;
        const max = PHYSICS_CONFIG.MAX_SPEED;
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
        this.gameRenderer.emitCollectionParticles(collectible.x, collectible.y, isHighDim, this.resourceManager.getParticleTint(collectible));
        
        this.gameStats.addCollected(collectible.resourceType, isHighDim ? RESOURCE_CONFIG.HIGH_DIM_MULTIPLIER : 1);
        
        if (byArm && this.gameStats.researchReduction > 0) {
            this.gameStats.reduceResearchTime(this.gameStats.researchReduction);
        }
        
        if (!this.gameStats.isColorUnlocked) this.gameStats.unlockColors();

        collectible.destroy();
    }

    private fireNet(targetX: number, targetY: number, distance: number) {
        this.gameRenderer.drawNet(this.spiralCenter.x, this.spiralCenter.y, targetX, targetY, distance);

        const angleToTarget = Utils.getAngle(this.spiralCenter.x, this.spiralCenter.y, targetX, targetY);
        const spread = Math.PI / 4;

        this.resourceManager.getGroup().getChildren().forEach((child) => {
            const res = child as any;
            if (!res.active) return;

            const dist = Utils.getDistance(res.x, res.y, this.spiralCenter.x, this.spiralCenter.y);
            if (dist > distance) return;

            const angleToRes = Utils.getAngle(this.spiralCenter.x, this.spiralCenter.y, res.x, res.y);
            const diff = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(angleToTarget), Phaser.Math.RadToDeg(angleToRes));

            if (Math.abs(diff) <= Phaser.Math.RadToDeg(spread) / 2) {
                res.body.setEnable(false);
                this.tweens.add({
                    targets: res,
                    x: this.spiralCenter.x,
                    y: this.spiralCenter.y,
                    duration: DURATIONS.NET_PULL, 
                    ease: 'Power2',
                    onComplete: () => { if (res.active) this.collectResource(res, true); }
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

        if (item.specialType === 'whitehole') this.resourceManager.spawnWhiteHole(undefined, undefined, true);
        else if (item.specialType === 'boost') this.triggerRadiusBoost();
        
        item.destroy();
        this.cameras.main.shake(100, 0.005);
    }

    private triggerRadiusBoost() {
        this.tweens.killTweensOf(this);
        if (this.boostTimerEvent) this.boostTimerEvent.remove();

        this.radiusMultiplier = 2.0;
        this.boostTimerEvent = this.time.delayedCall(DURATIONS.RADIUS_BOOST, () => {
            this.tweens.add({ targets: this, radiusMultiplier: 1.0, duration: DURATIONS.RADIUS_BOOST_SHRINK, ease: 'Power1' });
            this.boostTimerEvent = undefined;
        });
    }
}
