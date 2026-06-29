import { invariant } from "@/lib/invariant";
import { ThemeEmoji, themeEmojiGlyphs } from "@/theme";

type ThemedEmojiProps = {
  emoji: ThemeEmoji;
};

export function ThemedEmoji({ emoji }: ThemedEmojiProps) {
  invariant(emoji in themeEmojiGlyphs, "emoji must be configured.");

  return (
    <span aria-hidden="true" data-theme-emoji={emoji}>
      {themeEmojiGlyphs[emoji]}
    </span>
  );
}
