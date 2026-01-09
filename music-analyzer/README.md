
# 🎵 AI Music Analyzer

A fully client-side music analysis tool that runs entirely in your browser. No backend, no servers, no API keys required.

## Features

- **Audio File Upload**: MP3, WAV, FLAC, MP4
- **YouTube Integration**: Analyze music from YouTube (playback-based)
- **Vocal Separation**: Extract instrumental tracks
- **Instrument Detection**: Identify guitar and piano
- **Chord Analysis**: Time-stamped chord progressions
- **Beat Export**: Save instrumental tracks to `/beats/`

## Quick Start

1. Clone this repository
2. Enable GitHub Pages in repository settings
3. Visit `https://yourusername.github.io/music-analyzer/`
4. Upload a music file or paste a YouTube URL
5. Watch the analysis happen in real-time

## Architecture

### Audio Pipeline
```
File Upload → Decode → Web Audio API → Analysis
     ↓
MP4 Video → Extract Audio → AudioBuffer → Process
     ↓
YouTube URL → Embed + Capture → MediaElement → Analyze
```

### Processing Chain

1. **Audio Ingestion** (`audio-loader.js`, `video-audio-extractor.js`)
   - Decode audio files using Web Audio API
   - Extract audio from MP4 containers
   - Normalize audio buffers

2. **Source Separation** (`vocal-separator.js`)
   - Spectral analysis for vocal/instrumental separation
   - Preserves BPM, pitch, and groove
   - Outputs stereo instrumental track

3. **Instrument Detection** (`instrument-detector.js`)
   - Frequency domain analysis
   - Transient detection for guitar/piano
   - Harmonic structure recognition

4. **Chord Analysis** (`chord-analyzer.js`)
   - Chromagram extraction
   - Template matching for chord recognition
   - Time-aligned chord progressions

5. **Visualization** (`waveform-renderer.js`)
   - Real-time waveform rendering
   - BPM-synced animations
   - Interactive chord timeline

6. **Export** (`beat-exporter.js`)
   - WAV file generation
   - JSON metadata export
   - Local storage in `/beats/`

## MP4 Handling

MP4 files are processed using HTML5 `<video>` element:
- Audio track extracted via `AudioContext.createMediaElementSource()`
- Downmixed to stereo if needed
- Converted to `AudioBuffer` for analysis

## YouTube Integration

**Important**: This app does NOT download YouTube videos.

- YouTube videos are embedded via `<iframe>`
- Audio is captured during playback using `MediaElementAudioSourceNode`
- Analysis occurs in real-time as the video plays
- No persistent storage of YouTube media
- Complies with YouTube Terms of Service

See [docs/legal-notice.md](docs/legal-notice.md) for full details.

## Why GitHub Pages Works

All processing happens in the browser:
- Web Audio API for audio processing
- Canvas API for visualization
- IndexedDB for temporary storage
- No server-side code required

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

Requires:
- Web Audio API
- ES6 Modules
- Canvas 2D
- FileReader API

## Documentation

- [How It Works](docs/how-it-works.md) - Technical deep dive
- [Limitations](docs/limitations.md) - Known constraints
- [Legal Notice](docs/legal-notice.md) - YouTube usage disclaimer

## Development

This is a static site. To develop locally:
```bash
# Simple HTTP server
python -m http.server 8000

# Or use any static file server
npx serve
```

Visit `http://localhost:8000`

## File Structure

- `/assets/css/` - Styling and themes
- `/assets/js/` - Modular ES6 JavaScript
- `/beats/` - Exported instrumental tracks (gitignored)
- `/docs/` - Technical documentation
- `/config/` - Application configuration

## Export Format

### Instrumental Track
`/beats/song-name-instrumental.wav`

### Analysis JSON
```json
{
  "song": "song-name",
  "tempo": 120,
  "key": "G Major",
  "instruments_detected": ["guitar", "piano"],
  "chords": [
    {
      "instrument": "guitar",
      "chord": "G",
      "start": 12.3,
      "end": 16.8
    }
  ]
}
```

## Contributing

This project is designed to run entirely client-side. Contributions should maintain:
- No backend dependencies
- Browser-only execution
- GitHub Pages compatibility

## License

MIT License - See LICENSE file for details

## Disclaimer

This tool is for educational and personal use. Users are responsible for ensuring their use of uploaded or linked content complies with applicable copyright laws and terms of service.
