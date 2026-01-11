# Beats Export Directory

This directory stores exported instrumental tracks and analysis files from the AI Music Analyzer.

## Contents

When you analyze music files, the following will be saved here:

### Instrumental Tracks
- `song-name-instrumental.wav` - Stereo WAV file with vocals removed
- Preserves original BPM, pitch, and groove
- CD-quality audio (44.1kHz, 16-bit)

### Analysis JSON
- `song-name-analysis.json` - Complete analysis data

## JSON Format
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

## File Management

- Files are saved to your browser's download folder
- The `/beats/` directory in the repository is for reference only
- Add `beats/*.wav` and `beats/*.json` to `.gitignore` if committing
- Files are generated client-side - nothing is uploaded to servers

## Usage

1. Analyze any music file using the web app
2. Click "Download Instrumental (WAV)" or "Download Analysis (JSON)"
3. Files will be saved to your default downloads folder
4. You can optionally move them to this directory for organization

## Storage Considerations

WAV files can be large (typically 30-50MB per song). Consider:
- Compressing to MP3 if storage is limited
- Using cloud storage for large collections
- Clearing old files periodically

## Integration

These files can be used with:
- Digital Audio Workstations (DAWs)
- Music production software
- Chord analysis tools
- Machine learning projects
- Music education applications
