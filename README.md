# CUSail Family Feud

A host-controlled Family Feud game board for the CUSail team social.

## Run it
Open the GitHub Pages link, or run locally:

```bash
python3 -m http.server 8123
```

then visit http://localhost:8123.

## Edit content
Everything (team names, questions, minigames, steal challenges) lives in **`data.js`**.

## Host controls
| Key | Action |
|---|---|
| → / ← | Next / previous screen |
| 1–8 | Reveal answer tile |
| X | Strike |
| S | Open / close steal challenges |
| F | Fullscreen |

- Click a tile to reveal it (click again to hide it if you made a mistake).
- Gold **+N** button on a team's scoreboard card = award the current pot.
- Click a team name to rename it; click a score to type an exact number.
- Scores are saved in the browser, so refreshing is safe. **Reset** clears everything.
