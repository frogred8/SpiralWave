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
            
            // 2. 스킬 데이터 셔플 및 12개 선택
            const shuffledSkills = Phaser.Utils.Array.Shuffle([...skillData]).slice(0, 12);
            
            // 3. 스킬에 위치 할당 및 초기 Prerequisites 제거
            shuffledSkills.forEach((skill: any, index: number) => {
                const pos = positions[index];
                skill.tree = pos.tree;
                skill.row = pos.row;
                skill.prerequisites = []; // 기존 의존성 초기화
            });

            // 4. 새로운 Prerequisites 생성 로직
            for(let r=1; r<4; r++) {
                // 이 row에 있는 스킬들
                const currentRows = shuffledSkills.filter((s: any) => s.row === r);
                // 바로 위 row에 있는 스킬들
                const upperRows = shuffledSkills.filter((s: any) => s.row === r - 1);
                
                // 해당 row에서 랜덤하게 하나 선택하여 추가 의존성(2개)을 부여할 대상 선정
                const multiPrereqIndex = Phaser.Math.Between(0, currentRows.length - 1);

                currentRows.forEach((skill: any, index: number) => {
                    // 기본 규칙: 자신의 바로 위 tree의 스킬을 선행 조건으로 포함
                    const directUpper = upperRows.find((s: any) => s.tree === skill.tree);
                    if (directUpper && !skill.prerequisites.some((p: any) => p.id === directUpper.id)) {
                        skill.prerequisites.push({ id: directUpper.id, level: 1 });
                    }

                    // 랜덤 규칙: row마다 하나는 이웃한 tree의 상위 스킬을 추가로 포함 (이웃: 인덱스 차이가 1)
                    if (index === multiPrereqIndex) {
                        const otherUpper = upperRows.filter((s: any) => 
                            Math.abs(s.tree - skill.tree) === 1 && 
                            !skill.prerequisites.some((p: any) => p.id === s.id)
                        );
                        if (otherUpper.length > 0) {
                            const randomUpper = Phaser.Utils.Array.GetRandom(otherUpper) as any;
                            skill.prerequisites.push({ id: randomUpper.id, level: 1 });
                        }
                    }
                });

                // 마지막 row(r=3)인 경우, 추가로 이웃한 tree의 연결 하나 더 생성 (기존에 연결 가능한 대상이 있는지 확인)
                if (r === 3) {
                    const potentialSkills = currentRows.filter((skill: any) => 
                        upperRows.some((up: any) => 
                            Math.abs(up.tree - skill.tree) === 1 && 
                            !skill.prerequisites.some((p: any) => p.id === up.id)
                        )
                    );

                    if (potentialSkills.length > 0) {
                        const randomSkill = Phaser.Utils.Array.GetRandom(potentialSkills) as any;
                        const otherUpper = upperRows.filter((s: any) => 
                            Math.abs(s.tree - randomSkill.tree) === 1 && 
                            !randomSkill.prerequisites.some((p: any) => p.id === s.id)
                        );
                        const extraUpper = Phaser.Utils.Array.GetRandom(otherUpper) as any;
                        randomSkill.prerequisites.push({ id: extraUpper.id, level: 1 });
                    }
                }
            }
            // 업데이트된 스킬 데이터로 교체
            skillData = shuffledSkills;
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
        this.syncArmsCount();

        this.cameras.add(0, 0, width, height).setName('UI').ignore(this.worldContainer);
        this.cameras.main.ignore(this.uiContainer);

        this.setupPhysics();
        this.setupTimers();
        this.setupUI(skillData);

        this.input.on('pointerdown', this.handleInput, this);
        this.gameStats.on(GameStats.EVENTS.SKILL_UPGRADED, (skillId: string) => {
            this.updateSpawnTimer();
            this.syncArmsCount();
        }, this);
        
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

        this.time.addEvent({ 
            delay: DURATIONS.METEOR_INTERVAL, 
            callback: () => this.resourceManager.spawnMeteor(), 
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

    private syncArmsCount() {
        while (this.arms.length < this.gameStats.maxArms) {
            this.arms.push(new RoboticArm(this, this.gameStats, this.spiralCenter));
        }
    }

    private setupUI(skillData: any) {
        // 상단 스탯 패널 구성
        const panelX = 50;
        const panelY = 15;
        const panelWidth = 380; // 스킬 트리 영역(World X 430)에 맞춤
        const panelHeight = 55;

        const statsContainer = this.add.container(panelX, panelY).setScrollFactor(0);
        
        // 배경 (어두운 금속/돌 느낌)
        const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a1a, 0.95)
            .setStrokeStyle(2, 0x444444)
            .setOrigin(0);
        
        // 텍스트 스타일 정의
        const labelStyle = { fontSize: '12px', color: '#888888', fontStyle: 'bold' };
        const valueStyle = { fontSize: '14px', color: '#00ffff', fontStyle: 'bold' };
        const totalStyle = { fontSize: '11px', color: '#aaaaaa' };

        // 리소스 표시
        const woodLabel = this.add.text(15, 8, 'WOOD', labelStyle);
        const woodValue = this.add.text(15, 22, '0', valueStyle);
        const rockLabel = this.add.text(85, 8, 'ROCK', labelStyle);
        const rockValue = this.add.text(85, 22, '0', valueStyle);
        
        // 총 수집 및 시간
        const totalText = this.add.text(165, 10, 'TOTAL: 0', totalStyle);
        const rateText = this.add.text(165, 25, '10s: 0', totalStyle);
        const timeText = this.add.text(165, 40, 'TIME: 00:00', totalStyle);

        // 기타 스탯 (반지름, 팔 개수 등)
        const gameStatsText = this.add.text(280, 10, '', { fontSize: '11px', color: '#00ff00', lineSpacing: 4 });

        statsContainer.add([bg, woodLabel, woodValue, rockLabel, rockValue, totalText, rateText, timeText, gameStatsText]);
        this.uiContainer.add(statsContainer);

        this.skillTreeUI = new SkillTreeUI(this, this.uiContainer, this.gameStats, skillData);

        const updateInfo = () => {
            woodValue.setText(this.gameStats.collected.wood.toString());
            rockValue.setText(this.gameStats.collected.rock.toString());
            
            totalText.setText(`TOTAL: ${this.gameStats.totalAll}`);
            rateText.setText(`10s: ${this.gameStats.getRecentCollectionAmount()}`);
            timeText.setText(`TIME: ${this.gameStats.getFormattedPlaytime()}`);
            
            const stats = `Radius: ${Math.floor(this.gameStats.radius)}\nArms: ${this.gameStats.maxArms}\nSpeed: ${this.gameStats.armSpeedFactor.toFixed(1)}x`;
            gameStatsText.setText(stats);
        };

        this.gameStats.on(GameStats.EVENTS.UPDATE_SCORE, updateInfo);
        
        // 1초마다 갱신 (최근 10초 획득량 갱신용)
        this.time.addEvent({
            delay: 1000,
            callback: updateInfo,
            loop: true
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
            
            // 기모으기 표시: 발사 3초 전부터 (DURATIONS.NET_COOLDOWN - 3000ms)
            const chargeStartTime = Math.max(0, DURATIONS.NET_COOLDOWN - 3000);
            if (this.netTimerAccumulator >= chargeStartTime) {
                const chargeProgress = (this.netTimerAccumulator - chargeStartTime) / 3000;
                this.gameRenderer.drawNetCharge(this.input.activePointer.worldX, this.input.activePointer.worldY, DURATIONS.NET_DISTANCE, chargeProgress);
            } else {
                this.gameRenderer.clearNetCharge();
            }

            if (this.netTimerAccumulator >= DURATIONS.NET_COOLDOWN) {
                this.gameRenderer.clearNetCharge();
                this.fireNet(this.input.activePointer.worldX, this.input.activePointer.worldY, DURATIONS.NET_DISTANCE);
                this.netTimerAccumulator = 0;
            }
        } else {
            this.gameRenderer.clearNetCharge();
            this.netTimerAccumulator = 0;
        }

        // 화이트 홀 로직 위임
        this.resourceManager.updateWhiteHoles(time);

        // 로봇팔 업데이트
        this.gameRenderer.clearArmGraphics();
        this.arms.forEach(arm => arm.update(delta, this.gameRenderer, this.collectResource.bind(this)));

        // 자동 로봇팔 로직
        if (this.gameStats.isAutoArmEnabled) {
            let activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
            if (activeArmsCount < this.gameStats.maxArms) {
                for (const arm of this.arms) {
                    // console.log(`${this.arms.length},Arm state: ${arm.state}, Last fire: ${arm.lastFireTime}, Current time: ${time}`);
                    if (activeArmsCount >= this.gameStats.maxArms) break;

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
                        if (targetResource) {
                            arm.fire(targetResource, time);
                            activeArmsCount++;
                        }
                    }
                }
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
            if (!res.active || this.arms.some(a => a.grabbedResource === res) || res.isBeingPulled) return;

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
        const spread = Phaser.Math.DegToRad(this.gameStats.netAngle);

        this.resourceManager.getGroup().getChildren().forEach((child) => {
            const res = child as any;
            if (!res.active) return;

            const dist = Utils.getDistance(res.x, res.y, this.spiralCenter.x, this.spiralCenter.y);
            if (dist > distance) return;

            const angleToRes = Utils.getAngle(this.spiralCenter.x, this.spiralCenter.y, res.x, res.y);
            const diff = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(angleToTarget), Phaser.Math.RadToDeg(angleToRes));

            if (Math.abs(diff) <= Phaser.Math.RadToDeg(spread) / 2) {
                res.body.setEnable(false);
                res.isBeingPulled = true;
                const startX = res.x;
                const startY = res.y;
                
                this.tweens.addCounter({
                    from: 0,
                    to: 1,
                    duration: DURATIONS.NET_PULL,
                    ease: 'Power2',
                    onUpdate: (tween) => {
                        if (res.active) {
                            const progress = (tween as any).getValue() ?? 0;
                            // 시작 위치와 실시간 spiralCenter 위치 사이를 보간하여 자원을 이동시킴
                            res.x = startX + (this.spiralCenter.x - startX) * progress;
                            res.y = startY + (this.spiralCenter.y - startY) * progress;
                        }
                    },
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
