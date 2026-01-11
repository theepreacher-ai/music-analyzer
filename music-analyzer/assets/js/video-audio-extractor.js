// Extract audio from video
export class VideoAudioExtractor {
    constructor(audioContext) {
        this.audioContext = audioContext;
    }
    
    async extractAudio(videoFile) {
        return new Promise((resolve, reject) => {
            const video
