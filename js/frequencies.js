class FrequencyGenerator {
    constructor() {
        this.audioCtx = null;
        this.masterGain = null;
        this.oscillators = {}; // { id: { osc, gainNode, frequency } }
        this.masterVolume = 0.5;
        this.active = false;

        // Solfeggio & Schumann Database
        this.frequencies = [
            { id: 'schumann', freq: 7.83, name: 'Schumann', desc: 'Erdresonanz', type: 'sine' },
            { id: '174', freq: 174, name: '174 Hz', desc: 'Schmerzlinderung', type: 'sine' },
            { id: '285', freq: 285, name: '285 Hz', desc: 'Geweberegeneration', type: 'sine' },
            { id: '396', freq: 396, name: '396 Hz', desc: 'Befreiung von Angst', type: 'sine' },
            { id: '417', freq: 417, name: '417 Hz', desc: 'Situationen klären', type: 'sine' },
            { id: '528', freq: 528, name: '528 Hz', desc: 'Transformation & Wunder', type: 'sine' },
            { id: '639', freq: 639, name: '639 Hz', desc: 'Verbindungen & Beziehungen', type: 'sine' },
            { id: '741', freq: 741, name: '741 Hz', desc: 'Intuition & Aufwachen', type: 'sine' },
            { id: '852', freq: 852, name: '852 Hz', desc: 'Rückkehr zur geistigen Ordnung', type: 'sine' },
            { id: '963', freq: 963, name: '963 Hz', desc: 'Göttliches Bewusstsein', type: 'sine' }
        ];
    }

    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioCtx.destination);
        }
    }

    setMasterVolume(val) {
        this.masterVolume = parseFloat(val);
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioCtx.currentTime, 0.1);
        }
    }

    toggleFrequency(id, enable) {
        if (!this.audioCtx) this.init();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        if (enable) {
            if (this.oscillators[id]) return; // Already running

            const freqData = this.frequencies.find(f => f.id === id);
            if (!freqData) return;

            const osc = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();

            osc.type = freqData.type;
            osc.frequency.value = freqData.freq;

            // Start silent
            gainNode.gain.value = 0;

            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            osc.start();

            // Fade in
            gainNode.gain.setTargetAtTime(0.5, this.audioCtx.currentTime, 0.5); // Default indiv volume 0.5

            this.oscillators[id] = { osc, gainNode, volume: 0.5 };
        } else {
            if (!this.oscillators[id]) return;

            const { osc, gainNode } = this.oscillators[id];

            // Fade out
            gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.5);

            setTimeout(() => {
                osc.stop();
                osc.disconnect();
                gainNode.disconnect();
            }, 600);

            delete this.oscillators[id];
        }
    }

    setFrequencyVolume(id, val) {
        if (this.oscillators[id]) {
            const { gainNode } = this.oscillators[id];
            this.oscillators[id].volume = parseFloat(val);
            gainNode.gain.setTargetAtTime(parseFloat(val), this.audioCtx.currentTime, 0.1);
        }
    }

    getFrequencyList() {
        return this.frequencies;
    }

    getActiveFrequencies() {
        const active = [];
        Object.keys(this.oscillators).forEach(id => {
            active.push({
                id: id,
                volume: this.oscillators[id].volume
            });
        });
        return active;
    }

    stopAll() {
        // Stop all active oscillators
        Object.keys(this.oscillators).forEach(id => {
            const { osc, gainNode } = this.oscillators[id];
            gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
            setTimeout(() => {
                osc.stop();
                osc.disconnect();
                gainNode.disconnect();
            }, 200);
            delete this.oscillators[id];
        });
        this.active = false;
    }
}
