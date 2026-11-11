# Birthday radio

The existing `/instrument` chassis now houses four stations. The other routes retain their existing behavior.

| Frequency | Program | Content |
| --- | --- | --- |
| 88.8 | Birthday | All four phrases of Happy Birthday, with a held final note and a loop pause |
| 94.4 | 望春風 | Opening four bars (the first recognizable melodic sentence); electronic plucked instrument |
| 100.0 | Shenandoah | Opening solo and “away, you rolling river” response; soft sustained synth |
| 105.6 | Birthday News | Fixed synthetic announcer in English or Taiwanese Mandarin, followed by a short station interval |

The frequencies are interface design choices, not biographical dates. Broadcast text is the user-requested birthday greeting, not a live news feed or date claim based on a calendar API. The announcer uses generic TTS voices and does not imitate Hikaru.

## Music and source notes

All instrumental sounds are synthesized locally using Web Audio; no commercial recording is included. Melody/tempo and accompaniment data live in `src/radio/channels.ts`; rendering and the news ident live in `src/radio/synthesis.ts`.

- Happy Birthday: complete familiar melody, 25 notes, C major.
- 望春風: 鄧雨賢, 1933; first four bars in C. Opening melody and dotted rhythm checked against https://www.guitarlu.net/lesson-fsong-22-bang-chhun-hong.html and https://akhun.co/notes/songs/望春風/ . Only the underlying tune is transcribed, with a new simple accompaniment; no lyrics or modern recording/arrangement is used. This is an authored Taiwanese song, not labeled anonymous or universally copyright-free.
- Shenandoah: traditional melody in D, opening phrase and response, based on the Frank Nordberg ABC transcription preserved at https://abcnotation.com/tunePage?a=trillian.mit.edu%2F%7Ejc%2Fmusic%2Fabc%2Fmirror%2Fmusicaviva.com%2Ftunes%2Fusa%2Fshenandoah%2F0000 . Accompaniment and synthesized timbre are newly made for this site.

## Audio

`public/radio/news-zh.mp3` and `news-en.mp3` are generated assets. To regenerate, install the optional Python `edge-tts` package and run `python scripts/generate-radio-news.py`. This dependency is only for asset production, not required by the website or its build. Keep script text, `broadcast` in `channels.ts`, and receipt text in sync when editing copy.

Audio starts after a user gesture. Music is rendered into cached buffers with OfflineAudioContext, then looped by AudioBufferSourceNode. Speech is decoded and placed after a three-note news ident; it shares the same tuning filters, master volume, compressor and analyser as the music. The site makes no runtime TTS service call.

Reception depends on distance from a station: gain reduction, high/low-pass narrowing and soft band-limited noise. A stable center window permits printing; pointer release snaps within four dial units. Arrow keys fine-tune, PageUp/PageDown select the next/previous station, Home/End select the first/last station. Volume zero silences all sound including print and tear effects. Hidden pages suspend the context.

Changing the news language fades out and restarts the corresponding broadcast. Changing language at a music station leaves the music running. Existing receipts retain their captured channel, language, playback position and waveform. Each station has an independently drawn SVG composition; export uses the same SVG at 1200 × 1640.

## Validation scope

Production build runs TypeScript checking and Vite bundling. No automated tests were added or run. Browser interaction, responsive rendering and real-device listening have not been verified in this update.
