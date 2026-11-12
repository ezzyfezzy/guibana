# Aguibana
Another guitar backtracking and noodling app.

## Files
- `index.html`: the whole app (HTML, CSS and JavaScript in one file).
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
