# How It Works

A technical deep dive into the AI Music Analyzer's architecture and algorithms.

## Overview

The AI Music Analyzer is a completely client-side application that processes audio using the Web Audio API and JavaScript. No data leaves your browser.

## Architecture
```
┌─────────────────┐
│  Audio Input    │
│  (File/Video)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Audio Decoding  │
│  AudioContext   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vocal Separator │
│ (Spectral Sub)  │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│   Instrument    │  │  Chord Analyzer │
│    Detector     │  │  (Chromagram)   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    ▼
            ┌───────────────┐
            │  Results UI   │
            │  Waveform     │
            │  Timeline     │
            └───────────────┘
```

## Audio Pipeline

### 1. Audio Loading

**File Upload:**
```javascript
File → ArrayBuffer → AudioContext.decodeAudioData() → AudioBuffer
```

**MP4 Video:**
```javascript
MP4 File → <video> element → MediaElementSource → MediaRecorder → AudioBuffer
```

**YouTube (Limited):**
```javascript
YouTube URL → <iframe> embed → User plays video → Capture attempt
Note: Browser security restricts direct audio capture from YouTube iframes
```

### 2. Vocal Separation

Uses spectral subtraction to isolate instrumental tracks:

**Algorithm:**
1. Split audio into overlapping frames (2048 samples, 512 hop)
2. Apply Hann window to each frame
3. Compute FFT (Fast Fourier Transform)
4. Attenuate vocal frequency range (300-3000 Hz)
5. Apply inverse FFT
6. Overlap-add reconstruction

**Why This Works:**
- Vocals occupy distinct frequency band
- Instrumental content spreads across spectrum
- Reducing mid-range attenuates vocals while preserving instruments

**Limitations:**
- Not as accurate as neural network methods
- May leave vocal artifacts
- Can reduce some instrumental frequencies

### 3. Instrument Detection

Analyzes frequency content and transient characteristics:

**Guitar Detection:**
- Strong transients (sharp attacks)
- Harmonic energy in 80-1000 Hz
- Characteristic string resonance
- Attack/decay envelope patterns

**Piano Detection:**
- Very sharp attacks
- Wide frequency range (100-4000 Hz)
- Rich harmonic overtones
- Specific inharmonicity patterns

**Algorithm:**
```javascript
For each analysis window:
  1. Calculate transient energy
  2. Compute frequency spectrum
  3. Measure energy distribution
  4. Compare against instrument profiles
  5. Threshold-based classification
```

### 4. Chord Analysis

Uses chromagram-based template matching:

**Steps:**
1. Extract 12-bin chromagram (one per pitch class)
2. Map frequencies to pitch classes (C, C#, D, etc.)
3. Normalize energy across bins
4. Match against chord templates
5. Track changes over time

**Chord Templates:**
- Major: Root, major third, perfect fifth
- Minor: Root, minor third, perfect fifth
- Stored as 12-element binary arrays

**Temporal Smoothing:**
- Analyze every 2 seconds
- Merge consecutive identical chords
- Prevents rapid flickering

### 5. Tempo Detection

Simple onset-based BPM estimation:

1. Calculate energy envelope
2. Find peaks above threshold
3. Measure inter-onset intervals
4. Convert to BPM (beats per minute)

**Formula:**
```
BPM = 60 / (average_interval_in_seconds)
```

### 6. Key Detection

Simplified key estimation:
- Aggregates pitch class distribution
- Compares against major/minor key profiles
- Returns most likely key

*Note: Current implementation uses heuristics for demo purposes*

## Visualization

### Waveform Rendering

Displays time-domain audio representation:
```javascript
For each pixel column:
  1. Find min/max sample values in range
  2. Draw vertical line from min to max
  3. Apply color and glow effect
```

### Chord Timeline

Interactive canvas visualization:

- Horizontal axis = time
- Vertical lanes = instruments
- Colored bars = chord regions
- Synchronized with audio playback

## Export

### WAV Generation

Converts AudioBuffer to WAV format:

1. Create WAV header (44 bytes)
2. Set format parameters (PCM, 16-bit, stereo)
3. Interleave channel data
4. Convert float32 samples to int16
5. Generate Blob and trigger download

### JSON Export

Serializes analysis data:
```json
{
  "song": "filename",
  "tempo": 120,
  "key": "G Major",
  "instruments_detected": ["guitar", "piano"],
  "chords": [
    {
      "instrument": "guitar",
      "chord": "Am",
      "start": 0.0,
      "end": 2.5
    }
  ]
}
```

## Performance Optimizations

**FFT Efficiency:**
- Uses Cooley-Tukey radix-2 algorithm
- O(n log n) complexity
- Powers-of-2 FFT sizes (2048, 4096)

**Memory Management:**
- Reuses TypedArrays when possible
- Releases large buffers after processing
- Streams data for long files

**Rendering:**
- Canvas downsampling for performance
- RequestAnimationFrame for smooth updates
- Debounced window resizing

## Browser Compatibility

**Required APIs:**
- Web Audio API (all modern browsers)
- Canvas 2D Context
- FileReader API
- ES6 Modules

**Optional APIs:**
- MediaRecorder (for video extraction)
- WebAssembly (for future enhancements)

## Limitations

See [limitations.md](limitations.md) for detailed constraints.

## Future Enhancements

**WASM Integration:**
- Compile Spleeter for true source separation
- TensorFlow.js for ML-based chord detection
- Real-time processing optimization

**Advanced Features:**
- Beat/bar detection
- Melody extraction
- Mixing/mastering tools
- Real-time audio effects

## Technical References

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [Cooley-Tukey FFT Algorithm](https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm)
- [Chromagram Analysis](https://en.wikipedia.org/wiki/Chroma_feature)
- [Spectral Subtraction](https://en.wikipedia.org/wiki/Spectral_subtraction)
