// Extract audio from video
export class VideoAudioExtractor {
    constructor(audioContext) {
        this.audioContext = audioContext;
    }
    
    async extractAudio(videoFile) {
        return new Promise((resolve, reject) => {
            const video= document.createElement('video');
            const fileUrl = URL.createObjectURL(videoFile);
            
            video.src = fileUrl;
            video.preload = 'metadata';
            
            video.addEventListener('loadedmetadata', async () => {
                try {
                    // Create media element source
                    const source = this.audioContext.createMediaElementSource(video);
                    const destination = this.audioContext.createMediaStreamDestination();
                    source.connect(destination);
                    
                    // Setup recorder
                    const recorder = new MediaRecorder(destination.stream);
                    const chunks = [];
                    
                    recorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            chunks.push(e.data);
                        }
                    };
                    
                    recorder.onstop = async () => {
                        const blob = new Blob(chunks, { type: 'audio/webm' });
                        const arrayBuffer = await blob.arrayBuffer();
                        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                        
                        URL.revokeObjectURL(fileUrl);
                        video.remove();
                        
                        resolve(this.downmixToStereo(audioBuffer));
                    };
                    
                    // Start recording and playback
                    recorder.start();
                    video.play();
                    
                    // Stop when video ends
                    video.addEventListener('ended', () => {
                        recorder.stop();
                        source.disconnect();
                    });
                    
                } catch (error) {
                    URL.revokeObjectURL(fileUrl);
                    video.remove();
                    reject(error);
                }
            });
            
            video.addEventListener('error', () => {
                URL.revokeObjectURL(fileUrl);
                video.remove();
                reject(new Error('Failed to load video'));
            });
        });
    }
    
    downmixToStereo(buffer) {
        if (buffer.numberOfChannels <= 2) {
            return buffer;
        }
        
        // Create new stereo buffer
        const stereoBuffer = this.audioContext.createBuffer(
            2,
            buffer.length,
            buffer.sampleRate
        );
        
        const leftChannel = stereoBuffer.getChannelData(0);
        const rightChannel = stereoBuffer.getChannelData(1);
        
        // Simple downmix: average all channels
        for (let i = 0; i < buffer.length; i++) {
            let leftSum = 0;
            let rightSum = 0;
            
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                if (channel % 2 === 0) {
                    leftSum += sample;
                } else {
                    rightSum += sample;
                }
            }
            
            leftChannel[i] = leftSum / Math.ceil(buffer.numberOfChannels / 2);
            rightChannel[i] = rightSum / Math.floor(buffer.numberOfChannels / 2);
        }
        
        return stereoBuffer;
    }
}
