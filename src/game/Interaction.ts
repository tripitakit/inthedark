import type { GameItem } from '../types';
import { GameState } from './GameState';
import { GraphWorld } from './GraphWorld';
import { audioEngine } from '../audio/AudioEngine';

/**
 * Risultato di un'interazione
 */
export type InteractionResult = {
  type: 'pickup' | 'unlock' | 'victory' | 'error' | 'nothing';
  message: string;
  item?: GameItem;
};

/**
 * Interaction - Gestisce le interazioni del giocatore
 *
 * Logica:
 * 1. Se c'è un item nel nodo corrente e non raccolto → raccoglilo (aggiunge all'inventario)
 * 2. Se hai un item selezionato e c'è un lock davanti → prova a usarlo
 * 3. Altrimenti → nessuna interazione disponibile
 */
export class Interaction {
  private gameState: GameState;
  private graphWorld: GraphWorld;

  constructor(gameState: GameState, graphWorld: GraphWorld) {
    this.gameState = gameState;
    this.graphWorld = graphWorld;
  }

  /**
   * Tenta un'interazione nel contesto corrente
   * Chiamato quando il giocatore preme Spazio
   */
  interact(): InteractionResult {
    // Prima prova a raccogliere un oggetto nel nodo corrente
    const pickupResult = this.tryPickup();
    if (pickupResult.type !== 'nothing') {
      return pickupResult;
    }

    // Poi prova a usare l'oggetto su un lock nella direzione corrente
    const useResult = this.tryUseItem();
    if (useResult.type !== 'nothing') {
      return useResult;
    }

    // Nessuna interazione disponibile - feedback audio
    audioEngine.playEmptyPickup();
    return {
      type: 'nothing',
      message: 'Nessuna interazione disponibile',
    };
  }

  /**
   * Tenta di raccogliere un item nel nodo corrente
   */
  private tryPickup(): InteractionResult {
    const currentNodeId = this.gameState.currentNode;
    const node = this.graphWorld.getNode(currentNodeId);

    if (!node || !node.item) {
      return { type: 'nothing', message: '' };
    }

    // Verifica se l'item è già stato raccolto
    if (node.item.collected) {
      return { type: 'nothing', message: '' };
    }

    // Raccogli l'oggetto e aggiungilo all'inventario
    const item = node.item;
    item.collected = true;
    this.gameState.addToInventory(item);

    // Feedback audio: pickup generico + firma sonora dell'oggetto
    audioEngine.playPickup();
    setTimeout(() => {
      audioEngine.playItemSignature(item.soundSignature);
    }, 150); // Piccolo delay per separare i suoni
    console.log(`Raccolto: ${item.id} (inventario: ${this.gameState.inventory.length})`);

    return {
      type: 'pickup',
      message: `Hai raccolto: ${item.id}`,
      item: item,
    };
  }

  /**
   * Tenta di usare l'oggetto selezionato su un lock nella direzione corrente
   */
  private tryUseItem(): InteractionResult {
    const selectedItem = this.gameState.selectedItem;
    if (!selectedItem) {
      return { type: 'nothing', message: '' };
    }

    // Verifica se c'è un lock nella direzione corrente
    const currentNodeId = this.gameState.currentNode;
    const direction = this.gameState.orientation;
    const lock = this.graphWorld.getLock(currentNodeId, direction);

    if (!lock) {
      return { type: 'nothing', message: '' };
    }

    // Verifica se il lock è già sbloccato
    if (this.gameState.isPassageUnlocked(lock.id)) {
      return { type: 'nothing', message: '' };
    }

    // Verifica se l'oggetto è quello giusto
    if (lock.requiredItem !== selectedItem.id) {
      audioEngine.playError();
      return {
        type: 'error',
        message: 'Questo oggetto non funziona qui',
      };
    }

    // Sblocca il passaggio e rimuovi l'oggetto dall'inventario
    this.gameState.unlockPassage(lock.id);
    this.gameState.removeSelectedItem();

    // Verifica condizione di vittoria
    if (lock.unlocks === 'victory') {
      console.log('=== VITTORIA! Sequenza di lancio avviata! ===');
      audioEngine.playLaunchSequence();
      return {
        type: 'victory',
        message: 'Hai attivato l\'astronave! Decollo in corso...',
        item: selectedItem,
      };
    }

    audioEngine.playUnlock();
    console.log(`Sbloccato: ${lock.id} con ${selectedItem.id}`);

    return {
      type: 'unlock',
      message: `Hai sbloccato il passaggio con ${selectedItem.id}`,
      item: selectedItem,
    };
  }
}
