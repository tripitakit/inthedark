import type { SurpriseEvent } from '../types';
import type { AudioEngine } from './AudioEngine';
import type { GameState } from '../game/GameState';

/**
 * SurpriseEventManager - Handles random, proximity, and story audio events
 */
export class SurpriseEventManager {
  private audioEngine: AudioEngine;
  private gameState: GameState;
  private events: SurpriseEvent[] = [];
  private activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lastTriggerTime: Map<string, number> = new Map();

  constructor(audioEngine: AudioEngine, gameState: GameState) {
    this.audioEngine = audioEngine;
    this.gameState = gameState;
  }

  /**
   * Register events from level data
   */
  registerEvents(events: SurpriseEvent[]): void {
    this.events = events;
    console.log(`SurpriseEventManager: Registered ${events.length} events`);
  }

  /**
   * Called when player enters a new room
   */
  onRoomEnter(roomId: string): void {
    // Check story events (first-time entry)
    this.checkStoryEvents(roomId);

    // Start random events for this room
    this.startRandomEvents(roomId);

    // Check proximity events
    this.checkProximityEvents(roomId);
  }

  /**
   * Called when player leaves a room
   */
  onRoomLeave(): void {
    // Clear all active timers
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Check and trigger story events (one-time)
   */
  private checkStoryEvents(roomId: string): void {
    const storyEvents = this.events.filter(
      (e) => e.type === 'story' && e.rooms.includes(roomId) && e.once
    );

    for (const event of storyEvents) {
      if (!this.gameState.isEventTriggered(event.id)) {
        // Check condition if specified
        if (event.condition && !this.evaluateCondition(event.condition)) {
          continue;
        }

        // Trigger the event
        this.triggerEvent(event);
        this.gameState.triggerEvent(event.id);
      }
    }
  }

  /**
   * Start random ambient events for current room
   */
  private startRandomEvents(roomId: string): void {
    const randomEvents = this.events.filter(
      (e) => e.type === 'random' && e.rooms.includes(roomId)
    );

    for (const event of randomEvents) {
      this.scheduleRandomEvent(event);
    }
  }

  /**
   * Schedule a random event to trigger after delay
   */
  private scheduleRandomEvent(event: SurpriseEvent): void {
    const minInterval = (event.intervalMin || 10) * 1000;
    const maxInterval = (event.intervalMax || 60) * 1000;
    const delay = minInterval + Math.random() * (maxInterval - minInterval);

    const timer = setTimeout(() => {
      // Check probability
      const probability = event.probability ?? 1;
      if (Math.random() < probability) {
        this.triggerEvent(event);
      }

      // Reschedule if still in same room
      if (this.activeTimers.has(event.id)) {
        this.scheduleRandomEvent(event);
      }
    }, delay);

    this.activeTimers.set(event.id, timer);
  }

  /**
   * Check proximity events based on distance to target
   */
  private checkProximityEvents(roomId: string): void {
    const proximityEvents = this.events.filter(
      (e) => e.type === 'proximity' && e.proximityTarget
    );

    for (const event of proximityEvents) {
      // Simple proximity check - for now just check if adjacent
      // Could be expanded with actual path distance
      const isNear = event.rooms.includes(roomId);

      if (isNear) {
        // Check condition
        if (event.condition && !this.evaluateCondition(event.condition)) {
          continue;
        }

        // Check cooldown
        const lastTrigger = this.lastTriggerTime.get(event.id) || 0;
        const cooldown = ((event.intervalMin || 30) * 1000);
        if (Date.now() - lastTrigger < cooldown) {
          continue;
        }

        this.triggerEvent(event);
        this.lastTriggerTime.set(event.id, Date.now());
      }
    }
  }

  /**
   * Trigger an event (play audio)
   */
  private triggerEvent(event: SurpriseEvent): void {
    console.log(`SurpriseEvent: Triggering ${event.id}`);

    switch (event.soundType) {
      case 'effect':
        if (event.soundId) {
          this.audioEngine.playSurpriseEffect(event.soundId);
        }
        break;

      case 'ambient':
        if (event.soundId) {
          this.audioEngine.playSurpriseAmbient(event.soundId);
        }
        break;

      case 'voice':
        if (event.voiceText) {
          // Voice synthesis will be handled by VoiceSynthesizer
          this.audioEngine.playVoiceNarration(event.voiceText);
        }
        break;
    }
  }

  /**
   * Evaluate a condition string against game state
   * Supports: hasItem:id, !hasItem:id, inRoom:id
   */
  private evaluateCondition(condition: string): boolean {
    if (condition.startsWith('!hasItem:')) {
      const itemId = condition.slice(9);
      return !this.gameState.hasItem(itemId);
    }

    if (condition.startsWith('hasItem:')) {
      const itemId = condition.slice(8);
      return this.gameState.hasItem(itemId);
    }

    if (condition.startsWith('inRoom:')) {
      const roomId = condition.slice(7);
      return this.gameState.currentNode === roomId;
    }

    console.warn(`Unknown condition: ${condition}`);
    return true;
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
    this.onRoomLeave();
    this.events = [];
  }
}
