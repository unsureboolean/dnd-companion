/**
 * D&D 5e Class Progression Tables
 * 
 * Contains spellcasting progression, spell slots, spells known, cantrips known,
 * proficiency bonus, and ASI levels for all 12 PHB classes.
 * 
 * Sources: D&D 5e Player's Handbook class tables
 */

/** Spellcasting type determines how a class interacts with spells */
export type SpellcastingType = "full" | "half" | "third" | "pact" | "none";

/** Spell slot table: key is spell level (1-9), value is number of slots */
export type SpellSlotTable = Record<number, number>;

/** Per-level progression entry */
export interface LevelProgression {
  level: number;
  proficiencyBonus: number;
  /** Number of cantrips known at this level (null if class doesn't get cantrips) */
  cantripsKnown: number | null;
  /** Number of spells known at this level (null for prepared casters or non-casters) */
  spellsKnown: number | null;
  /** Spell slots available at this level */
  spellSlots: SpellSlotTable;
  /** Whether this level grants an ASI */
  asi: boolean;
  /** Max spell level accessible at this level */
  maxSpellLevel: number;
}

/** Full class spellcasting profile */
export interface ClassSpellcasting {
  type: SpellcastingType;
  /** The ability used for spellcasting */
  ability: string | null;
  /** Whether this class prepares spells (vs. knowing a fixed list) */
  preparedCaster: boolean;
  /** Formula description for how many spells can be prepared */
  preparedFormula: string | null;
  /** Level progression table (indexed 1-20) */
  progression: LevelProgression[];
  /** The level at which subclass is chosen */
  subclassLevel: number;
}

// ============================================================
// Proficiency bonus by character level (same for all classes)
// ============================================================
export function getProficiencyBonus(level: number): number {
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

// ============================================================
// ASI levels (standard for most classes)
// ============================================================
const STANDARD_ASI_LEVELS = [4, 8, 12, 16, 19];
const FIGHTER_ASI_LEVELS = [4, 6, 8, 12, 14, 16, 19];
const ROGUE_ASI_LEVELS = [4, 8, 10, 12, 16, 19];

// ============================================================
// Helper to build a full 20-level progression
// ============================================================
function buildProgression(config: {
  cantrips: (number | null)[];  // cantrips known at levels 1-20
  spellsKnown: (number | null)[];  // spells known at levels 1-20 (null for prepared casters)
  slotsByLevel: SpellSlotTable[];  // spell slots at levels 1-20
  asiLevels: number[];
}): LevelProgression[] {
  return Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const slots = config.slotsByLevel[i] || {};
    const maxSpellLevel = Object.keys(slots).length > 0
      ? Math.max(...Object.keys(slots).map(Number))
      : 0;
    return {
      level,
      proficiencyBonus: getProficiencyBonus(level),
      cantripsKnown: config.cantrips[i],
      spellsKnown: config.spellsKnown[i],
      spellSlots: slots,
      asi: config.asiLevels.includes(level),
      maxSpellLevel,
    };
  });
}

// ============================================================
// Full Caster Spell Slot Tables
// ============================================================
const FULL_CASTER_SLOTS: SpellSlotTable[] = [
  { 1: 2 },                                          // Level 1
  { 1: 3 },                                          // Level 2
  { 1: 4, 2: 2 },                                    // Level 3
  { 1: 4, 2: 3 },                                    // Level 4
  { 1: 4, 2: 3, 3: 2 },                              // Level 5
  { 1: 4, 2: 3, 3: 3 },                              // Level 6
  { 1: 4, 2: 3, 3: 3, 4: 1 },                        // Level 7
  { 1: 4, 2: 3, 3: 3, 4: 2 },                        // Level 8
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },                  // Level 9
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },                  // Level 10
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },            // Level 11
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },            // Level 12
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },      // Level 13
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },      // Level 14
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, // Level 15
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, // Level 16
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, // Level 17
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, // Level 18
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, // Level 19
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, // Level 20
];

// Half caster slots (Paladin, Ranger) - start at level 2
const HALF_CASTER_SLOTS: SpellSlotTable[] = [
  {},                                                  // Level 1
  { 1: 2 },                                           // Level 2
  { 1: 3 },                                           // Level 3
  { 1: 3 },                                           // Level 4
  { 1: 4, 2: 2 },                                     // Level 5
  { 1: 4, 2: 2 },                                     // Level 6
  { 1: 4, 2: 3 },                                     // Level 7
  { 1: 4, 2: 3 },                                     // Level 8
  { 1: 4, 2: 3, 3: 2 },                               // Level 9
  { 1: 4, 2: 3, 3: 2 },                               // Level 10
  { 1: 4, 2: 3, 3: 3 },                               // Level 11
  { 1: 4, 2: 3, 3: 3 },                               // Level 12
  { 1: 4, 2: 3, 3: 3, 4: 1 },                         // Level 13
  { 1: 4, 2: 3, 3: 3, 4: 1 },                         // Level 14
  { 1: 4, 2: 3, 3: 3, 4: 2 },                         // Level 15
  { 1: 4, 2: 3, 3: 3, 4: 2 },                         // Level 16
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },                   // Level 17
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },                   // Level 18
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },                   // Level 19
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },                   // Level 20
];

// Third caster slots (Eldritch Knight, Arcane Trickster) - start at level 3
const THIRD_CASTER_SLOTS: SpellSlotTable[] = [
  {},                                                  // Level 1
  {},                                                  // Level 2
  { 1: 2 },                                           // Level 3
  { 1: 3 },                                           // Level 4
  { 1: 3 },                                           // Level 5
  { 1: 3 },                                           // Level 6
  { 1: 4, 2: 2 },                                     // Level 7
  { 1: 4, 2: 2 },                                     // Level 8
  { 1: 4, 2: 2 },                                     // Level 9
  { 1: 4, 2: 3 },                                     // Level 10
  { 1: 4, 2: 3 },                                     // Level 11
  { 1: 4, 2: 3 },                                     // Level 12
  { 1: 4, 2: 3, 3: 2 },                               // Level 13
  { 1: 4, 2: 3, 3: 2 },                               // Level 14
  { 1: 4, 2: 3, 3: 2 },                               // Level 15
  { 1: 4, 2: 3, 3: 3 },                               // Level 16
  { 1: 4, 2: 3, 3: 3 },                               // Level 17
  { 1: 4, 2: 3, 3: 3 },                               // Level 18
  { 1: 4, 2: 3, 3: 3, 4: 1 },                         // Level 19
  { 1: 4, 2: 3, 3: 3, 4: 1 },                         // Level 20
];

// Warlock Pact Magic slots
const WARLOCK_SLOTS: SpellSlotTable[] = [
  { 1: 1 },                                           // Level 1
  { 1: 2 },                                           // Level 2
  { 2: 2 },                                           // Level 3
  { 2: 2 },                                           // Level 4
  { 3: 2 },                                           // Level 5
  { 3: 2 },                                           // Level 6
  { 4: 2 },                                           // Level 7
  { 4: 2 },                                           // Level 8
  { 5: 2 },                                           // Level 9
  { 5: 2 },                                           // Level 10
  { 5: 3 },                                           // Level 11
  { 5: 3 },                                           // Level 12
  { 5: 3 },                                           // Level 13
  { 5: 3 },                                           // Level 14
  { 5: 3 },                                           // Level 15
  { 5: 3 },                                           // Level 16
  { 5: 4 },                                           // Level 17
  { 5: 4 },                                           // Level 18
  { 5: 4 },                                           // Level 19
  { 5: 4 },                                           // Level 20
];

// No spell slots
const NO_SLOTS: SpellSlotTable[] = Array(20).fill({});

// ============================================================
// CLASS PROGRESSION DATA
// ============================================================

export const CLASS_PROGRESSION: Record<string, ClassSpellcasting> = {
  Barbarian: {
    type: "none",
    ability: null,
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 3,
    progression: buildProgression({
      cantrips: Array(20).fill(null),
      spellsKnown: Array(20).fill(null),
      slotsByLevel: NO_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Bard: {
    type: "full",
    ability: "charisma",
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 3,
    progression: buildProgression({
      cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      spellsKnown: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
      slotsByLevel: FULL_CASTER_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Cleric: {
    type: "full",
    ability: "wisdom",
    preparedCaster: true,
    preparedFormula: "Wisdom modifier + Cleric level",
    subclassLevel: 1,
    progression: buildProgression({
      cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      spellsKnown: Array(20).fill(null), // prepared caster
      slotsByLevel: FULL_CASTER_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Druid: {
    type: "full",
    ability: "wisdom",
    preparedCaster: true,
    preparedFormula: "Wisdom modifier + Druid level",
    subclassLevel: 2,
    progression: buildProgression({
      cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      spellsKnown: Array(20).fill(null), // prepared caster
      slotsByLevel: FULL_CASTER_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Fighter: {
    type: "none", // Base fighter; Eldritch Knight is subclass-dependent
    ability: null,
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 3,
    progression: buildProgression({
      cantrips: Array(20).fill(null),
      spellsKnown: Array(20).fill(null),
      slotsByLevel: NO_SLOTS,
      asiLevels: FIGHTER_ASI_LEVELS,
    }),
  },

  Monk: {
    type: "none",
    ability: null,
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 3,
    progression: buildProgression({
      cantrips: Array(20).fill(null),
      spellsKnown: Array(20).fill(null),
      slotsByLevel: NO_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Paladin: {
    type: "half",
    ability: "charisma",
    preparedCaster: true,
    preparedFormula: "Charisma modifier + half Paladin level (rounded down)",
    subclassLevel: 3,
    progression: buildProgression({
      cantrips: Array(20).fill(null), // Paladins don't get cantrips
      spellsKnown: Array(20).fill(null), // prepared caster
      slotsByLevel: HALF_CASTER_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Ranger: {
    type: "half",
    ability: "wisdom",
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 3,
    progression: buildProgression({
      cantrips: Array(20).fill(null), // Rangers don't get cantrips
      spellsKnown: [null, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
      slotsByLevel: HALF_CASTER_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Rogue: {
    type: "none", // Base rogue; Arcane Trickster is subclass-dependent
    ability: null,
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 3,
    progression: buildProgression({
      cantrips: Array(20).fill(null),
      spellsKnown: Array(20).fill(null),
      slotsByLevel: NO_SLOTS,
      asiLevels: ROGUE_ASI_LEVELS,
    }),
  },

  Sorcerer: {
    type: "full",
    ability: "charisma",
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 1,
    progression: buildProgression({
      cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
      slotsByLevel: FULL_CASTER_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Warlock: {
    type: "pact",
    ability: "charisma",
    preparedCaster: false,
    preparedFormula: null,
    subclassLevel: 1,
    progression: buildProgression({
      cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
      slotsByLevel: WARLOCK_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },

  Wizard: {
    type: "full",
    ability: "intelligence",
    preparedCaster: true,
    preparedFormula: "Intelligence modifier + Wizard level",
    subclassLevel: 2,
    progression: buildProgression({
      cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      spellsKnown: Array(20).fill(null), // prepared caster (spellbook)
      slotsByLevel: FULL_CASTER_SLOTS,
      asiLevels: STANDARD_ASI_LEVELS,
    }),
  },
};

// ============================================================
// Helper functions
// ============================================================

/**
 * Get the number of new cantrips a character should learn at a given level
 */
export function getNewCantripsAtLevel(className: string, fromLevel: number, toLevel: number): number {
  const prog = CLASS_PROGRESSION[className];
  if (!prog) return 0;
  const fromCantrips = fromLevel >= 1 ? (prog.progression[fromLevel - 1]?.cantripsKnown ?? 0) : 0;
  const toCantrips = prog.progression[toLevel - 1]?.cantripsKnown ?? 0;
  if (fromCantrips === null || toCantrips === null) return 0;
  return Math.max(0, (toCantrips ?? 0) - (fromCantrips ?? 0));
}

/**
 * Get the number of new spells a character should learn at a given level
 * For "known" casters (Bard, Sorcerer, Ranger, Warlock)
 */
export function getNewSpellsKnownAtLevel(className: string, fromLevel: number, toLevel: number): number {
  const prog = CLASS_PROGRESSION[className];
  if (!prog || prog.preparedCaster) return 0;
  const fromKnown = fromLevel >= 1 ? (prog.progression[fromLevel - 1]?.spellsKnown ?? 0) : 0;
  const toKnown = prog.progression[toLevel - 1]?.spellsKnown ?? 0;
  if (fromKnown === null || toKnown === null) return 0;
  return Math.max(0, (toKnown ?? 0) - (fromKnown ?? 0));
}

/**
 * Get the number of prepared spells for a prepared caster
 */
export function getPreparedSpellCount(className: string, level: number, abilityModifier: number): number {
  const prog = CLASS_PROGRESSION[className];
  if (!prog || !prog.preparedCaster) return 0;
  
  if (prog.type === "full") {
    return Math.max(1, abilityModifier + level);
  } else if (prog.type === "half") {
    return Math.max(1, abilityModifier + Math.floor(level / 2));
  }
  return 0;
}

/**
 * Get the max spell level accessible at a given character level
 */
export function getMaxSpellLevel(className: string, level: number): number {
  const prog = CLASS_PROGRESSION[className];
  if (!prog) return 0;
  return prog.progression[level - 1]?.maxSpellLevel ?? 0;
}

/**
 * Check if a class gets spellcasting
 */
export function isSpellcaster(className: string): boolean {
  const prog = CLASS_PROGRESSION[className];
  if (!prog) return false;
  return prog.type !== "none";
}

/**
 * Get spell slots at a given level
 */
export function getSpellSlotsAtLevel(className: string, level: number): SpellSlotTable {
  const prog = CLASS_PROGRESSION[className];
  if (!prog) return {};
  return prog.progression[level - 1]?.spellSlots ?? {};
}

/**
 * Get whether a level grants ASI for a given class
 */
export function grantsASI(className: string, level: number): boolean {
  const prog = CLASS_PROGRESSION[className];
  if (!prog) return false;
  return prog.progression[level - 1]?.asi ?? false;
}

/**
 * Get the subclass level for a class
 */
export function getSubclassLevel(className: string): number {
  const prog = CLASS_PROGRESSION[className];
  return prog?.subclassLevel ?? 3;
}
