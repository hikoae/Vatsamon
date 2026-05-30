/**
 * Web Audio-based Alpine Cow sound synthesizer.
 * Simulates a deep, funny, resonance-packed "Moooo!" and high-quality battle sfx.
 */

class AlpineSoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Synthesizes a hilarious "Moooo!" cow sound
   * Custom low frequency oscillators with vocal-tract bandpass filter sweeping.
   */
  public playMoo() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // 1. Oscillator layer 1: main heavy low frequency hum (Sawtooth)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      // Lower pitch over time to simulate head lowering
      osc1.frequency.setValueAtTime(110, now);
      // Sweeping frequency curves
      osc1.frequency.exponentialRampToValueAtTime(125, now + 0.15);
      osc1.frequency.exponentialRampToValueAtTime(105, now + 0.6);
      osc1.frequency.linearRampToValueAtTime(80, now + 1.2);

      // 2. Oscillator layer 2: warm undertone (Triangle)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(112, now);
      osc2.frequency.exponentialRampToValueAtTime(127, now + 0.15);
      osc2.frequency.linearRampToValueAtTime(82, now + 1.2);

      // 3. Vibrato (Modulates main hum's frequency to sound like real animal vocal vibrating)
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.value = 14; // fast wobble
      vibratoGain.gain.setValueAtTime(3.5, now);
      vibratoGain.gain.linearRampToValueAtTime(1.5, now + 1.0);
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc1.frequency);
      vibratoGain.connect(osc2.frequency);

      // 4. Vocal Filter Sweep (Bandpass emphasizes vowels e.g. "Mooo")
      const bpFilter = this.ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.Q.setValueAtTime(3.2, now);
      // Sweep resonance from 400Hz ("Mo") down to 220Hz ("oo")
      bpFilter.frequency.setValueAtTime(450, now);
      bpFilter.frequency.exponentialRampToValueAtTime(550, now + 0.2);
      bpFilter.frequency.exponentialRampToValueAtTime(240, now + 0.82);

      // 5. Volume Envelope
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.38, now + 0.18); // quick swell
      gainNode.gain.setValueAtTime(0.38, now + 0.6); // sustain
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2); // natural fadeout

      // Connections
      osc1.connect(bpFilter);
      osc2.connect(bpFilter);
      bpFilter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      // Start & Stop
      vibrato.start(now);
      osc1.start(now);
      osc2.start(now);

      vibrato.stop(now + 1.25);
      osc1.stop(now + 1.25);
      osc2.stop(now + 1.25);
    } catch (e) {
      console.warn("Could not play synthesized Moo! sound:", e);
    }
  }

  /**
   * Synthesizes a heavy impact headbutt/clack hit
   */
  public playHeadbutt() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Crack wave
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

      // Low bass thud layer
      const oscThud = this.ctx.createOscillator();
      oscThud.type = 'sine';
      oscThud.frequency.setValueAtTime(80, now);
      oscThud.frequency.exponentialRampToValueAtTime(30, now + 0.3);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      osc.connect(filter);
      oscThud.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      oscThud.start(now);
      osc.stop(now + 0.35);
      oscThud.stop(now + 0.35);
    } catch (e) {
      console.warn("Could not play headbutt sound:", e);
    }
  }

  /**
   * Play victory alpine chime fanfare
   */
  public playVictoryFanfare() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // High bright resonant bells (Arpeggio notes C4 - E4 - G4 - C5)
      const notes = [261.63, 329.63, 392.00, 523.25];
      
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.7);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.8);
      });
    } catch (e) {
      console.warn("Could not play victory fanfare:", e);
    }
  }

  /**
   * Generic tactile button click chirp
   */
  public playClick() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn("Could not play click sound:", e);
    }
  }
}

export const soundEngine = new AlpineSoundEngine();
