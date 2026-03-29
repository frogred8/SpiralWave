import Phaser from 'phaser';
import { Utils } from '@shared/Utils';
import { Collectible } from '@repo/shared';
import { GameStats } from '@shared/GameStats';
import { PHYSICS_CONFIG } from '@shared/Constants';
import { getResourceMetadata } from './ResourceRegistry';
import { OrbitState, Resource, Satellite } from './OrbitTypes';

interface OrbitSystemOptions {
    satelliteCount?: number;
    orbitRadius?: number;
    gravityRadius?: number;
    collectionRadius?: number;
    angularVelocity?: number;
}

const DEFAULT_OPTIONS: Required<OrbitSystemOptions> = {
    satelliteCount: 0,
    orbitRadius: 150,
    gravityRadius: 110,
    collectionRadius: 22,
    angularVelocity: Phaser.Math.DegToRad(20)
};

export class OrbitSystem {
    private scene: Phaser.Scene;
    private worldContainer: Phaser.GameObjects.Container;
    private gameStats: GameStats;
    private getOrbitBaseRadius: () => number;
    private resourceProvider: () => Phaser.GameObjects.GameObject[];
    private collectResource: (resource: Collectible, centerX?: number, centerY?: number) => void;
    private orbitState: OrbitState;

    constructor(
        scene: Phaser.Scene,
        worldContainer: Phaser.GameObjects.Container,
        center: Phaser.Math.Vector2,
        gameStats: GameStats,
        getOrbitBaseRadius: () => number,
        resourceProvider: () => Phaser.GameObjects.GameObject[],
        collectResource: (resource: Collectible, centerX?: number, centerY?: number) => void,
        options: OrbitSystemOptions = {}
    ) {
        this.scene = scene;
        this.worldContainer = worldContainer;
        this.gameStats = gameStats;
        this.getOrbitBaseRadius = getOrbitBaseRadius;
        this.resourceProvider = resourceProvider;
        this.collectResource = collectResource;

        const config = { ...DEFAULT_OPTIONS, ...options };
        this.orbitState = {
            center,
            satellites: [],
            elapsedMs: 0
        };

        this.createSatellites(config);
    }

    public setSatelliteCount(satelliteCount: number) {
        const currentCount = this.orbitState.satellites.length;
        if (currentCount === satelliteCount) return;

        if (satelliteCount <= 0) {
            this.clear();
            return;
        }

        const options = {
            ...DEFAULT_OPTIONS,
            satelliteCount
        };

        if (currentCount === 0 || satelliteCount < currentCount) {
            this.clear();
            this.createSatellites(options);
            return;
        }

        while (this.orbitState.satellites.length < satelliteCount) {
            this.createSatellite(this.getNextSatelliteAngle(), options);
        }
    }

    public update(delta: number) {
        const deltaSeconds = delta / 1000;
        this.orbitState.elapsedMs += delta;

        this.orbitState.satellites.forEach((satellite) => {
            satellite.angle += satellite.angularVelocity * deltaSeconds;
            this.positionSatellite(satellite);
        });
    }

    public clear() {
        this.orbitState.satellites.forEach((satellite) => satellite.destroy());
        this.orbitState.satellites = [];
    }

    public resetResourceState() {
        this.resourceProvider().forEach((child) => {
            const resource = child as Resource;
            if (resource.active && resource.orbitCollectionState === 'attracted') {
                resource.orbitCollectionState = 'floating';
            }
        });
    }

    public isAttracting(resource: Collectible): boolean {
        return (resource as Resource).orbitCollectionState === 'attracted';
    }

    public handleResourceGravity(resource: Resource): boolean {
        if (!resource.active || resource.itemType === 'special' || resource.isBeingPulled) return false;

        const nearest = this.getNearestSatellite(resource);
        if (!nearest) {
            if (resource.orbitCollectionState === 'attracted') {
                resource.orbitCollectionState = 'floating';
            }
            return false;
        }

        resource.orbitCollectionState = 'attracted';

        if (resource.body && resource.body.enable) {
            Utils.applyGravityToPoint(
                resource,
                nearest.distance,
                nearest.satellite.gravityRadius,
                nearest.satellite.x,
                nearest.satellite.y,
                this.gameStats.force * 0.5,
                PHYSICS_CONFIG.ACCEL_BASE,
                PHYSICS_CONFIG.DRAG_BASE
            );
            Utils.limitSpeed(resource, nearest.distance, PHYSICS_CONFIG.MIN_SPEED_NEAR_CENTER, PHYSICS_CONFIG.MIN_SPEED_NORMAL, PHYSICS_CONFIG.MAX_SPEED);
        }

        if (nearest.distance <= nearest.satellite.collectionRadius) {
            resource.orbitCollectionState = 'collected';
            this.collectResource(resource, nearest.satellite.x, nearest.satellite.y);
            return true;
        }

        return true;
    }

    private createSatellites(options: Required<OrbitSystemOptions>) {
        if (options.satelliteCount <= 0) return;

        for (let index = 0; index < options.satelliteCount; index++) {
            const angle = (Math.PI * 2 * index) / options.satelliteCount;
            this.createSatellite(angle, options);
        }
    }

    private createSatellite(angle: number, options: Required<OrbitSystemOptions>) {
        const metadata = getResourceMetadata('satellite');
        const satellite = this.scene.add.container(0, 0) as Satellite;
        satellite.orbitRadius = options.orbitRadius;
        satellite.angle = angle;
        satellite.angularVelocity = options.angularVelocity;
        satellite.gravityRadius = options.gravityRadius;
        satellite.collectionRadius = options.collectionRadius;

        const boundary = this.scene.add.circle(0, 0, satellite.gravityRadius, 0x333333, 0.15)
            .setStrokeStyle(1, 0x666666, 0.35);
        const swirl = this.scene.add.circle(0, 0, 16, metadata.tint, 0.14)
            .setStrokeStyle(1, metadata.tint, 0.45);
        const core = this.scene.add.circle(0, 0, 7, 0x000000, 1);

        satellite.add([boundary, swirl, core]);
        this.worldContainer.add(satellite);
        this.positionSatellite(satellite);

        this.scene.tweens.add({
            targets: swirl,
            angle: 360,
            duration: 2200,
            repeat: -1
        });

        this.orbitState.satellites.push(satellite);
    }

    private positionSatellite(satellite: Satellite) {
        const orbitDistance = this.getOrbitBaseRadius() + satellite.gravityRadius;
        satellite.x = this.orbitState.center.x + orbitDistance * Math.cos(satellite.angle);
        satellite.y = this.orbitState.center.y + orbitDistance * Math.sin(satellite.angle);
    }

    private getNextSatelliteAngle() {
        if (this.orbitState.satellites.length === 0) return 0;

        const sortedAngles = this.orbitState.satellites
            .map((satellite) => Phaser.Math.Angle.Normalize(satellite.angle))
            .sort((left, right) => left - right);

        let largestGap = -1;
        let nextAngle = sortedAngles[0];

        for (let index = 0; index < sortedAngles.length; index++) {
            const currentAngle = sortedAngles[index];
            const nextIndex = (index + 1) % sortedAngles.length;
            const followingAngle = nextIndex === 0
                ? sortedAngles[0] + Math.PI * 2
                : sortedAngles[nextIndex];
            const gap = followingAngle - currentAngle;

            if (gap > largestGap) {
                largestGap = gap;
                nextAngle = currentAngle + gap / 2;
            }
        }

        return Phaser.Math.Angle.Normalize(nextAngle);
    }

    private getNearestSatellite(resource: Resource): { satellite: Satellite; distance: number } | null {
        let nearest: { satellite: Satellite; distance: number } | null = null;

        this.orbitState.satellites.forEach((satellite) => {
            const distance = Utils.getDistance(resource.x, resource.y, satellite.x, satellite.y);
            if (distance > satellite.gravityRadius) return;

            if (!nearest || distance < nearest.distance) {
                nearest = { satellite, distance };
            }
        });

        return nearest;
    }
}
