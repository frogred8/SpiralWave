import Phaser from 'phaser';
import { I18n } from '@shared/I18n';
import { GameStats } from '@shared/GameStats';
import { SkillTreeUI } from './SkillTreeUI';
import { GameRenderer } from './GameRenderer';
import { RoboticArm } from './RoboticArm';
import { DURATIONS, RESOURCE_CONFIG, PHYSICS_CONFIG, INITIAL_STATS } from '@shared/Constants';
import { Utils } from '@shared/Utils';
import { ResourceManager } from './ResourceManager';
import { SpecialItem, Collectible, StartRequest, EndRequest, RankEntry, LeaderBoardResponse } from '@repo/shared';
import { SoundManager } from './SoundManager';
import skillTreeData from '@shared/SKILLTREE.json';

interface UIState {
    overlay: 'initialSkill' | 'inputForm' | 'gameOver' | null;
    initialSkillData?: any[];
    excludeSkillIds?: string[];
    selectedInitialSkills?: any[];
    leaderBoardRanks?: RankEntry[];
}

export class GameScene extends Phaser.Scene {
    private spiralCenter!: Phaser.Math.Vector2;
    private worldContainer!: Phaser.GameObjects.Container;
    private uiContainer!: Phaser.GameObjects.Container;
    private topUiContainer!: Phaser.GameObjects.Container;
    private gameStats!: GameStats;
    private skillTreeUI!: SkillTreeUI;
    private gameRenderer!: GameRenderer;
    private resourceManager!: ResourceManager;
    private arms: RoboticArm[] = [];
    private isLanguageMenuOpen: boolean = false;
    private langSelectorContainer!: Phaser.GameObjects.Container;
    private langMenuContainer!: Phaser.GameObjects.Container;
    private soundBtnContainer!: Phaser.GameObjects.Container;
    private statsContainer!: Phaser.GameObjects.Container;
    private uiUpdateTimer?: Phaser.Time.TimerEvent;
    
    private radiusMultiplier: number = 1.0;
    private boostTimerEvent?: Phaser.Time.TimerEvent;
    private spawnTimer!: Phaser.Time.TimerEvent;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private netTimerAccumulator: number = 0;
    private isGameStarted: boolean = false;
    private isRestarted: boolean = false;
    private canReroll: boolean = false;
    private timerText!: Phaser.GameObjects.Text;
    private specialItemTimer?: Phaser.Time.TimerEvent;
    private currentGameId: string = '';
    private currentSelectSkillId: number = 0;

    private currentUIState: UIState = { overlay: null };
    private activeDOMElement: Phaser.GameObjects.DOMElement | null = null;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        this.spiralCenter = new Phaser.Math.Vector2(width / 2, height / 2);

        SoundManager.getInstance().play('background');

        const skillData = this.initGameStats();
        this.initContainers();
        this.initSystems(skillData);
        this.initCameras(width, height);

        this.setupPhysics();
        this.setupUI(skillData);
        this.showInitialSkillSelection(skillData);

        this.scale.on('resize', this.handleResize, this);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }
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
        this.cameras.add(0, 0, width, height).setName('UI')
            .ignore([this.worldContainer]);
        this.cameras.main.ignore([this.uiContainer, this.topUiContainer]);
    }

    private updateUIPositions() {
        const { width } = this.scale;
        const btnWidth = 70;
        const btnHeight = 25;
        const startX = width - 20 - btnWidth;
        const startY = 15;

        if (this.langSelectorContainer) {
            this.langSelectorContainer.setPosition(startX, startY);
        }

        if (this.langMenuContainer) {
            this.langMenuContainer.setPosition(startX, startY + btnHeight + 2);
        }

        if (this.soundBtnContainer) {
            // 언어 메뉴가 열려 있으면 메뉴의 높이만큼 사운드 버튼을 아래로 내림
            // 언어 4개 * (버튼 높이 25 + 간격 1) = 104px
            const menuOffset = this.isLanguageMenuOpen ? (btnHeight + 1) * 4 + 5 : 0;
            this.soundBtnContainer.setPosition(startX, startY + btnHeight + 5 + menuOffset);
        }
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;
        
        // 중앙 좌표 업데이트
        this.spiralCenter.set(width / 2, height / 2);
        this.gameRenderer.updateSpiralPosition();

        // UI 위치 업데이트
        if (this.timerText) {
            this.timerText.setPosition(width / 2, 40);
        }

        this.updateUIPositions();

        // 스탯 컨테이너는 왼쪽 상단 고정이므로 별도 이동 불필요 (필요시 추가)
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

    private showInitialSkillSelection(skillData: any[], excludeSkillIds: string[] = [], preservedSkills: any[] | null = null) {
        this.currentUIState.overlay = 'initialSkill';
        this.currentUIState.initialSkillData = skillData;
        this.currentUIState.excludeSkillIds = excludeSkillIds;
        
        if (preservedSkills) {
            this.currentUIState.selectedInitialSkills = preservedSkills;
        }
        
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

        // 스킬 선택 로직: 보존된 데이터가 있으면 그것을 사용, 없으면 새로 생성
        let selectedSkills = preservedSkills;
        if (!selectedSkills) {
            const candidateSkills = skillData.filter(s => s.row <= 1 && !excludeSkillIds.includes(s.id));
            selectedSkills = Phaser.Utils.Array.Shuffle([...candidateSkills]).slice(0, 2);
            this.currentUIState.selectedInitialSkills = selectedSkills;
        }
        
        const currentSelectionIds = selectedSkills.map(s => s.id);

        // 다시 시작한 경우 1회에 한해 다시 뽑기 버튼 제공
        if (this.isRestarted && this.canReroll) {
            this.createRerollButton(width, height, skillData, currentSelectionIds);
        }

        selectedSkills.forEach((skill, index) => {
            const x = width / 2 + (index === 0 ? -180 : 180);
            const y = height / 2 + 20;
            this.createSkillCard(x, y, skill, overlay, title);
        });
    }

    private createRerollButton(width: number, height: number, skillData: any[], currentSelectionIds: string[]) {
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
            // 현재 선택된 스킬들을 제외하고 다시 생성 (null을 넘겨 새 랜덤 추출 유도)
            this.showInitialSkillSelection(skillData, currentSelectionIds, null);
        });
    }

    private createSkillCard(x: number, y: number, skill: any, overlay: Phaser.GameObjects.Rectangle, title: Phaser.GameObjects.Text) {
        const btn = this.add.container(x, y).setDepth(2001);
        const bg = this.add.rectangle(0, 0, 280, 320, 0x1a1a1a, 0.95)
            .setStrokeStyle(3, 0x444444)
            .setInteractive({ useHandCursor: true });
        
        const skillName = I18n.t(`skill.${skill.id}.name`) || skill.id;
        const nameText = this.add.text(0, -100, skillName, {
            fontSize: '24px',
            color: '#00ff00',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 240 }
        }).setOrigin(0.5).setPadding({ top: 4, bottom: 4 });

        const desc = I18n.t(`skill.${skill.id}.desc`) || '';
        const descText = this.add.text(0, 0, desc, {
            fontSize: '18px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: 240 }
        }).setOrigin(0.5).setPadding({ top: 4, bottom: 4 });

        const hintText = this.add.text(0, 110, I18n.t('ui.click_to_select'), {
            fontSize: '14px', color: '#aaaaaa', fontStyle: 'italic'
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
            this.handleInitialSkillSelection(skill, btn, overlay, title);
        });
    }

    private handleInitialSkillSelection(skill: any, btn: Phaser.GameObjects.Container, overlay: Phaser.GameObjects.Rectangle, title: Phaser.GameObjects.Text) {
        this.gameStats.grantSkill(skill);
        SoundManager.getInstance().play('skillupgrade');
        
        const skillIndex = (skillTreeData as any[]).findIndex((s: any) => s.id === skill.id);
        this.sendStartGameSignal(skillIndex);
        this.startGame();
        
        this.tweens.add({
            targets: [overlay, title, btn],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                overlay.destroy();
                title.destroy();
                this.uiContainer.iterate((child: any) => {
                    if (child && child.depth >= 2000) child.destroy();
                });
            }
        });
        
        this.uiContainer.iterate((child: any) => {
            if (child && child.depth >= 2001 && child !== btn) {
                this.tweens.add({ targets: child, alpha: 0, duration: 300 });
            }
        });
    }

    private startGame() {
        this.currentUIState.overlay = null;
        this.gameStats.startGame();
        this.setupTimers();
        this.isGameStarted = true;
        this.timerText.setVisible(true);
        SoundManager.getInstance().play('gamestart');
    }

    private async sendStartGameSignal(skillId: number) {
        this.currentSelectSkillId = skillId;
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        if (!serverUrl) return;

        try {
            const body: StartRequest = { select_skill_id: skillId };
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

    private showInputForm() {
        this.currentUIState.overlay = 'inputForm';
        const { width, height } = this.scale;
        
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive().setDepth(4000);
        this.uiContainer.add(overlay);

        const formContainer = this.add.container(width / 2, height / 2).setDepth(4001);
        this.uiContainer.add(formContainer);

        const bg = this.add.rectangle(0, 0, 340, 420, 0x222222, 0.95).setStrokeStyle(2, 0x444444);
        const title = this.add.text(0, -170, I18n.t('ui.submit_score'), { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        this.activeDOMElement = this.add.dom(width / 2, height / 2 - 20).createFromHTML(this.getInputFormHtml()).setOrigin(0.5).setDepth(4002);

        const closeForm = () => {
            if (this.activeDOMElement) { this.activeDOMElement.destroy(); this.activeDOMElement = null; }
            formContainer.destroy(); overlay.destroy();
        };

        const buttonGroup = this.createFormButtons(closeForm);
        formContainer.add([bg, title, buttonGroup]);

        formContainer.setScale(0);
        if (this.activeDOMElement) {
            this.activeDOMElement.setScale(0);
            this.tweens.add({ targets: [formContainer, this.activeDOMElement], scale: 1, duration: 400, ease: 'Back.easeOut' });
        }
    }

    private getInputFormHtml(): string {
        return `
            <div style="width: 290px; display: flex; flex-direction: column; gap: 10px; font-family: sans-serif; pointer-events: auto;">
                <div>
                    <label style="display: block; font-size: 16px; color: #aaaaaa; margin-bottom: 8px; text-align: left;">${I18n.t('ui.name')}</label>
                    <input type="text" id="playerName" style="width: 100%; padding: 12px; border-radius: 4px; border: 1px solid #444; background: #333; color: white; font-size: 16px; box-sizing: border-box;">
                </div>
                <div style="margin-top: 10px;">
                    <label style="display: block; font-size: 16px; color: #aaaaaa; margin-bottom: 8px; text-align: left;">${I18n.t('ui.message')}</label>
                    <textarea id="playerMsg" style="width: 100%; padding: 12px; border-radius: 4px; border: 1px solid #444; background: #333; color: white; height: 100px; resize: none; font-size: 16px; box-sizing: border-box;"></textarea>
                </div>
            </div>
        `;
    }

    private createFormButtons(closeCallback: () => void): Phaser.GameObjects.Container {
        const group = this.add.container(0, 155);
        
        // Submit
        const submitBtn = this.add.container(-75, 0);
        const submitBg = this.add.rectangle(0, 0, 140, 50, 0x00ff00, 1).setInteractive({ useHandCursor: true });
        const submitTxt = this.add.text(0, 0, I18n.t('ui.submit'), { fontSize: '18px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
        submitBtn.add([submitBg, submitTxt]);

        submitBg.on('pointerover', () => submitBg.setFillStyle(0x00dd00));
        submitBg.on('pointerout', () => submitBg.setFillStyle(0x00ff00));
        submitBg.on('pointerdown', async () => {
            const name = (document.getElementById('playerName') as HTMLInputElement).value;
            const msg = (document.getElementById('playerMsg') as HTMLTextAreaElement).value;
            await this.sendEndGameSignal(name, msg);
            closeCallback();
            this.showGameOverScreen();
        });

        // Skip
        const skipBtn = this.add.container(75, 0);
        const skipBg = this.add.rectangle(0, 0, 140, 50, 0x444444, 1).setInteractive({ useHandCursor: true });
        const skipTxt = this.add.text(0, 0, I18n.t('ui.skip'), { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        skipBtn.add([skipBg, skipTxt]);

        skipBg.on('pointerover', () => skipBg.setFillStyle(0x555555));
        skipBg.on('pointerout', () => skipBg.setFillStyle(0x444444));
        skipBg.on('pointerdown', () => {
            closeCallback();
            this.showGameOverScreen();
        });

        group.add([submitBtn, skipBtn]);
        return group;
    }

    private async sendEndGameSignal(name: string, msg: string) {
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        if (!serverUrl) return;

        try {
            const body: EndRequest = {
                game_id: this.currentGameId,
                select_skill_id: this.currentSelectSkillId,
                name: name,
                score: this.gameStats.totalAll,
                msg: msg
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

    private async fetchLeaderBoardData(): Promise<RankEntry[]> {
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        if (!serverUrl) return [];

        try {
            const response = await fetch(`${serverUrl}/leaderboard`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data: LeaderBoardResponse = await response.json();
            return data.ranks || [];
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            return [];
        }
    }

    private async showGameOverScreen() {
        this.currentUIState.overlay = 'gameOver';
        const { width, height } = this.scale;
        
        SoundManager.getInstance().play('winning');
        this.timerText.setAlpha(1);
        
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive().setDepth(3000);
        this.uiContainer.add(overlay);

        this.createGameOverText(width);
        const leaderBoardContainer = await this.createLeaderBoardUI(width, height);
        const restartBtn = this.createRestartButton(width, height, overlay, leaderBoardContainer);

        // 애니메이션
        leaderBoardContainer.setScale(0);
        restartBtn.setScale(0);
        this.tweens.add({
            targets: [leaderBoardContainer, restartBtn],
            scale: 1, duration: 500, ease: 'Back.easeOut', delay: 500
        });
    }

    private createGameOverText(width: number) {
        const title = this.add.text(width / 2, 80, I18n.t('ui.game_over'), {
            fontSize: '56px', color: '#ff0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(3001);
        
        const resourceInfo = this.add.text(width / 2, 160, `${I18n.t('ui.total_resources')}: ${this.gameStats.totalAll}`, {
            fontSize: '28px', color: '#ffffff', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3001);
        
        this.uiContainer.add([title, resourceInfo]);
    }

    private async createLeaderBoardUI(width: number, height: number): Promise<Phaser.GameObjects.Container> {
        const container = this.add.container(width / 2, height / 2).setDepth(3001);
        this.uiContainer.add(container);

        const bg = this.add.rectangle(0, 0, 600, 400, 0x222222, 0.9).setStrokeStyle(2, 0x444444);
        const title = this.add.text(0, -170, I18n.t('ui.leaderboard'), {
            fontSize: '24px', color: '#00ff00', fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add([bg, title]);

        let ranks = this.currentUIState.leaderBoardRanks;
        if (!ranks) {
            ranks = await this.fetchLeaderBoardData();
            this.currentUIState.leaderBoardRanks = ranks;
        }
        
        const displayRanks = ranks.slice(0, 10);
        if (displayRanks.length === 0) {
            container.add(this.add.text(0, 0, I18n.t('ui.no_rankings'), { fontSize: '18px', color: '#888888' }).setOrigin(0.5));
        } else {
            displayRanks.forEach((rank, i) => this.addLeaderBoardEntry(container, rank, i));
        }
        return container;
    }

    private addLeaderBoardEntry(container: Phaser.GameObjects.Container, rank: RankEntry, index: number) {
        const y = -130 + (index * 30);
        const score = this.add.text(-260, y, rank.score.toLocaleString(), { fontSize: '18px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(1, 0.5);
        const name = this.add.text(-220, y, rank.name, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5);
        const msg = this.add.text(-50, y, rank.msg, { fontSize: '16px', color: '#aaaaaa' }).setOrigin(0, 0.5);
        container.add([score, name, msg]);
    }

    private createRestartButton(width: number, height: number, overlay: any, board: any): Phaser.GameObjects.Container {
        const btn = this.add.container(width / 2, height - 100).setDepth(3001);
        const bg = this.add.rectangle(0, 0, 250, 60, 0x222222, 0.9).setStrokeStyle(3, 0x444444).setInteractive({ useHandCursor: true });
        const txt = this.add.text(0, 0, I18n.t('ui.restart'), { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        btn.add([bg, txt]);
        this.uiContainer.add(btn);

        bg.on('pointerover', () => bg.setStrokeStyle(4, 0x00ff00));
        bg.on('pointerout', () => bg.setStrokeStyle(3, 0x444444));
        bg.on('pointerdown', () => {
            SoundManager.getInstance().play('restart');
            this.restartGame();
            overlay.destroy();
            this.uiContainer.iterate((child: any) => { if(child && child.depth >= 3001) child.destroy(); });
        });
        return btn;
    }

    private restartGame() {
        const { width, height } = this.scale;
        this.cleanupForRestart();
        
        const skillData = this.resetGameStats(width, height);
        
        this.isGameStarted = false;
        this.isRestarted = true;
        this.canReroll = true;
        
        this.uiContainer.removeAll(true);
        this.setupUI(skillData);
        this.showInitialSkillSelection(skillData);
    }

    private cleanupForRestart() {
        this.currentUIState.overlay = null;
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
        this.timerText.setVisible(false).setColor('#ffffff').setAlpha(1);
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
        const { width } = this.scale;

        // 중앙 타이머 텍스트 생성
        this.timerText = this.add.text(width / 2, 40, this.gameStats.getFormattedRemainingTime(), {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(this.isGameStarted);
        this.uiContainer.add(this.timerText);

        this.setupGameStatsListeners();
        this.setupInputListeners();
        this.createStatsPanel();
        this.setupLanguageSelector();

        // 기존 SkillTreeUI가 있다면 리스너 제거
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
        }
        this.skillTreeUI = new SkillTreeUI(this, this.uiContainer, this.gameStats, skillData);

        // 1초마다 갱신 (최근 10초 획득량 갱신용)
        if (this.uiUpdateTimer) this.uiUpdateTimer.remove();
        this.uiUpdateTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.isGameStarted && !this.gameStats.isGameOver && this.statsContainer.active) {
                    this.gameStats.emit(GameStats.EVENTS.UPDATE_SCORE);
                }
            },
            loop: true
        });

        this.cameras.main.flash(1000, 255, 255, 255);
        this.gameStats.emit(GameStats.EVENTS.UPDATE_SCORE);
        this.restoreUIState();
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
            if (this.gameStats.totalAll > 1) this.showInputForm();
            else this.showGameOverScreen();
        }, this);

        this.gameStats.on(GameStats.EVENTS.CALCULATE_BOOSTER, () => {
            this.physics.pause();
            if (this.spawnTimer) this.spawnTimer.paused = true;
            this.timerText.setText(I18n.t('ui.bonus_time')).setColor('#ffff00').setAlpha(1);

            this.skillTreeUI.playBoosterAnimation((addedTime) => {
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
            this.showFloatingText(50 + x, 15 + (55 / 2) - 20, `+${amount}`, '#00ff00', false, fontSize);
        }, this);

        this.gameStats.on('worldResourceCollected', (data: { type: string, amount: number, x: number, y: number }) => {
            const fontSize = data.amount > 1 ? '21px' : '14px';
            this.showFloatingText(data.x, data.y - 20, `+${data.amount}`, '#00ff00', true, fontSize);
        }, this);
    }

    private setupInputListeners() {
        this.input.off('pointerdown');
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
            if (gameObjects.length > 0) return;
            this.handleInput(pointer);
        }, this);
    }

    private createStatsPanel() {
        const panelX = 50, panelY = 15, panelWidth = 380, panelHeight = 55;
        this.statsContainer = this.add.container(panelX, panelY).setScrollFactor(0);
        
        const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a1a, 0.95).setStrokeStyle(2, 0x444444).setOrigin(0);
        const iconStyle = { fontSize: '20px' };
        const valueStyle = { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' };
        const totalStyle = { fontSize: '11px', color: '#aaaaaa' };

        const woodIcon = this.add.text(15, panelHeight / 2, RESOURCE_CONFIG.ICONS.wood, iconStyle).setOrigin(0, 0.5);
        const woodValue = this.add.text(45, panelHeight / 2, '0', valueStyle).setOrigin(0, 0.5);
        const rockIcon = this.add.text(105, panelHeight / 2, RESOURCE_CONFIG.ICONS.rock, iconStyle).setOrigin(0, 0.5);
        const rockValue = this.add.text(135, panelHeight / 2, '0', valueStyle).setOrigin(0, 0.5);
        
        const totalText = this.add.text(195, 10, `${I18n.t('stats.total')}: 0`, totalStyle).setPadding({ top: 2, bottom: 2 });
        const rateText = this.add.text(195, 25, `${I18n.t('stats.rate')}: 0`, totalStyle).setPadding({ top: 2, bottom: 2 });
        const timeText = this.add.text(195, 40, `${I18n.t('stats.time')}: 00:00`, totalStyle).setPadding({ top: 2, bottom: 2 });
        const gameStatsText = this.add.text(300, 10, '', { fontSize: '11px', color: '#00ff00', lineSpacing: 4 }).setPadding({ top: 2, bottom: 2 });

        this.statsContainer.add([bg, woodIcon, woodValue, rockIcon, rockValue, totalText, rateText, timeText, gameStatsText]);
        this.uiContainer.add(this.statsContainer);

        this.gameStats.removeAllListeners(GameStats.EVENTS.UPDATE_SCORE);
        this.gameStats.on(GameStats.EVENTS.UPDATE_SCORE, () => {
            woodValue.setText(this.gameStats.collected.wood.toString());
            rockValue.setText(this.gameStats.collected.rock.toString());
            totalText.setText(`${I18n.t('stats.total')}: ${this.gameStats.totalAll}`);
            rateText.setText(`${I18n.t('stats.rate')}: ${this.gameStats.getRecentCollectionAmount()}`);
            timeText.setText(`${I18n.t('stats.time')}: ${this.gameStats.getFormattedPlaytime()}`);
            gameStatsText.setText(`${I18n.t('stats.radius')}: ${Math.floor(this.gameStats.radius)}\n${I18n.t('stats.arms')}: ${this.gameStats.maxArms}\n${I18n.t('stats.speed')}: ${this.gameStats.armSpeedFactor.toFixed(1)}x`);
        }, this);
    }

    private restoreUIState() {
        const state = this.currentUIState;
        if (!state.overlay) return;

        switch (state.overlay) {
            case 'initialSkill':
                this.showInitialSkillSelection(state.initialSkillData || [], state.excludeSkillIds, state.selectedInitialSkills);
                break;
            case 'inputForm':
                this.showInputForm();
                break;
            case 'gameOver':
                this.showGameOverScreen();
                break;
        }
    }

    private setupLanguageSelector() {
        const languages = [
            { code: 'ko', label: '🇰🇷 KO' },
            { code: 'en', label: '🇺🇸 EN' },
            { code: 'zh', label: '🇨🇳 ZH' },
            { code: 'ja', label: '🇯🇵 JA' }
        ];

        const btnWidth = 70, btnHeight = 25;
        const startX = this.scale.width - 20 - btnWidth, startY = 15;

        // 메인 버튼
        const currentLang = languages.find(l => l.code === I18n.getLanguage()) || languages[0];
        this.langSelectorContainer = this.add.container(startX, startY);
        const mainBg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x1a1a1a, 0.95).setStrokeStyle(1, 0x444444).setOrigin(0);
        const mainText = this.add.text(btnWidth / 2 - 5, btnHeight / 2, currentLang.label, { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
        const arrow = this.add.text(btnWidth - 15, btnHeight / 2, this.isLanguageMenuOpen ? '▲' : '▼', { fontSize: '10px', color: '#aaaaaa' }).setOrigin(0.5);
        
        this.langSelectorContainer.add([mainBg, mainText, arrow]);
        this.langSelectorContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
        this.topUiContainer.add(this.langSelectorContainer);

        // 드롭다운 메뉴
        this.langMenuContainer = this.add.container(startX, startY + btnHeight + 2).setVisible(this.isLanguageMenuOpen).setDepth(100);
        this.topUiContainer.add(this.langMenuContainer);

        languages.forEach((lang, index) => this.createLanguageMenuItem(lang, index, btnWidth, btnHeight, arrow));

        this.langSelectorContainer.on('pointerdown', () => {
            this.isLanguageMenuOpen = !this.isLanguageMenuOpen;
            this.langMenuContainer.setVisible(this.isLanguageMenuOpen);
            arrow.setText(this.isLanguageMenuOpen ? '▲' : '▼');
            this.updateUIPositions();
        });

        this.langSelectorContainer.on('pointerover', () => mainBg.setStrokeStyle(1, 0xaaaaaa));
        this.langSelectorContainer.on('pointerout', () => mainBg.setStrokeStyle(1, 0x444444));

        this.setupSoundButton(startX, startY + btnHeight + 5, btnWidth, btnHeight);
    }

    private createLanguageMenuItem(lang: any, index: number, width: number, height: number, arrow: Phaser.GameObjects.Text) {
        const itemY = index * (height + 1);
        const item = this.add.container(0, itemY);
        const isCurrent = I18n.getLanguage() === lang.code;
        const itemBg = this.add.rectangle(0, 0, width, height, 0x222222, 0.95).setStrokeStyle(1, isCurrent ? 0x00ff00 : 0x444444).setOrigin(0);
        const itemText = this.add.text(width / 2, height / 2, lang.label, {
            fontSize: '12px', color: isCurrent ? '#00ff00' : '#ffffff', fontStyle: isCurrent ? 'bold' : 'normal'
        }).setOrigin(0.5);

        item.add([itemBg, itemText]);
        item.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        
        item.on('pointerdown', () => {
            if (I18n.getLanguage() !== lang.code) {
                I18n.setLanguage(lang.code as any);
                this.isLanguageMenuOpen = false;
                this.refreshUIAfterLanguageChange();
            } else {
                this.isLanguageMenuOpen = false;
                this.langMenuContainer.setVisible(false);
                arrow.setText('▼');
                this.updateUIPositions();
            }
        });

        item.on('pointerover', () => itemBg.setStrokeStyle(1, 0xaaaaaa));
        item.on('pointerout', () => itemBg.setStrokeStyle(1, isCurrent ? 0x00ff00 : 0x444444));
        this.langMenuContainer.add(item);
    }

    private setupSoundButton(x: number, y: number, width: number, height: number) {
        this.soundBtnContainer = this.add.container(x, y);
        const soundBg = this.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.95).setStrokeStyle(1, 0x444444).setOrigin(0);
        const getSoundLabel = () => SoundManager.getInstance().isMuted() ? "🔇 OFF" : "🔊 ON";
        const soundText = this.add.text(width / 2, height / 2, getSoundLabel(), { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
        
        this.soundBtnContainer.add([soundBg, soundText]);
        this.soundBtnContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        this.topUiContainer.add(this.soundBtnContainer);

        this.soundBtnContainer.on('pointerdown', () => {
            const isMuted = SoundManager.getInstance().toggleMute();
            soundText.setText(getSoundLabel());
            soundBg.setStrokeStyle(1, isMuted ? 0xff0000 : 0x00ff00);
        });

        this.soundBtnContainer.on('pointerover', () => soundBg.setStrokeStyle(1, 0xaaaaaa));
        this.soundBtnContainer.on('pointerout', () => {
            const isMuted = SoundManager.getInstance().isMuted();
            soundBg.setStrokeStyle(1, isMuted ? 0xaa0000 : 0x444444);
        });
    }

    private refreshUIAfterLanguageChange() {
        const currentSkillData = this.skillTreeUI ? this.skillTreeUI.skillTreeData : this.cache.json.get('skillTreeData');
        
        // UI 컨테이너 초기화
        this.uiContainer.removeAll(true);
        this.topUiContainer.removeAll(true);
        if (this.activeDOMElement) {
            this.activeDOMElement.destroy();
            this.activeDOMElement = null;
        }
        
        // UI 재생성 (현재 셔플된 상태 유지)
        this.setupUI(currentSkillData);
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
                this.timerText.setText('00:00').setColor('#ff0000');
            }
            return;
        }

        const cappedDelta = Math.min(delta, 1000);
        this.gameStats.update(cappedDelta);
        
        this.updateTimerDisplay(time);
        this.handleBlackHoleMovement();
        this.updateAutoNet(cappedDelta);
        this.resourceManager.updateWhiteHoles(time);
        this.updateArms(cappedDelta);
        this.updateAutoArms(time);

        this.gameRenderer.drawBoundaries(this.radiusMultiplier);
        this.processResources();
    }

    private updateTimerDisplay(time: number) {
        this.timerText.setText(this.gameStats.getFormattedRemainingTime());
        const remainingTime = this.gameStats.getRemainingTime();
        if (this.gameStats.isBoosterTime) {
            this.timerText.setColor('#ffff00').setAlpha(Math.floor(time / 500) % 2 === 0 ? 1 : 0.5);
        } else if (remainingTime < 30) {
            this.timerText.setColor('#ff0000').setAlpha(Math.floor(time / 500) % 2 === 0 ? 1 : 0.5);
        } else {
            this.timerText.setColor('#ffffff').setAlpha(1);
        }
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
