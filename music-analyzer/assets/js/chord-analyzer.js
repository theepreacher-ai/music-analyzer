// Chord analysis
export class ChordAnalyzer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.chordTemplates = this.initializeChordTemplates();
    }
    
    initializeChordTemplates() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const templates = {};
        
        // Major chord template
        const majorPattern = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0];
        
        // Minor chord template
        const minorPattern = [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0];
        
        notes.forEach((note, i) => {
            // Major chords
            templates[note] = this.rotateArray(majorPattern, i);
            
            // Minor chords
            templates[note + 'm'] = this.rotateArray(minorPattern, i);
        });
        
        return templates;
    }
    
    rotateArray(arr, n) {
        const rotated = [...arr];
        for (let i = 0; i < n; i++) {
            rotated.unshift(rotated.pop());
        }
        return rotated;
    }
    
    async analyze(audioBuffer, instruments) {
        const chords = [];
        const hopSize = 2.0; // Analyze every 2 seconds
        const duration = audioBuffer.duration;
        
        for (let t = 0; t < duration; t += hopSize) {
            const endTime = Math.min(t + hopSize, duration);
            
            // Extract chromagram for this segment
            const chromagram = this.extractChromagram(audioBuffer, t, endTime);
            
            // Detect chord
            const chord = this.detectChord(chromagram);
            
            if (chord && chords.length > 0 && chords[chords.length - 1].chord === chord) {
                // Extend previous chord
                chords[chords.length - 1].end = endTime;
            } else if (chord) {
                // Assign instrument based on detected instruments
                const instrument = instruments.length > 0 ? 
                    instruments[Math.floor(Math.random() * instruments.length)] : 
                    'guitar';
                
                chords.push({
                    instrument: instrument,
                    chord: chord,
                    start: t,
                    end: endTime
                });
            }
        }
        
        return chords;
    }
    
    extractChromagram(audioBuffer, startTime, endTime) {
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Initialize 12-bin chromagram
        const chroma = new Float32Array(12).fill(0);
        
        // FFT parameters
        const fftSize = 4096;
        const binSize = sampleRate / fftSize;
        
        // Process overlapping windows
        for (let i = startSample; i < endSample - fftSize; i += fftSize / 2) {
            const frame = new Float32Array(fftSize);
            const window = this.getHannWindow(fftSize);
            
            for (let j = 0; j < fftSize; j++) {
                frame[j] = channelData[i + j] * window[j];
            }
            
            // Compute magnitude spectrum
            const real = new Float32Array(frame);
            const imag = new Float32Array(fftSize);
            this.fft(real, imag);
            
            // Map frequencies to pitch classes
            for (let k = 1; k < fftSize / 2; k++) {
                const freq = k * binSize;
                const magnitude = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
                
                // Convert frequency to MIDI note
                if (freq > 20 && freq < 5000) {
                    const midi = 69 + 12 * Math.log2(freq / 440);
                    const pitchClass = Math.round(midi) % 12;
                    chroma[pitchClass] += magnitude;
                }
            }
        }
        
        // Normalize
        const sum = chroma.reduce((a, b) => a + b, 0);
        if (sum > 0) {
            for (let i = 0; i < 12; i++) {
                chroma[i] /= sum;
            }
        }
        
        return chroma;
    }
    
    detectChord(chromagram) {
        let bestMatch = null;
        let bestScore = -Infinity;
        
        for (const [chordName, template] of Object.entries(this.chordTemplates)) {
            let score = 0;
            for (let i = 0; i < 12; i++) {
                score += chromagram[i] * template[i];
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = chordName;
            }
        }
        
        return bestScore > 0.3 ? bestMatch : null;
    }
    
    getHannWindow(size) {
        const window = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
        }
        return window;
    }
    
    fft(real, imag) {
        const n = real.length;
        if (n <= 1) return;
        
        let j = 0;
        for (let i = 0; i < n; i++) {
            if (i < j) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
            let m = n >> 1;
            while (m >= 1 && j >= m) {
                j -= m;
                m >>= 1;
            }
            j += m;
        }
        
        for (let size = 2; size <= n; size *= 2) {
            const halfsize = size / 2;
            const tablestep = n / size;
            
            for (let i = 0; i < n; i += size) {
                for (let j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
                    const angle = 2 * Math.PI * k / n;
                    const tpre = real[j + halfsize] * Math.cos(angle) + imag[j + halfsize] * Math.sin(angle);
                    const tpim = -real[j + halfsize] * Math.sin(angle) + imag[j + halfsize] * Math.cos(angle);
                    
                    real[j + halfsize] = real[j] - tpre;
                    imag[j + halfsize] = imag[j] - tpim;
                    real[j] += tpre;
                    imag[j] += tpim;
                }
            }
        }
    }
}
