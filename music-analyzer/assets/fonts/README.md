# Custom Fonts

This directory is reserved for custom fonts that enhance the musical theme.

## Recommended Fonts

### Musical Display Font
A font with musical note characters and symbols that could be used for:
- Chord labels
- Time signatures
- Decorative elements

### Monospace Font for Code/Data
For displaying:
- BPM values
- Timestamps
- Technical readouts

## Current Implementation

The app currently uses system fonts:
- `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto` for UI
- System monospace for technical displays

## How to Add Custom Fonts

1. Place font files (`.ttf`, `.woff`, `.woff2`) in this directory
2. Add `@font-face` declarations in CSS:
```css
@font-face {
    font-family: 'MusicalDisplay';
    src: url('../fonts/musical-display.woff2') format('woff2'),
         url('../fonts/musical-display.woff') format('woff'),
         url('../fonts/musical-display.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
```

3. Use in your styles:
```css
.chord-label {
    font-family: 'MusicalDisplay', sans-serif;
}
```

## Performance Considerations

- Use WOFF2 format for best compression
- Include `font-display: swap` to prevent blocking
- Subset fonts to include only needed characters
- Consider using variable fonts for flexibility

## License

Ensure any custom fonts used have appropriate licenses for web use and redistribution.
```

---

## beats/.gitkeep
```
