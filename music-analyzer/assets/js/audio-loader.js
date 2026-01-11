// Audio loader
export class AudioLoader {
    constructor(audioContext) {
        this.audioContext = audioContext;
    }
    
    async loadFromFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return this.normalizeBuffer(audioBuffer);
    }
    
    async loadFromUrl(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return this.normalizeBuffer(audioBuffer);
    }
    
    normalizeBuffer(buffer) {
        // Normalize audio to prevent clipping
        const numberOfChannels = buffer.numberOfChannels;
        let maxAmplitude = 0;
        
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
            }
        }
        
        if (maxAmplitude > 0.95) {
            const scaleFactor = 0.95 / maxAmplitude;
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const channelData = buffer.getChannelData(channel);
                for (let i = 0; i < channelData.length; i++) {
                    channelData[i] *= scaleFactor;
                }
            }
        }
        
        return buffer;
    }
}
