export class VocalSeparator {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.modelLoaded = false;
    }
    
    async loadModel() {
        // In production: Load pre-trained Demucs or similar model
        // Using ONNX Runtime Web to run the model in browser
        // Model URL would point to quantized ONNX model (~50MB)
        this.modelLoaded = true;
    }
    
    async separate(audioBuffer) {
        // OPTION 1: Use Web API approach (cloud-based, best quality)
        return await this.separateViaAPI(audioBuffer);
        
        // OPTION 2: Local processing with better algorithms
        // return await this.separateLocally(audioBuffer);
    }
    
    async separateViaAPI(audioBuffer) {
        // Convert to WAV blob
        const wav = this.audioBufferToWav(audioBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        
        // Call separation API (Spleeter/Demucs as a service)
        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('stems', '2'); // vocals, instrumental
        
        const response = await fetch('https://api.your-service.com/separate', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        // Download instrumental stem
        const instrumentalResponse = await fetch(result.instrumental_url);
        const arrayBuffer = await instrumentalResponse.arrayBuffer();
        
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }
    
    async separateLocally(audioBuffer) {
        // Advanced local processing combining multiple techniques
        
        const sampleRate = audioBuffer.sampleRate;
        const length = audioBuffer.length;
        const numberOfChannels = audioBuffer.numberOfChannels;
        
        const instrumentalBuffer = this.audioContext.createBuffer(
            numberOfChannels, length, sampleRate
        );
        
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = instrumentalBuffer.getChannelData(channel);
            
            // Use larger FFT for better frequency resolution
            const fftSize = 8192; // 4x larger than original
            const hopSize = fftSize / 4; // 75% overlap for smoother results
            
            const numFrames = Math.floor((length - fftSize) / hopSize) + 1;
            const window = this.getHannWindow(fftSize);
            
            // Store magnitude and phase separately for better reconstruction
            const magnitudes = [];
            const phases = [];
            
            // Analysis phase: Extract all frames
            for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
                const offset = frameIdx * hopSize;
                const frame = new Float32Array(fftSize);
                
                for (let i = 0; i < fftSize; i++) {
                    const idx = offset + i;
                    frame[i] = idx < length ? inputData[idx] * window[i] : 0;
                }
                
                const spectrum = this.analyzeFrame(frame);
                magnitudes.push(spectrum.magnitude);
                phases.push(spectrum.phase);
            }
            
            // Processing phase: Advanced filtering
            for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
                const mag = magnitudes[frameIdx];
                const binSize = sampleRate / fftSize;
                
                for (let bin = 0; bin < fftSize / 2; bin++) {
                    const freq = bin * binSize;
                    
                    // Multi-band adaptive filtering
                    let attenuation = 1.0;
                    
                    // Vocal fundamental range (narrow, aggressive)
                    if (freq >= 80 && freq <= 300) {
                        attenuation = 0.6; // Preserve low male vocals area
                    }
                    // Primary vocal range (most aggressive)
                    else if (freq >= 300 && freq <= 3500) {
                        // Use spectral flux to detect transients (likely instruments)
                        const flux = this.getSpectralFlux(magnitudes, frameIdx, bin);
                        
                        // High flux = likely percussive/instrument, preserve it
                        // Low flux = likely sustained vocal, attenuate more
                        const fluxFactor = Math.min(flux * 2, 1.0);
                        attenuation = 0.15 + (fluxFactor * 0.35);
                    }
                    // Vocal harmonics range
                    else if (freq >= 3500 && freq <= 8000) {
                        attenuation = 0.5;
                    }
                    // Preserve high frequencies (cymbals, breath, etc)
                    else {
                        attenuation = 0.85;
                    }
                    
                    // Apply temporal smoothing to reduce artifacts
                    if (frameIdx > 0) {
                        const prevMag = magnitudes[frameIdx - 1][bin];
                        const smoothing = 0.7;
                        attenuation = attenuation * smoothing + (1 - smoothing) * (prevMag > 0 ? mag[bin] / prevMag : 1);
                    }
                    
                    mag[bin] *= attenuation;
                }
            }
            
            // Synthesis phase: Reconstruct audio with phase vocoder
            for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
                const offset = frameIdx * hopSize;
                const reconstructed = this.synthesizeFrame(
                    magnitudes[frameIdx],
                    phases[frameIdx],
                    fftSize
                );
                
                // Overlap-add with window
                for (let i = 0; i < fftSize && offset + i < length; i++) {
                    outputData[offset + i] += reconstructed[i] * window[i];
                }
            }
            
            // Normalize with soft limiting
            this.softNormalize(outputData, length);
        }
        
        // Stereo enhancement: Use mid/side processing
        if (numberOfChannels === 2) {
            this.enhanceStereo(instrumentalBuffer);
        }
        
        return instrumentalBuffer;
    }
    
    analyzeFrame(frame) {
        const n = frame.length;
        const real = new Float32Array(frame);
        const imag = new Float32Array(n);
        
        this.fft(real, imag);
        
        const magnitude = new Float32Array(n / 2);
        const phase = new Float32Array(n / 2);
        
        for (let i = 0; i < n / 2; i++) {
            magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
            phase[i] = Math.atan2(imag[i], real[i]);
        }
        
        return { magnitude, phase };
    }
    
    synthesizeFrame(magnitude, phase, fftSize) {
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);
        
        // Reconstruct complex spectrum
        for (let i = 0; i < fftSize / 2; i++) {
            real[i] = magnitude[i] * Math.cos(phase[i]);
            imag[i] = magnitude[i] * Math.sin(phase[i]);
        }
        
        // Mirror for negative frequencies
        for (let i = fftSize / 2; i < fftSize; i++) {
            const mirrorIdx = fftSize - i;
            real[i] = real[mirrorIdx];
            imag[i] = -imag[mirrorIdx];
        }
        
        this.ifft(real, imag);
        return real;
    }
    
    getSpectralFlux(magnitudes, frameIdx, bin) {
        if (frameIdx === 0) return 0;
        
        const current = magnitudes[frameIdx][bin];
        const previous = magnitudes[frameIdx - 1][bin];
        
        // Positive difference indicates onset/transient
        const diff = Math.max(0, current - previous);
        
        // Normalize by average magnitude
        const avg = (current + previous) / 2;
        return avg > 0 ? diff / avg : 0;
    }
    
    enhanceStereo(buffer) {
        // Mid/Side processing to widen instrumental
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);
        const length = buffer.length;
        
        for (let i = 0; i < length; i++) {
            const mid = (left[i] + right[i]) / 2;
            const side = (left[i] - right[i]) / 2;
            
            // Enhance stereo width slightly
            const widthFactor = 1.2;
            left[i] = mid + side * widthFactor;
            right[i] = mid - side * widthFactor;
        }
    }
    
    softNormalize(data, length) {
        // Find RMS instead of peak
        let rms = 0;
        for (let i = 0; i < length; i++) {
            rms += data[i] * data[i];
        }
        rms = Math.sqrt(rms / length);
        
        const targetRMS = 0.15;
        const gain = targetRMS / (rms + 0.0001);
        
        // Apply with soft limiting
        for (let i = 0; i < length; i++) {
            const scaled = data[i] * gain;
            // Soft clip using tanh
            data[i] = Math.tanh(scaled * 0.9) * 1.1;
        }
    }
    
    getHannWindow(size) {
        const window = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
        }
        return window;
    }
    
    audioBufferToWav(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        const data = [];
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = audioBuffer.getChannelData(channel)[i];
                const intSample = Math.max(-1, Math.min(1, sample));
                const int16 = intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF;
                data.push(int16);
            }
        }
        
        const dataSize = data.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);
        
        let offset = 44;
        for (let i = 0; i < data.length; i++) {
            view.setInt16(offset, data[i], true);
            offset += 2;
        }
        
        return buffer;
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
    
    ifft(real, imag) {
        const n = real.length;
        
        for (let i = 0; i < n; i++) {
            imag[i] = -imag[i];
        }
        
        this.fft(real, imag);
        
        for (let i = 0; i < n; i++) {
            real[i] /= n;
            imag[i] = -imag[i] / n;
        }
    }
}
