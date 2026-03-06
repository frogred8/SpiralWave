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
    // 로봇팔 관련 변수
    roboticArmGraphics;
    arms = [];
    // 게임 상태 변수
    constructor() {
        super('GameScene');
    }
    preload() {
        this.load.json('skillTreeData', 'SKILLTREE.json');
    }
    create() {
        const { width, height } = this.scale;
        this.spiralCenter = new Phaser.Math.Vector2(width / 2, height / 2);
        const skillData = this.cache.json.get('skillTreeData');
        this.gameStats = new GameStats(skillData);
        // 로봇팔 초기화
        for (let i = 0; i < 5; i++) {
            this.arms.push({
                state: 'idle',
                target: new Phaser.Math.Vector2(),
                grabbedResource: null,
                extensionProgress: 0,
                lastFireTime: 0
            });
        }
        // 월드와 UI를 분리하여 관리하기 위한 컨테이너 생성
        this.worldContainer = this.add.container(0, 0);
        this.uiContainer = this.add.container(0, 0);
        // 로봇팔 그래픽 객체 초기화
        this.roboticArmGraphics = this.add.graphics();
        this.worldContainer.add(this.roboticArmGraphics);
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
        // 물체가 강한 힘에 의해 겹쳤을 때 분리하는 로직 강화
        this.physics.world.OVERLAP_BIAS = 100;
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
        this.skillTreeUI = new SkillTreeUI(this, this.uiContainer, this.gameStats, skillData);
        this.gameStats.on('updateScore', () => {
            if (this.gameStats.isInitialPhase) {
                infoText.setText(`[ RED: ${this.gameStats.collectedTriangles.red}/10 ]  [ BLUE: ${this.gameStats.collectedTriangles.blue}/10 ]  [ YELLOW: ${this.gameStats.collectedTriangles.yellow}/10 ]`);
            }
            else {
                infoText.setText(`[ WOOD: ${this.gameStats.collected.wood} ]  [ ROCK: ${this.gameStats.collected.rock} ]  [ IRON: ${this.gameStats.collected.iron} ] | Radius: ${Math.floor(this.gameStats.radius)} | Arms: ${this.gameStats.maxArms} | Speed: ${this.gameStats.armSpeedFactor.toFixed(1)}x`);
            }
        });
        this.gameStats.on('initialPhaseComplete', () => {
            this.gameStats.unlockColors();
            this.cameras.main.flash(500, 255, 255, 255);
        });
        // 물리 그룹 초기화 (중복 제거 및 설정 통합)
        this.resources = this.physics.add.group({
            bounceX: 0.8, // 튕겨나가는 정도 (0~1)
            bounceY: 0.8,
            collideWorldBounds: false // 화면 밖으로 나가지 않게 설정
        });
        // 자원들끼리 충돌했을 때 튕기며 불꽃이 튀도록 설정
        this.physics.add.collider(this.resources, this.resources, (obj1, obj2) => {
            const r1 = obj1;
            const r2 = obj2;
            this.sparks.emitParticle(2, r1.x, r1.y);
            // Sticking 버그 방지: 충돌 시 서로를 반대 방향으로 밀어내는 추가 힘 적용
            const angle = Phaser.Math.Angle.Between(r1.x, r1.y, r2.x, r2.y);
            const pushForce = 150;
            r1.body.velocity.x -= Math.cos(angle) * pushForce;
            r1.body.velocity.y -= Math.sin(angle) * pushForce;
            r2.body.velocity.x += Math.cos(angle) * pushForce;
            r2.body.velocity.y += Math.sin(angle) * pushForce;
        });
        // 카메라 렌더링 설정: 메인 카메라는 UI를 무시하고, UI 카메라는 월드를 무시함
        this.cameras.main.ignore(this.uiContainer);
        this.uiCamera.ignore(this.worldContainer);
        this.gameStats.emit('updateScore'); // Initial score update
        // 로봇팔 발사 이벤트 리스너
        this.input.on('pointerdown', this.fireRoboticArm, this);
    }
    fireRoboticArm(pointer) {
        // 현재 사용 중인 팔 개수 계산
        const activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
        // 업그레이드된 최대 팔 개수를 초과하면 발사 불가
        if (activeArmsCount >= this.gameStats.maxArms) {
            return;
        }
        // 사용 가능한(idle) 팔 하나 선택
        const arm = this.arms.find(a => a.state === 'idle');
        if (!arm)
            return;
        let closestResource = null;
        let minDistance = 200; // 최대 탐색 반경
        this.resources.getChildren().forEach((child) => {
            const resource = child;
            if (!resource.active)
                return;
            // 이미 다른 팔에 잡힌 자원은 제외
            const isAlreadyGrabbed = this.arms.some(a => a.grabbedResource === resource);
            if (isAlreadyGrabbed)
                return;
            const distance = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, resource.x, resource.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestResource = resource;
            }
        });
        if (closestResource) {
            arm.state = 'extending';
            arm.grabbedResource = closestResource;
            arm.extensionProgress = 0;
            arm.target.copy(this.spiralCenter);
        }
    }
    spawnResource() {
        if (this.resources.getLength() >= 300) {
            return;
        }
        if (this.gameStats.isInitialPhase) {
            this.spawnTriangle();
            return;
        }
        const { width, height } = this.scale;
        let x, y;
        const edge = Phaser.Math.Between(0, 3);
        if (edge === 0) {
            x = Phaser.Math.Between(0, width);
            y = 0;
        }
        else if (edge === 1) {
            x = width;
            y = Phaser.Math.Between(0, height);
        }
        else if (edge === 2) {
            x = Phaser.Math.Between(0, width);
            y = height;
        }
        else {
            x = 0;
            y = Phaser.Math.Between(0, height);
        }
        const types = ['rock', 'wood', 'iron'];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        // 10% + Upgrade 확률로 상위 차원 자원 생성
        const isHighDim = Math.random() < this.gameStats.highDimProb;
        const fontSize = isHighDim ? '60px' : '24px';
        const icon = this.getResourceIcon(type);
        const resource = this.add.text(x, y, icon, {
            fontSize,
            padding: { top: 20, bottom: 20, left: 10, right: 10 },
            testString: '|MÉq_y' // Helps with emoji metrics
        }).setOrigin(0.5);
        resource.isHighDim = isHighDim;
        // 물리 엔진 적용
        this.physics.add.existing(resource);
        this.resources.add(resource);
        this.worldContainer.add(resource);
        resource.updateText();
        const radius = isHighDim ? 30 : 12; // 크기 2.5배 반영
        resource.body.setCircle(radius, (resource.width - radius * 2) / 2, (resource.height - radius * 2) / 2);
        if (!this.gameStats.isColorUnlocked) {
            resource.setTint(0x444444);
        }
        resource.resourceType = type;
        resource.body.setMass(isHighDim ? 3 : 1); // 질량 3배
        const targetX = Phaser.Math.Between(0, width);
        const targetY = Phaser.Math.Between(0, height);
        const dir = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
        const baseSpeed = Phaser.Math.Between(200, 300);
        const speed = isHighDim ? baseSpeed * 0.5 : baseSpeed; // 2배 천천히 이동
        resource.body.setMaxSpeed(400);
        resource.body.setVelocity(dir.x * speed, dir.y * speed);
    }
    spawnTriangle() {
        const { width, height } = this.scale;
        let x, y;
        const edge = Phaser.Math.Between(0, 3);
        if (edge === 0) {
            x = Phaser.Math.Between(0, width);
            y = 0;
        }
        else if (edge === 1) {
            x = width;
            y = Phaser.Math.Between(0, height);
        }
        else if (edge === 2) {
            x = Phaser.Math.Between(0, width);
            y = height;
        }
        else {
            x = 0;
            y = Phaser.Math.Between(0, height);
        }
        const colors = [
            { name: 'red', value: 0xff0000 },
            { name: 'blue', value: 0x0000ff },
            { name: 'yellow', value: 0xffff00 }
        ];
        const color = colors[Phaser.Math.Between(0, colors.length - 1)];
        // 삼각형 생성 (정삼각형 모양, 바운딩 박스 20x20)
        const triangle = this.add.triangle(x, y, 0, 20, 10, 0, 20, 20, color.value);
        triangle.itemType = 'triangle';
        triangle.triangleColor = color.name;
        this.physics.add.existing(triangle);
        this.resources.add(triangle);
        this.worldContainer.add(triangle);
        triangle.body.setCircle(10);
        triangle.body.setMass(1);
        const targetX = Phaser.Math.Between(0, width);
        const targetY = Phaser.Math.Between(0, height);
        const dir = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
        // 천천히 이동
        const speed = Phaser.Math.Between(50, 100);
        triangle.body.setVelocity(dir.x * speed, dir.y * speed);
        // 천천히 회전
        this.tweens.add({
            targets: triangle,
            angle: 360,
            duration: Phaser.Math.Between(2000, 4000),
            repeat: -1
        });
    }
    getResourceIcon(type) {
        switch (type) {
            case 'rock': return '🪨';
            case 'wood': return '🪵';
            case 'iron': return '🪙';
            default: return '✨';
        }
    }
    getResourceColor(type) {
        switch (type) {
            case 'rock': return 0xaaaaaa;
            case 'wood': return 0x8b4513;
            case 'iron': return 0x778899;
            default: return 0xffffff;
        }
    }
    update(time, delta) {
        const skillData = this.cache.json.get('skillTreeData');
        this.gameStats.update(delta, skillData);
        // 모든 로봇팔 그리기 및 업데이트
        this.roboticArmGraphics.clear();
        this.arms.forEach(arm => {
            if (arm.state === 'extending' && arm.grabbedResource) {
                // 실시간 추적: 자원의 현재 위치를 향해 팔이 길어짐
                const factor = this.gameStats.armSpeedFactor;
                const distanceToTarget = Phaser.Math.Distance.Between(this.spiralCenter.x, this.spiralCenter.y, arm.grabbedResource.x, arm.grabbedResource.y);
                // 일정한 확장 속도 (초당 600픽셀 * 속도 배율)
                const baseExtendSpeed = 600;
                const extensionStep = (baseExtendSpeed * factor * (delta / 1000)) / Math.max(distanceToTarget, 1);
                arm.extensionProgress = Math.min(1, arm.extensionProgress + extensionStep);
                arm.target.x = this.spiralCenter.x + (arm.grabbedResource.x - this.spiralCenter.x) * arm.extensionProgress;
                arm.target.y = this.spiralCenter.y + (arm.grabbedResource.y - this.spiralCenter.y) * arm.extensionProgress;
                if (arm.extensionProgress >= 1) {
                    // 자원에 도달함: 잡기 상태로 전환
                    arm.state = 'retracting';
                    arm.grabbedResource.body.setEnable(false); // 잡은 이후에는 물리 효과 정지
                    const isHighDim = ('itemType' in arm.grabbedResource && arm.grabbedResource.itemType === 'triangle') ? false : arm.grabbedResource.isHighDim;
                    const distance = Phaser.Math.Distance.Between(arm.target.x, arm.target.y, this.spiralCenter.x, this.spiralCenter.y);
                    // 일정한 회수 속도 (초당 800픽셀 * 속도 배율)
                    // 상위 차원 자원은 4배 더 무겁게 설정 (200픽셀/초)
                    const baseRetractSpeed = 800;
                    const speedMultiplier = isHighDim ? 0.25 : 1.0;
                    const retractDuration = (distance / (baseRetractSpeed * factor * speedMultiplier)) * 1000;
                    this.tweens.add({
                        targets: arm.target,
                        x: this.spiralCenter.x,
                        y: this.spiralCenter.y,
                        duration: retractDuration,
                        ease: 'Linear', // 일정한 속도를 위해 Linear로 변경
                        onComplete: () => {
                            if (arm.grabbedResource) {
                                this.collectResource(arm.grabbedResource, true);
                                arm.grabbedResource = null;
                            }
                            arm.state = 'idle';
                            arm.extensionProgress = 0;
                        }
                    });
                }
            }
            if (arm.state !== 'idle') {
                this.roboticArmGraphics.lineStyle(3, 0x999999, 0.8);
                this.roboticArmGraphics.lineBetween(this.spiralCenter.x, this.spiralCenter.y, arm.target.x, arm.target.y);
                // 집게 모양 그리기
                this.roboticArmGraphics.fillStyle(0xcccccc, 1);
                this.roboticArmGraphics.fillCircle(arm.target.x, arm.target.y, 8);
                if (arm.state === 'retracting' && arm.grabbedResource) {
                    arm.grabbedResource.setPosition(arm.target.x, arm.target.y);
                }
            }
        });
        // 자동 로봇팔 로직
        if (this.gameStats.isAutoArmEnabled) {
            const activeArmsCount = this.arms.filter(a => a.state !== 'idle').length;
            if (activeArmsCount < this.gameStats.maxArms) {
                // 발사 가능한(idle이며 쿨타임이 지난) 모든 팔에 대해 시도
                this.arms.forEach(arm => {
                    if (arm.state === 'idle' && time > arm.lastFireTime + 5000) {
                        let bestHighDim = null;
                        let bestNormal = null;
                        let minHighDimDist = 400;
                        let minNormalDist = 400;
                        this.resources.getChildren().forEach((child) => {
                            const collectible = child;
                            if (!collectible.active)
                                return;
                            const isAlreadyGrabbed = this.arms.some(a => a.grabbedResource === collectible);
                            if (isAlreadyGrabbed)
                                return;
                            const distance = Phaser.Math.Distance.Between(this.spiralCenter.x, this.spiralCenter.y, collectible.x, collectible.y);
                            const isHighDim = ('itemType' in collectible && collectible.itemType === 'triangle') ? false : collectible.isHighDim;
                            if (isHighDim) {
                                if (distance < minHighDimDist) {
                                    minHighDimDist = distance;
                                    bestHighDim = collectible;
                                }
                            }
                            else {
                                if (distance < minNormalDist) {
                                    minNormalDist = distance;
                                    bestNormal = collectible;
                                }
                            }
                        });
                        // 큰 자원 우선, 없으면 일반 자원
                        const targetResource = bestHighDim || bestNormal;
                        if (targetResource) {
                            arm.state = 'extending';
                            arm.grabbedResource = targetResource;
                            arm.extensionProgress = 0;
                            arm.target.copy(this.spiralCenter);
                            arm.lastFireTime = time; // 개별 팔 발사 시간 갱신
                        }
                    }
                });
            }
        }
        // 나선 영향력 경계선 그리기
        this.boundaryGraphics.clear();
        this.boundaryGraphics.lineStyle(2, 0xffffff, 0.1).setAlpha(0.5);
        this.boundaryGraphics.strokeCircle(this.spiralCenter.x, this.spiralCenter.y, this.gameStats.radius);
        this.boundaryGraphics.lineStyle(2, 0x00ffff, 0.3);
        this.boundaryGraphics.strokeCircle(this.spiralCenter.x, this.spiralCenter.y, 15);
        this.resources.getChildren().forEach((child) => {
            const res = child;
            const isGrabbedByAnyArm = this.arms.some(a => a.grabbedResource === res);
            if (!res || res.active === false || isGrabbedByAnyArm) {
                return;
            }
            let distanceToCenter = Phaser.Math.Distance.BetweenPoints(res, this.spiralCenter);
            if (distanceToCenter < this.gameStats.radius) {
                const direction = new Phaser.Math.Vector2(this.spiralCenter.x - res.x, this.spiralCenter.y - res.y).normalize();
                const tangent = new Phaser.Math.Vector2(-direction.y, direction.x);
                // 중력 가속도 계산: 질량에 상관없이 동일한 가속도를 가짐 (실제 물리 법칙 반영)
                const distanceFactor = 1 - (distanceToCenter / this.gameStats.radius);
                const pullStrength = distanceFactor * this.gameStats.force;
                // 기본 가속도 (기존 150 -> 90으로 60% 축소)
                let accelMagnitude = pullStrength * 90;
                if (distanceToCenter < 150) {
                    // 중심에 가까울수록 흡수력을 기하급수적으로 강화
                    const boost = Math.pow((150 - distanceToCenter) / 150, 2) * 5;
                    accelMagnitude *= (1 + boost);
                }
                // 나선형 회전 계수: 중심에 가까울수록 회전력을 급격히 줄임
                const spiralAngleFactor = 0.2 * Math.pow(distanceToCenter / this.gameStats.radius, 2);
                const forceX = (direction.x * accelMagnitude + tangent.x * accelMagnitude * spiralAngleFactor);
                const forceY = (direction.y * accelMagnitude + tangent.y * accelMagnitude * spiralAngleFactor);
                res.body.velocity.x += forceX;
                res.body.velocity.y += forceY;
                if (distanceToCenter < 150) {
                    // 드래그를 질량에 비례하게 적용하여 큰 물체도 속도가 잘 줄어들게 함
                    const dragValue = 50 * res.body.mass;
                    res.body.setDrag(dragValue, dragValue);
                }
                else {
                    res.body.setDrag(0);
                }
            }
            // 큰 자원(isHighDim)은 크기가 크므로 수집 범위를 넓힘 (30 -> 45)
            const isHighDim = !('itemType' in res && res.itemType === 'triangle') && res.isHighDim;
            const collectionRadius = isHighDim ? 45 : 30;
            if (distanceToCenter < collectionRadius) {
                this.collectResource(res);
                return;
            }
            if (distanceToCenter > 1200) {
                res.destroy();
                return;
            }
            // 속도 제한 로직: 60% 수준으로 하향 조정 (400 -> 240, 50 -> 30)
            const effectiveMinSpeed = distanceToCenter < 100 ? 10 : 30;
            const maxSpeed = 240;
            const velocity = res.body.velocity;
            const speedSq = velocity.lengthSq();
            if (speedSq > maxSpeed * maxSpeed) {
                velocity.normalize().scale(maxSpeed);
            }
            else if (speedSq < effectiveMinSpeed * effectiveMinSpeed) {
                if (speedSq === 0) {
                    const randomAngle = Math.random() * Math.PI * 2;
                    res.body.setVelocity(Math.cos(randomAngle) * effectiveMinSpeed, Math.sin(randomAngle) * effectiveMinSpeed);
                }
                else {
                    velocity.normalize().scale(effectiveMinSpeed);
                }
            }
        });
    }
    collectResource(collectible, byArm = false) {
        if (!collectible || collectible.active === false) {
            console.warn('Cannot collect invalid item');
            return;
        }
        if ('itemType' in collectible && collectible.itemType === 'triangle') {
            this.gameStats.addTriangle(collectible.triangleColor);
            collectible.destroy();
            this.cameras.main.shake(50, 0.001);
            return;
        }
        const resource = collectible;
        // 상위 차원 자원은 5배 지급
        const amount = resource.isHighDim ? 5 : 1;
        this.gameStats.addCollected(resource.resourceType, amount);
        // 로봇팔로 채취 시 10% 확률로 연구 시간 1초 단축
        if (byArm && Math.random() < 0.1) {
            this.gameStats.reduceResearchTime(1);
        }
        if (!this.gameStats.isColorUnlocked && this.gameStats.collected.rock > 10) {
            this.gameStats.unlockColors();
        }
        resource.destroy();
        this.cameras.main.shake(100, 0.001);
        this.gameStats.once('colorsUnlocked', this.onColorsUnlocked, this);
    }
    onColorsUnlocked() {
        this.cameras.main.flash(1000, 255, 255, 255);
        const children = this.resources.getChildren();
        if (children && Array.isArray(children)) {
            children.forEach((child) => {
                const resource = child;
                if (resource && resource.active !== false) {
                    resource.clearTint();
                }
            });
        }
    }
}
