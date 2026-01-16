import type { Direction } from '../types';
import { GraphWorld } from '../game/GraphWorld';
import { GameState } from '../game/GameState';

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
 */
export class Minimap {
  private container: HTMLElement;
  private graphWorld: GraphWorld;
  private gameState: GameState;
  private nodePositions: Map<string, NodePosition> = new Map();
  private visible: boolean = true;

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
   * Renderizza la minimap
   */
  render(): void {
    if (!this.visible) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';
    this.container.innerHTML = '';

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
    const cellSize = 24;
    const nodeSize = 20;
    const connSize = 4;

    // Container con posizionamento assoluto
    const wrapper = document.createElement('div');
    wrapper.className = 'minimap-wrapper';
    wrapper.style.width = `${width * cellSize}px`;
    wrapper.style.height = `${height * cellSize}px`;
    wrapper.style.position = 'relative';

    // Stato corrente
    const currentNode = this.gameState.currentNode;
    const visitedNodes = new Set(this.gameState.visitedNodes);

    // Set per tracciare connessioni già renderizzate
    const renderedConnections = new Set<string>();

    // Renderizza nodi e connessioni
    for (const [nodeId, pos] of this.nodePositions) {
      const isVisited = visitedNodes.has(nodeId);
      const isCurrent = nodeId === currentNode;

      // Calcola posizione pixel
      const pixelX = (pos.x - minX) * cellSize + (cellSize - nodeSize) / 2;
      const pixelY = (pos.y - minY) * cellSize + (cellSize - nodeSize) / 2;

      // Crea nodo
      const cell = document.createElement('div');
      cell.className = 'minimap-node';
      cell.style.left = `${pixelX}px`;
      cell.style.top = `${pixelY}px`;

      if (isCurrent) {
        cell.classList.add('current');
      } else if (isVisited) {
        cell.classList.add('visited');
      } else {
        cell.classList.add('unknown');
      }

      // Dati del nodo
      const node = this.graphWorld.getNode(nodeId);

      // Indicatore oggetto non raccolto (solo per nodi visitati)
      if (node?.item && !node.item.collected && isVisited) {
        cell.classList.add('has-item');
      }

      wrapper.appendChild(cell);

      // Renderizza connessioni (solo se scoperte via sonar)
      if (node && isVisited) {
        const directions: Direction[] = ['north', 'east', 'south', 'west'];
        for (const dir of directions) {
          const targetId = node.connections[dir];
          if (!targetId) continue;

          // Verifica se l'edge è stato scoperto (da uno dei due lati)
          const isDiscovered =
            this.gameState.isEdgeDiscovered(nodeId, dir) ||
            this.gameState.isEdgeDiscovered(targetId, OPPOSITE_DIRECTION[dir]);
          if (!isDiscovered) continue;

          // Evita duplicati (A->B e B->A)
          const connKey = [nodeId, targetId].sort().join('-');
          if (renderedConnections.has(connKey)) continue;
          renderedConnections.add(connKey);

          // Verifica se bloccata
          const lock = this.graphWorld.getLock(nodeId, dir);
          const isLocked = lock && !this.gameState.isPassageUnlocked(lock.id);

          // Crea elemento connessione
          const conn = document.createElement('div');
          conn.className = `minimap-conn minimap-conn-${dir}`;
          if (isLocked) {
            conn.classList.add('locked');
          }

          // Posiziona la connessione
          if (dir === 'north' || dir === 'south') {
            // Connessione verticale
            conn.style.left = `${pixelX + (nodeSize - connSize) / 2}px`;
            conn.style.top = dir === 'north'
              ? `${pixelY - connSize}px`
              : `${pixelY + nodeSize}px`;
            conn.style.width = `${connSize}px`;
            conn.style.height = `${connSize}px`;
          } else {
            // Connessione orizzontale
            conn.style.left = dir === 'west'
              ? `${pixelX - connSize}px`
              : `${pixelX + nodeSize}px`;
            conn.style.top = `${pixelY + (nodeSize - connSize) / 2}px`;
            conn.style.width = `${connSize}px`;
            conn.style.height = `${connSize}px`;
          }

          wrapper.appendChild(conn);
        }
      }
    }

    this.container.appendChild(wrapper);
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
  }
}
