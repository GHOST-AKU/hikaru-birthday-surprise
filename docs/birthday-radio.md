# Birthday radio

The existing `/instrument` chassis now houses four stations. The other routes retain their existing behavior.

| Frequency | Program | Content |
| --- | --- | --- |
| 88.8 | Birthday | All four phrases of Happy Birthday, with a held final note and a loop pause |
| 94.4 | 望春風 | Complete first verse through 心內彈琵琶 (16 bars); electronic plucked instrument |
| 100.0 | Shenandoah | Complete first verse through “cross the wide Missouri”; soft sustained synth |
| 105.6 | Birthday News | Fixed synthetic announcer in English or Taiwanese Mandarin, followed by a short station interval |

The frequencies are interface design choices, not biographical dates. Broadcast text is the user-requested birthday greeting, not a live news feed or date claim based on a calendar API. The announcer uses generic TTS voices and does not imitate Hikaru.

## Music and source notes

All instrumental sounds are synthesized locally using Web Audio; no commercial recording is included. Melody/tempo and accompaniment data live in `src/radio/channels.ts`; rendering and the news ident live in `src/radio/synthesis.ts`.

- Happy Birthday: complete familiar melody, 25 notes, C major.
- 望春風: 鄧雨賢, 1933; first verse in C. Full melodic contour, octave markings and dotted rhythm checked against the teaching score (page 5) at https://lmjh.tc.edu.tw/var/file/101/1101/img/1075/838512096.pdf , with the opening also checked against https://www.guitarlu.net/lesson-fsong-22-bang-chhun-hong.html and https://akhun.co/notes/songs/望春風/ . Only the underlying tune is transcribed, with a new simple accompaniment; no lyrics or modern recording/arrangement is used. This is an authored Taiwanese song, not labeled anonymous or universally copyright-free.
- Shenandoah: traditional melody in D, complete first verse through “cross the wide Missouri,” based on the Frank Nordberg ABC transcription preserved at https://abcnotation.com/tunePage?a=trillian.mit.edu%2F%7Ejc%2Fmusic%2Fabc%2Fmirror%2Fmusicaviva.com%2Ftunes%2Fusa%2Fshenandoah%2F0000 . Accompaniment and synthesized timbre are newly made for this site.

## Audio

`public/radio/news-zh.mp3` and `news-en.mp3` are generated assets. To regenerate, install the optional Python `edge-tts` package and run `python scripts/generate-radio-news.py`. This dependency is only for asset production, not required by the website or its build. Keep script text, `broadcast` in `channels.ts`, and receipt text in sync when editing copy.

Audio starts after a user gesture. Music is rendered into cached buffers with OfflineAudioContext, then looped by AudioBufferSourceNode. Speech is decoded and placed after a 3.05-second station ident (a six-note bell motif, soft bass and a quiet resolving major-seventh chord); a descending three-note tag follows the bulletin, with space before the next loop. The intro fades before the announcer enters; it shares the same tuning filters, master volume, compressor and analyser as the music. The site makes no runtime TTS service call.

Reception depends on distance from a station: gain reduction, high/low-pass narrowing and soft band-limited noise. A stable center window permits printing; pointer release snaps within four dial units. Arrow keys fine-tune, PageUp/PageDown select the next/previous station, Home/End select the first/last station. Volume zero silences all sound including print and tear effects. Hidden pages suspend the context.

Changing the news language fades out and restarts the corresponding broadcast. Changing language at a music station leaves the music running. Existing receipts retain their captured channel, language, playback position and waveform. Once printing finishes, a quiet scissors icon and “snip” / “剪下” appear beside the perforation. Clicking the scissors detaches the ticket; dragging the paper or pressing Enter/Space on it still works. The cue disappears after detachment and is excluded from the saved artwork. Each station has an independently drawn SVG composition; export uses the same SVG at 1200 × 1640.

## Validation scope

Production build runs TypeScript checking and Vite bundling. No automated tests were added or run. Browser interaction, responsive rendering and real-device listening have not been verified in this update.

## Shenandoah revision

Rhythm now follows Paul Hardy’s consistent 4/4 transcription (80 BPM), transposed from G to D: https://www.folktunefinder.com/tunes/51319 . Tied notes remain continuous; the two eighth-note breath rests are explicit (MIDI 0 means rest). The ending remains through “cross the wide Missouri.” This replaces the previous mixed-meter transcription. River timbre uses a clear upper-register flute-like sine spectrum, 25 ms attack, sustained body, short release, quieter bass, and three low-level stereo echoes at 225/450/675 ms. No environmental recording is mixed in. Browser listening has not been verified in this revision.

## Current Shenandoah score and flute revision

Supersedes both earlier transcriptions above. Fixed reference: Flutetunes, D major, 4/4, quarter note = 76, https://www.flutetunes.com/tunes.php?id=107 ; visible score https://www.flutetunes.com/tunes/shenandoah.pdf and matching score MIDI https://www.flutetunes.com/tunes/shenandoah.mid . Only the traditional melody is transcribed; the site's recording and the modern bass arrangement are not bundled.

All 38 melody pitches and durations were compared with track 1 of the score MIDI: exact match, 40 quarter-note beats. The 3-beat MIDI count-in is omitted. No note timings are randomized. The loop retains the final sustained D through “cross the wide Missouri.” The accompaniment remains a newly made, very quiet set of simple root/fifth supports.

The flute voice is synthesized: sustained harmonic spectrum, shaped air noise, delayed gentle vibrato and short note releases. This replaces the glassy oscillator timbre. Diffuse low-level convolution room ambience replaces rhythmic delay repeats so echoes do not blur the pulse. The stored note pitches already match the flute register; there is no additional octave shift. Score comparison and the production build are completed; listening on a browser/device has not been verified.
