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
export async function renderMusic(channel: Channel): Promise<AudioBuffer> {
  const beat = 60 / channel.tempo;
  const beats = channel.notes.reduce((sum, note) => sum + note[1], 0);
  const context = new OfflineAudioContext(1, Math.ceil((beats * beat + 2.8) * rate), rate);
  const mix = space(context);
  const color = channel.id === 'birthday' ? 'bell' : channel.id === 'spring' ? 'pluck' : 'air';
  let cursor = .15;
  channel.notes.forEach(([pitch, length], i) => {
    const expression = .19 + Math.sin(i / Math.max(1, channel.notes.length - 1) * Math.PI) * .035;
    tone(context, mix, pitch, cursor, length * beat * .9, expression, color);
    cursor += length * beat;
  });
  channel.bass.forEach(([pitch, start, length]) => {
    const at = .15 + start * beat;
    const duration = length * beat * .75;
    tone(context, mix, pitch, at, duration, .055, 'bass');
    tone(context, mix, pitch + 7, at + .025, duration, .022, 'air');
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
