export type Language = 'en' | 'ko' | 'zh' | 'ja';
export declare const TRANSLATIONS: Record<Language, Record<string, string>>;
export declare class I18n {
    private static currentLanguage;
    static setLanguage(lang: Language): void;
    static getLanguage(): Language;
    static t(key: string): string;
}
