import Phaser from 'phaser';
import { I18n } from '@shared/I18n';
import { GameStats } from '@shared/GameStats';
import { SkillTreeUI } from './SkillTreeUI';
import { GameRenderer } from './GameRenderer';
import { RoboticArm } from './RoboticArm';
import { DURATIONS, RESOURCE_CONFIG, PHYSICS_CONFIG, INITIAL_STATS } from '@shared/Constants';
import { Utils } from '@shared/Utils';
import { ResourceManager } from './ResourceManager';
import { Resource, SpecialItem, Collectible } from '@shared/Types';
import { SoundManager } from './SoundManager';
import skillTreeData from '@shared/SKILLTREE.json';

export class GameScene extends Phaser.Scene {
    private spiralCenter!: Phaser.Math.Vector2;
    private worldContainer!: Phaser.GameObjects.Container;
    private uiContainer!: Phaser.GameObjects.Container;
    private gameStats!: GameStats;
    private skillTreeUI!: SkillTreeUI;
    private gameRenderer!: GameRenderer;
    private resourceManager!: ResourceManager;
    private arms: RoboticArm[] = [];
    private languageButtons: Phaser.GameObjects.Container[] = [];
    private isLanguageMenuOpen: boolean = false;
    
    private radiusMultiplier: number = 1.0;
    private boostTimerEvent?: Phaser.Time.TimerEvent;
    private spawnTimer!: Phaser.Time.TimerEvent;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private netTimerAccumulator: number = 0;
    private isGameStarted: boolean = false;
    private isRestarted: boolean = false;
    private canReroll: boolean = false;
    private timerText!: Phaser.GameObjects.Text;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        this.spiralCenter = new Phaser.Math.Vector2(width / 2, height / 2);

        // 배경음악 재생 (루프 설정은 SoundManager에서 이미 되어 있음)
        SoundManager.getInstance().play('background');

        // 스킬 트리 데이터 복제 (원본 데이터 수정을 방지하기 위해 딥 카피)
        let skillData = JSON.parse(JSON.stringify(skillTreeData));
        
        // 스킬 트리 랜덤 배치 로직
        if (skillData) {
            skillData = Utils.generateRandomSkillTree(skillData);
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
        this.setupUI(skillData);
        this.showInitialSkillSelection(skillData);

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

    private showInitialSkillSelection(skillData: any[], excludeSkillIds: string[] = []) {
        const { width, height } = this.scale;

        // 딤드 배경
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
            .setOrigin(0).setInteractive().setDepth(2000);
        this.uiContainer.add(overlay);

        const title = this.add.text(width / 2, height / 2 - 200, I18n.t('ui.choose_starting_skill'), {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(2001);
        this.uiContainer.add(title);

        // 첫 번째 또는 두 번째 row의 스킬들 중에서 2개 랜덤 선택 (제외 목록 반영)
        const candidateSkills = skillData.filter(s => s.row <= 1 && !excludeSkillIds.includes(s.id));
        const selectedSkills = Phaser.Utils.Array.Shuffle([...candidateSkills]).slice(0, 2);
        const currentSelectionIds = selectedSkills.map(s => s.id);

        // 다시 시작한 경우 1회에 한해 다시 뽑기 버튼 제공
        if (this.isRestarted && this.canReroll) {
            const rerollBtn = this.add.container(width / 2, height / 2 + 250).setDepth(2001);
            const rerollBg = this.add.rectangle(0, 0, 160, 45, 0x333333, 0.9)
                .setStrokeStyle(2, 0x00ff00)
                .setInteractive({ useHandCursor: true });
            const rerollText = this.add.text(0, 0, I18n.t('ui.reroll'), {
                fontSize: '18px',
                color: '#00ff00',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            rerollBtn.add([rerollBg, rerollText]);
            this.uiContainer.add(rerollBtn);

            rerollBg.on('pointerover', () => rerollBg.setFillStyle(0x444444));
            rerollBg.on('pointerout', () => rerollBg.setFillStyle(0x333333));
            rerollBg.on('pointerdown', () => {
                this.canReroll = false;
                SoundManager.getInstance().play('reroll');
                // 현재 선택 UI 제거
                this.uiContainer.iterate((child: any) => {
                    if (child && child.depth >= 2000) child.destroy();
                });
                // 현재 선택된 스킬들을 제외하고 다시 생성
                this.showInitialSkillSelection(skillData, currentSelectionIds);
            });
        }

        selectedSkills.forEach((skill, index) => {            const x = width / 2 + (index === 0 ? -180 : 180);
            const y = height / 2 + 20;
            
            const btn = this.add.container(x, y).setDepth(2001);
            
            // 어둡고 거친 금속 느낌의 배경
            const bg = this.add.rectangle(0, 0, 280, 320, 0x1a1a1a, 0.95)
                .setStrokeStyle(3, 0x444444)
                .setInteractive({ useHandCursor: true });
            
            // 스킬 이름 (I18n 활용)
            const skillName = I18n.t(`skill.${skill.id}.name`) || skill.id;
            const nameText = this.add.text(0, -100, skillName, {
                fontSize: '24px',
                color: '#00ff00',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: 240 }
            }).setOrigin(0.5);

            // 효과 설명
            const desc = I18n.t(`skill.${skill.id}.desc`) || '';
            const descText = this.add.text(0, 0, desc, {
                fontSize: '18px',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 8,
                wordWrap: { width: 240 }
            }).setOrigin(0.5);

            // 클릭 유도 텍스트
            const hintText = this.add.text(0, 110, 'CLICK TO SELECT', {
                fontSize: '14px',
                color: '#aaaaaa',
                fontStyle: 'italic'
            }).setOrigin(0.5);

            btn.add([bg, nameText, descText, hintText]);
            this.uiContainer.add(btn);

            bg.on('pointerover', () => {
                bg.setStrokeStyle(4, 0x00ff00);
                this.tweens.add({ targets: btn, scale: 1.05, duration: 200, ease: 'Back.easeOut' });
            });
            bg.on('pointerout', () => {
                bg.setStrokeStyle(3, 0x444444);
                this.tweens.add({ targets: btn, scale: 1.0, duration: 200, ease: 'Back.easeOut' });
            });
            bg.on('pointerdown', () => {
                this.gameStats.grantSkill(skill);
                SoundManager.getInstance().play('skillupgrade');
                this.startGame();
                
                // 선택 UI 제거 애니메이션
                this.tweens.add({
                    targets: [overlay, title, btn],
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        overlay.destroy();
                        title.destroy();
                        // 모든 선택 버튼 제거
                        this.uiContainer.iterate((child: any) => {
                            if (child && child.depth >= 2000) child.destroy();
                        });
                    }
                });
                
                // 다른 버튼도 페이드 아웃
                this.uiContainer.iterate((child: any) => {
                    if (child && child.depth >= 2001 && child !== btn) {
                        this.tweens.add({ targets: child, alpha: 0, duration: 300 });
                    }
                });
            });
        });
    }

    private startGame() {
        this.gameStats.startGame();
        this.setupTimers();
        this.isGameStarted = true;
        this.timerText.setVisible(true);
        SoundManager.getInstance().play('gamestart');
    }

    private showGameOverScreen() {
        const { width, height } = this.scale;
        
        SoundManager.getInstance().play('winning');
        
        // 타이머 정지 효과
        this.timerText.setAlpha(1);
        
        // 딤드 배경
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85)
            .setOrigin(0).setInteractive().setDepth(3000);
        this.uiContainer.add(overlay);

        const title = this.add.text(width / 2, height / 2 - 120, I18n.t('ui.game_over'), {
            fontSize: '64px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(3001);
        this.uiContainer.add(title);

        const resourceInfo = this.add.text(width / 2, height / 2, `${I18n.t('ui.total_resources')}\n${this.gameStats.totalAll}`, {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 15
        }).setOrigin(0.5).setDepth(3001);
        this.uiContainer.add(resourceInfo);

        // 다시하기 버튼
        const restartBtn = this.add.container(width / 2, height / 2 + 150).setDepth(3001);
        const btnBg = this.add.rectangle(0, 0, 250, 60, 0x222222, 0.9)
            .setStrokeStyle(3, 0x444444)
            .setInteractive({ useHandCursor: true });
        
        const btnText = this.add.text(0, 0, I18n.t('ui.restart'), {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        restartBtn.add([btnBg, btnText]);
        this.uiContainer.add(restartBtn);

        btnBg.on('pointerover', () => btnBg.setStrokeStyle(4, 0x00ff00));
        btnBg.on('pointerout', () => btnBg.setStrokeStyle(3, 0x444444));
        btnBg.on('pointerdown', () => {
            SoundManager.getInstance().play('restart');
            this.restartGame();
            overlay.destroy();
            title.destroy();
            resourceInfo.destroy();
            restartBtn.destroy();
        });

        // 결과창 등장 애니메이션
        restartBtn.setScale(0);
        this.tweens.add({
            targets: restartBtn,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut',
            delay: 1000
        });
    }

    private restartGame() {
        const { width, height } = this.scale;

        // 모든 리소스 및 화이트홀 제거
        this.resourceManager.clear();
        
        // 모든 타이머 제거
        this.time.removeAllEvents();

        // 진행 중인 모든 트윈 제거 (운석 등)
        this.tweens.killAll();

        // 블랙홀 좌표 초기화
        this.spiralCenter.set(width / 2, height / 2);
        this.gameRenderer.updateSpiralPosition();

        // 로봇팔 상태 초기화
        this.arms.forEach(arm => arm.reset());

        // 기타 게임 상태 초기화
        this.radiusMultiplier = 1.0;
        this.netTimerAccumulator = 0;
        if (this.boostTimerEvent) {
            this.boostTimerEvent.remove();
            this.boostTimerEvent = undefined;
        }

        // 타이머 텍스트 초기화
        this.timerText.setVisible(false).setColor('#ffffff').setAlpha(1);

        // 스탯 초기화 (새로운 스킬 트리 랜덤 배치 포함)
        let skillData = JSON.parse(JSON.stringify(skillTreeData));
        if (skillData) {
            skillData = Utils.generateRandomSkillTree(skillData);
        }
        this.gameStats.reset(skillData);
        
        // 게임 상태 초기화
        this.isGameStarted = false;
        this.isRestarted = true;
        this.canReroll = true;
        
        // UI 갱신 (리셋된 스탯 반영)
        // refreshUIAfterLanguageChange는 내부적으로 skillTreeUI.skillTreeData를 쓰므로, 
        // 여기서 직접 setupUI를 호출하거나, skillTreeUI를 먼저 갱신해야 함
        this.uiContainer.removeAll(true);
        this.languageButtons = [];
        this.setupUI(skillData);
        
        // 초기 스킬 선택 다시 표시
        this.showInitialSkillSelection(skillData);
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
        const { width, height } = this.scale;

        // 중앙 타이머 텍스트 생성 (setupUI로 이동하여 리셋 시 재생성되도록 함)
        this.timerText = this.add.text(width / 2, 40, this.gameStats.getFormattedRemainingTime(), {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(this.isGameStarted);
        this.uiContainer.add(this.timerText);

        // 이전 리스너 제거 (중복 방지)
        this.gameStats.removeAllListeners(GameStats.EVENTS.UPDATE_SCORE);
        this.gameStats.removeAllListeners('resourceCollected');
        this.gameStats.removeAllListeners('worldResourceCollected');
        this.gameStats.removeAllListeners(GameStats.EVENTS.SKILL_UPGRADED);
        this.gameStats.removeAllListeners(GameStats.EVENTS.GAME_OVER);

        this.gameStats.on(GameStats.EVENTS.SKILL_UPGRADED, (skillId: string) => {
            this.updateSpawnTimer();
            this.syncArmsCount();
            SoundManager.getInstance().play('skilllevelup');
        }, this);
        
        this.gameStats.on(GameStats.EVENTS.GAME_OVER, () => {
            this.showGameOverScreen();
        }, this);

        this.gameStats.on(GameStats.EVENTS.CALCULATE_BOOSTER, () => {
            // 게임 일시 정지
            this.physics.pause();
            if (this.spawnTimer) this.spawnTimer.paused = true;
            
            // 중앙 텍스트 안내 추가 가능 (예: "부스터 시간 계산 중...")
            this.timerText.setText('BONUS TIME!').setColor('#ffff00').setAlpha(1);

            this.skillTreeUI.playBoosterAnimation((addedTime) => {
                this.gameStats.addBoosterTime(addedTime);
                this.physics.resume();
                if (this.spawnTimer) this.spawnTimer.paused = false;
                
                // 만약 추가된 시간이 없으면 바로 게임 오버 처리되도록 update가 돌게 됨
            });
        }, this);

        this.gameStats.on(GameStats.EVENTS.SPAWN_RATE_CHANGED, () => {
            this.updateSpawnTimer();
        }, this);

        // 입력 리스너 (create에서 1회만 등록해도 되지만, setupUI에서 관리 효율을 위해 체크)
        this.input.off('pointerdown');
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
            if (gameObjects.length > 0) return;
            this.handleInput(pointer);
        }, this);

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
        const iconStyle = { fontSize: '20px' };
        const valueStyle = { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' };
        const totalStyle = { fontSize: '11px', color: '#aaaaaa' };

        // 리소스 표시 (아이콘 + 수치) - Y축 중앙 정렬 (패널 높이 55 기준)
        const woodIcon = this.add.text(15, panelHeight / 2, RESOURCE_CONFIG.ICONS.wood, iconStyle).setOrigin(0, 0.5);
        const woodValue = this.add.text(45, panelHeight / 2, '0', valueStyle).setOrigin(0, 0.5);
        const rockIcon = this.add.text(105, panelHeight / 2, RESOURCE_CONFIG.ICONS.rock, iconStyle).setOrigin(0, 0.5);
        const rockValue = this.add.text(135, panelHeight / 2, '0', valueStyle).setOrigin(0, 0.5);
        
        // 총 수집 및 시간
        const totalText = this.add.text(195, 10, `${I18n.t('stats.total')}: 0`, totalStyle);
        const rateText = this.add.text(195, 25, `${I18n.t('stats.rate')}: 0`, totalStyle);
        const timeText = this.add.text(195, 40, `${I18n.t('stats.time')}: 00:00`, totalStyle);

        // 기타 스탯 (반지름, 팔 개수 등)
        const gameStatsText = this.add.text(300, 10, '', { fontSize: '11px', color: '#00ff00', lineSpacing: 4 });

        statsContainer.add([bg, woodIcon, woodValue, rockIcon, rockValue, totalText, rateText, timeText, gameStatsText]);
        this.uiContainer.add(statsContainer);

        // 언어 선택 UI (우측 상단)
        this.setupLanguageSelector();

        // 기존 SkillTreeUI가 있다면 리스너 제거
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
        }
        this.skillTreeUI = new SkillTreeUI(this, this.uiContainer, this.gameStats, skillData);

        const updateInfo = () => {
            woodValue.setText(this.gameStats.collected.wood.toString());
            rockValue.setText(this.gameStats.collected.rock.toString());
            
            totalText.setText(`${I18n.t('stats.total')}: ${this.gameStats.totalAll}`);
            rateText.setText(`${I18n.t('stats.rate')}: ${this.gameStats.getRecentCollectionAmount()}`);
            timeText.setText(`${I18n.t('stats.time')}: ${this.gameStats.getFormattedPlaytime()}`);
            
            const stats = `${I18n.t('stats.radius')}: ${Math.floor(this.gameStats.radius)}\n${I18n.t('stats.arms')}: ${this.gameStats.maxArms}\n${I18n.t('stats.speed')}: ${this.gameStats.armSpeedFactor.toFixed(1)}x`;
            gameStatsText.setText(stats);
        };

        this.gameStats.on(GameStats.EVENTS.UPDATE_SCORE, updateInfo);
        
        // 자원 획득 시 플로팅 텍스트 표시 (UI 패널용)
        this.gameStats.on('resourceCollected', (type: string, amount: number) => {
            const x = type === 'wood' ? 45 : 135;
            const fontSize = amount > 1 ? '21px' : '14px';
            this.showFloatingText(panelX + x, panelY + (panelHeight / 2) - 20, `+${amount}`, '#00ff00', false, fontSize);
        });

        // 월드 공간 자원 획득 시 플로팅 텍스트 표시 (흡수 지점용)
        this.gameStats.on('worldResourceCollected', (data: { type: string, amount: number, x: number, y: number }) => {
            const fontSize = data.amount > 1 ? '21px' : '14px';
            this.showFloatingText(data.x, data.y - 20, `+${data.amount}`, '#00ff00', true, fontSize);
        });
        
        // 1초마다 갱신 (최근 10초 획득량 갱신용)
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.isGameStarted && !this.gameStats.isGameOver) {
                    updateInfo();
                }
            },
            loop: true
        });

        // 시작 시 번쩍이는 효과
        this.cameras.main.flash(1000, 255, 255, 255);

        this.gameStats.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    private setupLanguageSelector() {
        const languages: { code: string, label: string }[] = [
            { code: 'ko', label: '🇰🇷 KO' },
            { code: 'en', label: '🇺🇸 EN' },
            { code: 'zh', label: '🇨🇳 ZH' },
            { code: 'ja', label: '🇯🇵 JA' }
        ];

        const btnWidth = 70;
        const btnHeight = 25;
        const startX = this.scale.width - 20 - btnWidth;
        const startY = 15;

        // 현재 선택된 언어 표시용 메인 버튼
        const currentLang = languages.find(l => l.code === I18n.getLanguage()) || languages[0];
        const mainBtn = this.add.container(startX, startY);
        const mainBg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x1a1a1a, 0.95)
            .setStrokeStyle(1, 0x444444)
            .setOrigin(0);
        const mainText = this.add.text(btnWidth / 2 - 5, btnHeight / 2, currentLang.label, { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
        const arrow = this.add.text(btnWidth - 15, btnHeight / 2, this.isLanguageMenuOpen ? '▲' : '▼', { fontSize: '10px', color: '#aaaaaa' }).setOrigin(0.5);
        
        mainBtn.add([mainBg, mainText, arrow]);
        mainBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
        this.uiContainer.add(mainBtn);

        // 드롭다운 메뉴용 컨테이너
        const menuContainer = this.add.container(startX, startY + btnHeight + 2).setVisible(this.isLanguageMenuOpen);
        this.uiContainer.add(menuContainer);

        languages.forEach((lang, index) => {
            const itemY = index * (btnHeight + 1);
            const item = this.add.container(0, itemY);
            
            const isCurrent = I18n.getLanguage() === lang.code;
            const itemBg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x222222, 0.95)
                .setStrokeStyle(1, isCurrent ? 0x00ff00 : 0x444444)
                .setOrigin(0);
            
            const itemText = this.add.text(btnWidth / 2, btnHeight / 2, lang.label, {
                fontSize: '12px',
                color: isCurrent ? '#00ff00' : '#ffffff',
                fontStyle: isCurrent ? 'bold' : 'normal'
            }).setOrigin(0.5);

            item.add([itemBg, itemText]);
            item.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
            
            item.on('pointerdown', () => {
                if (I18n.getLanguage() !== lang.code) {
                    I18n.setLanguage(lang.code as any);
                    this.isLanguageMenuOpen = false;
                    this.refreshUIAfterLanguageChange();
                } else {
                    this.isLanguageMenuOpen = false;
                    menuContainer.setVisible(false);
                    arrow.setText('▼');
                }
            });

            item.on('pointerover', () => itemBg.setStrokeStyle(1, 0xaaaaaa));
            item.on('pointerout', () => itemBg.setStrokeStyle(1, isCurrent ? 0x00ff00 : 0x444444));

            menuContainer.add(item);
        });

        // 메인 버튼 클릭 시 메뉴 토글
        mainBtn.on('pointerdown', () => {
            this.isLanguageMenuOpen = !this.isLanguageMenuOpen;
            menuContainer.setVisible(this.isLanguageMenuOpen);
            arrow.setText(this.isLanguageMenuOpen ? '▲' : '▼');
        });

        mainBtn.on('pointerover', () => mainBg.setStrokeStyle(1, 0xaaaaaa));
        mainBtn.on('pointerout', () => mainBg.setStrokeStyle(1, 0x444444));
    }

    private refreshUIAfterLanguageChange() {
        const currentSkillData = this.skillTreeUI ? this.skillTreeUI.skillTreeData : this.cache.json.get('skillTreeData');
        
        // UI 컨테이너 초기화
        this.uiContainer.removeAll(true);
        this.languageButtons = [];
        
        // UI 재생성 (현재 셔플된 상태 유지)
        this.setupUI(currentSkillData);
    }




    private handleInput(pointer: Phaser.Input.Pointer) {
        const activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
        if (activeArmsCount >= this.gameStats.maxArms) return;

        const arm = this.arms.find(a => a.state === 'idle');
        if (!arm) return;

        let bestTarget: Collectible | null = null;
        let bestPriority = -1; // 2: Special, 1: HighDim, 0: Normal
        let minDistance = 300; // 200 * 1.5

        this.resourceManager.getGroup().getChildren().forEach(child => {
            const res = child as Collectible;
            if (!res.active || this.arms.some(a => a.grabbedResource === res)) return;
            
            const dist = Utils.getDistance(pointer.worldX, pointer.worldY, res.x, res.y);
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

        if (bestTarget) arm.fire(bestTarget, this.time.now);
    }

    update(time: number, delta: number) {
        // 게임 시작 전이거나 부스터 계산 중이거나 게임 오버면 업데이트 중지
        if (!this.isGameStarted || this.gameStats.isGameOver || this.gameStats.isBoosterCalculating) {
            if (this.gameStats.isGameOver) {
                this.gameRenderer.clearArmGraphics();
                this.timerText.setText('00:00').setColor('#ff0000');
            }
            return;
        }

        // 1초(1000ms) 이상의 delta값은 무조건 1초만 누적
        const cappedDelta = Math.min(delta, 1000);

        this.gameStats.update(cappedDelta);
        this.timerText.setText(this.gameStats.getFormattedRemainingTime());
        
        if (this.gameStats.isBoosterTime) {
            // 부스터 시간 중에는 타이머를 노란색으로 표시하고 깜빡임 효과 유지
            this.timerText.setColor('#ffff00');
            this.timerText.setAlpha(Math.floor(time / 500) % 2 === 0 ? 1 : 0.5);
        } else if (this.gameStats.getRemainingTime() < 30) {
            // 정규 시간이 얼마 안 남았을 때 빨간색으로 변경
            this.timerText.setColor('#ff0000');
            this.timerText.setAlpha(Math.floor(time / 500) % 2 === 0 ? 1 : 0.5);
        } else {
            this.timerText.setColor('#ffffff').setAlpha(1);
        }

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
            this.netTimerAccumulator += cappedDelta;
            
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
        this.arms.forEach(arm => arm.update(cappedDelta, this.gameRenderer, this.collectResource.bind(this)));

        // 자동 로봇팔 로직
        if (this.gameStats.isAutoArmEnabled) {
            let activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
            if (activeArmsCount < this.gameStats.maxArms) {
                for (const arm of this.arms) {
                    if (activeArmsCount >= this.gameStats.maxArms) break;

                    if (arm.state === 'idle' && time > arm.lastFireTime + DURATIONS.ARM_AUTO_FIRE_COOLDOWN) {
                        let bestTarget: Collectible | null = null;
                        let bestPriority = -1;
                        let minDistance = 600; // 400 * 1.5

                        this.resourceManager.getGroup().getChildren().forEach((child) => {
                            const collectible = child as Collectible;
                            if (!collectible.active || this.arms.some(a => a.grabbedResource === collectible)) return;

                            const distance = Utils.getDistance(this.spiralCenter.x, this.spiralCenter.y, collectible.x, collectible.y);
                            if (distance > minDistance) return;

                            let priority = 0;
                            if (collectible.itemType === 'special') priority = 2;
                            else if (collectible.isHighDim) priority = 1;

                            if (priority > bestPriority) {
                                bestPriority = priority;
                                minDistance = distance;
                                bestTarget = collectible;
                            } else if (priority === bestPriority && distance < minDistance) {
                                minDistance = distance;
                                bestTarget = collectible;
                            }
                        });

                        if (bestTarget) {
                            arm.fire(bestTarget, time);
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

            // 작은 블랙홀 중력 적용
            this.resourceManager.getSmallBlackHoles().forEach(sbh => {
                if (!res.active) return;
                const sbhDist = Utils.getDistance(res.x, res.y, sbh.x, sbh.y);
                const sbhRadius = 150 * sbh.scale; // 축소 중일 때 반지름도 줄어듦
                if (sbhDist < sbhRadius) {
                    this.applyGravityToPoint(res, sbhDist, sbhRadius, sbh.x, sbh.y);
                }
            });

            const collectionRadius = res.isHighDim ? RESOURCE_CONFIG.COLLECTION_RADIUS.HIGH_DIM : RESOURCE_CONFIG.COLLECTION_RADIUS.NORMAL;
            if (dist < collectionRadius) {
                this.collectResource(res);
            } else {
                // 작은 블랙홀 수집 체크
                let collectedBySBH = false;
                this.resourceManager.getSmallBlackHoles().forEach(sbh => {
                    if (!res.active || collectedBySBH) return;
                    const sbhDist = Utils.getDistance(res.x, res.y, sbh.x, sbh.y);
                    // 작은 블랙홀의 수집 반경 (기본 30)
                    if (sbhDist < 30 * sbh.scale) {
                        this.collectResource(res, false, false, sbh.x, sbh.y);
                        collectedBySBH = true;
                    }
                });

                if (!collectedBySBH) {
                    if (dist > 1200) {
                        res.destroy();
                    } else {
                        this.limitSpeed(res, dist);
                    }
                }
            }
        });
    }

    private applyGravity(res: any, dist: number, radius: number) {
        this.applyGravityToPoint(res, dist, radius, this.spiralCenter.x, this.spiralCenter.y);
    }

    private applyGravityToPoint(res: any, dist: number, radius: number, targetX: number, targetY: number) {
        const dir = new Phaser.Math.Vector2(targetX - res.x, targetY - res.y).normalize();
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

    private collectResource(collectible: any, byArm: boolean = false, byNet: boolean = false, centerX?: number, centerY?: number) {
        if (!collectible.active) return;

        if (collectible.itemType === 'special') {
            SoundManager.getInstance().play('gather');
            this.handleSpecialItem(collectible, byArm, byNet);
            return;
        }

        const isHighDim = collectible.isHighDim || false;
        this.gameRenderer.emitCollectionParticles(collectible.x, collectible.y, isHighDim, this.resourceManager.getParticleTint(collectible), centerX, centerY);
        
        SoundManager.getInstance().play('gather');
        
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
                            this.collectResource(res, false, true); 
                        }
                    }
                });
            }
        });
    }

    private handleSpecialItem(item: SpecialItem, byArm: boolean, byNet: boolean) {
        // 팔이나 그물로 직접 획득한 경우가 아니면 발동하지 않음 (단순 흡수는 파괴만 됨)
        if (!byArm && !byNet) {
            item.destroy();
            this.cameras.main.shake(100, 0.005);
            return;
        }

        if (item.specialType === 'whitehole') this.resourceManager.spawnWhiteHole(undefined, undefined, true);
        else if (item.specialType === 'boost') this.triggerRadiusBoost();
        
        item.destroy();
        this.cameras.main.shake(100, 0.005);
    }

    private showFloatingText(x: number, y: number, text: string, color: string, isInWorld: boolean = false, fontSize: string = '14px') {
        const ft = this.add.text(x, y, text, { fontSize, color, fontStyle: 'bold' }).setDepth(100);
        
        if (isInWorld) {
            this.worldContainer.add(ft);
        } else {
            ft.setScrollFactor(0);
            this.uiContainer.add(ft);
        }

        this.tweens.add({
            targets: ft,
            y: y - 30,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.easeOut',
            onComplete: () => ft.destroy()
        });
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
