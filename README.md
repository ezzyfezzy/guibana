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

## Embedding just the player

`embed.html` is a second, self-contained page with only the fretboard player —
chord chips, speed/play, box/neck and note-name/interval toggles, the guitar
tone picker, the fretboard itself, and the legend. None of the chord-typing
box, the arrangement editor dialog, or the "Make with AI" pane. It drives
itself from song JSON instead of a text input, so you can drop it into any
existing page and feed it a song from your own code.

Build/serve it the same way as the main app (`npm run dev` / `npm run build`
+ `npm run preview`), then embed it with an iframe:

```html
<iframe src="https://your-host/embed.html" width="100%" height="560" style="border:0"></iframe>
```

There are three ways to give it a song:

1. **The "Song JSON" box on the page itself.** Paste JSON and press *Load
   song* — this is there so the embed is usable on its own, with no host-page
   code at all.
2. **A URL query param**, handy for static links:
   `embed.html?song=` + `encodeURIComponent(JSON.stringify(song))`.
3. **From the host page's own JavaScript**, once the iframe has loaded:
   ```js
   iframe.contentWindow.postMessage({type: 'guibana-song', song}, '*');
   ```
   If you're including `js/embed.js` directly on your own page instead of
   using an iframe (same origin, no sandboxing), call
   `window.guibanaLoadSong(song)` instead of posting a message.

`song` is JSON in one of two shapes:

- **Simple** — just a chord loop, no backing band:
  ```json
  {"chords": "Am F C G"}
  ```
- **Full arrangement** — sets, repeats, strum/bass/drum patterns, tempo,
  style and tone — the same format produced by "Copy JSON" in the main app's
  arrangement editor and described in its "Make with AI" prompt.

The embed keeps its own `localStorage` key (`guibana-embed-v1`, set via
`window.GUIBANA_STORAGE_KEY` before `js/embed.js` loads) so it won't clash
with a full Guibana instance's saved song if both ever end up on the same
origin.

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
| `embed.html` | standalone page with just the fretboard player (see above) |
| `js/embed.js` | wires the embed's player and JSON-loading, reusing the same theory/board/audio/playback modules |
| `public/smp/` | recorded guitar/bass/drum samples |

Outside claude.ai, the "Download JSON" button is hidden (it depends on a
Claude artifact feature) — use "Copy JSON" instead.

## Song links

A song link is just Guibana's URL with a `#song-<code>` hash appended. Any
app that already has a song as JSON can build that hash itself, without
importing any of Guibana's code:

```
#song-<z|r><base32-text>
```

- `z` means the JSON bytes are raw-deflated (RFC 1951 "deflate-raw" — no
  zlib or gzip header) before encoding. `r` means the JSON bytes are encoded
  as-is, uncompressed — simpler to produce, and still opens fine, just a
  longer link.
- `<base32-text>` is those bytes (compressed or not) base32-encoded with
  Guibana's own alphabet, `abcdefghijklmnopqrstuvwxyz234567` (lowercase, no
  `=` padding), packing 5 bits per output character, most-significant-bit
  first, zero-padding only the final partial group.

The JSON itself matches what "Copy JSON" / "Download JSON" produce:

```jsonc
{
  "name": "My song",
  "tempo": 100,          // optional, clamped to 50–180
  "style": "folk",       // optional, id from STYLES in js/theory.js
  "tone": "nylon",       // optional, id from TONES in js/audio.js
  "sets": [
    {
      "name": "Verse",
      "repeat": 1,
      "strum": "folk",   // id from STRUMS in js/theory.js
      "beats": 4,        // 2, 4, or 8
      "lines": [
        {"chords": "Am F C G", "repeat": 1, "bass": "off", "drums": "off"}
      ]
    }
  ]
}
```

Minimal example (Node.js), using the uncompressed `r` variant so there's no
dependency on a raw-deflate implementation:

```js
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
function b32(bytes) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
    val &= (1 << bits) - 1;
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}

function songLink(song, baseUrl) {
  const bytes = Buffer.from(JSON.stringify(song), 'utf8');
  return `${baseUrl}#song-r${b32(bytes)}`;
}

songLink({name: 'My song', sets: [/* ... */]}, 'https://your-guibana-host/');
```

For the shorter `z` variant, raw-deflate the JSON bytes first — in Node,
`zlib.deflateRawSync(bytes)` — then base32-encode that and prefix with
`song-z` instead of `song-r`.

Opening the resulting link (in a browser, or by setting `location.hash` on
an already-open Guibana tab) loads the song straight in — no server
round-trip, nothing to upload. See `js/songlinks.js` for the exact
encode/decode Guibana itself uses.

## Credits

- Guitar and bass samples: [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
  by Nicholas Brosowsky, CC BY 3.0, re-encoded and trimmed.
- Drum kits: [GeneralUser GS](https://schristiancollins.com/generaluser.php)
  by S. Christian Collins, rendered from the SoundFont. GeneralUser GS License v2.0.
