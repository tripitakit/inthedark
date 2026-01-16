import { GameState } from '../game/GameState';
import { GraphWorld } from '../game/GraphWorld';
import type { Direction } from '../types';

// English names for rooms
const ROOM_NAMES: Record<string, string> = {
  forest_start: 'Forest Trail',
  forest_path: 'Forest Crossroads',
  forest_clearing: 'Forest Clearing',
  forest_thicket: 'Dense Thicket',
  forest_stream: 'Forest Stream',
  cave_entrance: 'Cave Entrance',
  cave_hall: 'Cave Hall',
  cave_crossroads: 'Cave Junction',
  cave_pool: 'Underground Pool',
  cave_tunnel: 'Narrow Tunnel',
  cave_chasm: 'Deep Chasm',
  cave_deep: 'Cave Depths',
  ship_airlock: 'Airlock Chamber',
  ship_corridor: 'Ship Corridor',
  ship_secret: 'Hologram Room',
  ship_bridge: 'Command Bridge',
  ship_engineering: 'Engine Room',
  ship_reactor: 'Reactor Core',
  ship_quarters: 'Crew Quarters',
  ship_storage: 'Storage Bay',
};

// English names for directions
const DIRECTION_NAMES: Record<Direction, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
};

/**
 * RoomInfoUI - Displays current room name and facing direction
 */
export class RoomInfoUI {
  private container: HTMLElement;
  private nameElement: HTMLElement;
  private directionElement: HTMLElement;
  private gameState: GameState;
  private graphWorld: GraphWorld;

  constructor(
    container: HTMLElement,
    gameState: GameState,
    graphWorld: GraphWorld
  ) {
    this.container = container;
    this.gameState = gameState;
    this.graphWorld = graphWorld;

    const nameEl = container.querySelector('.room-name');
    const dirEl = container.querySelector('.room-direction');

    if (!nameEl || !dirEl) {
      throw new Error('RoomInfoUI: missing .room-name or .room-direction elements');
    }

    this.nameElement = nameEl as HTMLElement;
    this.directionElement = dirEl as HTMLElement;
  }

  /**
   * Updates the room info display
   */
  render(): void {
    const nodeId = this.gameState.currentNode;
    const direction = this.gameState.orientation;

    // Get room name (use translation or fall back to node name)
    const node = this.graphWorld.getNode(nodeId);
    const roomName = ROOM_NAMES[nodeId] || node?.name || nodeId;

    // Get direction name
    const directionName = DIRECTION_NAMES[direction];

    this.nameElement.textContent = roomName;
    this.directionElement.textContent = `Facing ${directionName}`;
  }

  /**
   * Shows/hides the room info panel
   */
  setVisible(visible: boolean): void {
    if (visible) {
      this.container.classList.add('active');
    } else {
      this.container.classList.remove('active');
    }
  }
}
