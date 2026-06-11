// sounds.js — Efectos de sonido sintetizados con WebAudio (sin archivos).
// Inspirado en el feedback sonoro de chess.com: sutil, corto y con propósito.
// Toggle de silencio persistido en localStorage ('cachos-muted').

const MUTE_KEY = 'cachos-muted';
let ctx = null;
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted() { return muted; }
export function toggleMuted() {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* sin storage */ }
  return muted;
}

// Tono simple con envolvente (attack rápido, release exponencial).
function tone(freq, { dur = 0.15, type = 'sine', vol = 0.12, delay = 0, slideTo = null } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Ráfaga de ruido filtrado — simula los dados golpeando dentro del cacho.
function noise({ dur = 0.22, vol = 0.16, delay = 0, freq = 900 } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

export const sounds = {
  // Te toca jugar — dos notas ascendentes, claras pero discretas.
  myTurn() { tone(620, { dur: 0.1, vol: 0.1 }); tone(930, { dur: 0.16, vol: 0.12, delay: 0.09 }); },
  // Alguien apostó — "tic" seco tipo pieza sobre el tablero.
  bid() { tone(420, { dur: 0.06, type: 'triangle', vol: 0.1 }); noise({ dur: 0.05, vol: 0.05, freq: 2400 }); },
  // Revelación — dados rodando (tres golpecitos de ruido).
  roll() {
    noise({ dur: 0.12, vol: 0.14, freq: 800 });
    noise({ dur: 0.12, vol: 0.12, freq: 1100, delay: 0.1 });
    noise({ dur: 0.18, vol: 0.1, freq: 650, delay: 0.22 });
  },
  // Perdiste un dado — caída descendente.
  loseDie() { tone(440, { dur: 0.3, type: 'sawtooth', vol: 0.08, slideTo: 160 }); },
  // Ganaste un dado (calza exacta) — arpegio ascendente.
  gainDie() { tone(520, { dur: 0.1, vol: 0.1 }); tone(660, { dur: 0.1, vol: 0.1, delay: 0.08 }); tone(880, { dur: 0.18, vol: 0.12, delay: 0.16 }); },
  // Victoria — pequeña fanfarria.
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 0.22, vol: 0.12, delay: i * 0.12 }));
  },
  // Derrota / eliminación final — dos notas graves descendentes.
  lose() { tone(330, { dur: 0.25, vol: 0.09 }); tone(220, { dur: 0.4, vol: 0.09, delay: 0.2 }); },
};
