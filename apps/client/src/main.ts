import Phaser from 'phaser';

let game: Phaser.Game | null = null;

async function bootstrap() {
    const { GameScene } = await import('./GameScene');

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: '#000000',
        parent: 'game-container',
        dom: {
            createContainer: true
        },
        pixelArt: false,
        roundPixels: true,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1400,
            height: 800,
            expandParent: true
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false,
            }
        },
        antialias: true,
        scene: [GameScene]
    };

    game = new Phaser.Game(config);
}

void bootstrap();

if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
        game?.destroy(true);
        game = null;
    });
}
