import type { GameItem } from '../types';
import { GameState } from './GameState';
import { GraphWorld } from './GraphWorld';
import { audioEngine } from '../audio/AudioEngine';

// Display names for items (converts snake_case IDs to readable names)
const ITEM_NAMES: Record<string, string> = {
  lantern: 'lantern',
  knife: 'knife',
  blue_gem: 'blue gem',
  rope: 'rope',
  alien_crystal: 'alien crystal',
  fuel_cell: 'fuel cell',
  power_cell: 'power cell',
  activation_key: 'activation key',
  ritual_bell: 'ritual bell',
  offering_chalice: 'offering chalice',
  stone_tablet: 'stone tablet',
  monk_medallion: 'monk medallion',
  crystal_shard: 'crystal shard',
  harmonic_key: 'harmonic key',
  void_essence: 'void essence',
  cosmic_sigil: 'cosmic sigil',
  memory_fragment: 'memory fragment',
  starlight_core: 'starlight core',
};

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

    // Stop item idle loop since we picked it up
    audioEngine.stopItemIdleLoop(item.soundSignature);

    // Feedback audio: pickup generico + firma sonora dell'oggetto + voice
    audioEngine.playPickup();
    setTimeout(() => {
      audioEngine.playItemSignature(item.soundSignature);
    }, 150); // Piccolo delay per separare i suoni

    // Voice narration after item signature sound
    const itemName = ITEM_NAMES[item.id] || item.id.replace(/_/g, ' ');
    setTimeout(() => {
      audioEngine.speakPickup(itemName);
    }, 600); // After signature sound finishes

    console.log(`Raccolto: ${item.id} (inventario: ${this.gameState.inventory.length})`);

    return {
      type: 'pickup',
      message: `Hai raccolto: ${item.id}`,
      item: item,
    };
  }

  /**
   * Tenta di usare l'oggetto selezionato su un lock nella direzione corrente
   * Supporta sia lock singoli che multi-item locks
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

    // Check if this is a multi-item lock
    if (lock.requiredItem2) {
      return this.tryMultiItemUnlock(lock, selectedItem);
    }

    // Single-item lock: verify the object is correct
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

  /**
   * Handles multi-item lock attempts
   * Requires player to have BOTH required items in inventory
   */
  private tryMultiItemUnlock(lock: { id: string; requiredItem: string; requiredItem2?: string; unlocks: string }, selectedItem: GameItem): InteractionResult {
    // Check if player has both required items
    const hasItem1 = this.gameState.hasItem(lock.requiredItem);
    const hasItem2 = lock.requiredItem2 ? this.gameState.hasItem(lock.requiredItem2) : false;

    // If selected item is one of the required items
    const isValidItem = selectedItem.id === lock.requiredItem || selectedItem.id === lock.requiredItem2;

    if (!isValidItem) {
      audioEngine.playError();
      return {
        type: 'error',
        message: 'Questo oggetto non funziona qui',
      };
    }

    // Check if we have both items
    if (!hasItem1 || !hasItem2) {
      // Play a different sound to indicate partial progress
      audioEngine.playItemPresence(); // Hint that something more is needed
      return {
        type: 'error',
        message: 'Serve qualcosa in più...',
      };
    }

    // We have both items - unlock and remove both
    this.gameState.unlockPassage(lock.id);

    // Remove both items from inventory (find and remove by ID)
    this.removeItemById(lock.requiredItem);
    if (lock.requiredItem2) {
      this.removeItemById(lock.requiredItem2);
    }

    // Check for victory condition
    if (lock.unlocks === 'victory') {
      console.log('=== VITTORIA! Transcendenza raggiunta! ===');
      audioEngine.playLaunchSequence();
      return {
        type: 'victory',
        message: 'Hai raggiunto la transcendenza!',
        item: selectedItem,
      };
    }

    audioEngine.playUnlock();
    console.log(`Sbloccato: ${lock.id} con ${lock.requiredItem} + ${lock.requiredItem2}`);

    return {
      type: 'unlock',
      message: `Hai combinato ${lock.requiredItem} e ${lock.requiredItem2}!`,
      item: selectedItem,
    };
  }

  /**
   * Helper to remove an item from inventory by ID
   */
  private removeItemById(itemId: string): void {
    const inventory = this.gameState.inventory;
    const index = inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
      // We need to select this item first, then remove it
      // This is a workaround since GameState only has removeSelectedItem
      const currentSelected = this.gameState.selectedIndex;

      // Temporarily select the item to remove
      while (this.gameState.selectedIndex !== index && this.gameState.inventory.length > 0) {
        this.gameState.selectNext();
        // Prevent infinite loop
        if (this.gameState.selectedIndex === currentSelected) break;
      }

      if (this.gameState.selectedIndex === index) {
        this.gameState.removeSelectedItem();
      }
    }
  }
}
