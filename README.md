# Guibana

**Guitar backtracking and noodling app.**

Type in a song's chords and Guibana gives you one set of notes that sounds good
over all of them, lit up on a fretboard in real time as a backing loop plays.
No music theory required — just land on the gold notes.

```
A  C  D
```

→ a fretboard, a backing track, and the notes that fit.

## What it does

- **Type chords, get notes.** Paste a chord sequence (`Am F C G`) and see the
  scale that fits the whole song, plus which notes belong to whatever chord is
  playing right now.
- **Build real arrangements.** Go beyond a flat chord list: verses, choruses,
  repeats, strum/bass/drum patterns, tempo and section markers, with a visual
  timeline and count-in.
- **Play along.** A backing loop (guitar, bass, and drums) keeps time while
  the fretboard highlights what to play, in "easy box" or "whole neck" view,
  labeled by note name or interval.
- **Make a song with AI.** Paste a chord chart or tab into the "Make with AI"
  pane to generate a ready-to-play arrangement.
- **Share without a server.** Arrangements encode into the page URL, so a song
  can be shared with just a link, or exported/imported as JSON.

## Try it

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173` URL. The fretboard needs audio
samples loaded over `fetch()`, so the app must be served over HTTP — opening
`index.html` directly from disk still works, but falls back to a built-in
synth instead of the recorded samples.

```bash
npm run build     # production build into dist/
npm run preview   # serve that build locally
```

No npm? Any static file server works just as well:

```bash
cd guibana
python3 -m http.server 8000
```

## Under the hood

A plain HTML/CSS/JS app — no framework, no build step required to run it.

| | |
|---|---|
| `index.html` | markup |
| `css/styles.css` | all styling |
| `js/theory.js` | scales, chord parsing, pattern tables, key-fit scoring |
| `js/arrangement.js` | the song data model: parsing, text ↔ JSON, sequencing |
| `js/audio.js` | the Web Audio synth/sample engine |
| `js/board.js` | fretboard SVG and note-spelling |
| `js/playback.js` | the backing-loop sequencer |
| `js/editor.js` | arrangement editor (block/text views, import/export) |
| `js/songlinks.js` | encoding songs into the URL hash |
| `js/ai-prompt.js` | the "Make with AI" pane |
| `js/app.js` | wires everything together and boots the app |
| `public/smp/` | recorded guitar/bass/drum samples |

Outside claude.ai, the "Download JSON" button is hidden (it depends on a
Claude artifact feature) — use "Copy JSON" instead.

## Credits

- Guitar and bass samples: [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
  by Nicholas Brosowsky, CC BY 3.0, re-encoded and trimmed.
- Drum kits: [GeneralUser GS](https://schristiancollins.com/generaluser.php)
  by S. Christian Collins, rendered from the SoundFont. GeneralUser GS License v2.0.
