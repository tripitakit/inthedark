import { GameState } from '../game/GameState';
import type { GameItem } from '../types';

// Icons for each item type
const ITEM_ICONS: Record<string, string> = {
  lanterna: '🔦',
  coltello: '🔪',
  corda: '🪢',
  gemma_blu: '💎',
  cristallo_alieno: '🔮',
  power_cell: '🔋',
  fuel_cell: '⛽',
  activation_key: '🔑',
};

// English names for items
const ITEM_NAMES: Record<string, string> = {
  lanterna: 'Lantern',
  coltello: 'Knife',
  corda: 'Rope',
  gemma_blu: 'Blue Gem',
  cristallo_alieno: 'Alien Crystal',
  power_cell: 'Power Cell',
  fuel_cell: 'Fuel Cell',
  activation_key: 'Act. Key',
};

// Maximum inventory slots displayed
const MAX_SLOTS = 8;

/**
 * InventoryUI - Gestisce la visualizzazione dell'inventario
 *
 * Mostra fino a 8 slot numerati con:
 * - Icona dell'oggetto
 * - Nome abbreviato
 * - Evidenziazione dello slot selezionato
 */
export class InventoryUI {
  private container: HTMLElement;
  private gameState: GameState;

  constructor(container: HTMLElement, gameState: GameState) {
    this.container = container;
    this.gameState = gameState;
    this.init();
  }

  /**
   * Inizializza la struttura HTML degli slot
   */
  private init(): void {
    this.container.innerHTML = '';

    // Crea gli slot vuoti
    for (let i = 0; i < MAX_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot empty';
      slot.dataset.index = String(i);

      const number = document.createElement('span');
      number.className = 'slot-number';
      number.textContent = String(i + 1);

      const icon = document.createElement('span');
      icon.className = 'item-icon';

      const name = document.createElement('span');
      name.className = 'item-name';

      slot.appendChild(number);
      slot.appendChild(icon);
      slot.appendChild(name);

      this.container.appendChild(slot);
    }
  }

  /**
   * Aggiorna la visualizzazione dell'inventario
   */
  render(): void {
    const inventory = this.gameState.inventory;
    const selectedIndex = this.gameState.selectedIndex;
    const slots = this.container.querySelectorAll('.inventory-slot');

    slots.forEach((slot, index) => {
      const slotElement = slot as HTMLElement;
      const item = inventory[index] as GameItem | undefined;
      const iconElement = slotElement.querySelector('.item-icon') as HTMLElement;
      const nameElement = slotElement.querySelector('.item-name') as HTMLElement;

      // Reset classi
      slotElement.classList.remove('selected', 'empty');

      if (item) {
        // Slot con oggetto
        iconElement.textContent = ITEM_ICONS[item.id] || '📦';
        nameElement.textContent = this.formatItemName(item.id);

        // Evidenzia se selezionato
        if (index === selectedIndex) {
          slotElement.classList.add('selected');
        }
      } else {
        // Slot vuoto
        slotElement.classList.add('empty');
        iconElement.textContent = '';
        nameElement.textContent = '';
      }
    });
  }

  /**
   * Gets the display name for an item
   */
  private formatItemName(id: string): string {
    return ITEM_NAMES[id] || id.replace(/_/g, ' ');
  }

  /**
   * Mostra/nasconde l'inventario
   */
  setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'flex' : 'none';
  }
}
