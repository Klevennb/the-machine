export enum ThemeEmoji {
  celebration = "celebration",
}

export const themeEmojiGlyphs = {
  [ThemeEmoji.celebration]: "\u{1F389}",
} as const satisfies Record<ThemeEmoji, string>;
