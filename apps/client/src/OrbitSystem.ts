import Phaser from 'phaser';
import { Utils } from '@shared/Utils';
import { Collectible } from '@repo/shared';
import { getResourceMetadata } from './ResourceRegistry';
import { OrbitState, Resource, Satellite } from './OrbitTypes';

interface OrbitSystemOptions {
    satelliteCount?: number;
    orbitRadius?: number;
    gravityRadius?: number;
    collectionRadius?: number;
    angularVelocity?: number;
}

interface SatelliteGravityConfig {
    gravityRadius: number;
    collectionRadius: number;
    pullStrength: number;
}

const DEFAULT_OPTIONS: Required<OrbitSystemOptions> = {
    satelliteCount: 2,
    orbitRadius: 150,
    gravityRadius: 110,
    collectionRadius: 22,
    angularVelocity: Phaser.Math.DegToRad(30)
};

export class OrbitSystem {
    private scene: Phaser.Scene;
    private worldContainer: Phaser.GameObjects.Container;
    private resourceProvider: () => Phaser.GameObjects.GameObject[];
    private collectResource: (resource: Collectible, centerX?: number, centerY?: number) => void;
    private orbitState: OrbitState;

    constructor(
        scene: Phaser.Scene,
        worldContainer: Phaser.GameObjects.Container,
        center: Phaser.Math.Vector2,
        resourceProvider: () => Phaser.GameObjects.GameObject[],
        collectResource: (resource: Collectible, centerX?: number, centerY?: number) => void,
        options: OrbitSystemOptions = {}
    ) {
        this.scene = scene;
        this.worldContainer = worldContainer;
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

    public update(delta: number) {
        const deltaSeconds = delta / 1000;
        this.orbitState.elapsedMs += delta;

        this.orbitState.satellites.forEach((satellite) => {
            satellite.angle += satellite.angularVelocity * deltaSeconds;

            satellite.x = this.orbitState.center.x + satellite.orbitRadius * Math.cos(satellite.angle);
            satellite.y = this.orbitState.center.y + satellite.orbitRadius * Math.sin(satellite.angle);
        });

        this.applyGravityWells({
            gravityRadius: DEFAULT_OPTIONS.gravityRadius,
            collectionRadius: DEFAULT_OPTIONS.collectionRadius,
            pullStrength: 180
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

    private createSatellites(options: Required<OrbitSystemOptions>) {
        const metadata = getResourceMetadata('satellite');

        for (let index = 0; index < options.satelliteCount; index++) {
            const angle = (Math.PI * 2 * index) / options.satelliteCount;
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
            const icon = this.scene.add.text(0, -20, metadata.icon, { fontSize: '18px' }).setOrigin(0.5);

            satellite.add([boundary, swirl, core, icon]);
            this.worldContainer.add(satellite);

            this.scene.tweens.add({
                targets: swirl,
                angle: 360,
                duration: 2200,
                repeat: -1
            });

            this.orbitState.satellites.push(satellite);
        }
    }

    private applyGravityWells(config: SatelliteGravityConfig) {
        this.resourceProvider().forEach((child) => {
            const resource = child as Resource;
            if (!resource.active || resource.itemType === 'special' || resource.isBeingPulled) return;

            const nearest = this.getNearestSatellite(resource);
            if (!nearest) {
                if (resource.orbitCollectionState === 'attracted') {
                    resource.orbitCollectionState = 'floating';
                }
                return;
            }

            resource.orbitCollectionState = 'attracted';

            if (resource.body && resource.body.enable) {
                const angle = Phaser.Math.Angle.Between(resource.x, resource.y, nearest.satellite.x, nearest.satellite.y);
                const pullSpeed = Phaser.Math.Linear(config.pullStrength, config.pullStrength * 1.8, 1 - nearest.distance / nearest.satellite.gravityRadius);
                resource.body.velocity.x = Math.cos(angle) * pullSpeed;
                resource.body.velocity.y = Math.sin(angle) * pullSpeed;
                resource.body.setDrag(180);
            }

            if (nearest.distance <= nearest.satellite.collectionRadius) {
                resource.orbitCollectionState = 'collected';
                this.collectResource(resource, nearest.satellite.x, nearest.satellite.y);
            }
        });
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
