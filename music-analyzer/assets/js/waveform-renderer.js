// Waveform rendering
export class WaveformRenderer {
    constructor() {
        this.animationFrame = null;
    }
    
    renderWaveform(canvas, audioBuffer) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 160;
        
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);
        
        const channelData = audioBuffer.getChannelData(0);
        const step = Math.ceil(channelData.length / width);
        const amp = height / 2;
        
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            for (let j = 0; j < step; j++) {
                const datum = channelData[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            const x = i;
            const yMin = (1 + min) * amp;
            const yMax = (1 + max) * amp;
            
            if (i === 0) {
                ctx.moveTo(x, yMin);
            } else {
                ctx.lineTo(x, yMin);
            }
        }
        
        ctx.stroke();
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#6366f1';
        ctx.stroke();
    }
    
    renderAnimatedWaveform(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width = window.innerWidth;
        const height = canvas.height = window.innerHeight;
        
        let time = 0;
        const barCount = 100;
        const barWidth = width / barCount;
        
        const animate = () => {
            ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = '#6366f1';
            
            for (let i = 0; i < barCount; i++) {
                const barHeight = (Math.sin(time + i * 0.1) * 0.5 + 0.5) * height * 0.3 + 50;
                const x = i * barWidth;
                const y = height / 2 - barHeight / 2;
                
                ctx.fillRect(x, y, barWidth - 2, barHeight);
            }
            
            time += 0.05;
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}
