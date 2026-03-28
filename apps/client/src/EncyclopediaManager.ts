import { ENCYCLOPEDIA_DATA } from '@shared/Constants';

export class EncyclopediaManager {
    private static instance: EncyclopediaManager;
    private discoveredIds: Set<string> = new Set();
    private readonly STORAGE_KEY = 'spiralwave_encyclopedia';

    private constructor() {
        this.loadDiscovery();
    }

    public static getInstance(): EncyclopediaManager {
        if (!EncyclopediaManager.instance) {
            EncyclopediaManager.instance = new EncyclopediaManager();
        }
        return EncyclopediaManager.instance;
    }

    private loadDiscovery() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const ids = JSON.parse(saved);
                if (Array.isArray(ids)) {
                    this.discoveredIds = new Set(ids);
                }
            } catch (e) {
                console.error('Failed to load encyclopedia discovery', e);
            }
        }
    }

    private saveDiscovery() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.discoveredIds)));
    }

    public discover(id: string) {
        if (!this.discoveredIds.has(id)) {
            this.discoveredIds.add(id);
            this.saveDiscovery();
            return true;
        }
        return false;
    }

    public isDiscovered(id: string): boolean {
        return this.discoveredIds.has(id);
    }

    public getDiscoveredCount(): number {
        return this.discoveredIds.size;
    }

    public getTotalCount(): number {
        return ENCYCLOPEDIA_DATA.length;
    }
}
