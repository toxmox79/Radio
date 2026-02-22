class RadioPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentStation = null;
        this.isPlaying = false;
        this.isLoading = false;
        this.volume = 1.0;

        // Bind methods to ensure 'this' context
        this.handleError = this.handleError.bind(this);
        this.handleWaiting = this.handleWaiting.bind(this);
        this.handlePlaying = this.handlePlaying.bind(this);
        this.handlePause = this.handlePause.bind(this);

        // Error handling & State
        this.audio.addEventListener('error', this.handleError);
        this.audio.addEventListener('waiting', this.handleWaiting);
        this.audio.addEventListener('playing', this.handlePlaying);
        this.audio.addEventListener('pause', this.handlePause);
    }

    loadStation(station) {
        if (!station || !station.url) return;

        // Stop current if playing
        this.audio.pause();
        this.isPlaying = false;
        this.isLoading = true;

        this.currentStation = station;
        this.audio.src = station.url;
        this.audio.volume = this.volume;

        this.dispatchEvent('stationChanged', station);

        // Attempt to play immediately
        this.play();
    }

    async play() {
        if (!this.audio.src) return;

        try {
            this.isLoading = true;
            await this.audio.play();
            // isPlaying will be set directly by the 'playing' event handler
        } catch (error) {
            console.error("Playback failed:", error);
            this.isLoading = false;
            this.isPlaying = false;
            this.dispatchEvent('error', "Stream Offline");
        }
    }

    pause() {
        this.audio.pause();
        // isPlaying set by event handler
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.dispatchEvent('pause');
    }

    toggle() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    setVolume(val) {
        this.volume = parseFloat(val);
        this.audio.volume = this.volume;
    }

    handleError(e) {
        console.error("Audio Error:", e);
        this.isPlaying = false;
        this.isLoading = false;
        this.dispatchEvent('error', "Stream Fehler");
    }

    handleWaiting() {
        this.isLoading = true;
        this.dispatchEvent('buffering');
    }

    handlePlaying() {
        this.isPlaying = true;
        this.isLoading = false;
        this.dispatchEvent('playing');
        this.updateMediaSession();
        this.startMetadataPolling();
    }

    handlePause() {
        this.isPlaying = false;
        this.isLoading = false;
        this.dispatchEvent('paused');
        this.stopMetadataPolling();
    }

    updateMediaSession() {
        if ('mediaSession' in navigator && this.currentStation) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: this.currentStation.name,
                artist: this.currentStation.genre || 'Solfeggio Radio',
                album: 'Solfeggio Schumann Radio',
                artwork: [
                    { src: this.currentStation.image || 'icon-512.png', sizes: '512x512', type: 'image/png' }
                ]
            });
        }
    }

    metadataInterval = null;
    startMetadataPolling() {
        this.stopMetadataPolling();
        this.metadataInterval = setInterval(() => {
            if (this.isPlaying) {
                this.dispatchEvent('requestMetadata', this.currentStation);
            }
        }, 15000);
        this.dispatchEvent('requestMetadata', this.currentStation);
    }

    stopMetadataPolling() {
        if (this.metadataInterval) {
            clearInterval(this.metadataInterval);
            this.metadataInterval = null;
        }
    }

    // Simple event system
    callbacks = {};
    on(event, callback) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(callback);
    }

    dispatchEvent(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }
}
