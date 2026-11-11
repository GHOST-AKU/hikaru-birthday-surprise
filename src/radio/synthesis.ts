import type { Channel } from './channels';
const rate = 44100;
const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
function tone(context: OfflineAudioContext, target: AudioNode, midi: number, start: number, duration: number, gain: number, color: 'bell' | 'pluck' | 'air' | 'bass'): void {
  const partials = color === 'bell' ? [1,.27,.07,.035] : color === 'pluck' ? [1,.36,.15,.055] : [1,.13,.035];
  partials.forEach((amplitude, index) => {
    const osc = context.createOscillator();
    const envelope = context.createGain();
    osc.frequency.value = hz(midi) * (index + 1);
    const attack = color === 'air' ? .13 : .012;
    const release = color === 'air' ? .7 : color === 'bell' ? .9 : .35;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain * amplitude, start + attack);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, gain * amplitude * (color === 'air' ? .65 : .22)), start + Math.max(attack + .01, duration * .75));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration + release);
    osc.connect(envelope).connect(target);
    osc.start(start); osc.stop(start + duration + release + .01);
  });
}
function space(context: OfflineAudioContext): GainNode {
  const mix = context.createGain(); mix.connect(context.destination);
  [.13,.23,.37].forEach((seconds, index) => {
    const delay = context.createDelay(1); delay.delayTime.value = seconds;
    const wet = context.createGain(); wet.gain.value = .12 / (index + 1);
    const filter = context.createBiquadFilter(); filter.frequency.value = 2100;
    mix.connect(delay).connect(filter).connect(wet).connect(context.destination);
  });
  return mix;
}
function riverSpace(context: OfflineAudioContext): GainNode {
  const mix = context.createGain(); mix.connect(context.destination);
  const reverb = context.createConvolver();
  const impulse = context.createBuffer(2, Math.ceil(rate * 1.15), rate);
  let seed = 173;
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel); let smoothed = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      smoothed = smoothed * .65 + (seed / 4294967296 * 2 - 1) * .35;
      const t = i / rate;
      data[i] = t < .026 ? 0 : smoothed * Math.exp(-(t - .026) * 7.5) * Math.min(1, (t - .026) / .014);
    }
  }
  reverb.buffer = impulse;
  const wet = context.createGain(); wet.gain.value = .095;
  mix.connect(reverb).connect(wet).connect(context.destination);
  return mix;
}
function fluteTone(context: OfflineAudioContext, target: AudioNode, midi: number, start: number, duration: number, gain: number): void {
  const voice = context.createGain();
  voice.gain.setValueAtTime(0, start);
  voice.gain.linearRampToValueAtTime(gain * .88, start + .032);
  voice.gain.linearRampToValueAtTime(gain, start + Math.min(.24, duration * .4));
  voice.gain.setValueAtTime(gain * .94, start + Math.max(.05, duration - .08));
  voice.gain.linearRampToValueAtTime(0, start + duration - .008);
  voice.connect(target);
  const vibrato = context.createOscillator(); vibrato.frequency.value = 4.8;
  const depth = context.createGain(); depth.gain.setValueAtTime(0, start);
  depth.gain.setValueAtTime(0, start + Math.min(.25, duration * .65));
  depth.gain.linearRampToValueAtTime(duration > .6 ? 5 : 1, start + duration * .8);
  vibrato.connect(depth); vibrato.start(start); vibrato.stop(start + duration);
  [1, .2, .075, .025, .008].forEach((weight, index) => {
    const oscillator = context.createOscillator(); oscillator.frequency.value = hz(midi) * (index + 1);
    const partial = context.createGain(); partial.gain.value = weight;
    depth.connect(oscillator.detune); oscillator.connect(partial).connect(voice);
    oscillator.start(start); oscillator.stop(start + duration);
  });
  const breath = context.createBufferSource();
  const buffer = context.createBuffer(1, Math.ceil(duration * rate), rate);
  const data = buffer.getChannelData(0); let seed = midi * 193;
  for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; data[i] = (seed / 4294967296 * 2 - 1) * .025; }
  breath.buffer = buffer;
  const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2800; filter.Q.value = .65;
  breath.connect(filter).connect(voice); breath.start(start); breath.stop(start + duration);
}
export async function renderMusic(channel: Channel): Promise<AudioBuffer> {
  const beat = 60 / channel.tempo;
  const beats = channel.notes.reduce((sum, note) => sum + note[1], 0);
  const isRiver = channel.id === 'river';
  const context = new OfflineAudioContext(isRiver ? 2 : 1, Math.ceil((beats * beat + 2.8) * rate), rate);
  const mix = isRiver ? riverSpace(context) : space(context);
  const color = channel.id === 'birthday' ? 'bell' : 'pluck';
  let cursor = .15;
  channel.notes.forEach(([pitch, length], i) => {
    const expression = .19 + Math.sin(i / Math.max(1, channel.notes.length - 1) * Math.PI) * .035;
    if (pitch > 0) {
      if (isRiver) fluteTone(context, mix, pitch, cursor, length * beat, expression * .72);
      else tone(context, mix, pitch, cursor, length * beat * .9, expression, color);
    }
    cursor += length * beat;
  });
  channel.bass.forEach(([pitch, start, length]) => {
    const at = .15 + start * beat;
    const duration = length * beat * .75;
    tone(context, mix, pitch, at, duration, isRiver ? .025 : .055, 'bass');
    tone(context, mix, pitch + 7, at + .025, duration, isRiver ? .01 : .022, 'air');
  });
  return context.startRendering();
}
export async function renderNews(voice: AudioBuffer): Promise<AudioBuffer> {
  const voiceStart = 3.05;
  const voiceEnd = voiceStart + voice.duration;
  const context = new OfflineAudioContext(1, Math.ceil((voiceEnd + 4.8) * rate), rate);
  const intro = context.createGain();
  intro.gain.setValueAtTime(1, 0);
  intro.gain.setValueAtTime(1, 2.35);
  intro.gain.linearRampToValueAtTime(0, voiceStart - .18);
  intro.connect(space(context));
  const motif = [[67,.5],[72,.5],[74,.5],[76,1],[74,.5],[72,1]] as const;
  let cursor = .14;
  motif.forEach(([pitch, beats], index) => {
    tone(context, intro, pitch, cursor, beats * .46, index === 3 ? .105 : .085, 'bell');
    cursor += beats * .46;
  });
  tone(context, intro, 48, .14, 1.3, .045, 'bass');
  tone(context, intro, 55, .83, .6, .03, 'bass');
  [48,60,64,71].forEach((pitch, index) => {
    tone(context, intro, pitch, 1.52 + index * .025, 1, index === 0 ? .038 : .018, 'air');
  });
  const source = context.createBufferSource(); source.buffer = voice;
  const level = context.createGain(); level.gain.value = .82;
  source.connect(level).connect(context.destination); source.start(voiceStart);
  const outro = space(context);
  [67,64,60].forEach((pitch, index) => {
    tone(context, outro, pitch, voiceEnd + .42 + index * .3, .5, .045, 'pluck');
  });
  [48,55].forEach(pitch => tone(context, outro, pitch, voiceEnd + .42, 1.8, .025, 'air'));
  return context.startRendering();
}
