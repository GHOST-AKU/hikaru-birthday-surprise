export type Language = 'en' | 'zh';
export type ChannelId = 'birthday' | 'spring' | 'river' | 'news';
export type Note = readonly [midi: number, beats: number];
export interface Channel { id: ChannelId; position: number; frequency: string; title: Record<Language, string>; tempo: number; notes: readonly Note[]; bass: readonly (readonly [midi: number, at: number, beats: number])[] }
export const channels: readonly Channel[] = [
  {
    id: 'birthday', position: .08, frequency: '88.8', title: { en: 'BIRTHDAY', zh: '生日快樂' }, tempo: 104,
    notes: [[67,.75],[67,.25],[69,1],[67,1],[72,1],[71,2], [67,.75],[67,.25],[69,1],[67,1],[74,1],[72,2], [67,.75],[67,.25],[79,1],[76,1],[72,1],[71,.5],[69,1.5], [77,.75],[77,.25],[76,1],[72,1],[74,1],[72,3]],
    bass: [[48,1,3],[55,4,3],[55,7,3],[48,10,3],[48,13,3],[53,16,3],[55,19,3],[48,22,3]],
  },
  {
    id: 'spring', position: .36, frequency: '94.4', title: { en: '望春風', zh: '望春風' }, tempo: 76,
    notes: [
      [55,1.5],[55,.5],[57,1],[60,1], [62,1],[60,.5],[62,.5],[64,2],
      [67,1.5],[64,.5],[64,.5],[62,.5],[60,1], [62,4],
      [64,1.5],[67,.5],[67,1],[64,.5],[67,.5], [60,1.5],[62,.5],[62,2],
      [55,1.5],[64,.5],[64,1],[62,1], [60,4],
      [62,1.5],[62,.5],[64,1],[62,.5],[60,.5], [57,1],[55,.5],[57,.5],[60,2],
      [57,1.5],[60,.5],[62,1],[64,1], [67,4],
      [67,1.5],[67,.5],[69,1],[67,.5],[64,.5], [64,1],[62,.5],[60,.5],[57,2],
      [55,1.5],[64,.5],[64,1],[62,1], [60,4],
    ],
    bass: [
      [48,0,4],[55,4,2],[48,6,2],[48,8,4],[55,12,4],
      [48,16,4],[53,20,4],[55,24,4],[48,28,4],
      [55,32,4],[45,36,4],[53,40,2],[50,42,2],[55,44,4],
      [48,48,4],[45,52,4],[55,56,4],[48,60,4],
    ],
  },
  {
    id: 'river', position: .64, frequency: '100.0', title: { en: 'SHENANDOAH', zh: 'SHENANDOAH' }, tempo: 76,
    notes: [
      [69,1],[74,0.5],[74,0.5],[74,1.5],[76,0.5],[78,0.5],
      [79,0.5],[83,0.5],[81,2.5],[86,0.5],[85,0.5],[83,2.5],
      [81,0.5],[83,0.5],[81,0.5],[78,0.5],[81,2.5],[81,1],
      [83,0.5],[83,0.5],[83,1.5],[78,0.5],[81,0.5],[78,0.5],
      [76,0.5],[74,2.5],[76,1],[78,2.5],[74,0.5],[78,0.5],
      [83,0.5],[81,3],[74,0.5],[76,0.5],[78,2.5],[74,0.5],
      [76,1],[74,3],
    ],
    bass: [[50,1,7],[55,9,4],[50,13,4],[47,17,4],[55,21,4],[50,25,4],[47,29,4],[45,33,4],[50,37,3]],
  },
  { id: 'news', position: .92, frequency: '105.6', title: { en: 'BIRTHDAY NEWS', zh: '生日特別廣播' }, tempo: 96, notes: [], bass: [] },
];
export const broadcast: Record<Language, { text: string; headline: string; lines: string[] }> = {
  en: {
    text: 'We interrupt this broadcast with a special announcement. Today is Hikaru’s birthday. Here’s to good games, good rest, and another year of being you. Today, you’re the headline. Happy birthday.',
    headline: 'TODAY, YOU’RE THE HEADLINE.',
    lines: ['We interrupt this broadcast', 'with a special announcement.', '', 'Today is HIKARU’s birthday.', '', 'Here’s to good games, good', 'rest, and another year of', 'being you.', '', 'Today, you’re the headline.', 'Happy birthday.'],
  },
  zh: {
    text: '現在插播一條特別消息。今天是 Hikaru 的生日。本台祝 Hikaru 生日快樂，新的一歲，盡興遊戲，安心休息。今天的頭條，留給你。',
    headline: '今天的頭條，留給你。',
    lines: ['現在插播一條特別消息。', '', '今天是 HIKARU 的生日。', '', '本台祝 HIKARU 生日快樂，', '新的一歲，盡興遊戲，', '安心休息。', '', '今天的頭條，留給你。'],
  },
};
export function reception(position: number): { channel: Channel; strength: number; locked: boolean } {
  const channel = channels.reduce((best, item) => Math.abs(position - item.position) < Math.abs(position - best.position) ? item : best);
  const distance = Math.abs(position - channel.position);
  const strength = Math.max(0, Math.min(1, 1 - Math.max(0, distance - .025) / .125));
  return { channel, strength: strength * strength * (3 - 2 * strength), locked: distance <= .035 };
}
export const frequencyAt = (position: number): string => (87.2 + position * 20).toFixed(1);
