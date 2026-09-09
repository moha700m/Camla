((global) => {
	class CamelRushAudio {
		constructor() {
			this.context = null;
			this.enabled = true;
			this.beatTimer = null;
			this.beat = 0;
		}

		async unlock() {
			if (!this.enabled) return false;
			const AudioContext = global.AudioContext || global.webkitAudioContext;
			if (!AudioContext) return false;
			this.context ||= new AudioContext();
			if (this.context.state === "suspended") await this.context.resume();
			this.startAmbience();
			return this.context.state === "running";
		}

		setEnabled(enabled) {
			this.enabled = Boolean(enabled);
			if (!this.enabled && this.context?.state === "running") void this.context.suspend();
			if (this.enabled) void this.unlock();
		}

		tone(frequency, duration = .12, options = {}) {
			if (!this.enabled || this.context?.state !== "running") return;
			const now = this.context.currentTime;
			const oscillator = this.context.createOscillator();
			const gain = this.context.createGain();
			oscillator.type = options.type || "sine";
			oscillator.frequency.setValueAtTime(frequency, now);
			if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, now + duration);
			gain.gain.setValueAtTime(.0001, now);
			gain.gain.exponentialRampToValueAtTime(options.volume || .075, now + .015);
			gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
			oscillator.connect(gain).connect(this.context.destination);
			oscillator.start(now);
			oscillator.stop(now + duration + .02);
		}

		join() {
			this.tone(392, .16, { to: 523, volume: .08 });
			setTimeout(() => this.tone(659, .22, { volume: .07 }), 95);
		}

		gift(level = 1) {
			const notes = level >= 3 ? [196, 392, 587, 784] : level === 2 ? [330, 494, 659] : [523, 659];
			notes.forEach((note, index) => setTimeout(() => this.tone(note, .2, { type: index ? "sine" : "triangle", volume: .08 }), index * 70));
		}

		hype() {
			this.tone(110, .34, { type: "sawtooth", to: 220, volume: .055 });
			setTimeout(() => this.tone(440, .26, { to: 880, volume: .07 }), 100);
		}

		startAmbience() {
			if (this.beatTimer || !this.enabled) return;
			this.beatTimer = setInterval(() => {
				if (this.context?.state !== "running") return;
				this.tone(this.beat % 4 === 0 ? 82 : 110, .18, { type: "triangle", volume: .025 });
				if (this.beat % 2 === 1) this.tone(660, .06, { volume: .012 });
				this.beat += 1;
			}, 480);
		}
	}

	global.CamelRushAudio = CamelRushAudio;
})(window);
