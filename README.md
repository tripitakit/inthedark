# In The Dark

An audio-only adventure game designed for visually impaired players. Navigate through a mysterious world using only sound cues, sonar echolocation, and voice narration.

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Story

You awaken in total darkness with no memory of how you got there. Armed only with a portable terminal equipped with sonar and an AI assistant, you must explore a forest, descend into caves, and discover an alien spacecraft. Collect items, solve puzzles, and uncover the mystery of your predicament.

## Controls

| Key | Action |
|-----|--------|
| Arrow Up | Move forward |
| Arrow Down | Turn around (180°) |
| Arrow Left | Turn left |
| Arrow Right | Turn right |
| Enter | Activate sonar pulse |
| Space | Pick up item / Use selected item |
| Ctrl | Cycle through inventory |
| S | Save game |
| H | Get a hint |
| P | Toggle voice narration |

## Audio Design

The game relies entirely on spatial audio cues:

- **Sonar**: Press Enter to emit a sonar pulse. Listen for:
  - Quick echo = wall ahead
  - Delayed echo = open passage
  - Item signature sound = locked door (hints at required key)

- **Footsteps**: Three distinct steps play when moving, with realistic pacing

- **Ambient sounds**: Each area has unique soundscapes (forest wind, cave drips, ship hum)

- **Voice narration**: Optional text-to-speech describes rooms and announces actions

## Features

- Audio-first gameplay with no visual requirements
- Web Speech API voice narration
- Save/load game progress
- Hint system for when you're stuck
- Multiple zones: Forest, Caves, Alien Ship, Temple, Celestial Realm
- Item-based puzzles with audio signatures

## Tech Stack

- TypeScript
- Vite
- Web Audio API (sound synthesis)
- Web Speech API (voice narration)
- LocalStorage (save system)

## Browser Support

Works best in modern browsers with Web Audio API and Web Speech API support:
- Chrome 33+
- Firefox 49+
- Safari 7+
- Edge 14+

## License

MIT
