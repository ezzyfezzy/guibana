# Aguibana
Another guitar backtracking and noodling app.

## Files
- `index.html`: markup only.
- `css/styles.css`: all styling.
- `js/`: the app logic, as ES modules:
  - `dom.js` — tiny `$`/`esc` DOM helpers.
  - `theory.js` — scales, chord parsing, strum/bass/drum pattern tables, key-fit scoring.
  - `arrangement.js` — the arrangement (sets/lines) data model: parsing, text<->JSON, sequencing.
  - `state.js` — persisted settings (localStorage) and the shared in-memory runtime state.
  - `audio.js` — the Web Audio synth/sample engine, tone and mixer controls.
  - `board.js` — fretboard SVG drawing and note-spelling helpers.
  - `readout.js` — the "notes to noodle with" tiles and chord chips.
  - `dropdown.js` — the sound-style picker.
  - `songmap.js` — the section timeline and count-in.
  - `playback.js` — the backing-loop sequencer (play/stop).
  - `editor.js` — the arrangement dialog (block editor, text editor, import/export).
  - `songlinks.js` — encoding/decoding songs into the page's URL hash.
  - `ai-prompt.js` — the "Make with AI" pane.
  - `app.js` — composition root: wires the modules together and boots the app.
- `smp/`: recorded samples and `manifest.json` (guitar, bass and three drum kits).

## Running it
The samples are loaded with `fetch()`, which browsers block for files opened straight from disk.
Serve the folder with any local web server, for example:

    cd aguibana
    python3 -m http.server 8000

then open http://localhost:8000. Opened as a plain file, the app still works but falls back to its built-in synth sounds.

Outside claude.ai the "Download JSON" button is hidden (it uses a Claude artifact feature). Use "Copy JSON" instead.

## Credits
- Guitar and bass samples: tonejs-instruments by Nicholas Brosowsky, CC BY 3.0
  (https://github.com/nbrosowsky/tonejs-instruments), re-encoded and trimmed.
- Drum kits: GeneralUser GS by S. Christian Collins (https://schristiancollins.com/generaluser.php),
  rendered from the SoundFont. GeneralUser GS License v2.0.
