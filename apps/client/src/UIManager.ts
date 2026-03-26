import Phaser from 'phaser';
import { I18n } from '@shared/I18n';
import { GameStats } from '@shared/GameStats';
import { DURATIONS, RESOURCE_CONFIG } from '@shared/Constants';
import { Utils } from '@shared/Utils';
import { RankEntry } from '@repo/shared';
import { SoundManager } from './SoundManager';
import skillTreeData from '@shared/SKILLTREE.json';
import { SkillTreeUI } from './SkillTreeUI';

export interface UIState {
    overlay: 'initialSkill' | 'inputForm' | 'gameOver' | null;
    initialSkillData?: any[];
    excludeSkillIds?: string[];
    selectedInitialSkills?: any[];
    leaderBoardRanks?: RankEntry[];
    isRestarted?: boolean;
    canReroll?: boolean;
}

export interface UICallbacks {
    onStartGame: () => void;
    onRestartGame: (canReroll: boolean) => void;
    onSendStartSignal: (skillId: number) => void;
    onSendEndSignal: (name: string, msg: string) => void;
    onFetchLeaderboard: () => Promise<RankEntry[]>;
    onRefreshUI: () => void;
}

export class UIManager {
    private scene: Phaser.Scene;
    private stats: GameStats;
    private uiContainer: Phaser.GameObjects.Container;
    private topUiContainer: Phaser.GameObjects.Container;
    private callbacks: UICallbacks;

    private timerText!: Phaser.GameObjects.Text;
    private statsContainer!: Phaser.GameObjects.Container;
    private langSelectorContainer!: Phaser.GameObjects.Container;
    private langMenuContainer!: Phaser.GameObjects.Container;
    private soundBtnContainer!: Phaser.GameObjects.Container;
    private activeDOMElement: Phaser.GameObjects.DOMElement | null = null;
    private skillTreeUI: SkillTreeUI | null = null;
    
    private statsUpdateListener: (() => void) | null = null;
    
    private isLanguageMenuOpen: boolean = false;
    public currentUIState: UIState = { overlay: null };
    private tooltipContainer: Phaser.GameObjects.Container | null = null;

    constructor(scene: Phaser.Scene, uiContainer: Phaser.GameObjects.Container, topUiContainer: Phaser.GameObjects.Container, stats: GameStats, callbacks: UICallbacks) {
        this.scene = scene;
        this.uiContainer = uiContainer;
        this.topUiContainer = topUiContainer;
        this.stats = stats;
        this.callbacks = callbacks;
    }

    public setupSkillTree(skillData: any[]) {
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
        }
        this.skillTreeUI = new SkillTreeUI(this.scene, this.uiContainer, this.stats, skillData);
    }

    public getSkillTreeUI(): SkillTreeUI | null {
        return this.skillTreeUI;
    }

    public setupMainUI() {
        const { width } = this.scene.scale;

        this.timerText = this.scene.add.text(width / 2, 40, this.stats.getFormattedRemainingTime(), {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(false);
        this.uiContainer.add(this.timerText);

        this.createStatsPanel();
        this.setupLanguageSelector();
    }

    public updateTimerDisplay(time: number, isGameStarted: boolean) {
        this.timerText.setVisible(isGameStarted);
        this.timerText.setText(this.stats.getFormattedRemainingTime());
        const remainingTime = this.stats.getRemainingTime();
        
        if (this.stats.isBoosterTime) {
            this.timerText.setColor('#ffff00').setAlpha(Math.floor(time / 500) % 2 === 0 ? 1 : 0.5);
        } else if (remainingTime < 30) {
            this.timerText.setColor('#ff0000').setAlpha(Math.floor(time / 500) % 2 === 0 ? 1 : 0.5);
        } else {
            this.timerText.setColor('#ffffff').setAlpha(1);
        }
    }

    public setGameOverTimerStyle() {
        this.timerText.setText('00:00').setColor('#ff0000').setAlpha(1);
    }

    public createStatsPanel() {
        const panelX = 50, panelY = 15, panelWidth = 380, panelHeight = 55;
        this.statsContainer = this.scene.add.container(panelX, panelY).setScrollFactor(0);
        
        const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a1a, 0.95).setStrokeStyle(2, 0x444444).setOrigin(0);
        const iconStyle = { fontSize: '20px' };
        const valueStyle = { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' };
        const totalStyle = { fontSize: '11px', color: '#aaaaaa' };

        const woodIcon = this.scene.add.text(15, panelHeight / 2, RESOURCE_CONFIG.ICONS.wood, iconStyle).setOrigin(0, 0.5);
        const woodValue = this.scene.add.text(45, panelHeight / 2, '0', valueStyle).setOrigin(0, 0.5);
        const rockIcon = this.scene.add.text(105, panelHeight / 2, RESOURCE_CONFIG.ICONS.rock, iconStyle).setOrigin(0, 0.5);
        const rockValue = this.scene.add.text(135, panelHeight / 2, '0', valueStyle).setOrigin(0, 0.5);
        
        const totalText = this.scene.add.text(195, 10, `${I18n.t('stats.total')}: 0`, totalStyle).setPadding({ top: 2, bottom: 2 });
        const rateText = this.scene.add.text(195, 25, `${I18n.t('stats.rate')}: 0`, totalStyle).setPadding({ top: 2, bottom: 2 });
        const timeText = this.scene.add.text(195, 40, `${I18n.t('stats.time')}: 00:00`, totalStyle).setPadding({ top: 2, bottom: 2 });
        const gameStatsText = this.scene.add.text(300, 10, '', { fontSize: '11px', color: '#00ff00', lineSpacing: 4 }).setPadding({ top: 2, bottom: 2 });

        this.statsContainer.add([bg, woodIcon, woodValue, rockIcon, rockValue, totalText, rateText, timeText, gameStatsText]);
        this.uiContainer.add(this.statsContainer);

        // 이전 리스너가 있다면 제거
        if (this.statsUpdateListener) {
            this.stats.off(GameStats.EVENTS.UPDATE_SCORE, this.statsUpdateListener);
        }

        // 새로운 리스너 생성 및 등록
        this.statsUpdateListener = () => {
            if (!this.statsContainer.active) return;
            woodValue.setText(this.stats.collected.wood.toString());
            rockValue.setText(this.stats.collected.rock.toString());
            totalText.setText(`${I18n.t('stats.total')}: ${this.stats.totalAll}`);
            rateText.setText(`${I18n.t('stats.rate')}: ${this.stats.getRecentCollectionAmount()}`);
            timeText.setText(`${I18n.t('stats.time')}: ${this.stats.getFormattedPlaytime()}`);
            gameStatsText.setText(`${I18n.t('stats.radius')}: ${Math.floor(this.stats.radius)}\n${I18n.t('stats.arms')}: ${this.stats.maxArms}\n${I18n.t('stats.speed')}: ${this.stats.armSpeedFactor.toFixed(1)}x`);
        };

        this.stats.on(GameStats.EVENTS.UPDATE_SCORE, this.statsUpdateListener);
    }

    public showFloatingText(x: number, y: number, text: string, color: string, isInWorld: boolean = false, fontSize: string = '14px', worldContainer: Phaser.GameObjects.Container) {
        const ft = this.scene.add.text(x, y, text, { fontSize, color, fontStyle: 'bold' }).setDepth(100);
        
        if (isInWorld) {
            worldContainer.add(ft);
        } else {
            ft.setScrollFactor(0);
            this.uiContainer.add(ft);
        }

        this.scene.tweens.add({
            targets: ft,
            y: y - 30,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.easeOut',
            onComplete: () => ft.destroy()
        });
    }

    public showInitialSkillSelection(skillData: any[], excludeSkillIds: string[] = [], preservedSkills: any[] | null = null, isRestarted: boolean, canReroll: boolean) {
        this.currentUIState.overlay = 'initialSkill';
        this.currentUIState.initialSkillData = skillData;
        this.currentUIState.excludeSkillIds = excludeSkillIds;
        this.currentUIState.isRestarted = isRestarted;
        this.currentUIState.canReroll = canReroll;
        
        if (preservedSkills) {
            this.currentUIState.selectedInitialSkills = preservedSkills;
        }
        
        const { width, height } = this.scene.scale;

        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
            .setOrigin(0).setInteractive().setDepth(2000);
        this.uiContainer.add(overlay);

        const title = this.scene.add.text(width / 2, height / 2 - 200, I18n.t('ui.choose_starting_skill'), {
            fontSize: '32px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(2001);
        this.uiContainer.add(title);

        let selectedSkills = preservedSkills;
        if (!selectedSkills) {
            const candidateSkills = skillData.filter(s => s.row <= 1 && !excludeSkillIds.includes(s.id));
            selectedSkills = Phaser.Utils.Array.Shuffle([...candidateSkills]).slice(0, 2);
            this.currentUIState.selectedInitialSkills = selectedSkills;
        }
        
        const currentSelectionIds = selectedSkills.map(s => s.id);

        if (isRestarted && canReroll) {
            this.createRerollButton(width, height, skillData, currentSelectionIds);
        }

        selectedSkills.forEach((skill, index) => {
            const x = width / 2 + (index === 0 ? -180 : 180);
            const y = height / 2 + 20;
            this.createSkillCard(x, y, skill, overlay, title);
        });
    }

    private createRerollButton(width: number, height: number, skillData: any[], currentSelectionIds: string[]) {
        const rerollBtn = this.scene.add.container(width / 2, height / 2 + 250).setDepth(2001);
        const rerollBg = this.scene.add.rectangle(0, 0, 160, 45, 0x333333, 0.9)
            .setStrokeStyle(2, 0x00ff00)
            .setInteractive({ useHandCursor: true });
        const rerollText = this.scene.add.text(0, 0, I18n.t('ui.reroll'), {
            fontSize: '18px', color: '#00ff00', fontStyle: 'bold'
        }).setOrigin(0.5);

        rerollBtn.add([rerollBg, rerollText]);
        this.uiContainer.add(rerollBtn);

        rerollBg.on('pointerover', () => rerollBg.setFillStyle(0x444444));
        rerollBg.on('pointerout', () => rerollBg.setFillStyle(0x333333));
        rerollBg.on('pointerdown', () => {
            SoundManager.getInstance().play('reroll');
            this.clearUIByDepth(2000);
            this.callbacks.onRestartGame(false); // In terms of re-rolling, it's like a partial restart
        });
    }

    private createSkillCard(x: number, y: number, skill: any, overlay: Phaser.GameObjects.Rectangle, title: Phaser.GameObjects.Text) {
        const btn = this.scene.add.container(x, y).setDepth(2001);
        const bg = this.scene.add.rectangle(0, 0, 280, 320, 0x1a1a1a, 0.95)
            .setStrokeStyle(3, 0x444444)
            .setInteractive({ useHandCursor: true });
        
        const skillName = I18n.t(`skill.${skill.id}.name`) || skill.id;
        const nameText = this.scene.add.text(0, -100, skillName, {
            fontSize: '24px', color: '#00ff00', fontStyle: 'bold', align: 'center', wordWrap: { width: 240 }
        }).setOrigin(0.5).setPadding({ top: 4, bottom: 4 });

        const desc = I18n.t(`skill.${skill.id}.desc`) || '';
        const descText = this.scene.add.text(0, 0, desc, {
            fontSize: '18px', color: '#ffffff', align: 'center', lineSpacing: 8, wordWrap: { width: 240 }
        }).setOrigin(0.5).setPadding({ top: 4, bottom: 4 });

        const hintText = this.scene.add.text(0, 110, I18n.t('ui.click_to_select'), {
            fontSize: '14px', color: '#aaaaaa', fontStyle: 'italic'
        }).setOrigin(0.5);

        btn.add([bg, nameText, descText, hintText]);
        this.uiContainer.add(btn);

        bg.on('pointerover', () => {
            bg.setStrokeStyle(4, 0x00ff00);
            this.scene.tweens.add({ targets: btn, scale: 1.05, duration: 200, ease: 'Back.easeOut' });
        });
        bg.on('pointerout', () => {
            bg.setStrokeStyle(3, 0x444444);
            this.scene.tweens.add({ targets: btn, scale: 1.0, duration: 200, ease: 'Back.easeOut' });
        });
        bg.on('pointerdown', () => {
            this.handleInitialSkillSelection(skill, btn, overlay, title);
        });
    }

    private handleInitialSkillSelection(skill: any, btn: Phaser.GameObjects.Container, overlay: Phaser.GameObjects.Rectangle, title: Phaser.GameObjects.Text) {
        this.stats.grantSkill(skill);
        SoundManager.getInstance().play('skillupgrade');
        
        const skillIndex = (skillTreeData as any[]).findIndex((s: any) => s.id === skill.id);
        this.callbacks.onSendStartSignal(skillIndex);
        this.callbacks.onStartGame();
        
        this.scene.tweens.add({
            targets: [overlay, title, btn],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                overlay.destroy();
                title.destroy();
                this.clearUIByDepth(2000);
            }
        });
        
        this.uiContainer.iterate((child: any) => {
            if (child && child.depth >= 2001 && child !== btn) {
                this.scene.tweens.add({ targets: child, alpha: 0, duration: 300 });
            }
        });
    }

    public showInputForm() {
        this.currentUIState.overlay = 'inputForm';
        const { width, height } = this.scene.scale;
        
        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive().setDepth(4000);
        this.uiContainer.add(overlay);

        const formContainer = this.scene.add.container(width / 2, height / 2).setDepth(4001);
        this.uiContainer.add(formContainer);

        const bg = this.scene.add.rectangle(0, 0, 340, 420, 0x222222, 0.95).setStrokeStyle(2, 0x444444);
        const title = this.scene.add.text(0, -170, I18n.t('ui.submit_score'), { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        this.activeDOMElement = this.scene.add.dom(width / 2, height / 2 - 20).createFromHTML(this.getInputFormHtml()).setOrigin(0.5).setDepth(4002);

        // Add event listeners to stop propagation of keyboard events
        const inputElements = this.activeDOMElement.node.querySelectorAll('input, textarea');
        inputElements.forEach(el => {
            el.addEventListener('keydown', (e) => e.stopPropagation());
            el.addEventListener('keyup', (e) => e.stopPropagation());
            el.addEventListener('keypress', (e) => e.stopPropagation());
        });

        // Add tooltip listener to the message label
        const messageLabel = this.activeDOMElement.node.querySelector('.message-label') as HTMLElement;
        if (messageLabel) {
            messageLabel.addEventListener('mouseover', () => {
                const rect = messageLabel.getBoundingClientRect();
                // Convert screen coordinates to Phaser coordinates
                const x = this.scene.scale.transformX(rect.left);
                const y = this.scene.scale.transformY(rect.top + rect.height / 2);
                this.showTooltip(x, y, I18n.t('ui.message_tooltip'), 'left');
                messageLabel.style.color = '#ffffff';
                messageLabel.style.borderBottomColor = '#00ff00';
            });
            messageLabel.addEventListener('mouseout', () => {
                this.hideTooltip();
                messageLabel.style.color = '#aaaaaa';
                messageLabel.style.borderBottomColor = '#666666';
            });
        }

        const closeForm = () => {
            if (this.activeDOMElement) { this.activeDOMElement.destroy(); this.activeDOMElement = null; }
            formContainer.destroy(); overlay.destroy();
        };

        const buttonGroup = this.createFormButtons(closeForm);
        formContainer.add([bg, title, buttonGroup]);

        formContainer.setScale(0);
        if (this.activeDOMElement) {
            this.activeDOMElement.setScale(0);
            this.scene.tweens.add({ targets: [formContainer, this.activeDOMElement], scale: 1, duration: 400, ease: 'Back.easeOut' });
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
                    <label class="message-label" style="display: inline-block; font-size: 16px; color: #aaaaaa; margin-bottom: 8px; text-align: left; cursor: help; border-bottom: 1px dashed #666;">
                        ${I18n.t('ui.message')} <span style="font-size: 14px; color: #00ff00; margin-left: 2px;">ⓘ</span>
                    </label>
                    <textarea id="playerMsg" style="width: 100%; padding: 12px; border-radius: 4px; border: 1px solid #444; background: #333; color: white; height: 100px; resize: none; font-size: 16px; box-sizing: border-box;"></textarea>
                </div>
            </div>
        `;
    }

    private createFormButtons(closeCallback: () => void): Phaser.GameObjects.Container {
        const group = this.scene.add.container(0, 155);
        
        const submitBtn = this.scene.add.container(-75, 0);
        const submitBg = this.scene.add.rectangle(0, 0, 140, 50, 0x00ff00, 1).setInteractive({ useHandCursor: true });
        const submitTxt = this.scene.add.text(0, 0, I18n.t('ui.submit'), { fontSize: '18px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
        submitBtn.add([submitBg, submitTxt]);

        submitBg.on('pointerover', () => submitBg.setFillStyle(0x00dd00));
        submitBg.on('pointerout', () => submitBg.setFillStyle(0x00ff00));
        submitBg.on('pointerdown', async () => {
            const name = (document.getElementById('playerName') as HTMLInputElement).value;
            const msg = (document.getElementById('playerMsg') as HTMLTextAreaElement).value;
            await this.callbacks.onSendEndSignal(name, msg);
            closeCallback();
            this.showGameOverScreen();
        });

        const skipBtn = this.scene.add.container(75, 0);
        const skipBg = this.scene.add.rectangle(0, 0, 140, 50, 0x444444, 1).setInteractive({ useHandCursor: true });
        const skipTxt = this.scene.add.text(0, 0, I18n.t('ui.skip'), { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
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

    public async showGameOverScreen() {
        this.currentUIState.overlay = 'gameOver';
        const { width, height } = this.scene.scale;
        
        SoundManager.getInstance().play('winning');
        this.timerText.setAlpha(1);
        
        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0).setInteractive().setDepth(3000);
        this.uiContainer.add(overlay);

        this.createGameOverText(width);
        const leaderBoardContainer = await this.createLeaderboardUI(width, height);
        const restartBtn = this.createRestartButton(width, height, overlay);

        leaderBoardContainer.setScale(0);
        restartBtn.setScale(0);
        this.scene.tweens.add({
            targets: [leaderBoardContainer, restartBtn],
            scale: 1, duration: 500, ease: 'Back.easeOut', delay: 500
        });
    }

    private createGameOverText(width: number) {
        const title = this.scene.add.text(width / 2, 80, I18n.t('ui.game_over'), {
            fontSize: '56px', color: '#ff0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(3001);
        
        const resourceInfo = this.scene.add.text(width / 2, 160, `${I18n.t('ui.total_resources')}: ${this.stats.totalAll}`, {
            fontSize: '28px', color: '#ffffff', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3001);
        
        this.uiContainer.add([title, resourceInfo]);
    }

    private async createLeaderboardUI(width: number, height: number): Promise<Phaser.GameObjects.Container> {
        const container = this.scene.add.container(width / 2, height / 2).setDepth(3001);
        this.uiContainer.add(container);

        const bg = this.scene.add.rectangle(0, 0, 600, 400, 0x222222, 0.9).setStrokeStyle(2, 0x444444);
        const title = this.scene.add.text(0, -170, I18n.t('ui.leaderboard'), {
            fontSize: '24px', color: '#00ff00', fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add([bg, title]);

        let ranks = await this.callbacks.onFetchLeaderboard();
        if (!ranks) {
            ranks = this.currentUIState.leaderBoardRanks || [];
        }
        this.currentUIState.leaderBoardRanks = ranks;
        
        const displayRanks = ranks.slice(0, 10);
        if (displayRanks.length === 0) {
            container.add(this.scene.add.text(0, 0, I18n.t('ui.no_rankings'), { fontSize: '18px', color: '#888888' }).setOrigin(0.5));
        } else {
            displayRanks.forEach((rank, i) => this.addLeaderboardEntry(container, rank, i));
        }
        return container;
    }

    private addLeaderboardEntry(container: Phaser.GameObjects.Container, rank: RankEntry, index: number) {
        const y = -130 + (index * 30);
        const score = this.scene.add.text(-260, y, rank.score.toLocaleString(), { fontSize: '18px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(1, 0.5).setPadding({ top: 4, bottom: 4 });
        const emoji = this.scene.add.text(-245, y, rank.emoji || '🌐', { fontSize: '18px' }).setOrigin(0, 0.5).setPadding({ top: 4, bottom: 4 });
        const name = this.scene.add.text(-210, y, rank.name, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5).setPadding({ top: 4, bottom: 4 });
        
        const msgMaxWidth = 330;
        const msg = this.scene.add.text(-50, y, rank.msg, { fontSize: '16px', color: '#aaaaaa' }).setOrigin(0, 0.5).setPadding({ top: 4, bottom: 4 });
        
        if (msg.width < msgMaxWidth || rank.msg.indexOf("\n") >= 0) {
            this.truncateStringByTextWidth(rank.msg, msgMaxWidth, msg);
            msg.setInteractive({ useHandCursor: true });
            msg.on('pointerover', (p: Phaser.Input.Pointer) => this.showTooltip(p.x, p.y, rank.msg));
            msg.on('pointerout', () => this.hideTooltip());
        }

        container.add([score, emoji, name, msg]);
    }

    private truncateStringByTextWidth(str: string, maxWidth: number, text:Phaser.GameObjects.Text) {
        let low = 0;
        let high = str.indexOf("\n");
        if (high < 0) high = str.length;

        while (low <= high) {
            let mid = Math.floor((low + high) / 2);
            let test = str.substring(0, mid) + "...";
            text.setText(test);
            if (text.width <= maxWidth) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
    }


    private showTooltip(x: number, y: number, text: string, side: 'top' | 'left' = 'top') {
        this.hideTooltip();
        
        const tooltipText = this.scene.add.text(0, 0, text, {
            fontSize: '14px',
            color: '#ffffff',
            align: 'left',
            wordWrap: { width: 300 },
            padding: { x: 10, y: 10 }
        }).setOrigin(0.5);

        const bgWidth = tooltipText.width + 4;
        const bgHeight = tooltipText.height + 4;
        const bg = this.scene.add.rectangle(0, 0, bgWidth, bgHeight, 0x000000, 0.95)
            .setStrokeStyle(1, 0x888888).setOrigin(0.5);

        const halfWidth = bgWidth / 2;
        const halfHeight = bgHeight / 2;

        this.tooltipContainer = this.scene.add.container(x, y);
        this.tooltipContainer.add([bg, tooltipText]);
        this.tooltipContainer.setDepth(20000);
        
        if (side === 'left') {
            this.tooltipContainer.x = x - halfWidth - 15;
            this.tooltipContainer.y = y;
        } else {
            if (y - bgHeight - 20 < 10) {
                this.tooltipContainer.y = y + halfHeight + 20;
            } else {
                this.tooltipContainer.y = y - halfHeight - 20;
            }
        }

        // Global boundary checks
        if (this.tooltipContainer.x - halfWidth < 10) this.tooltipContainer.x = halfWidth + 10;
        if (this.tooltipContainer.x + halfWidth > this.scene.scale.width - 10) this.tooltipContainer.x = this.scene.scale.width - halfWidth - 10;
        if (this.tooltipContainer.y - halfHeight < 10) this.tooltipContainer.y = halfHeight + 10;
        if (this.tooltipContainer.y + halfHeight > this.scene.scale.height - 10) this.tooltipContainer.y = this.scene.scale.height - halfHeight - 10;

        this.topUiContainer.add(this.tooltipContainer);
    }

    private hideTooltip() {
        if (this.tooltipContainer) {
            this.tooltipContainer.destroy();
            this.tooltipContainer = null;
        }
    }

    private createRestartButton(width: number, height: number, overlay: any): Phaser.GameObjects.Container {
        const btn = this.scene.add.container(width / 2, height - 100).setDepth(3001);
        const bg = this.scene.add.rectangle(0, 0, 250, 60, 0x222222, 0.9).setStrokeStyle(3, 0x444444).setInteractive({ useHandCursor: true });
        const txt = this.scene.add.text(0, 0, I18n.t('ui.restart'), { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        btn.add([bg, txt]);
        this.uiContainer.add(btn);

        bg.on('pointerover', () => bg.setStrokeStyle(4, 0x00ff00));
        bg.on('pointerout', () => bg.setStrokeStyle(3, 0x444444));
        bg.on('pointerdown', () => {
            SoundManager.getInstance().play('restart');
            this.callbacks.onRestartGame(true);
            overlay.destroy();
            this.clearUIByDepth(3001);
        });
        return btn;
    }

    public restoreUIState() {
        const state = this.currentUIState;
        if (!state.overlay) return;

        switch (state.overlay) {
            case 'initialSkill':
                this.showInitialSkillSelection(state.initialSkillData || [], state.excludeSkillIds, state.selectedInitialSkills, state.isRestarted || false, state.canReroll || false);
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
        const startX = this.scene.scale.width - 20 - btnWidth, startY = 15;

        const currentLang = languages.find(l => l.code === I18n.getLanguage()) || languages[0];
        this.langSelectorContainer = this.scene.add.container(startX, startY);
        const mainBg = this.scene.add.rectangle(0, 0, btnWidth, btnHeight, 0x1a1a1a, 0.95).setStrokeStyle(1, 0x444444).setOrigin(0);
        const mainText = this.scene.add.text(btnWidth / 2 - 5, btnHeight / 2, currentLang.label, { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
        const arrow = this.scene.add.text(btnWidth - 15, btnHeight / 2, this.isLanguageMenuOpen ? '▲' : '▼', { fontSize: '10px', color: '#aaaaaa' }).setOrigin(0.5);
        
        this.langSelectorContainer.add([mainBg, mainText, arrow]);
        this.langSelectorContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
        this.topUiContainer.add(this.langSelectorContainer);

        this.langMenuContainer = this.scene.add.container(startX, startY + btnHeight + 2).setVisible(this.isLanguageMenuOpen).setDepth(100);
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
        const item = this.scene.add.container(0, itemY);
        const isCurrent = I18n.getLanguage() === lang.code;
        const itemBg = this.scene.add.rectangle(0, 0, width, height, 0x222222, 0.95).setStrokeStyle(1, isCurrent ? 0x00ff00 : 0x444444).setOrigin(0);
        const itemText = this.scene.add.text(width / 2, height / 2, lang.label, {
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
        this.soundBtnContainer = this.scene.add.container(x, y);
        const soundBg = this.scene.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.95).setStrokeStyle(1, 0x444444).setOrigin(0);
        const getSoundLabel = () => SoundManager.getInstance().isMuted() ? "🔇 OFF" : "🔊 ON";
        const soundText = this.scene.add.text(width / 2, height / 2, getSoundLabel(), { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
        
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

    public refreshUIAfterLanguageChange() {
        this.hideTooltip();
        const currentSkillData = this.stats.skillTreeData;
        this.uiContainer.removeAll(true);
        this.topUiContainer.removeAll(true);
        if (this.activeDOMElement) { this.activeDOMElement.destroy(); this.activeDOMElement = null; }
        
        // UI 컴포넌트 재구성
        this.setupMainUI();
        this.setupSkillTree(currentSkillData);
        
        // 오버레이 상태 복구 (다국어 변경 시에도 오버레이 유지)
        this.restoreUIState();
        
        // Scene에 리프레시 알림 (리사이즈나 카메라 설정 등)
        this.callbacks.onRefreshUI();
    }

    public updateUIPositions() {
        const { width } = this.scene.scale;
        const btnWidth = 70, btnHeight = 25;
        const startX = width - 20 - btnWidth, startY = 15;

        if (this.langSelectorContainer) this.langSelectorContainer.setPosition(startX, startY);
        if (this.langMenuContainer) this.langMenuContainer.setPosition(startX, startY + btnHeight + 2);
        if (this.soundBtnContainer) {
            const menuOffset = this.isLanguageMenuOpen ? (btnHeight + 1) * 4 + 5 : 0;
            this.soundBtnContainer.setPosition(startX, startY + btnHeight + 5 + menuOffset);
        }
    }

    public handleResize() {
        const { width } = this.scene.scale;
        if (this.timerText) this.timerText.setPosition(width / 2, 40);
        this.updateUIPositions();
    }

    public clearUIByDepth(minDepth: number) {
        this.uiContainer.iterate((child: any) => {
            if (child && child.depth >= minDepth) child.destroy();
        });
    }

    public destroy() {
        this.hideTooltip();
        if (this.activeDOMElement) this.activeDOMElement.destroy();
        this.statsContainer.destroy();
        this.uiContainer.removeAll(true);
        this.topUiContainer.removeAll(true);
    }
}
