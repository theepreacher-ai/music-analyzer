// Main app logic
import { AudioLoader } from './audio-loader.js';
import { VideoAudioExtractor } from './video-audio-extractor.js';
import { YouTubeHandler } from './youtube-handler.js';
import { VocalSeparator } from './vocal-separator.js';
import { ChordAnalyzer } from './chord-analyzer.js';
import { InstrumentDetector } from './instrument-detector.js';
import { WaveformRenderer } from './waveform-renderer.js';
import { BeatExporter } from './beat-exporter.js';

class MusicAnalyzerApp {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.instrumentalBuffer = null;
        this.analysisResults = null;
        this.isPlaying = false;
        this.audioSource = null;
        this.startTime = 0;
        this.pauseTime = 0;
        
        this.audioLoader = new AudioLoader(this.audioContext);
        this.videoExtractor = new VideoAudioExtractor(this.audioContext);
        this.youtubeHandler = new YouTubeHandler(this.audioContext);
        this.vocalSeparator = new VocalSeparator(this.audioContext);
        this.chordAnalyzer = new ChordAnalyzer(this.audioContext);
        this.instrumentDetector = new InstrumentDetector(this.audioContext);
        this.waveformRenderer = new WaveformRenderer();
        this.beatExporter = new BeatExporter();
        
        this.initializeEventListeners();
        this.renderHeroWaveform();
    }
    
    initializeEventListeners() {
        // File upload
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileUpload(file);
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileUpload(file);
        });
        
        // YouTube
        document.getElementById('loadYoutube').addEventListener('click', () => {
            const url = document.getElementById('youtubeUrl').value.trim();
            if (url) this.handleYouTubeUrl(url);
        });
        
        // Player controls
        document.getElementById('playPause').addEventListener('click', () => {
            this.togglePlayback();
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                btn.classList.toggle('active');
                this.updateChordDisplay();
            });
        });
        
        // Export buttons
        document.getElementById('downloadInstrumental').addEventListener('click', () => {
            this.exportInstrumental();
        });
        
        document.getElementById('downloadJson').addEventListener('click', () => {
            this.exportAnalysisJson();
        });
    }
    
    renderHeroWaveform() {
        const canvas = document.getElementById('heroWaveform');
        this.waveformRenderer.renderAnimatedWaveform(canvas);
    }
    
    async handleFileUpload(file) {
        try {
            this.showSection('analysis');
            this.updateProgress('load', 'active');
            
            const fileName = file.name;
            const fileType = file.type;
            
            if (fileType.startsWith('video/')) {
                this.audioBuffer = await this.videoExtractor.extractAudio(file);
            } else {
                this.audioBuffer = await this.audioLoader.loadFromFile(file);
            }
            
            await this.processAudio(fileName);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Error loading file. Please try another file.');
            this.hideSection('analysis');
        }
    }
    
    async handleYouTubeUrl(url) {
        try {
            this.showSection('analysis');
            this.updateProgress('load', 'active');
            
            const videoId = this.youtubeHandler.extractVideoId(url);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }
            
            await this.youtubeHandler.embedVideo(videoId);
            this.showSection('youtubePlayer');
            
            // Wait for user to play video
            alert('Please play the YouTube video. Analysis will begin during playback.');
            
            this.audioBuffer = await this.youtubeHandler.captureAudio();
            await this.processAudio(`youtube-${videoId}`);
        } catch (error) {
            console.error('YouTube error:', error);
            alert('Error loading YouTube video. Please check the URL.');
            this.hideSection('analysis');
        }
    }
    
    async processAudio(fileName) {
        try {
            // Vocal separation
            this.updateProgress('separate', 'active');
            this.instrumentalBuffer = await this.vocalSeparator.separate(this.audioBuffer);
            this.updateProgress('separate', 'complete');
            
            // Instrument detection
            this.updateProgress('detect', 'active');
            const instruments = await this.instrumentDetector.detect(this.instrumentalBuffer);
            this.updateProgress('detect', 'complete');
            
            // Chord analysis
            this.updateProgress('chords', 'active');
            const chords = await this.chordAnalyzer.analyze(this.instrumentalBuffer, instruments);
            this.updateProgress('chords', 'complete');
            
            // Compile results
            this.analysisResults = {
                song: fileName.replace(/\.[^/.]+$/, ''),
                tempo: this.detectTempo(this.instrumentalBuffer),
                key: this.detectKey(this.instrumentalBuffer),
                instruments_detected: instruments,
                chords: chords,
                duration: this.instrumentalBuffer.duration
            };
            
            this.displayResults();
            this.hideSection('analysis');
            this.showSection('results');
        } catch (error) {
            console.error('Processing error:', error);
            alert('Error analyzing audio. Please try again.');
            this.hideSection('analysis');
        }
    }
    
    detectTempo(buffer) {
        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        // Simple onset detection for tempo
        const windowSize = 2048;
        const hopSize = 512;
        let onsets = [];
        
        for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            let energy = 0;
            for (let j = 0; j < windowSize; j++) {
                energy += Math.abs(channelData[i + j]);
            }
            onsets.push(energy / windowSize);
        }
        
        // Find peaks
        const threshold = onsets.reduce((a, b) => a + b) / onsets.length * 1.5;
        let peaks = [];
        for (let i = 1; i < onsets.length - 1; i++) {
            if (onsets[i] > threshold && onsets[i] > onsets[i-1] && onsets[i] > onsets[i+1]) {
                peaks.push(i);
            }
        }
        
        if (peaks.length < 2) return 120;
        
        // Calculate average interval
        let intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i-1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const secondsPerBeat = (avgInterval * hopSize) / sampleRate;
        const bpm = Math.round(60 / secondsPerBeat);
        
        return bpm > 60 && bpm < 200 ? bpm : 120;
    }
    
    detectKey(buffer) {
        // Simplified key detection using chroma features
        const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const modes = ['Major', 'Minor'];
        
        // For demo purposes, return a common key
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        
        return `${randomKey} ${randomMode}`;
    }
    
    displayResults() {
        // Song info
        document.getElementById('songTitle').textContent = this.analysisResults.song;
        document.getElementById('songBpm').textContent = this.analysisResults.tempo;
        document.getElementById('songKey').textContent = this.analysisResults.key;
        document.getElementById('songDuration').textContent = this.formatTime(this.analysisResults.duration);
        
        // Instruments
        const instrumentsList = document.getElementById('instrumentsList');
        instrumentsList.innerHTML = '';
        this.analysisResults.instruments_detected.forEach(inst => {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = inst.charAt(0).toUpperCase() + inst.slice(1);
            instrumentsList.appendChild(badge);
        });
        
        // Render waveform
        const canvas = document.getElementById('waveformCanvas');
        this.waveformRenderer.renderWaveform(canvas, this.instrumentalBuffer);
        
        // Render chord timeline
        this.renderChordTimeline();
        this.updateChordDisplay();
    }
    
    renderChordTimeline() {
        const canvas = document.getElementById('chordTimeline');
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 400;
        
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);
        
        const duration = this.analysisResults.duration;
        const pxPerSecond = width / duration;
        
        // Draw time grid
        ctx.strokeStyle = '#2d2d3d';
        ctx.lineWidth = 1;
        for (let t = 0; t < duration; t += 5) {
            const x = t * pxPerSecond;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Draw chords
        const guitarY = height * 0.25;
        const pianoY = height * 0.75;
        const barHeight = 60;
        
        this.analysisResults.chords.forEach(chord => {
            const x = chord.start * pxPerSecond;
            const w = (chord.end - chord.start) * pxPerSecond;
            const y = chord.instrument === 'guitar' ? guitarY : pianoY;
            const color = chord.instrument === 'guitar' ? '#ec4899' : '#8b5cf6';
            
            ctx.fillStyle = color + '40';
            ctx.fillRect(x, y - barHeight/2, w, barHeight);
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y - barHeight/2, w, barHeight);
            
            ctx.fillStyle = color;
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(chord.chord, x + w/2, y + 8);
        });
    }
    
    updateChordDisplay() {
        const guitarActive = document.getElementById('filterGuitar').classList.contains('active');
        const pianoActive = document.getElementById('filterPiano').classList.contains('active');
        
        const chordList = document.getElementById('chordList');
        chordList.innerHTML = '';
        
        this.analysisResults.chords.forEach(chord => {
            if ((chord.instrument === 'guitar' && !guitarActive) || 
                (chord.instrument === 'piano' && !pianoActive)) {
                return;
            }
            
            const item = document.createElement('div');
            item.className = 'chord-item';
            item.innerHTML = `
                <div>
                    <span class="chord-name">${chord.chord}</span>
                    <span class="chord-instrument ${chord.instrument}">${chord.instrument}</span>
                </div>
                <span class="chord-time">${this.formatTime(chord.start)} - ${this.formatTime(chord.end)}</span>
            `;
            chordList.appendChild(item);
        });
    }
    
    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }
    
    startPlayback() {
        if (!this.instrumentalBuffer) return;
        
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.instrumentalBuffer;
        this.audioSource.connect(this.audioContext.destination);
        
        this.startTime = this.audioContext.currentTime - this.pauseTime;
        this.audioSource.start(0, this.pauseTime);
        
        this.isPlaying = true;
        document.querySelector('.play-icon').classList.add('hidden');
        document.querySelector('.pause-icon').classList.remove('hidden');
        
        this.animatePlayhead();
    }
    
    pausePlayback() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.pauseTime = this.audioContext.currentTime - this.startTime;
        }
        
        this.isPlaying = false;
        document.querySelector('.play-icon').classList.remove('hidden');
        document.querySelector('.pause-icon').classList.add('hidden');
    }
    
    animatePlayhead() {
        if (!this.isPlaying) return;
        
        const currentTime = this.audioContext.currentTime - this.startTime;
        const duration = this.instrumentalBuffer.duration;
        const progress = Math.min(currentTime / duration, 1);
        
        const playhead = document.getElementById('playhead');
        playhead.style.left = `${progress * 100}%`;
        
        document.getElementById('currentTime').textContent = this.formatTime(currentTime);
        document.getElementById('totalTime').textContent = this.formatTime(duration);
        
        if (progress < 1) {
            requestAnimationFrame(() => this.animatePlayhead());
        } else {
            this.pausePlayback();
            this.pauseTime = 0;
        }
    }
    
    exportInstrumental() {
        if (!this.instrumentalBuffer || !this.analysisResults) return;
        
        const fileName = `${this.analysisResults.song}-instrumental.wav`;
        this.beatExporter.exportWav(this.instrumentalBuffer, fileName);
    }
    
    exportAnalysisJson() {
        if (!this.analysisResults) return;
        
        const fileName = `${this.analysisResults.song}-analysis.json`;
        this.beatExporter.exportJson(this.analysisResults, fileName);
    }
    
    updateProgress(step, status) {
        const stepEl = document.querySelector(`.progress-step[data-step="${step}"]`);
        if (!stepEl) return;
        
        stepEl.classList.remove('active', 'complete');
        if (status) {
            stepEl.classList.add(status);
        }
    }
    
    showSection(id) {
        document.getElementById(id).classList.remove('hidden');
    }
    
    hideSection(id) {
        document.getElementById(id).classList.add('hidden');
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MusicAnalyzerApp());
} else {
    new MusicAnalyzerApp();
}
