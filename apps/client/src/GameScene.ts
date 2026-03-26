import Phaser from 'phaser';
import { GameStats } from '@shared/GameStats';
import { GameRenderer } from './GameRenderer';
import { RoboticArm } from './RoboticArm';
import { DURATIONS, RESOURCE_CONFIG, PHYSICS_CONFIG, LIMITS } from '@shared/Constants';
import { Utils } from '@shared/Utils';
import { ResourceManager } from './ResourceManager';
import { SpecialItem, Collectible, StartRequest, EndRequest, RankEntry, LeaderboardResponse } from '@repo/shared';
import { SoundManager } from './SoundManager';
import skillTreeData from '@shared/SKILLTREE.json';
import { UIManager } from './UIManager';

export class GameScene extends Phaser.Scene {
    private spiralCenter!: Phaser.Math.Vector2;
    private worldContainer!: Phaser.GameObjects.Container;
    private uiContainer!: Phaser.GameObjects.Container;
    private topUiContainer!: Phaser.GameObjects.Container;
    private gameStats!: GameStats;
    private gameRenderer!: GameRenderer;
    private resourceManager!: ResourceManager;
    private uiManager!: UIManager;
    private arms: RoboticArm[] = [];
    private uiUpdateTimer?: Phaser.Time.TimerEvent;
    
    private radiusMultiplier: number = 1.0;
    private boostTimerEvent?: Phaser.Time.TimerEvent;
    private spawnTimer!: Phaser.Time.TimerEvent;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private netTimerAccumulator: number = 0;
    private isGameStarted: boolean = false;
    private isRestarted: boolean = false;
    private canReroll: boolean = false;
    private specialItemTimer?: Phaser.Time.TimerEvent;
    private currentGameId: string = '';
    private currentSelectSkillId: number = 0;
    private userInfo: { ip: string; emoji: string }|null = null;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        this.spiralCenter = new Phaser.Math.Vector2(width / 2, height / 2);

        SoundManager.getInstance().play('background');

        const skillData = this.initGameStats();
        this.initContainers();
        
        // UI Manager 초기화
        this.uiManager = new UIManager(this, this.uiContainer, this.topUiContainer, this.gameStats, {
            onStartGame: () => this.startGame(),
            onRestartGame: (canReroll) => this.restartGame(canReroll),
            onSendStartSignal: (id) => this.sendStartGameSignal(id),
            onSendEndSignal: (name, msg) => this.sendEndGameSignal(name, msg),
            onFetchLeaderboard: () => this.fetchLeaderboardData(),
            onRefreshUI: () => this.handleRefreshUI()
        });

        this.initSystems(skillData);
        this.initCameras(width, height);

        this.setupPhysics();
        this.setupUI(skillData);
        this.uiManager.showInitialSkillSelection(skillData, [], null, this.isRestarted, this.canReroll);

        this.scale.on('resize', this.handleResize, this);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }
    }

    private handleRefreshUI() {
        // 카메라 설정 다시 적용 (ignore 등)
        const { width, height } = this.scale;
        this.initCameras(width, height);
        this.gameStats.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    private initGameStats(): any[] {
        // 스킬 트리 데이터 복제 (원본 데이터 수정을 방지하기 위해 딥 카피)
        let skillData = JSON.parse(JSON.stringify(skillTreeData));
        
        // 스킬 트리 랜덤 배치 로직
        if (skillData) {
            skillData = Utils.generateRandomSkillTree(skillData);
        }

        this.gameStats = new GameStats(skillData);
        return skillData;
    }

    private initContainers() {
        this.worldContainer = this.add.container(0, 0);
        this.uiContainer = this.add.container(0, 0);
        this.topUiContainer = this.add.container(0, 0).setDepth(10000);
    }

    private initSystems(skillData: any[]) {
        // Renderer 초기화
        this.gameRenderer = new GameRenderer(this, this.worldContainer, this.uiContainer, this.gameStats, this.spiralCenter);

        // ResourceManager 초기화
        this.resourceManager = new ResourceManager(this, this.gameStats, this.gameRenderer, this.worldContainer, this.spiralCenter);

        // 로봇팔 초기화
        this.arms = [];
        this.syncArmsCount();
    }

    private initCameras(width: number, height: number) {
        let uiCam = this.cameras.getCamera('UI');
        if (!uiCam) {
            uiCam = this.cameras.add(0, 0, width, height).setName('UI');
        }
        uiCam.ignore([this.worldContainer]);
        this.cameras.main.ignore([this.uiContainer, this.topUiContainer]);
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;
        
        // 중앙 좌표 업데이트
        this.spiralCenter.set(width / 2, height / 2);
        this.gameRenderer.updateSpiralPosition();

        // UI Manager 리사이즈 처리
        if (this.uiManager) {
            this.uiManager.handleResize();
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
        // 기존 타이머가 있다면 제거 (재시작 시 대비)
        if (this.spawnTimer) this.spawnTimer.remove();
        
        this.spawnTimer = this.time.addEvent({ 
            delay: Math.max(100, RESOURCE_CONFIG.SPAWN_INTERVAL_BASE / (this.gameStats.spawnRateFactor || 1)), 
            callback: () => this.resourceManager.spawnResource(), 
            callbackScope: this, 
            loop: true 
        });
        
        this.time.addEvent({ 
            delay: DURATIONS.WHITE_HOLE_SPAWN, 
            callback: () => this.resourceManager.spawnWhiteHole(), 
            callbackScope: this, 
            loop: true 
        });

        this.updateSpecialItemTimer();

        this.time.addEvent({ 
            delay: DURATIONS.METEOR_INTERVAL, 
            callback: () => this.resourceManager.spawnMeteor(), 
            callbackScope: this, 
            loop: true 
        });

        this.scheduleSmallBlackHoleSpawn();
    }

    private scheduleSmallBlackHoleSpawn() {
        this.time.delayedCall(DURATIONS.SMALL_BLACK_HOLE_SPAWN, () => {
            // 게임이 실행 중이고 종료되지 않은 경우에만 스폰 시도
            if (this.isGameStarted && !this.gameStats.isGameOver && !this.gameStats.isBoosterCalculating) {
                const count = this.gameStats.smallBlackHoleCount;
                let spawnDelay = 0;
                for (let i = 0; i < count; i++) {
                    const delay = Phaser.Math.Between(DURATIONS.SMALL_BLACK_HOLE_DELAY_MIN, DURATIONS.SMALL_BLACK_HOLE_DELAY_MAX);
                    spawnDelay += delay;
                    this.time.delayedCall(spawnDelay, () => this.resourceManager.spawnSmallBlackHole());
                }
            }
            // 다음 스폰 예약 (게임 오버 시에는 중지)
            if (!this.gameStats.isGameOver) {
                this.scheduleSmallBlackHoleSpawn();
            }
        });
    }

    private startGame() {
        this.gameStats.startGame();
        this.setupTimers();
        this.isGameStarted = true;
        SoundManager.getInstance().play('gamestart');
    }

    private async sendStartGameSignal(skillId: number) {
        this.currentSelectSkillId = skillId;
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        if (!serverUrl) return;

        try {
            if (!this.userInfo) {
                this.userInfo = await Utils.getUserInfo();
            }
            const body: StartRequest = { select_skill_id: skillId, ip: this.userInfo.ip };
            const response = await fetch(`${serverUrl}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (data.game_id) {
                this.currentGameId = data.game_id;
            }
        } catch (err) {
            console.error('Failed to send start signal:', err);
        }
    }

    private async sendEndGameSignal(name: string, msg: string) {
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        if (!serverUrl) return;

        try {
            // Get IP and emoji from external service
            if (!this.userInfo) {
                this.userInfo = await Utils.getUserInfo();
            }
            name = name.length > LIMITS.END_NAME_LENGTH ? name.substring(0, LIMITS.END_NAME_LENGTH) : name;
            msg = msg.length > LIMITS.END_MSG_LENGTH ? msg.substring(0, LIMITS.END_MSG_LENGTH) : msg;
            const body: EndRequest = {
                game_id: this.currentGameId,
                select_skill_id: this.currentSelectSkillId,
                name: name,
                score: this.gameStats.totalAll,
                msg: msg,
                emoji: this.userInfo.emoji,
                ip: this.userInfo.ip
            };

            await fetch(`${serverUrl}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (err) {
            console.error('Failed to send end signal:', err);
        }
    }

    private restartGame(canReroll: boolean = false) {
        const { width, height } = this.scale;
        this.cleanupForRestart();
        
        const skillData = this.resetGameStats(width, height);
        
        this.isGameStarted = false;
        this.isRestarted = true;
        this.canReroll = canReroll;
        
        this.uiManager.showInitialSkillSelection(skillData, [], null, this.isRestarted, this.canReroll);
        this.uiManager.refreshUIAfterLanguageChange();
    }

    private cleanupForRestart() {
        this.resourceManager.clear();
        this.time.removeAllEvents();
        this.tweens.killAll();
        this.arms.forEach(arm => arm.reset());
        this.radiusMultiplier = 1.0;
        this.netTimerAccumulator = 0;
        if (this.boostTimerEvent) {
            this.boostTimerEvent.remove();
            this.boostTimerEvent = undefined;
        }
    }

    private resetGameStats(width: number, height: number): any[] {
        this.spiralCenter.set(width / 2, height / 2);
        this.gameRenderer.updateSpiralPosition();

        let skillData = JSON.parse(JSON.stringify(skillTreeData));
        if (skillData) {
            skillData = Utils.generateRandomSkillTree(skillData);
        }
        this.gameStats.reset(skillData);
        return skillData;
    }

    private updateSpecialItemTimer() {
        if (this.specialItemTimer) this.specialItemTimer.remove();
        this.specialItemTimer = this.time.addEvent({ 
            delay: this.gameStats.specialItemInterval, 
            callback: () => this.resourceManager.spawnSpecialItem(), 
            callbackScope: this, 
            loop: true 
        });
    }

    private updateSpawnTimer() {
        if (this.spawnTimer) {
            this.spawnTimer.remove();
        }
        const effectiveSpawnFactor = (this.gameStats.spawnRateFactor || 1) * (this.gameStats.timeSpawnMultiplier || 1);
        this.spawnTimer = this.time.addEvent({
            delay: Math.max(100, RESOURCE_CONFIG.SPAWN_INTERVAL_BASE / effectiveSpawnFactor),
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
        this.uiManager.setupMainUI();
        this.uiManager.setupSkillTree(skillData);

        this.setupGameStatsListeners();
        this.setupInputListeners();

        if (this.uiUpdateTimer) this.uiUpdateTimer.remove();
        this.uiUpdateTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.isGameStarted && !this.gameStats.isGameOver) {
                    this.gameStats.emit(GameStats.EVENTS.UPDATE_SCORE);
                }
            },
            loop: true
        });

        this.cameras.main.flash(1000, 255, 255, 255);
        this.gameStats.emit(GameStats.EVENTS.UPDATE_SCORE);
        this.uiManager.restoreUIState();
    }

    private setupGameStatsListeners() {
        this.gameStats.removeAllListeners(GameStats.EVENTS.SKILL_UPGRADED);
        this.gameStats.removeAllListeners(GameStats.EVENTS.GAME_OVER);
        this.gameStats.removeAllListeners(GameStats.EVENTS.CALCULATE_BOOSTER);
        this.gameStats.removeAllListeners(GameStats.EVENTS.SPAWN_RATE_CHANGED);
        this.gameStats.removeAllListeners(GameStats.EVENTS.SPECIAL_ITEM_INTERVAL_CHANGED);
        this.gameStats.removeAllListeners('resourceCollected');
        this.gameStats.removeAllListeners('worldResourceCollected');

        this.gameStats.on(GameStats.EVENTS.SKILL_UPGRADED, () => {
            this.updateSpawnTimer();
            this.syncArmsCount();
            SoundManager.getInstance().play('skilllevelup');
        }, this);
        
        this.gameStats.on(GameStats.EVENTS.GAME_OVER, () => {
            if (this.gameStats.totalAll > 1) this.uiManager.showInputForm();
            else this.uiManager.showGameOverScreen();
        }, this);

        this.gameStats.on(GameStats.EVENTS.CALCULATE_BOOSTER, () => {
            this.physics.pause();
            if (this.spawnTimer) this.spawnTimer.paused = true;
            this.uiManager.updateTimerDisplay(this.time.now, true); // This might need a separate call for bonus time style

            this.uiManager.getSkillTreeUI()?.playBoosterAnimation((addedTime) => {
                this.gameStats.addBoosterTime(addedTime);
                this.physics.resume();
                if (this.spawnTimer) this.spawnTimer.paused = false;
            });
        }, this);

        this.gameStats.on(GameStats.EVENTS.SPAWN_RATE_CHANGED, () => this.updateSpawnTimer(), this);
        this.gameStats.on(GameStats.EVENTS.SPECIAL_ITEM_INTERVAL_CHANGED, () => this.updateSpecialItemTimer(), this);

        // 자원 획득 시 플로팅 텍스트 표시
        this.gameStats.on('resourceCollected', (type: string, amount: number) => {
            const x = type === 'wood' ? 45 : 135;
            const fontSize = amount > 1 ? '21px' : '14px';
            this.uiManager.showFloatingText(50 + x, 15 + (55 / 2) - 20, `+${amount}`, '#00ff00', false, fontSize, this.worldContainer);
        }, this);

        this.gameStats.on('worldResourceCollected', (data: { type: string, amount: number, x: number, y: number }) => {
            const fontSize = data.amount > 1 ? '21px' : '14px';
            this.uiManager.showFloatingText(data.x, data.y - 20, `+${data.amount}`, '#00ff00', true, fontSize, this.worldContainer);
        }, this);
    }

    private setupInputListeners() {
        this.input.off('pointerdown');
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
            if (gameObjects.length > 0) return;
            this.handleInput(pointer);
        }, this);
    }

    private findBestArmTarget(originX: number, originY: number, searchRadius: number): Collectible | null {
        let bestTarget: Collectible | null = null;
        let bestPriority = -1; // 2: Special, 1: HighDim, 0: Normal
        let minDistance = searchRadius;

        this.resourceManager.getGroup().getChildren().forEach(child => {
            const res = child as Collectible;
            if (!res.active || this.arms.some(a => a.grabbedResource === res)) return;
            
            const dist = Utils.getDistance(originX, originY, res.x, res.y);
            if (dist > minDistance) return;

            let priority = 0;
            if (res.itemType === 'special') priority = 2;
            else if (res.isHighDim) priority = 1;

            if (priority > bestPriority) {
                bestPriority = priority;
                minDistance = dist;
                bestTarget = res;
            } else if (priority === bestPriority && dist < minDistance) {
                minDistance = dist;
                bestTarget = res;
            }
        });

        return bestTarget;
    }

    private handleInput(pointer: Phaser.Input.Pointer) {
        if (this.arms.filter(a => a.state !== 'idle').length >= this.gameStats.maxArms) return;

        const arm = this.arms.find(a => a.state === 'idle');
        if (!arm) return;

        const bestTarget = this.findBestArmTarget(pointer.worldX, pointer.worldY, 300);
        if (bestTarget) arm.fire(bestTarget, this.time.now);
    }

    update(time: number, delta: number) {
        if (!this.isGameStarted || this.gameStats.isGameOver || this.gameStats.isBoosterCalculating) {
            if (this.gameStats.isGameOver) {
                this.gameRenderer.clearArmGraphics();
                this.uiManager.setGameOverTimerStyle();
            }
            return;
        }

        const cappedDelta = Math.min(delta, 1000);
        this.gameStats.update(cappedDelta);
        
        this.uiManager.updateTimerDisplay(time, this.isGameStarted);
        this.handleBlackHoleMovement();
        this.updateAutoNet(cappedDelta);
        this.resourceManager.updateWhiteHoles(time);
        this.updateArms(cappedDelta);
        this.updateAutoArms(time);

        this.gameRenderer.drawBoundaries(this.radiusMultiplier);
        this.processResources();
    }

    private handleBlackHoleMovement() {
        if (!this.cursors) return;
        const moveSpeed = this.gameStats.moveSpeed;
        if (this.cursors.left.isDown) this.spiralCenter.x -= moveSpeed;
        if (this.cursors.right.isDown) this.spiralCenter.x += moveSpeed;
        if (this.cursors.up.isDown) this.spiralCenter.y -= moveSpeed;
        if (this.cursors.down.isDown) this.spiralCenter.y += moveSpeed;
        
        this.spiralCenter.x = Phaser.Math.Clamp(this.spiralCenter.x, 50, this.scale.width - 50);
        this.spiralCenter.y = Phaser.Math.Clamp(this.spiralCenter.y, 50, this.scale.height - 50);
        this.gameRenderer.updateSpiralPosition();
    }

    private updateAutoNet(delta: number) {
        if (!this.gameStats.isNetEnabled) {
            this.gameRenderer.clearNetCharge();
            this.netTimerAccumulator = 0;
            return;
        }

        this.netTimerAccumulator += delta;
        const chargeStartTime = Math.max(0, DURATIONS.NET_COOLDOWN - 3000);
        
        if (this.netTimerAccumulator >= chargeStartTime) {
            const chargeProgress = (this.netTimerAccumulator - chargeStartTime) / 3000;
            this.gameRenderer.drawNetCharge(this.input.activePointer.worldX, this.input.activePointer.worldY, this.gameStats.netDistance, chargeProgress);
        } else {
            this.gameRenderer.clearNetCharge();
        }

        if (this.netTimerAccumulator >= DURATIONS.NET_COOLDOWN) {
            this.gameRenderer.clearNetCharge();
            this.fireNet(this.input.activePointer.worldX, this.input.activePointer.worldY, this.gameStats.netDistance);
            this.netTimerAccumulator = 0;
        }
    }

    private updateArms(delta: number) {
        this.gameRenderer.clearArmGraphics();
        this.arms.forEach(arm => arm.update(delta, this.gameRenderer, this.collectResource.bind(this)));
    }

    private updateAutoArms(time: number) {
        if (!this.gameStats.isAutoArmEnabled) return;
        const idleArms = this.arms.filter(a => a.state === 'idle' && time > a.lastFireTime + DURATIONS.ARM_AUTO_FIRE_COOLDOWN);
        for (const arm of idleArms) {
            if (this.arms.filter(a => a.state !== 'idle').length >= this.gameStats.maxArms) break;
            const bestTarget = this.findBestArmTarget(this.spiralCenter.x, this.spiralCenter.y, 600);
            if (bestTarget) arm.fire(bestTarget, time);
        }
    }

    private getCurrentRadius() {
        return this.gameStats.radius * this.radiusMultiplier;
    }

    private processResources() {
        const effectiveRadius = this.getCurrentRadius();
        const centerX = this.spiralCenter.x, centerY = this.spiralCenter.y;
        const screenLimit = Math.max(1200, this.scale.width, this.scale.height);

        this.resourceManager.getGroup().getChildren().forEach(child => {
            const res = child as any;
            if (!res.active || this.arms.some(a => a.grabbedResource === res) || res.isBeingPulled) return;

            const dist = Utils.getDistance(res.x, res.y, centerX, centerY);
            if (res.itemType === 'special') {
                if (dist > screenLimit) res.destroy();
                return;
            }

            if (dist < effectiveRadius) {
                Utils.applyGravityToPoint(res, dist, effectiveRadius, centerX, centerY, this.gameStats.force, PHYSICS_CONFIG.ACCEL_BASE, PHYSICS_CONFIG.DRAG_BASE);
            }

            const collectionRadius = res.isHighDim ? RESOURCE_CONFIG.COLLECTION_RADIUS.HIGH_DIM : RESOURCE_CONFIG.COLLECTION_RADIUS.NORMAL;
            if (dist < collectionRadius) {
                this.collectResource(res);
                return;
            }

            // 작은 블랙홀 중력 및 수집
            let collectedBySBH = false;
            this.resourceManager.getSmallBlackHoles().forEach(sbh => {
                if (!res.active || collectedBySBH) return;
                const sbhDist = Utils.getDistance(res.x, res.y, sbh.x, sbh.y);
                const sbhRadius = this.gameStats.smallBlackHoleRadius * sbh.scale;
                if (sbhDist < sbhRadius) {
                    Utils.applyGravityToPoint(res, sbhDist, sbhRadius, sbh.x, sbh.y, this.gameStats.force, PHYSICS_CONFIG.ACCEL_BASE, PHYSICS_CONFIG.DRAG_BASE);
                }
                if (sbhDist < 30 * sbh.scale) {
                    this.collectResource(res, false, false, sbh.x, sbh.y);
                    collectedBySBH = true;
                }
            });

            if (!collectedBySBH) {
                if (dist > screenLimit) res.destroy();
                else Utils.limitSpeed(res, dist, PHYSICS_CONFIG.MIN_SPEED_NEAR_CENTER, PHYSICS_CONFIG.MIN_SPEED_NORMAL, PHYSICS_CONFIG.MAX_SPEED);
            }
        });
    }

    private async fetchLeaderboardData(): Promise<RankEntry[]> {
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        if (!serverUrl) return [];

        try {
            const response = await fetch(`${serverUrl}/leaderboard`);
            const data: LeaderboardResponse = await response.json();
            return data.ranks || [];
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            return [];
        }
    }

    private collectResource(collectible: any, byArm: boolean = false, byNet: boolean = false, centerX?: number, centerY?: number, silent: boolean = false) {
        if (!collectible.active) return;

        if (collectible.itemType === 'special') {
            this.handleSpecialItem(collectible, byArm, byNet, silent);
            return;
        }

        const isHighDim = collectible.isHighDim || false;
        this.gameRenderer.emitCollectionParticles(collectible.x, collectible.y, isHighDim, this.resourceManager.getParticleTint(collectible), centerX, centerY);
        
        if (!silent) SoundManager.getInstance().play('gather');
        
        const amount = isHighDim ? RESOURCE_CONFIG.HIGH_DIM_MULTIPLIER : 1;
        this.gameStats.addCollected(collectible.resourceType, amount, collectible.x, collectible.y);
        
        if (byArm && this.gameStats.researchReduction > 0) {
            this.gameStats.reduceResearchTime(this.gameStats.researchReduction);
        }
        
        collectible.destroy();
    }

    private fireNet(targetX: number, targetY: number, distance: number) {
        this.gameRenderer.drawNet(this.spiralCenter.x, this.spiralCenter.y, targetX, targetY, distance);

        const angleToTarget = Utils.getAngle(this.spiralCenter.x, this.spiralCenter.y, targetX, targetY);
        const spread = Phaser.Math.DegToRad(this.gameStats.netAngle);
        let hasPlayedSound = false;

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
                            const silent = hasPlayedSound;
                            if (!silent) hasPlayedSound = true;
                            this.collectResource(res, false, true, undefined, undefined, silent); 
                        }
                    }
                });
            }
        });
    }

    private handleSpecialItem(item: SpecialItem, byArm: boolean, byNet: boolean, silent: boolean = false) {
        // 팔이나 그물로 직접 획득한 경우가 아니면 발동하지 않음 (단순 흡수는 파괴만 됨)
        if (!byArm && !byNet) {
            item.destroy();
            this.cameras.main.shake(100, 0.005);
            return;
        }

        if (!silent) SoundManager.getInstance().play('specialitem');

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
