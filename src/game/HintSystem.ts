import type { GameState } from './GameState';
import { VoiceSynthesizer } from '../audio/VoiceSynthesizer';
import type { AudioEngine } from '../audio/AudioEngine';

/**
 * Puzzle hint definition
 */
interface PuzzleHint {
  puzzleId: string;
  roomContext: string[]; // Rooms where this hint is relevant
  requiredItem?: string; // Item player needs (if puzzle requires one)
  lockId?: string; // Lock ID if hint is for a lock puzzle
  hints: string[]; // Progressive hints (index 0 = vague, higher = clearer)
}

/**
 * All puzzle hints organized by zone
 */
const PUZZLE_HINTS: PuzzleHint[] = [
  // === FOREST / CAVE PUZZLES ===
  {
    puzzleId: 'chasm_rope',
    roomContext: ['cave_chasm', 'cave_hall', 'cave_crossroads', 'cave_tunnel'],
    lockId: 'chasm_rope',
    hints: [
      'The void hungers... but fibers may bridge the darkness.',
      'What binds, when woven, can span the abyss.',
      'A rope. You need a rope to cross the chasm. Check the narrow tunnel.',
    ],
  },
  {
    puzzleId: 'secret_gem',
    roomContext: ['ship_corridor', 'cave_pool'],
    lockId: 'secret_gem',
    hints: [
      'Crystal waters reflect crystalline keys.',
      'Something blue glimmers in the depths... or do you carry it?',
      'The blue gem unlocks the hologram room.',
    ],
  },

  // === SHIP PUZZLES ===
  {
    puzzleId: 'airlock_crystal',
    roomContext: ['ship_airlock', 'cave_deep'],
    lockId: 'airlock_crystal',
    hints: [
      'Alien hearts beat in crystalline rhythm.',
      'The pulsing gem speaks the tongue of the stars.',
      'Use the alien crystal to open the airlock.',
    ],
  },
  {
    puzzleId: 'engineering_power',
    roomContext: ['ship_engineering', 'ship_bridge', 'ship_storage'],
    lockId: 'engineering_power',
    hints: [
      'Machines hunger for stored lightning.',
      'Power flows from contained energy.',
      'The power cell energizes the engineering bay. Check the storage.',
    ],
  },
  {
    puzzleId: 'reactor_fuel',
    roomContext: ['ship_reactor', 'ship_bridge', 'ship_quarters'],
    lockId: 'reactor_fuel',
    hints: [
      'The heart of the ship thirsts for fire.',
      'Fuel feeds the flames of propulsion.',
      'Insert the fuel cell into the reactor. Check the crew quarters.',
    ],
  },
  {
    puzzleId: 'bridge_activation',
    roomContext: ['ship_bridge', 'ship_corridor', 'ship_engineering'],
    lockId: 'bridge_activation',
    hints: [
      'Command requires authority, authority requires proof.',
      'A key shaped for stellar navigation.',
      'The activation key unlocks the bridge controls. Check engineering.',
    ],
  },

  // === TEMPLE PUZZLES ===
  {
    puzzleId: 'sanctuary_seal',
    roomContext: ['temple_main_hall', 'temple_antechamber', 'temple_side_chapel'],
    lockId: 'sanctuary_seal',
    hints: [
      'Sacred spaces answer to sacred sounds.',
      'Ring the call that summons the devoted.',
      'The ritual bell opens the sanctuary. Check the side chapel.',
    ],
  },
  {
    puzzleId: 'crypt_seal',
    roomContext: ['temple_crypt', 'temple_crypt_stairs', 'temple_library'],
    lockId: 'crypt_seal',
    hints: [
      'Stone remembers... the tablets hold the key.',
      'Written wisdom unlocks the resting place.',
      'Use the stone tablet to enter the crypt. Check the library.',
    ],
  },
  {
    puzzleId: 'inner_sanctum_seal',
    roomContext: ['temple_inner_sanctum', 'temple_crypt', 'temple_meditation'],
    lockId: 'inner_sanctum_seal',
    hints: [
      'The holy one wore their faith upon their chest.',
      'A medallion marks the path of the enlightened.',
      'The monk medallion grants passage to the inner sanctum. Check the meditation room.',
    ],
  },
  {
    puzzleId: 'bell_sequence',
    roomContext: ['temple_main_hall'],
    hints: [
      'The winds speak in order: cold, then rising, then setting.',
      'North whispers first, East follows, West completes.',
      'Use sonar facing North, then East, then West.',
    ],
  },
  {
    puzzleId: 'portal_multi',
    roomContext: ['temple_portal_room', 'temple_inner_sanctum', 'temple_offering_room', 'celestial_garden'],
    lockId: 'portal_activation',
    hints: [
      'Two become one: the vessel and the light it holds.',
      'Fill the chalice with celestial radiance.',
      'Combine the offering chalice and crystal shard. Chalice in offering room, shard in celestial garden.',
    ],
  },

  // === CELESTIAL PUZZLES ===
  {
    puzzleId: 'archive_seal',
    roomContext: ['celestial_spire', 'celestial_fountain'],
    lockId: 'archive_seal',
    hints: [
      'Harmony unlocks memory.',
      'The key that sings opens the songs of ages.',
      'The harmonic key opens the celestial archive. Find it at the fountain.',
    ],
  },
  {
    puzzleId: 'oracle_seal',
    roomContext: ['celestial_bridge', 'celestial_void_edge'],
    lockId: 'oracle_seal',
    hints: [
      'Emptiness holds wisdom.',
      'Capture nothing to learn everything.',
      'The void essence reveals the oracle. Find it at the void edge.',
    ],
  },
  {
    puzzleId: 'resonance_seal',
    roomContext: ['celestial_throne', 'celestial_memory_hall'],
    lockId: 'resonance_seal',
    hints: [
      'Echoes of the past resonate with the present.',
      'A fragment of memory completes the pattern.',
      'Use the memory fragment at the resonance chamber. Find it in the memory hall.',
    ],
  },
  {
    puzzleId: 'harmonic_alignment',
    roomContext: ['celestial_spire', 'celestial_fountain'],
    hints: [
      'The key dances with the cosmos: a full rotation of being.',
      'Hold the tone, face each direction in the suns path.',
      'While holding harmonic key, rotate North, East, South, West.',
    ],
  },
  {
    puzzleId: 'transcendence',
    roomContext: ['celestial_throne', 'celestial_oracle', 'celestial_archive'],
    lockId: 'transcendence_gate',
    hints: [
      'Two truths complete the journey: light and understanding.',
      'Stars heart and cosmic symbol together ascend.',
      'Combine starlight core and cosmic sigil. Core in oracle, sigil in archive.',
    ],
  },

  // === GENERAL EXPLORATION HINTS ===
  {
    puzzleId: 'general_exploration',
    roomContext: ['forest_start', 'forest_path', 'forest_clearing'],
    hints: [
      'Listen to the echoes... they reveal the path.',
      'Use sonar to discover passages in each direction.',
      'Press Enter for sonar, arrows to face directions, Tab to walk.',
    ],
  },
];

/**
 * HintSystem - Context-aware riddle hints with lo-fi voice
 *
 * Provides progressive hints based on:
 * - Current room location
 * - Player inventory
 * - Puzzle completion state
 *
 * Features:
 * - Progressive hints (vague → clear)
 * - Repeatable at any time (no cooldown)
 * - Lo-fi computer voice output
 */
export class HintSystem {
  private gameState: GameState;
  private voiceSynth: VoiceSynthesizer;

  constructor(gameState: GameState, audioEngine: AudioEngine) {
    this.gameState = gameState;
    this.voiceSynth = new VoiceSynthesizer(audioEngine);
  }

  /**
   * Request a hint for the current context
   * Returns true if hint was provided, false if currently speaking
   */
  async requestHint(): Promise<boolean> {
    // Check if already speaking
    if (this.voiceSynth.speaking) {
      return false;
    }

    // Find relevant hint
    const hint = this.findRelevantHint();
    if (!hint) {
      // No specific hint - give general encouragement
      await this.voiceSynth.speak('Listen to your surroundings. The path reveals itself.');
      return true;
    }

    // Get progressive hint level (first time vague, subsequent times clearer)
    const hintLevel = this.gameState.incrementHintLevel(hint.puzzleId);
    const hintIndex = Math.min(hintLevel - 1, hint.hints.length - 1);
    const hintText = hint.hints[hintIndex];

    console.log(`HintSystem: Providing hint ${hintLevel} for ${hint.puzzleId}`);
    await this.voiceSynth.speak(hintText);

    return true;
  }

  /**
   * Find the most relevant hint for current game state
   */
  private findRelevantHint(): PuzzleHint | null {
    const currentRoom = this.gameState.currentNode;

    // Filter hints relevant to current room
    const relevantHints = PUZZLE_HINTS.filter((hint) =>
      hint.roomContext.includes(currentRoom)
    );

    if (relevantHints.length === 0) {
      return null;
    }

    // Prioritize hints for unsolved puzzles
    for (const hint of relevantHints) {
      // Skip if puzzle already completed
      if (hint.lockId && this.gameState.isPassageUnlocked(hint.lockId)) {
        continue;
      }

      // Skip sequence puzzles if completed
      if (!hint.lockId && this.gameState.isSequenceCompleted(hint.puzzleId)) {
        continue;
      }

      // Check if player has required item for this puzzle
      if (hint.requiredItem && !this.gameState.hasItem(hint.requiredItem)) {
        // Player doesn't have the item yet - hint about finding it
        continue;
      }

      return hint;
    }

    // Return first relevant hint as fallback
    return relevantHints[0];
  }

  /**
   * Check if hint system is ready (not currently speaking)
   */
  isReady(): boolean {
    return !this.voiceSynth.speaking;
  }

  /**
   * Update game state reference (for save/load)
   */
  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }
}
