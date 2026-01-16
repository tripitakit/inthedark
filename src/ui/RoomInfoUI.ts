import { GameState } from '../game/GameState';
import { GraphWorld } from '../game/GraphWorld';
import type { Direction } from '../types';

// English names for rooms
const ROOM_NAMES: Record<string, string> = {
  // Forest zone
  forest_start: 'Forest Trail',
  forest_path: 'Forest Crossroads',
  forest_clearing: 'Forest Clearing',
  forest_thicket: 'Dense Thicket',
  forest_stream: 'Forest Stream',
  // Cave zone
  cave_entrance: 'Cave Entrance',
  cave_hall: 'Cave Hall',
  cave_crossroads: 'Cave Junction',
  cave_pool: 'Underground Pool',
  cave_tunnel: 'Narrow Tunnel',
  cave_chasm: 'Deep Chasm',
  cave_deep: 'Cave Depths',
  // Ship zone
  ship_airlock: 'Airlock Chamber',
  ship_corridor: 'Ship Corridor',
  ship_secret: 'Hologram Room',
  ship_bridge: 'Command Bridge',
  ship_engineering: 'Engine Room',
  ship_reactor: 'Reactor Core',
  ship_quarters: 'Crew Quarters',
  ship_storage: 'Storage Bay',
  // Temple zone
  temple_entrance: 'Temple Entrance',
  temple_antechamber: 'Antechamber',
  temple_side_chapel: 'Side Chapel',
  temple_offering_room: 'Offering Room',
  temple_main_hall: 'Main Hall',
  temple_library: 'Ancient Library',
  temple_crypt_stairs: 'Crypt Stairs',
  temple_crypt: 'Crypt',
  temple_sanctuary: 'Sanctuary',
  temple_observatory: 'Observatory',
  temple_meditation: 'Meditation Room',
  temple_inner_sanctum: 'Inner Sanctum',
  temple_portal_room: 'Portal Room',
  // Celestial zone
  celestial_arrival: 'Celestial Arrival',
  celestial_crossroads: 'Celestial Crossroads',
  celestial_garden: 'Crystal Garden',
  celestial_fountain: 'Harmony Fountain',
  celestial_void_edge: 'Void Edge',
  celestial_echo_chamber: 'Echo Chamber',
  celestial_spire: 'Celestial Spire',
  celestial_archive: 'Cosmic Archive',
  celestial_memory_hall: 'Memory Hall',
  celestial_throne: 'Throne Room',
  celestial_bridge: 'Bridge of Light',
  celestial_oracle: 'Oracle Sanctum',
  celestial_resonance: 'Resonance Chamber',
  celestial_transcendence: 'Transcendence Portal',
};

// English names for directions
const DIRECTION_NAMES: Record<Direction, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
};

/**
 * RoomInfoUI - Displays current room name, description, and facing direction
 */
export class RoomInfoUI {
  private container: HTMLElement;
  private nameElement: HTMLElement;
  private descriptionElement: HTMLElement;
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
    const descEl = container.querySelector('.room-description');
    const dirEl = container.querySelector('.room-direction');

    if (!nameEl || !dirEl) {
      throw new Error('RoomInfoUI: missing .room-name or .room-direction elements');
    }

    this.nameElement = nameEl as HTMLElement;
    this.directionElement = dirEl as HTMLElement;

    // Create description element if it doesn't exist
    if (!descEl) {
      this.descriptionElement = document.createElement('div');
      this.descriptionElement.className = 'room-description';
      this.nameElement.after(this.descriptionElement);
    } else {
      this.descriptionElement = descEl as HTMLElement;
    }
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

    // Get room description from node data
    const description = node?.description || '';

    // Get direction name
    const directionName = DIRECTION_NAMES[direction];

    this.nameElement.textContent = roomName;
    this.descriptionElement.textContent = description;
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
