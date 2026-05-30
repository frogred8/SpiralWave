import type { UniqueArtifactData } from './Types';

export const UNIQUE_ARTIFACTS: UniqueArtifactData[] = [
    {
        id: 'fever_core',
        effects: [
            { property: 'feverScoreMultiplier', value: 0.5, mode: 'add' },
            { property: 'feverTimeRecovery', value: 0.1, mode: 'add' }
        ]
    },
    {
        id: 'dense_singularity',
        effects: [
            { property: 'armBlackHoleRadius', value: 30, mode: 'add' },
            { property: 'armBlackHoleForceMultiplier', value: 0.25, mode: 'add' }
        ]
    },
    {
        id: 'research_lens',
        effects: [
            { property: 'researchBonus', value: 1, mode: 'add' }
        ]
    }
];
