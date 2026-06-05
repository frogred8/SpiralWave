import Phaser from 'phaser';
import { I18n } from '@shared/I18n';

type TutorialStep = 'movement' | 'arm' | 'research' | 'complete';

export class TutorialManager {
    private readonly scene: Phaser.Scene;
    private readonly uiContainer: Phaser.GameObjects.Container;
    private panel: Phaser.GameObjects.Container | null = null;
    private step: TutorialStep = 'movement';
    private isEnabled: boolean = false;
    private readonly storageKey = 'spiralwave.tutorial.completed';

    constructor(scene: Phaser.Scene, uiContainer: Phaser.GameObjects.Container) {
        this.scene = scene;
        this.uiContainer = uiContainer;
    }

    public start() {
        if (this.hasCompletedTutorial()) return;

        this.isEnabled = true;
        this.step = 'movement';
        this.showStep();
    }

    public recordMovement() {
        if (this.step === 'movement') this.advanceTo('arm');
    }

    public recordArmGrab() {
        if (this.step === 'arm') this.advanceTo('research');
    }

    public recordSkillUpgrade() {
        if (this.step === 'research') this.complete();
    }

    public destroy() {
        this.panel?.destroy();
        this.panel = null;
    }

    private advanceTo(step: TutorialStep) {
        if (!this.isEnabled) return;
        this.step = step;
        this.showStep();
    }

    private complete() {
        this.step = 'complete';
        this.isEnabled = false;
        this.markCompleted();
        this.destroy();
    }

    private showStep() {
        this.destroy();

        const { width } = this.scene.scale;
        const panelWidth = Math.min(520, width - 40);
        const container = this.scene.add.container(width / 2, 96).setDepth(1800).setScrollFactor(0);
        const bg = this.scene.add.rectangle(0, 0, panelWidth, 72, 0x111111, 0.88)
            .setStrokeStyle(1, 0x22c55e);
        const title = this.scene.add.text(-panelWidth / 2 + 18, -24, I18n.t('tutorial.title'), {
            fontSize: '15px',
            color: '#22c55e',
            fontStyle: 'bold'
        }).setOrigin(0).setPadding({ top: 2, bottom: 2 });
        const body = this.scene.add.text(-panelWidth / 2 + 18, 2, I18n.t(`tutorial.${this.step}`), {
            fontSize: '13px',
            color: '#f3f4f6',
            wordWrap: { width: panelWidth - 36, useAdvancedWrap: true }
        }).setOrigin(0, 0.5).setPadding({ top: 2, bottom: 2 });

        container.add([bg, title, body]);
        this.uiContainer.add(container);
        this.panel = container;
    }

    private hasCompletedTutorial() {
        try {
            return window.localStorage.getItem(this.storageKey) === 'true';
        } catch {
            return false;
        }
    }

    private markCompleted() {
        try {
            window.localStorage.setItem(this.storageKey, 'true');
        } catch {
            // Local storage may be unavailable in restricted browser contexts.
        }
    }
}
