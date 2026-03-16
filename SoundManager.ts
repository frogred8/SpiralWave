import { Howl } from 'howler';

/**
 * SoundManager handles sound effect playback using howler.js.
 */
export class SoundManager {
    private static instance: SoundManager;
    private sounds: Map<string, Howl> = new Map();
    private volume: number = 0.5;

    private constructor() {
        // Initialize with default sounds if URLs were provided.
        // For now, these are placeholders for the user to fill.
        this.loadSound('resource', 'https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-click-1112.mp3'); // Example short sound
        this.loadSound('special', 'https://assets.mixkit.co/sfx/preview/mixkit-magic-marimba-notif-2481.mp3'); // Example special sound
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
     */
    public loadSound(key: string, url: string) {
        if (this.sounds.has(key)) {
            this.sounds.get(key)?.unload();
        }

        const sound = new Howl({
            src: [url],
            volume: this.volume,
            preload: true
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
