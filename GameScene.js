import Phaser from 'phaser';
import { GameStats } from './GameStats';
import { SkillTreeUI } from './SkillTreeUI';
export class GameScene extends Phaser.Scene {
    spiralCenter;
    resources;
    boundaryGraphics;
    sparks;
    uiCamera;
    worldContainer;
    uiContainer;
    gameStats;
    skillTreeUI;
    // 게임 상태 변수
    constructor() {
        super('GameScene');
    }
    create() {
        const { width, height } = this.scale;
        this.spiralCenter = new Phaser.Math.Vector2(width / 2, height / 2);
        this.gameStats = new GameStats();
        // 월드와 UI를 분리하여 관리하기 위한 컨테이너 생성
        this.worldContainer = this.add.container(0, 0);
        this.uiContainer = this.add.container(0, 0);
        // UI 전용 카메라 추가 (메인 카메라의 흔들림 효과에서 제외됨)
        this.uiCamera = this.cameras.add(0, 0, width, height).setName('UI');
        // 우주 배경의 작은 별들 생성
        const starCount = 300;
        const stars = this.add.graphics();
        for (let i = 0; i < starCount; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const radius = Phaser.Math.FloatBetween(0.2, 1.2);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.9);
            stars.fillStyle(0xffffff, alpha);
            stars.fillCircle(x, y, radius);
        }
        this.worldContainer.add(stars);
        // 불꽃 파티클 텍스처 생성
        const sparkGraphics = this.make.graphics({ x: 0, y: 0 });
        sparkGraphics.fillStyle(0xffffff);
        sparkGraphics.fillCircle(2, 2, 2);
        sparkGraphics.generateTexture('spark', 4, 4);
        sparkGraphics.destroy();
        this.sparks = this.add.particles(0, 0, 'spark', {
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            tint: [0xffff00, 0xff8800, 0xffffff],
            blendMode: 'ADD',
            emitting: false
        });
        this.worldContainer.add(this.sparks);
        // 나선 경계 시각화를 위한 그래픽 객체
        this.boundaryGraphics = this.add.graphics();
        this.worldContainer.add(this.boundaryGraphics);
        // 중심부 블랙홀 핵 (사건의 지평선)
        const blackHole = this.add.circle(this.spiralCenter.x, this.spiralCenter.y, 15, 0x000000, 1);
        const glow = this.add.circle(this.spiralCenter.x, this.spiralCenter.y, 18, 0xffffff, 0.2);
        this.worldContainer.add([blackHole, glow]);
        // 핵 주변 일렁이는 효과
        this.tweens.add({
            targets: glow,
            alpha: 0.5,
            scale: 1.3,
            duration: 1500,
            yoyo: true,
            loop: -1
        });
        // 물체가 강한 힘에 의해 겹쳤을 때 분리하는 로직 강화 (Sticking 현상 방지 핵심 속성명 수정)
        this.physics.world.OVERLAP_BIAS = 40;
        // 일정 시간마다 자원 생성
        this.time.addEvent({
            delay: 200,
            callback: this.spawnResource,
            callbackScope: this,
            loop: true
        });
        // UI 텍스트
        const infoText = this.add.text(20, 20, '', { fontSize: '18px', color: '#00ffff', fontStyle: 'bold' }).setScrollFactor(0); // UI는 카메라에 고정
        this.uiContainer.add(infoText);
        // 스킬 트리 생성
        this.skillTreeUI = new SkillTreeUI(this, this.uiContainer, this.gameStats);
        this.gameStats.on('updateScore', () => {
            infoText.setText(`[ WOOD: ${this.gameStats.collected.wood} ]  [ ROCK: ${this.gameStats.collected.rock} ]  [ FISH: ${this.gameStats.collected.fish} ] | Radius: ${Math.floor(this.gameStats.radius)}`);
        });
        // 물리 그룹 초기화 (중복 제거 및 설정 통합)
        this.resources = this.physics.add.group({
            bounceX: 0.8, // 튕겨나가는 정도 (0~1)
            bounceY: 0.8,
            collideWorldBounds: false // 화면 밖으로 나가지 않게 설정
        });
        // 자원들끼리 충돌했을 때 튕기며 불꽃이 튀도록 설정
        this.physics.add.collider(this.resources, this.resources, (obj1, obj2) => {
            this.sparks.emitParticle(2, obj1.x, obj1.y);
        });
        // 카메라 렌더링 설정: 메인 카메라는 UI를 무시하고, UI 카메라는 월드를 무시함
        this.cameras.main.ignore(this.uiContainer);
        this.uiCamera.ignore(this.worldContainer);
        this.gameStats.emit('updateScore'); // Initial score update
    }
    spawnResource() {
        // 성능 최적화: 최대 객체 수를 넘으면 생성하지 않음
        if (this.resources.getLength() >= this.gameStats.maxResources) {
            return;
        }
        const { width, height } = this.scale;
        let x, y;
        // 0: 상, 1: 우, 2: 하, 3: 좌 테두리 중 무작위 선택
        const edge = Phaser.Math.Between(0, 3);
        if (edge === 0) { // 상단
            x = Phaser.Math.Between(0, width);
            y = 0;
        }
        else if (edge === 1) { // 우측
            x = width;
            y = Phaser.Math.Between(0, height);
        }
        else if (edge === 2) { // 하단
            x = Phaser.Math.Between(0, width);
            y = height;
        }
        else { // 좌측
            x = 0;
            y = Phaser.Math.Between(0, height);
        }
        const types = ['rock', 'wood', 'fish'];
        const type = types[Math.floor(Math.random() * types.length)];
        const icon = this.getResourceIcon(type);
        const resource = this.add.text(x, y, icon, { fontSize: '24px' }).setOrigin(0.5);
        // 물리 엔진 적용
        this.physics.add.existing(resource);
        this.resources.add(resource);
        this.worldContainer.add(resource);
        // 텍스트 크기를 즉시 계산하여 바디 위치를 정확히 잡음
        resource.updateText();
        const radius = 12;
        // 바디를 이모지 그래픽의 정중앙에 배치
        resource.body.setCircle(radius, (resource.width - radius * 2) / 2, (resource.height - radius * 2) / 2);
        //resource.body.setBounce(1,1); // 당구공처럼 완전 탄성 충돌 (에너지 보존)
        //resource.body.setDrag(0.95);
        //resource.body.useDamping = true; // 댐핑 모드 활성화로 부드러운 감속
        // 초기에는 무채색(어두운 틴트), 색상 해금 시 틴트 제거 (GameStats에서 관리)
        if (!this.gameStats.isColorUnlocked)
            resource.setTint(0x444444);
        resource.resourceType = type;
        resource.body.setMass(1); // 모든 자원에 동일한 질량 부여
        // 화면 안의 임의의 좌표를 향하도록 방향 설정
        const targetX = Phaser.Math.Between(0, width);
        const targetY = Phaser.Math.Between(0, height);
        const dir = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
        const speed = Phaser.Math.Between(200, 300);
        resource.body.setMaxSpeed(400);
        resource.body.setVelocity(dir.x * speed, dir.y * speed);
    }
    getResourceIcon(type) {
        switch (type) {
            case 'rock': return '🪨';
            case 'wood': return '🪵';
            case 'fish': return '🐟';
            default: return '✨';
        }
    }
    getResourceColor(type) {
        switch (type) {
            case 'rock': return 0xaaaaaa;
            case 'wood': return 0x8b4513;
            case 'fish': return 0x00ffff;
            default: return 0xffffff;
        }
    }
    update() {
        // 나선 영향력 경계선 그리기
        this.boundaryGraphics.clear();
        // 외부 인력 반경
        this.boundaryGraphics.lineStyle(2, 0xffffff, 0.1).setAlpha(0.5); // 투명도 추가
        this.boundaryGraphics.strokeCircle(this.spiralCenter.x, this.spiralCenter.y, this.gameStats.radius);
        // 내부 흡수 경계 (사건의 지평선 테두리)
        this.boundaryGraphics.lineStyle(2, 0x00ffff, 0.3);
        this.boundaryGraphics.strokeCircle(this.spiralCenter.x, this.spiralCenter.y, 15);
        // getChildren()은 현재 자식들의 복사본 배열을 반환하므로 순회 중 destroy해도 안전합니다.
        this.resources.getChildren().forEach((child) => {
            const res = child;
            let distanceToCenter = Phaser.Math.Distance.BetweenPoints(res, this.spiralCenter);
            if (distanceToCenter < this.gameStats.radius) {
                // 1. 인력 계산 (중심 방향)
                const direction = new Phaser.Math.Vector2(this.spiralCenter.x - res.x, this.spiralCenter.y - res.y).normalize();
                // 2. 회전력 계산 (수직 방향)
                const tangent = new Phaser.Math.Vector2(-direction.y, direction.x);
                // 3. 힘 조절 (가속은 낮게, 방향은 크게)
                const pullStrength = (1 - distanceToCenter / this.gameStats.radius) * this.gameStats.force;
                // 가속도(인력)를 낮게 설정 (지나치지 않게)
                const accelMagnitude = pullStrength * 50;
                // 방향 전환 계수를 대폭 상향 (나선형 궤도를 크게 그림)
                const spiralAngleFactor = 0.2;
                // 4. 속도 업데이트
                // 인력은 살짝만, 회전력은 강하게 주어 궤도를 돌게 함
                const forceX = (direction.x * accelMagnitude + tangent.x * accelMagnitude * spiralAngleFactor);
                const forceY = (direction.y * accelMagnitude + tangent.y * accelMagnitude * spiralAngleFactor);
                res.body.velocity.x += forceX;
                res.body.velocity.y += forceY;
                // 디버그 모드일 때 가속도 벡터 시각화
                if (this.physics.world.drawDebug) {
                    this.boundaryGraphics.lineStyle(2, 0x00ff00, 1); // 녹색 선
                    this.boundaryGraphics.lineBetween(res.x, res.y, res.x + forceX * 4, // 시각적 확인을 위해 길이를 10배 확대
                    res.y + forceY * 4);
                }
                // 5. 핵심: 지나침 방지를 위한 감속 (Damping)
                // 중심에 가까워질수록 물리적 저항을 주어 속도를 줄입니다.
                if (distanceToCenter < 150) {
                    res.body.setDrag(500, 500); // 중심 근처에서 끈적하게 감속
                }
                else {
                    res.body.setDrag(0); // 평소엔 적당한 저항
                }
            }
            // 흡수 판정 (흡수되면 루프 종료)
            if (distanceToCenter < 30) {
                this.collectResource(res);
                return;
            }
            // 화면 밖으로 너무 멀리 나가면 제거
            if (distanceToCenter > 1200) {
                res.destroy();
                return;
            }
        });
    }
    collectResource(resource) {
        this.gameStats.addCollected(resource.resourceType);
        // 특정 자원 이상 모으면 색상 해금 (예시)
        if (!this.gameStats.isColorUnlocked && this.gameStats.collected.rock > 10) {
            this.gameStats.unlockColors();
        }
        resource.destroy();
        // 흡수 효과 (간단한 카메라 흔들림 등)
        this.cameras.main.shake(100, 0.001);
        // Listen for color unlock event from GameStats
        this.gameStats.once('colorsUnlocked', this.onColorsUnlocked, this);
    }
    onColorsUnlocked() {
        this.cameras.main.flash(1000, 255, 255, 255);
        this.resources.getChildren().forEach((child) => {
            child.clearTint();
        });
    }
}
