/**
 * Item display names - shared module to avoid duplication
 *
 * Contains both spoken names (lowercase, natural speech) and display names (Title Case)
 */

export interface ItemNameEntry {
  spoken: string;   // For voice narration (lowercase, natural)
  display: string;  // For UI display (Title Case)
}

const ITEM_NAMES_DATA: Record<string, ItemNameEntry> = {
  lantern: { spoken: 'lantern', display: 'Lantern' },
  knife: { spoken: 'knife', display: 'Knife' },
  blue_gem: { spoken: 'blue gem', display: 'Blue Gem' },
  rope: { spoken: 'rope', display: 'Rope' },
  alien_crystal: { spoken: 'alien crystal', display: 'Alien Crystal' },
  fuel_cell: { spoken: 'fuel cell', display: 'Fuel Cell' },
  power_cell: { spoken: 'power cell', display: 'Power Cell' },
  activation_key: { spoken: 'activation key', display: 'Activation Key' },
  ritual_bell: { spoken: 'ritual bell', display: 'Ritual Bell' },
  offering_chalice: { spoken: 'offering chalice', display: 'Offering Chalice' },
  stone_tablet: { spoken: 'stone tablet', display: 'Stone Tablet' },
  monk_medallion: { spoken: 'monk medallion', display: 'Monk Medallion' },
  crystal_shard: { spoken: 'crystal shard', display: 'Crystal Shard' },
  harmonic_key: { spoken: 'harmonic key', display: 'Harmonic Key' },
  void_essence: { spoken: 'void essence', display: 'Void Essence' },
  cosmic_sigil: { spoken: 'cosmic sigil', display: 'Cosmic Sigil' },
  memory_fragment: { spoken: 'memory fragment', display: 'Memory Fragment' },
  starlight_core: { spoken: 'starlight core', display: 'Starlight Core' },
};

/**
 * Get the spoken name for an item (for voice narration)
 * Falls back to converting snake_case to spaces if not found
 */
export function getSpokenName(itemId: string): string {
  return ITEM_NAMES_DATA[itemId]?.spoken || itemId.replace(/_/g, ' ');
}

/**
 * Get the display name for an item (for UI)
 * Falls back to Title Case conversion if not found
 */
export function getDisplayName(itemId: string): string {
  if (ITEM_NAMES_DATA[itemId]) {
    return ITEM_NAMES_DATA[itemId].display;
  }
  // Convert snake_case to Title Case
  return itemId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
