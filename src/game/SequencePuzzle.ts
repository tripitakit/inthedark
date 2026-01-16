import type { Direction, SequencePuzzle as SequencePuzzleType } from '../types';
import type { GameState } from './GameState';
import type { AudioEngine } from '../audio/AudioEngine';

/**
 * SequencePuzzleManager - Handles sequence-based puzzles
 * Supports: sonar (facing directions), rotation (turn sequence), visit (room order)
 */
export class SequencePuzzleManager {
  private puzzles: SequencePuzzleType[] = [];
  private currentProgress: Map<string, Direction[]> = new Map();
  private gameState: GameState;
  private audioEngine: AudioEngine;
  private onPuzzleComplete?: (puzzle: SequencePuzzleType) => void;

  constructor(gameState: GameState, audioEngine: AudioEngine) {
    this.gameState = gameState;
    this.audioEngine = audioEngine;
  }

  /**
   * Register puzzles from level data
   */
  registerPuzzles(puzzles: SequencePuzzleType[]): void {
    this.puzzles = puzzles;
    // Initialize progress tracking
    for (const puzzle of puzzles) {
      this.currentProgress.set(puzzle.id, []);
    }
    console.log(`SequencePuzzleManager: Registered ${puzzles.length} puzzles`);
  }

  /**
   * Set callback for puzzle completion
   */
  setOnComplete(callback: (puzzle: SequencePuzzleType) => void): void {
    this.onPuzzleComplete = callback;
  }

  /**
   * Called when player uses sonar while facing a direction
   */
  onSonar(roomId: string, facingDirection: Direction): void {
    const puzzles = this.getActivePuzzles(roomId, 'sonar');
    for (const puzzle of puzzles) {
      this.recordAction(puzzle, facingDirection);
    }
  }

  /**
   * Called when player rotates to face a new direction
   */
  onRotation(roomId: string, newDirection: Direction): void {
    const puzzles = this.getActivePuzzles(roomId, 'rotation');
    for (const puzzle of puzzles) {
      this.recordAction(puzzle, newDirection);
    }
  }

  /**
   * Called when player enters a room (for visit-type puzzles)
   * Uses room direction relative to the puzzle context
   */
  onRoomVisit(_roomId: string, entryDirection: Direction): void {
    // Visit puzzles might span multiple rooms
    const visitPuzzles = this.puzzles.filter(
      (p) => p.type === 'visit' && !this.gameState.isSequenceCompleted(p.id)
    );

    for (const puzzle of visitPuzzles) {
      // Record entry direction as the action
      this.recordAction(puzzle, entryDirection);
    }
  }

  /**
   * Get puzzles active in current room of specific type
   */
  private getActivePuzzles(
    roomId: string,
    type: SequencePuzzleType['type']
  ): SequencePuzzleType[] {
    return this.puzzles.filter(
      (p) =>
        p.roomId === roomId &&
        p.type === type &&
        !this.gameState.isSequenceCompleted(p.id)
    );
  }

  /**
   * Record a player action for a puzzle
   */
  private recordAction(puzzle: SequencePuzzleType, direction: Direction): void {
    // Check if required item is needed and held
    if (puzzle.requiredItem && !this.gameState.hasItem(puzzle.requiredItem)) {
      return;
    }

    const progress = this.currentProgress.get(puzzle.id) || [];
    const expectedIndex = progress.length;
    const expectedDirection = puzzle.sequence[expectedIndex];

    if (direction === expectedDirection) {
      // Correct action
      progress.push(direction);
      this.currentProgress.set(puzzle.id, progress);

      // Play progress feedback
      this.playProgressFeedback(progress.length, puzzle.sequence.length);

      // Check if sequence complete
      if (progress.length === puzzle.sequence.length) {
        this.completePuzzle(puzzle);
      }
    } else {
      // Wrong action - reset progress
      this.currentProgress.set(puzzle.id, []);
      this.playErrorFeedback();
    }
  }

  /**
   * Mark puzzle as completed and trigger reward
   */
  private completePuzzle(puzzle: SequencePuzzleType): void {
    console.log(`SequencePuzzle: Completed ${puzzle.id}`);
    this.gameState.completeSequence(puzzle.id);
    puzzle.completed = true;

    // Play completion sound
    this.playCompletionFeedback();

    // Trigger callback
    if (this.onPuzzleComplete) {
      this.onPuzzleComplete(puzzle);
    }
  }

  /**
   * Play audio feedback for correct step
   */
  private playProgressFeedback(step: number, total: number): void {
    if (!this.audioEngine.isReady()) return;

    // Ascending tone based on progress
    const ctx = this.audioEngine.getContext();
    const master = this.audioEngine.getMasterGain();
    if (!ctx || !master) return;

    const now = ctx.currentTime;
    const baseFreq = 400 + (step / total) * 400; // 400-800Hz

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Play audio feedback for incorrect action
   */
  private playErrorFeedback(): void {
    this.audioEngine.playError();
  }

  /**
   * Play audio feedback for puzzle completion
   */
  private playCompletionFeedback(): void {
    this.audioEngine.playUnlock();
  }

  /**
   * Reset progress for all puzzles in a room
   */
  resetRoomProgress(roomId: string): void {
    for (const puzzle of this.puzzles) {
      if (puzzle.roomId === roomId) {
        this.currentProgress.set(puzzle.id, []);
      }
    }
  }

  /**
   * Get progress for a specific puzzle (for debugging/UI)
   */
  getProgress(puzzleId: string): Direction[] {
    return this.currentProgress.get(puzzleId) || [];
  }

  /**
   * Update game state reference
   */
  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.puzzles = [];
    this.currentProgress.clear();
  }
}
