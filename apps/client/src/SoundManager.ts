import { Howl, Howler } from 'howler';

/**
 * SoundManager handles sound effect playback using howler.js.
 */
export class SoundManager {
    private static instance: SoundManager;
    private sounds: Map<string, Howl> = new Map();
    private playingCounts: Map<string, number> = new Map();
    private volume: number = 0.15;
    private muted: boolean = false;

    private constructor() {
        // Initialize with sounds from the sounds folder
        this.loadSound('gather', 'sounds/gather.mp3', false, 0.1);
        this.loadSound('skilllevelup', 'sounds/skilllevelup.mp3');
        this.loadSound('skillupgrade', 'sounds/skillupgrade.mp3');
        this.loadSound('reroll', 'sounds/reroll.mp3');
        this.loadSound('gamestart', 'sounds/gamestart.mp3');
        this.loadSound('restart', 'sounds/restart.mp3');
        this.loadSound('winning', 'sounds/winning.mp3', false, 0.1);
        this.loadSound('specialitem', 'sounds/specialitem.mp3', false, 0.3);
        this.loadSound('background', 'sounds/background.mp3', true, 0.2);
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    /**
     * Toggles global mute state.
     */
    public toggleMute(): boolean {
        this.muted = !this.muted;
        Howler.mute(this.muted);
        return this.muted;
    }

    /**
     * Returns the current mute state.
     */
    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Loads a sound effect.
     * @param key Unique identifier for the sound.
     * @param url URL or path to the sound file.
     * @param loop Whether the sound should loop.
     * @param volume Initial volume for this specific sound.
     */
    private loadSound(key: string, url: string, loop: boolean = false, volume: number = this.volume) {
        if (this.sounds.has(key)) {
            this.sounds.get(key)?.unload();
        }

        const sound = new Howl({
            src: [url],
            volume: volume,
            preload: true,
            loop: loop
        });

        // 재생 및 종료 이벤트 핸들러 등록하여 현재 재생 수 추적
        sound.on('play', () => {
            this.playingCounts.set(key, (this.playingCounts.get(key) || 0) + 1);
        });
        sound.on('end', () => {
            this.playingCounts.set(key, Math.max(0, (this.playingCounts.get(key) || 1) - 1));
        });
        sound.on('stop', () => {
            this.playingCounts.set(key, Math.max(0, (this.playingCounts.get(key) || 1) - 1));
        });

        this.sounds.set(key, sound);
        this.playingCounts.set(key, 0);
    }

    /**
     * Plays a sound effect by its key.
     * @param key Key of the sound to play.
     */
    public play(key: string) {
        const sound = this.sounds.get(key);
        if (sound) {
            // 'gather' 사운드에 대해 동시 재생 4개 제한
            if (key === 'gather') {
                const count = this.playingCounts.get(key) || 0;
                if (count >= 4) return;
            }
            sound.play();
        } else {
            console.warn(`Sound with key "${key}" not found.`);
        }
    }
}
