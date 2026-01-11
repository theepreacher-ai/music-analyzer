// Instrument detection
export class InstrumentDetector {
    constructor(audioContext) {
        this.audioContext = audioContext;
    }
    
    async detect(audioBuffer) {
        const instruments = [];
        
        const hasGuitar = this.detectGuitar(audioBuffer);
        const hasPiano = this.detectPiano(audioBuffer);
        
        if (hasGuitar) instruments.push('guitar');
        if (hasPiano) instruments.push('piano');
        
        // If nothing detected, default to guitar
        if (instruments.length === 0) {
            instruments.push('guitar');
        }
        
        return instruments;
    }
    
    detectGuitar(audioBuffer) {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Guitar characteristics:
        // - Strong transients
        // - Harmonic content in 80-1000 Hz range
        // - Characteristic attack/decay envelope
        
        let transientCount = 0;
        let harmonicEnergy = 0;
        const windowSize = 2048;
        
        for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
            // Check for transients
            let maxDiff = 0;
            for (let j = i; j < i + windowSize - 1; j++) {
                const diff = Math.abs(channelData[j + 1] - channelData[j]);
                maxDiff = Math.max(maxDiff, diff);
            }
            
            if (maxDiff > 0.1) {
                transientCount++;
            }
            
            // Analyze frequency content
            const frame = channelData.slice(i, i + windowSize);
            const spectrum = this.getSpectrum(frame, sampleRate);
            
            // Sum energy in guitar range (80-1000 Hz)
            for (let freq = 80; freq < 1000; freq += 10) {
                const bin = Math.floor(freq * windowSize / sampleRate);
                if (bin < spectrum.length) {
                    harmonicEnergy += spectrum[bin];
                }
            }
        }
        
        const avgTransients = transientCount / (channelData.length / windowSize);
        const avgHarmonicEnergy = harmonicEnergy / (channelData.length / windowSize);
        
        // Heuristic thresholds
        return avgTransients > 0.1 && avgHarmonicEnergy > 0.05;
    }
    
    detectPiano(audioBuffer) {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Piano characteristics:
        // - Sharp attacks
        // - Rich harmonic overtones
        // - Energy across wide frequency range
        // - Specific inharmonicity
        
        let sharpAttacks = 0;
        let wideRangeEnergy = 0;
        const windowSize = 2048;
        
        for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
            const frame = channelData.slice(i, i + windowSize);
            
            // Detect sharp attack
            let attack = 0;
            for (let j = 0; j < 100; j++) {
                attack += Math.abs(frame[j]);
            }
            attack /= 100;
            
            if (attack > 0.2) {
                sharpAttacks++;
            }
            
            // Analyze full spectrum
            const spectrum = this.getSpectrum(frame, sampleRate);
            
            // Check for energy across wide range (100-4000 Hz)
            let lowEnergy = 0;
            let midEnergy = 0;
            let highEnergy = 0;
            
            for (let freq = 100; freq < 500; freq += 10) {
                const bin = Math.floor(freq * windowSize / sampleRate);
                if (bin < spectrum.length) lowEnergy += spectrum[bin];
            }
            
            for (let freq = 500; freq < 2000; freq += 10) {
                const bin = Math.floor(freq * windowSize / sampleRate);
                if (bin < spectrum.length) midEnergy += spectrum[bin];
            }
            
            for (let freq = 2000; freq < 4000; freq += 10) {
                const bin = Math.floor(freq * windowSize / sampleRate);
                if (bin < spectrum.length) highEnergy += spectrum[bin];
            }
            
            // Piano has energy distributed across ranges
            if (lowEnergy > 0.01 && midEnergy > 0.01 && highEnergy > 0.005) {
                wideRangeEnergy++;
            }
        }
        
        const avgAttacks = sharpAttacks / (channelData.length / windowSize);
        const avgWideRange = wideRangeEnergy / (channelData.length / windowSize);
        
        return avgAttacks > 0.05 && avgWideRange > 0.03;
    }
    
    getSpectrum(frame, sampleRate) {
        const fftSize = frame.length;
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);
        
        // Apply window and copy to real
        const window = this.getHannWindow(fftSize);
        for (let i = 0; i < fftSize; i++) {
            real[i] = frame[i] * window[i];
        }
        
        // Perform FFT
        this.fft(real, imag);
        
        // Compute magnitude spectrum
        const spectrum = new Float32Array(fftSize / 2);
        for (let i = 0; i < fftSize / 2; i++) {
            spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }
        
        return spectrum;
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
