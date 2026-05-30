/**
 * Synthesizes vintage-game style sound effects using the browser's Web Audio API.
 * This guarantees audio feedback offline and inside sandboxed environments
 * without requiring external media assets.
 */
export function playSynthSound(type: 'muggito' | 'success' | 'clink' | 'levelUp') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'muggito') {
      // Warm, playful low-to-high pasture cow moo sweep
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(145, ctx.currentTime + 0.35);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.1);
      
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.15);
    } else if (type === 'success') {
      // Uplifting arpeggio chime for finding cows or passing quiz
      osc.type = 'sine';
      const now = ctx.currentTime;
      const pitches = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      pitches.forEach((freq, idx) => {
        const time = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, time);
      });
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      
      osc.start();
      osc.stop(now + 0.5);
    } else if (type === 'clink') {
      // Wood clack resonance for cattle bumping horns amichevolmente
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'levelUp') {
      // Triumph fanfare sweeper
      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.linearRampToValueAtTime(659.25, now + 0.2); // E5
      osc.frequency.linearRampToValueAtTime(987.77, now + 0.4); // B5
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      
      osc.start();
      osc.stop(now + 0.6);
    }
  } catch (e) {
    console.warn('AudioContext failed or is currently blocked by browser policies:', e);
  }
}
