import 'phaser';
import { GameScene } from './GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        }
    },
    fps: {
        target: 60,
        forceSetTimeOut: true
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);

// Vite의 Hot Module Replacement(HMR)를 위한 처리
// 코드가 수정되면 기존 게임 인스턴스를 안전하게 제거합니다.
if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
        game.destroy(true);
    });
}