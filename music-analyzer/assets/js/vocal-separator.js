export class VocalSeparator {
    constructor(audioContext, options = {}) {
        this.audioContext = audioContext;
        this.apiKey = options.apiKey || null;
        this.apiEndpoint = options.apiEndpoint || 'https://api.replicate.com/v1/predictions';
        this.onProgress = options.onProgress || (() => {});
    }
    
    async separate(audioBuffer, options = {}) {
        const service = options.service || 'replicate'; // replicate, lalalai, or spleeter
        
        switch(service) {
            case 'replicate':
                return await this.separateWithReplicate(audioBuffer, options);
            case 'lalalai':
                return await this.separateWithLalal(audioBuffer, options);
            case 'spleeter':
                return await this.separateWithSpleeter(audioBuffer, options);
            default:
                throw new Error(`Unknown service: ${service}`);
        }
    }
    
    async separateWithReplicate(audioBuffer, options = {}) {
        /**
         * Uses Replicate API with Demucs model
         * https://replicate.com/facebookresearch/demucs
         * Best quality, ~30-60 seconds processing
         */
        
        if (!this.apiKey) {
            throw new Error('Replicate API key required. Get one at https://replicate.com');
        }
        
        this.onProgress({ stage: 'converting', progress: 0 });
        
        // Convert audio buffer to WAV file
        const wavBlob = await this.audioBufferToWavBlob(audioBuffer);
        
        this.onProgress({ stage: 'uploading', progress: 10 });
        
        // Upload to temporary storage (you'd use your own S3/storage)
        const audioUrl = await this.uploadToStorage(wavBlob);
        
        this.onProgress({ stage: 'processing', progress: 20 });
        
        // Create prediction
        const prediction = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: 'b76242b40c256551b3e3d78bce0a9ae857bbafa91a74b3f36d5d1e1723f36bb8',
                input: {
                    audio: audioUrl,
                    stem: options.stem || 'vocals', // or 'drums', 'bass', 'other'
                    split_only: options.splitOnly || false
                }
            })
        });
        
        const predictionData = await prediction.json();
        
        // Poll for completion
        const result = await this.pollPrediction(predictionData.id, predictionData.urls.get);
        
        this.onProgress({ stage: 'downloading', progress: 90 });
        
        // Download the instrumental track
        const instrumentalUrl = result.output.instrumental || result.output;
        const instrumentalBuffer = await this.downloadAndDecodeAudio(instrumentalUrl);
        
        this.onProgress({ stage: 'complete', progress: 100 });
        
        return instrumentalBuffer;
    }
    
    async separateWithLalal(audioBuffer, options = {}) {
        /**
         * Uses LALAL.AI API
         * https://www.lalal.ai/api/
         * Premium quality, paid service
         */
        
        if (!this.apiKey) {
            throw new Error('LALAL.AI API key required. Get one at https://www.lalal.ai/api/');
        }
        
        this.onProgress({ stage: 'converting', progress: 0 });
        
        const wavBlob = await this.audioBufferToWavBlob(audioBuffer);
        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('stem', options.stem || 'vocal');
        formData.append('filter', options.filter || '0'); // 0=mild, 1=normal, 2=aggressive
        
        this.onProgress({ stage: 'uploading', progress: 10 });
        
        // Upload file
        const uploadResponse = await fetch('https://www.lalal.ai/api/upload/', {
            method: 'POST',
            headers: {
                'Authorization': `license ${this.apiKey}`
            },
            body: formData
        });
        
        const uploadData = await uploadResponse.json();
        
        if (!uploadData.id) {
            throw new Error('Upload failed: ' + (uploadData.error || 'Unknown error'));
        }
        
        this.onProgress({ stage: 'processing', progress: 30 });
        
        // Check processing status
        const result = await this.pollLalalStatus(uploadData.id);
        
        this.onProgress({ stage: 'downloading', progress: 90 });
        
        // Download instrumental
        const instrumentalBuffer = await this.downloadAndDecodeAudio(result.stem_track);
        
        this.onProgress({ stage: 'complete', progress: 100 });
        
        return instrumentalBuffer;
    }
    
    async separateWithSpleeter(audioBuffer, options = {}) {
        /**
         * Uses self-hosted or third-party Spleeter API
         * Open source, requires your own server
         * Example: https://github.com/deezer/spleeter
         */
        
        const endpoint = options.endpoint || 'http://localhost:5000/separate';
        
        this.onProgress({ stage: 'converting', progress: 0 });
        
        const wavBlob = await this.audioBufferToWavBlob(audioBuffer);
        const formData = new FormData();
        formData.append('audio', wavBlob, 'audio.wav');
        formData.append('stems', options.stems || '2'); // 2, 4, or 5 stems
        
        this.onProgress({ stage: 'uploading', progress: 10 });
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Spleeter API error: ${response.statusText}`);
        }
        
        this.onProgress({ stage: 'processing', progress: 50 });
        
        const result = await response.json();
        
        this.onProgress({ stage: 'downloading', progress: 90 });
        
        // Assuming API returns URLs for separated stems
        const instrumentalBuffer = await this.downloadAndDecodeAudio(result.instrumental);
        
        this.onProgress({ stage: 'complete', progress: 100 });
        
        return instrumentalBuffer;
    }
    
    async pollPrediction(id, getUrl) {
        /**
         * Poll Replicate prediction until complete
         */
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes max
        
        while (attempts < maxAttempts) {
            const response = await fetch(getUrl, {
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                }
            });
            
            const prediction = await response.json();
            
            if (prediction.status === 'succeeded') {
                return prediction;
            }
            
            if (prediction.status === 'failed') {
                throw new Error('Prediction failed: ' + (prediction.error || 'Unknown error'));
            }
            
            // Update progress based on status
            const progress = 20 + Math.min(attempts * 0.5, 70);
            this.onProgress({ stage: 'processing', progress });
            
            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        throw new Error('Processing timeout');
    }
    
    async pollLalalStatus(fileId) {
        /**
         * Poll LALAL.AI status until complete
         */
        let attempts = 0;
        const maxAttempts = 120;
        
        while (attempts < maxAttempts) {
            const response = await fetch(`https://www.lalal.ai/api/check/?id=${fileId}`, {
                headers: {
                    'Authorization': `license ${this.apiKey}`
                }
            });
            
            const status = await response.json();
            
            if (status.state === 'success') {
                return status.result;
            }
            
            if (status.state === 'error') {
                throw new Error('Processing failed: ' + (status.error || 'Unknown error'));
            }
            
            const progress = 30 + Math.min(attempts * 0.5, 60);
            this.onProgress({ stage: 'processing', progress });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        throw new Error('Processing timeout');
    }
    
    async uploadToStorage(blob) {
        /**
         * Upload to temporary storage
         * Replace with your own S3/Cloud Storage implementation
         */
        
        // Option 1: Use a file hosting service
        const formData = new FormData();
        formData.append('file', blob);
        
        const response = await fetch('https://file.io', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Upload failed');
        }
        
        return data.link;
        
        // Option 2: Use your own backend
        /*
        const response = await fetch('https://your-backend.com/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.url;
        */
    }
    
    async downloadAndDecodeAudio(url) {
        /**
         * Download audio file and decode to AudioBuffer
         */
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }
    
    async audioBufferToWavBlob(audioBuffer) {
        /**
         * Convert AudioBuffer to WAV Blob
         */
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        // Interleave channels
        const interleaved = new Int16Array(audioBuffer.length * numChannels);
        
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = audioBuffer.getChannelData(channel)[i];
                const clamped = Math.max(-1, Math.min(1, sample));
                const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
                interleaved[i * numChannels + channel] = int16;
            }
        }
        
        const dataSize = interleaved.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        
        // Write WAV header
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
        
        // Write audio data
        const samples = new DataView(buffer, 44);
        for (let i = 0; i < interleaved.length; i++) {
            samples.setInt16(i * 2, interleaved[i], true);
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
    }
}

// Usage example:
/*
const audioContext = new AudioContext();
const separator = new VocalSeparator(audioContext, {
    apiKey: 'your-api-key',
    onProgress: ({ stage, progress }) => {
        console.log(`${stage}: ${progress}%`);
    }
});

// Load audio file
const response = await fetch('song.mp3');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

// Separate with Replicate (Demucs)
const instrumental = await separator.separate(audioBuffer, {
    service: 'replicate',
    stem: 'vocals'
});

// Or use LALAL.AI
const instrumental = await separator.separate(audioBuffer, {
    service: 'lalalai',
    filter: '2' // aggressive filtering
});

// Play result
const source = audioContext.createBufferSource();
source.buffer = instrumental;
source.connect(audioContext.destination);
source.start();
*/
