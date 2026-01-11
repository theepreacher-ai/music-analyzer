// YouTube handler
export class YouTubeHandler {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.videoElement = null;
    }
    
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
            /youtube\.com\/embed\/([^&\s]+)/,
            /youtube\.com\/v\/([^&\s]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    embedVideo(videoId) {
        return new Promise((resolve) => {
            const container = document.getElementById('youtubeEmbed');
            container.innerHTML = `
                <iframe
                    id="youtubeFrame"
                    width="100%"
                    height="480"
                    src="https://www.youtube.com/embed/${videoId}?enablejsapi=1"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                ></iframe>
            `;
            resolve();
        });
    }
    
    async captureAudio() {
        return new Promise((resolve, reject) => {
            // Note: Direct audio capture from YouTube iframe is restricted
            // This is a placeholder implementation
            // In production, users would need to use browser extensions or download tools
            
            alert('YouTube audio capture is limited by browser security. Please use the file upload feature instead.');
            reject(new Error('YouTube audio capture not available'));
        });
    }
}
