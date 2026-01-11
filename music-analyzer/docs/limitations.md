# Limitations

Understanding the constraints and boundaries of the AI Music Analyzer.

## Technical Limitations

### 1. Vocal Separation Quality

**Current Method:** Spectral subtraction

**Limitations:**
- Cannot completely remove vocals
- May leave vocal artifacts in instrumental
- Can attenuate some instrumental frequencies
- Less effective for:
  - Heavily compressed audio
  - Dense mixes
  - Vocals panned to extremes

**Why:**
The app uses frequency-based filtering rather than machine learning models. True source separation requires neural networks (like Spleeter or Demucs) which are too large for browser deployment without WASM compilation.

### 2. Chord Detection Accuracy

**Current Method:** Chromagram template matching

**Accuracy:** ~70-80% for common chords

**Struggles With:**
- Extended chords (7ths, 9ths, etc.)
- Jazz harmonies
- Polychords
- Dissonant passages
- Rapid chord changes

**Why:**
Template matching is limited to major/minor triads. Advanced chord recognition requires:
- Larger template database
- Machine learning models
- Context-aware analysis

### 3. Instrument Detection

**Current Method:** Heuristic frequency analysis

**Limitations:**
- Binary detection only (present/absent)
- Limited to guitar and piano
- Cannot detect:
  - Drums/percussion
  - Bass
  - Synthesizers
  - Orchestral instruments
- May confuse similar instruments

**False Positives:**
- Distorted guitars may trigger piano detection
- Synthesizers may trigger multiple detections

### 4. YouTube Integration

**Major Restriction:** Browser security prevents direct audio capture from embedded YouTube videos.

**What Works:**
- Embedding videos via iframe
- Displaying video player

**What Doesn't Work:**
- Automatic audio extraction
- Background processing
- Downloaded media

**Workaround:**
Users must upload downloaded files or use browser extensions that enable audio capture.

**Legal Note:** See [legal-notice.md](legal-notice.md)

### 5. File Size Limits

**Practical Limits:**
- Maximum file size: ~100MB
- Maximum duration: ~10 minutes
- Longer files may cause:
  - Browser slowdown
  - Memory errors
  - Slow processing

**Why:**
All processing happens in browser memory. Very large files can exhaust available RAM.

### 6. Processing Speed

**Typical Processing Times:**
- 3-minute song: 15-30 seconds
- 5-minute song: 30-60 seconds
- 10-minute song: 1-2 minutes

**Factors Affecting Speed:**
- Device CPU performance
- Browser optimization
- File sample rate/quality
- Background browser activity

**Not Real-Time:**
Cannot analyze audio as it plays. Must process entire file first.

## Format Limitations

### Supported Formats

**Audio:**
- MP3 (most common)
- WAV (uncompressed)
- FLAC (lossless, if browser supports)
- M4A/AAC (if browser supports)

**Video:**
- MP4 (audio extraction)

**Not Supported:**
- OGG Vorbis (limited browser support)
- WMA (Windows Media Audio)
- Proprietary formats
- DRM-protected content

### Quality Considerations

**Best Results:**
- Lossless formats (WAV, FLAC)
- High bitrate MP3 (320 kbps)
- Well-mixed, mastered tracks

**Poor Results:**
- Low bitrate MP3 (<128 kbps)
- Heavily compressed audio
- Lo-fi recordings
- Live recordings with crowd noise

## Browser Limitations

### Required Features

Must have support for:
- Web Audio API
- ES6 Modules
- Canvas 2D
- FileReader API

**Minimum Versions:**
- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

**Not Supported:**
- Internet Explorer (any version)
- Older mobile browsers
- Text-based browsers

### Mobile Limitations

**Works On:**
- Modern iOS (Safari 14.1+)
- Modern Android (Chrome 90+)

**Challenges:**
- Smaller screen for visualizations
- Limited RAM for large files
- Slower processing
- File upload restrictions

## Accuracy Limitations

### Expected Accuracy

**Vocal Separation:** 70-80% effective
**Chord Detection:** 70-80% for major/minor chords
**Instrument Detection:** 60-75% accuracy
**Tempo Detection:** 85-95% accuracy
**Key Detection:** 50-70% accuracy (heuristic)

### Genres That Work Best

- Pop
- Rock
- Folk
- Country
- Simple jazz

### Genres That Struggle

- Heavy metal (dense mixes)
- Electronic/EDM (synthesized sounds)
- Classical (orchestral complexity)
- Experimental (non-standard harmonies)
- Hip-hop (complex production)

## Legal & Ethical Limitations

### Copyright

**You Are Responsible For:**
- Ensuring you have rights to uploaded content
- Complying with copyright laws
- Not redistributing copyrighted material

**The App Does Not:**
- Store your files
- Upload data to servers
- Share your content

### YouTube Terms of Service

Using this app to process downloaded YouTube content may violate YouTube's Terms of Service. See [legal-notice.md](legal-notice.md).

## Future Improvements

### Planned Enhancements

**Short Term:**
- Better chord detection (7ths, sus, augmented)
- More instruments (drums, bass, vocals)
- Improved vocal separation

**Long Term:**
- WASM-based neural networks
- Real-time processing
- Advanced source separation
- Melody extraction
- Mixing/mastering tools

### WASM Potential

Compiling ML models to WebAssembly could provide:
- 10x faster processing
- 90%+ vocal separation accuracy
- 95%+ chord detection accuracy
- Support for 20+ instruments

**Challenges:**
- Large file sizes (50-100MB)
- Complex compilation pipeline
- Browser compatibility

## Workarounds

### For Better Vocal Separation

1. Use high-quality source files
2. Try different EQ settings
3. Use professional tools (Spleeter, RX)

### For Better Chord Detection

1. Upload clean recordings
2. Focus on sections with clear harmony
3. Manually verify detected chords
4. Use dedicated chord detection tools

### For YouTube Content

1. Download videos legally (Creative Commons)
2. Upload file directly to analyzer
3. Use browser extensions (at your own risk)

## Support & Feedback

Found a bug or have suggestions?
- Open an issue on GitHub
- Check documentation for common problems
- Understand that this is a client-side demo with inherent limitations

## Conclusion

This tool is designed for:
- Educational purposes
- Quick analysis
- Demonstration of Web Audio API capabilities

It is **not** a replacement for:
- Professional DAW software
- Studio-grade source separation
- Expert music transcription
- Commercial music production tools

Use it knowing its limitations, and enjoy exploring your music!
