import { Howl } from 'howler';

/**
 * SoundManager handles sound effect playback using howler.js.
 */
export class SoundManager {
    private static instance: SoundManager;
    private sounds: Map<string, Howl> = new Map();
    private volume: number = 0.5;

    private constructor() {
        // Initialize with sounds from the sounds folder
        this.loadSound('gather', 'sounds/gather.mp3');
        this.loadSound('skilllevelup', 'sounds/skilllevelup.mp3');
        this.loadSound('skillupgrade', 'sounds/skillupgrade.mp3');
        this.loadSound('reroll', 'sounds/reroll.mp3');
        this.loadSound('gamestart', 'sounds/gamestart.mp3');
        this.loadSound('restart', 'sounds/restart.mp3');
        this.loadSound('winning', 'sounds/winning.mp3');
        this.loadSound('background', 'sounds/background.mp3', true, 0.3);
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    /**
     * Loads a sound effect.
     * @param key Unique identifier for the sound.
     * @param url URL or path to the sound file.
     * @param loop Whether the sound should loop.
     * @param volume Initial volume for this specific sound.
     */
    public loadSound(key: string, url: string, loop: boolean = false, volume: number = this.volume) {
        if (this.sounds.has(key)) {
            this.sounds.get(key)?.unload();
        }

        const sound = new Howl({
            src: [url],
            volume: volume,
            preload: true,
            loop: loop
        });

        this.sounds.set(key, sound);
    }

    /**
     * Plays a sound effect by its key.
     * @param key Key of the sound to play.
     */
    public play(key: string) {
        const sound = this.sounds.get(key);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound with key "${key}" not found.`);
        }
    }

    /**
     * Sets the global volume for all sounds managed by this manager.
     * @param volume Value between 0.0 and 1.0.
     */
    public setVolume(volume: number) {
        this.volume = Phaser.Math.Clamp(volume, 0, 1);
        this.sounds.forEach(sound => {
            sound.volume(this.volume);
        });
    }
}
