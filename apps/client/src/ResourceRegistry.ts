import { ResourceType, SpecialItemType } from './Types';

export type ResourceRegistryKey = ResourceType | SpecialItemType | 'satellite';

export interface ResourceMetadata {
    key: ResourceRegistryKey;
    name: string;
    description: string;
    icon: string;
    tint: number;
}

export const RESOURCE_METADATA: Record<ResourceRegistryKey, ResourceMetadata> = {
    rock: {
        key: 'rock',
        name: 'Rock',
        description: 'Dense mineral debris that drifts toward gravity wells and converts into score when collected.',
        icon: '🪨',
        tint: 0xaaaaaa
    },
    wood: {
        key: 'wood',
        name: 'Wood',
        description: 'Light salvage material that is common, fast to gather, and feeds early progression.',
        icon: '🪵',
        tint: 0x8b4513
    },
    whitehole: {
        key: 'whitehole',
        name: 'White Hole',
        description: 'A volatile anomaly that erupts fresh resources around its core for a short duration.',
        icon: '🌀',
        tint: 0xffffff
    },
    boost: {
        key: 'boost',
        name: 'Boost Charge',
        description: 'A temporary radius amplifier that expands the black hole collection boundary.',
        icon: '⚡',
        tint: 0x00ffff
    },
    resourceBomb: {
        key: 'resourceBomb',
        name: 'Resource Bomb',
        description: 'Alien-thrown payload that bursts into rich resources when activated.',
        icon: '💣',
        tint: 0xffdd55
    },
    satellite: {
        key: 'satellite',
        name: 'Orbital Satellite',
        description: 'A collection drone that revolves around the black hole and pulls nearby resources inward.',
        icon: '🛰️',
        tint: 0x7dddff
    }
};

export function getResourceMetadata(key: string): ResourceMetadata {
    return RESOURCE_METADATA[key as ResourceRegistryKey] ?? {
        key: 'satellite',
        name: 'Unknown Entity',
        description: 'Fallback metadata for unsupported resource entities.',
        icon: '✨',
        tint: 0xffffff
    };
}
