import type { Direction } from '../types';
import { GraphWorld } from '../game/GraphWorld';
import { GameState } from '../game/GameState';
import {
  MINIMAP_CELL_SIZE,
  MINIMAP_NODE_SIZE,
  MINIMAP_CONN_SIZE,
} from '../constants';

interface NodePosition {
  x: number;
  y: number;
}

// Offset per ogni direzione (coordinate griglia)
const DIRECTION_OFFSET: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

// Direzione opposta
const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/**
 * Minimap - Visualizza la mappa del gioco
 * Calcola coordinate con BFS e renderizza con CSS Grid
 * Uses incremental DOM updates to avoid recreating all elements
 */
export class Minimap {
  private container: HTMLElement;
  private wrapper: HTMLElement | null = null;
  private graphWorld: GraphWorld;
  private gameState: GameState;
  private nodePositions: Map<string, NodePosition> = new Map();
  private visible: boolean = true;

  // Cached DOM elements for incremental updates
  private nodeElements: Map<string, HTMLElement> = new Map();
  private connElements: Map<string, HTMLElement> = new Map();

  // Cache previous state to detect changes
  private prevCurrentNode: string | null = null;
  private prevVisitedNodes: Set<string> = new Set();
  private prevDiscoveredEdges: Set<string> = new Set();
  private prevUnlockedPassages: Set<string> = new Set();
  private prevCollectedItems: Set<string> = new Set();

  constructor(
    container: HTMLElement,
    graphWorld: GraphWorld,
    gameState: GameState
  ) {
    this.container = container;
    this.graphWorld = graphWorld;
    this.gameState = gameState;

    // Calcola posizioni iniziali
    this.calculatePositions();
  }

  /**
   * Calcola le coordinate di tutti i nodi con BFS
   */
  private calculatePositions(): void {
    this.nodePositions.clear();

    const startNode = this.graphWorld.getStartNode();
    if (!startNode) return;

    // BFS per assegnare coordinate
    const queue: Array<{ nodeId: string; x: number; y: number }> = [
      { nodeId: startNode, x: 0, y: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, x, y } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      this.nodePositions.set(nodeId, { x, y });

      // Esplora connessioni
      const node = this.graphWorld.getNode(nodeId);
      if (!node) continue;

      const directions: Direction[] = ['north', 'east', 'south', 'west'];
      for (const dir of directions) {
        const targetId = node.connections[dir];
        if (targetId && !visited.has(targetId)) {
          const offset = DIRECTION_OFFSET[dir];
          queue.push({
            nodeId: targetId,
            x: x + offset.dx,
            y: y + offset.dy,
          });
        }
      }
    }
  }

  /**
   * Create initial DOM structure (only called once)
   */
  private createDOM(): void {
    // Clear existing
    this.container.innerHTML = '';
    this.nodeElements.clear();
    this.connElements.clear();

    if (this.nodePositions.size === 0) return;

    // Calcola bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const pos of this.nodePositions.values()) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Container con posizionamento assoluto
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'minimap-wrapper';
    this.wrapper.style.width = `${width * MINIMAP_CELL_SIZE}px`;
    this.wrapper.style.height = `${height * MINIMAP_CELL_SIZE}px`;
    this.wrapper.style.position = 'relative';

    // Create all node elements
    for (const [nodeId, pos] of this.nodePositions) {
      const pixelX = (pos.x - minX) * MINIMAP_CELL_SIZE + (MINIMAP_CELL_SIZE - MINIMAP_NODE_SIZE) / 2;
      const pixelY = (pos.y - minY) * MINIMAP_CELL_SIZE + (MINIMAP_CELL_SIZE - MINIMAP_NODE_SIZE) / 2;

      const cell = document.createElement('div');
      cell.className = 'minimap-node unknown';
      cell.style.left = `${pixelX}px`;
      cell.style.top = `${pixelY}px`;
      cell.dataset.nodeId = nodeId;

      this.wrapper.appendChild(cell);
      this.nodeElements.set(nodeId, cell);

      // Create connection elements for this node
      const node = this.graphWorld.getNode(nodeId);
      if (!node) continue;

      const directions: Direction[] = ['north', 'east', 'south', 'west'];
      for (const dir of directions) {
        const targetId = node.connections[dir];
        if (!targetId) continue;

        // Only create connection once (use sorted key)
        const connKey = [nodeId, targetId].sort().join('-');
        if (this.connElements.has(connKey)) continue;

        const conn = document.createElement('div');
        conn.className = `minimap-conn minimap-conn-${dir}`;
        conn.style.display = 'none'; // Hidden until discovered

        // Posiziona la connessione
        if (dir === 'north' || dir === 'south') {
          conn.style.left = `${pixelX + (MINIMAP_NODE_SIZE - MINIMAP_CONN_SIZE) / 2}px`;
          conn.style.top = dir === 'north'
            ? `${pixelY - MINIMAP_CONN_SIZE}px`
            : `${pixelY + MINIMAP_NODE_SIZE}px`;
          conn.style.width = `${MINIMAP_CONN_SIZE}px`;
          conn.style.height = `${MINIMAP_CONN_SIZE}px`;
        } else {
          conn.style.left = dir === 'west'
            ? `${pixelX - MINIMAP_CONN_SIZE}px`
            : `${pixelX + MINIMAP_NODE_SIZE}px`;
          conn.style.top = `${pixelY + (MINIMAP_NODE_SIZE - MINIMAP_CONN_SIZE) / 2}px`;
          conn.style.width = `${MINIMAP_CONN_SIZE}px`;
          conn.style.height = `${MINIMAP_CONN_SIZE}px`;
        }

        this.wrapper.appendChild(conn);
        this.connElements.set(connKey, conn);
      }
    }

    this.container.appendChild(this.wrapper);
  }

  /**
   * Update DOM elements based on current state (incremental)
   */
  private updateDOM(): void {
    const currentNode = this.gameState.currentNode;
    const visitedNodes = new Set(this.gameState.visitedNodes);

    // Update node elements
    for (const [nodeId, cell] of this.nodeElements) {
      const isVisited = visitedNodes.has(nodeId);
      const isCurrent = nodeId === currentNode;
      const node = this.graphWorld.getNode(nodeId);
      const hasItem = node?.item && !node.item.collected && isVisited;

      // Only update if state changed
      const wasVisited = this.prevVisitedNodes.has(nodeId);
      const wasCurrent = nodeId === this.prevCurrentNode;
      const hadItem = this.prevCollectedItems.has(nodeId) === false && node?.item;

      if (isCurrent !== wasCurrent || isVisited !== wasVisited || hasItem !== hadItem) {
        // Update classes
        cell.classList.remove('current', 'visited', 'unknown', 'has-item');

        if (isCurrent) {
          cell.classList.add('current');
        } else if (isVisited) {
          cell.classList.add('visited');
        } else {
          cell.classList.add('unknown');
        }

        if (hasItem) {
          cell.classList.add('has-item');
        }
      }
    }

    // Update connection elements
    for (const [nodeId] of this.nodePositions) {
      const isVisited = visitedNodes.has(nodeId);
      if (!isVisited) continue;

      const node = this.graphWorld.getNode(nodeId);
      if (!node) continue;

      const directions: Direction[] = ['north', 'east', 'south', 'west'];
      for (const dir of directions) {
        const targetId = node.connections[dir];
        if (!targetId) continue;

        const connKey = [nodeId, targetId].sort().join('-');
        const conn = this.connElements.get(connKey);
        if (!conn) continue;

        // Check if edge is discovered
        const isDiscovered =
          this.gameState.isEdgeDiscovered(nodeId, dir) ||
          this.gameState.isEdgeDiscovered(targetId, OPPOSITE_DIRECTION[dir]);

        // Check if locked
        const lock = this.graphWorld.getLock(nodeId, dir);
        const isLocked = lock ? !this.gameState.isPassageUnlocked(lock.id) : false;

        // Build edge key for caching
        const edgeKey = `${nodeId}-${dir}`;
        const wasDiscovered = this.prevDiscoveredEdges.has(edgeKey);
        const lockKey = lock ? lock.id : '';
        const wasLocked = lockKey ? !this.prevUnlockedPassages.has(lockKey) : false;

        // Only update if changed
        if (isDiscovered !== wasDiscovered || isLocked !== wasLocked) {
          conn.style.display = isDiscovered ? 'block' : 'none';

          if (isLocked) {
            conn.classList.add('locked');
          } else {
            conn.classList.remove('locked');
          }
        }
      }
    }

    // Update cached state
    this.prevCurrentNode = currentNode;
    this.prevVisitedNodes = new Set(visitedNodes);

    // Cache discovered edges and unlocked passages
    this.prevDiscoveredEdges.clear();
    this.prevUnlockedPassages.clear();
    for (const nodeId of visitedNodes) {
      const node = this.graphWorld.getNode(nodeId);
      if (!node) continue;
      const directions: Direction[] = ['north', 'east', 'south', 'west'];
      for (const dir of directions) {
        if (this.gameState.isEdgeDiscovered(nodeId, dir)) {
          this.prevDiscoveredEdges.add(`${nodeId}-${dir}`);
        }
        const lock = this.graphWorld.getLock(nodeId, dir);
        if (lock && this.gameState.isPassageUnlocked(lock.id)) {
          this.prevUnlockedPassages.add(lock.id);
        }
      }
    }

    // Cache collected items
    this.prevCollectedItems.clear();
    for (const [nodeId] of this.nodePositions) {
      const node = this.graphWorld.getNode(nodeId);
      if (node?.item?.collected) {
        this.prevCollectedItems.add(nodeId);
      }
    }
  }

  /**
   * Renderizza la minimap
   */
  render(): void {
    if (!this.visible) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';

    // Create DOM on first render, then update incrementally
    if (!this.wrapper) {
      this.createDOM();
    }

    this.updateDOM();
  }

  /**
   * Force full re-render (e.g., after loading a new level)
   */
  forceRender(): void {
    this.wrapper = null;
    this.nodeElements.clear();
    this.connElements.clear();
    this.prevCurrentNode = null;
    this.prevVisitedNodes.clear();
    this.prevDiscoveredEdges.clear();
    this.prevUnlockedPassages.clear();
    this.prevCollectedItems.clear();
    this.calculatePositions();
    this.render();
  }

  /**
   * Toggle visibilità
   */
  toggle(): void {
    this.visible = !this.visible;
    this.render();
  }

  /**
   * Mostra/nascondi
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.render();
  }

  /**
   * Aggiorna riferimento a GameState
   */
  setGameState(gameState: GameState): void {
    this.gameState = gameState;
    // Force re-render when state changes
    this.forceRender();
  }
}
