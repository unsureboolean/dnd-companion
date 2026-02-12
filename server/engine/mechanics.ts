/**
 * MECHANICS ENGINE
 * ================
 * This is the CODE layer that handles all game mechanics.
 * The LLM NEVER does math or rolls dice - this module does.
 *
 * KEY RULE: All randomness comes from crypto.getRandomValues().
 * All state reads/writes go through the database.
 * The LLM only receives RESULTS from this engine.
 *
 * AI-NOTE: When extending this engine, always:
 * 1. Use cryptographic RNG for dice (never Math.random)
 * 2. Return structured MechanicsResult objects
 * 3. Log every action to mechanicsLog via logMechanicsEvent()
 * 4. Never trust LLM-provided numbers - always read from DB
 */

import crypto from "crypto";
import {
  calculateModifier,
  calculateProficiencyBonus,
  SKILL_ABILITY_MAP,
  type AbilityScore,
  type Skill,
} from "../../shared/dnd5eData";

// ============================================================
// TYPES
// ============================================================

/** Result of any mechanical action - fed to the narrator */
export interface MechanicsResult {
  /** What type of mechanic was executed */
  type: string;
  /** Was the action successful? */
  success: boolean;
  /** Human-readable summary for the mechanics panel */
  summary: string;
  /** Detailed breakdown for the narrator's context */
  details: Record<string, unknown>;
  /** Should this result be hidden from players? (e.g., passive checks) */
  isHidden: boolean;
}

/** Character stats as read from the database - the source of truth */
export interface CharacterState {
  id: number;
  name: string;
  level: number;
  characterClass: string;
  race: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  maxHitPoints: number;
  currentHitPoints: number;
  armorClass: number;
  skills: Record<string, boolean> | null;
  savingThrows: Record<string, boolean> | null;
  equipment: string[] | null;
  spells: string[] | null;
  cantrips: string[] | null;
  spellSlots: Record<string, number> | null;
  features: string[] | null;
}

/** NPC combat stats stored in the stats JSON field */
export interface NpcCombatStats {
  ac: number;
  maxHp: number;
  currentHp: number;
  attackBonus: number;
  damageDice: string;
  speed: number;
  abilities?: Record<string, number>;
  savingThrowBonuses?: Record<string, number>;
  /** Special abilities or attacks */
  specialActions?: string[];
}

/** Hidden object in a location */
export interface HiddenObject {
  name: string;
  dc: number;
  type: "trap" | "secret_door" | "hidden_item" | "clue" | "other";
  description: string;
  discovered: boolean;
}

// ============================================================
// DICE ENGINE
// Uses crypto.getRandomValues for fair, unpredictable rolls.
// AI-NOTE: NEVER replace this with Math.random() or LLM output.
// ============================================================

/**
 * Roll a single die with cryptographic randomness.
 * @param sides - Number of sides (e.g., 20 for d20)
 * @returns A number from 1 to sides, inclusive
 */
export function rollDie(sides: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % sides) + 1;
}

/**
 * Roll multiple dice.
 * @returns Array of individual rolls
 */
export function rollMultipleDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => rollDie(sides));
}

/**
 * Roll with advantage (roll 2d20, take higher).
 */
export function rollWithAdvantage(): { rolls: [number, number]; result: number } {
  const rolls: [number, number] = [rollDie(20), rollDie(20)];
  return { rolls, result: Math.max(...rolls) };
}

/**
 * Roll with disadvantage (roll 2d20, take lower).
 */
export function rollWithDisadvantage(): { rolls: [number, number]; result: number } {
  const rolls: [number, number] = [rollDie(20), rollDie(20)];
  return { rolls, result: Math.min(...rolls) };
}

/**
 * Parse dice notation like "2d6+3" and roll it.
 * AI-NOTE: This is the ONLY way dice should be rolled in the system.
 */
export function rollFromNotation(notation: string): {
  rolls: number[];
  modifier: number;
  total: number;
  notation: string;
} {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    // Default to 1d20 if notation is invalid
    const roll = rollDie(20);
    return { rolls: [roll], modifier: 0, total: roll, notation: "1d20" };
  }
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  const rolls = rollMultipleDice(count, sides);
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { rolls, modifier, total, notation };
}

// ============================================================
// ABILITY & SKILL HELPERS
// These read from CharacterState (DB data) to compute bonuses.
// ============================================================

/**
 * Get the ability score value for a character.
 */
export function getAbilityScore(character: CharacterState, ability: AbilityScore): number {
  return character[ability];
}

/**
 * Get the modifier for an ability score.
 */
export function getAbilityModifier(character: CharacterState, ability: AbilityScore): number {
  return calculateModifier(character[ability]);
}

/**
 * Get the full bonus for a skill check (modifier + proficiency if proficient).
 */
export function getSkillBonus(character: CharacterState, skill: Skill): number {
  const ability = SKILL_ABILITY_MAP[skill];
  const modifier = getAbilityModifier(character, ability);
  const isProficient = character.skills?.[skill] === true;
  const profBonus = isProficient ? calculateProficiencyBonus(character.level) : 0;
  return modifier + profBonus;
}

/**
 * Get the saving throw bonus for an ability.
 */
export function getSavingThrowBonus(character: CharacterState, ability: AbilityScore): number {
  const modifier = getAbilityModifier(character, ability);
  const isProficient = character.savingThrows?.[ability] === true;
  const profBonus = isProficient ? calculateProficiencyBonus(character.level) : 0;
  return modifier + profBonus;
}

/**
 * Get passive score for a skill (10 + skill bonus).
 * AI-NOTE: Used for passive perception/investigation checks that run
 * BEFORE room descriptions are generated.
 */
export function getPassiveScore(character: CharacterState, skill: Skill): number {
  return 10 + getSkillBonus(character, skill);
}

// ============================================================
// SKILL CHECK RESOLVER
// Compares a d20 roll + bonus against a DC.
// ============================================================

export interface SkillCheckResult extends MechanicsResult {
  type: "skill_check";
  details: {
    skill: string;
    ability: string;
    roll: number;
    bonus: number;
    total: number;
    dc: number;
    advantage: boolean;
    disadvantage: boolean;
    rolls?: [number, number]; // If advantage/disadvantage
    characterName: string;
    isProficient: boolean;
  };
}

/**
 * Perform a skill check for a character against a DC.
 * AI-NOTE: This is called by the DM logic loop when the LLM
 * requests a roll_skill_check function call.
 */
export function resolveSkillCheck(
  character: CharacterState,
  skill: Skill,
  dc: number,
  options: { advantage?: boolean; disadvantage?: boolean } = {}
): SkillCheckResult {
  const ability = SKILL_ABILITY_MAP[skill];
  const bonus = getSkillBonus(character, skill);
  const isProficient = character.skills?.[skill] === true;

  let roll: number;
  let rolls: [number, number] | undefined;

  if (options.advantage && !options.disadvantage) {
    const advResult = rollWithAdvantage();
    roll = advResult.result;
    rolls = advResult.rolls;
  } else if (options.disadvantage && !options.advantage) {
    const disResult = rollWithDisadvantage();
    roll = disResult.result;
    rolls = disResult.rolls;
  } else {
    roll = rollDie(20);
  }

  const total = roll + bonus;
  const success = total >= dc;

  // Natural 20 always succeeds, natural 1 always fails (optional rule)
  const nat20 = roll === 20;
  const nat1 = roll === 1;

  const advStr = options.advantage ? " (advantage)" : options.disadvantage ? " (disadvantage)" : "";
  const profStr = isProficient ? " (proficient)" : "";
  const rollStr = rolls ? `[${rolls.join(", ")}]→${roll}` : `${roll}`;

  return {
    type: "skill_check",
    success: nat20 || (!nat1 && success),
    summary: `${character.name} ${skill} check${advStr}: ${rollStr} + ${bonus}${profStr} = ${total} vs DC ${dc} → ${nat20 ? "CRITICAL SUCCESS" : nat1 ? "CRITICAL FAIL" : success ? "SUCCESS" : "FAIL"}`,
    details: {
      skill,
      ability,
      roll,
      bonus,
      total,
      dc,
      advantage: !!options.advantage,
      disadvantage: !!options.disadvantage,
      rolls,
      characterName: character.name,
      isProficient,
    },
    isHidden: false,
  };
}

// ============================================================
// SAVING THROW RESOLVER
// ============================================================

export interface SavingThrowResult extends MechanicsResult {
  type: "saving_throw";
  details: {
    ability: string;
    roll: number;
    bonus: number;
    total: number;
    dc: number;
    characterName: string;
    isProficient: boolean;
  };
}

export function resolveSavingThrow(
  character: CharacterState,
  ability: AbilityScore,
  dc: number,
  options: { advantage?: boolean; disadvantage?: boolean } = {}
): SavingThrowResult {
  const bonus = getSavingThrowBonus(character, ability);
  const isProficient = character.savingThrows?.[ability] === true;

  let roll: number;
  if (options.advantage) {
    roll = rollWithAdvantage().result;
  } else if (options.disadvantage) {
    roll = rollWithDisadvantage().result;
  } else {
    roll = rollDie(20);
  }

  const total = roll + bonus;
  const success = total >= dc;

  return {
    type: "saving_throw",
    success,
    summary: `${character.name} ${ability} save: ${roll} + ${bonus} = ${total} vs DC ${dc} → ${success ? "SUCCESS" : "FAIL"}`,
    details: {
      ability,
      roll,
      bonus,
      total,
      dc,
      characterName: character.name,
      isProficient,
    },
    isHidden: false,
  };
}

// ============================================================
// ATTACK RESOLVER
// Handles attack rolls and damage calculation.
// ============================================================

export interface AttackResult extends MechanicsResult {
  type: "attack_roll";
  details: {
    attackRoll: number;
    attackBonus: number;
    attackTotal: number;
    targetAc: number;
    hit: boolean;
    isCritical: boolean;
    isCriticalFail: boolean;
    damageRolls?: number[];
    damageTotal?: number;
    damageType?: string;
    attackerName: string;
    targetName: string;
    weapon: string;
  };
}

/**
 * Resolve an attack roll against a target AC.
 * AI-NOTE: The LLM requests this via the roll_attack function call.
 * Damage is only rolled if the attack hits.
 */
export function resolveAttack(
  attackerName: string,
  attackBonus: number,
  targetName: string,
  targetAc: number,
  damageDice: string,
  damageType: string = "slashing",
  weapon: string = "weapon",
  options: { advantage?: boolean; disadvantage?: boolean } = {}
): AttackResult {
  let attackRoll: number;
  if (options.advantage) {
    attackRoll = rollWithAdvantage().result;
  } else if (options.disadvantage) {
    attackRoll = rollWithDisadvantage().result;
  } else {
    attackRoll = rollDie(20);
  }

  const isCritical = attackRoll === 20;
  const isCriticalFail = attackRoll === 1;
  const attackTotal = attackRoll + attackBonus;
  const hit = isCritical || (!isCriticalFail && attackTotal >= targetAc);

  let damageRolls: number[] | undefined;
  let damageTotal: number | undefined;

  if (hit) {
    const dmgResult = rollFromNotation(damageDice);
    damageRolls = dmgResult.rolls;
    damageTotal = dmgResult.total;

    // Critical hit: double the dice (roll again and add)
    if (isCritical) {
      const critExtra = rollFromNotation(damageDice);
      damageRolls = [...damageRolls, ...critExtra.rolls];
      damageTotal += critExtra.total - critExtra.modifier; // Don't double the modifier
    }
  }

  return {
    type: "attack_roll",
    success: hit,
    summary: hit
      ? `${attackerName} attacks ${targetName} with ${weapon}: ${attackRoll} + ${attackBonus} = ${attackTotal} vs AC ${targetAc} → ${isCritical ? "CRITICAL HIT" : "HIT"} for ${damageTotal} ${damageType} damage!`
      : `${attackerName} attacks ${targetName} with ${weapon}: ${attackRoll} + ${attackBonus} = ${attackTotal} vs AC ${targetAc} → ${isCriticalFail ? "CRITICAL MISS" : "MISS"}`,
    details: {
      attackRoll,
      attackBonus,
      attackTotal,
      targetAc,
      hit,
      isCritical,
      isCriticalFail,
      damageRolls,
      damageTotal,
      damageType,
      attackerName,
      targetName,
      weapon,
    },
    isHidden: false,
  };
}

// ============================================================
// PASSIVE CHECK SYSTEM
// AI-NOTE: These run BEFORE the narrator generates room descriptions.
// The results tell the narrator what hidden things to reveal.
// ============================================================

export interface PassiveCheckResult extends MechanicsResult {
  type: "passive_check";
  details: {
    characterName: string;
    skill: string;
    passiveScore: number;
    objectName: string;
    objectDc: number;
    discovered: boolean;
    objectDescription: string;
  };
}

/**
 * Run passive perception/investigation checks against hidden objects.
 * Called automatically when entering a new location or at the start of a turn.
 *
 * AI-NOTE: This is the key function that prevents the LLM from deciding
 * what players notice. The CODE decides based on stats vs DCs, then
 * tells the narrator what was discovered.
 */
export function runPassiveChecks(
  characters: CharacterState[],
  hiddenObjects: HiddenObject[]
): PassiveCheckResult[] {
  const results: PassiveCheckResult[] = [];

  for (const obj of hiddenObjects) {
    if (obj.discovered) continue; // Already found

    for (const character of characters) {
      // Use passive perception for traps and hidden items
      // Use passive investigation for clues and secret doors
      const skill: Skill = obj.type === "clue" || obj.type === "secret_door"
        ? "investigation"
        : "perception";

      const passiveScore = getPassiveScore(character, skill);
      const discovered = passiveScore >= obj.dc;

      if (discovered) {
        results.push({
          type: "passive_check",
          success: true,
          summary: `${character.name}'s passive ${skill} (${passiveScore}) detected: ${obj.name} (DC ${obj.dc})`,
          details: {
            characterName: character.name,
            skill,
            passiveScore,
            objectName: obj.name,
            objectDc: obj.dc,
            discovered: true,
            objectDescription: obj.description,
          },
          isHidden: true, // Don't show the DC to players
        });
        break; // One character finding it is enough
      }
    }
  }

  return results;
}

// ============================================================
// HP & STATE MANAGEMENT
// All HP changes go through these functions.
// ============================================================

export interface HpChangeResult extends MechanicsResult {
  type: "hp_change";
  details: {
    characterName: string;
    previousHp: number;
    change: number;
    newHp: number;
    maxHp: number;
    isUnconscious: boolean;
    isDead: boolean;
  };
}

/**
 * Apply HP change to a character. Clamps between 0 and maxHp.
 * Returns the new HP value and whether the character is unconscious/dead.
 *
 * AI-NOTE: This does NOT write to the database. The caller (DM loop)
 * is responsible for persisting the change via db.updateCharacter().
 */
export function applyHpChange(
  character: CharacterState,
  amount: number // positive = healing, negative = damage
): HpChangeResult {
  const previousHp = character.currentHitPoints;
  const newHp = Math.max(0, Math.min(character.maxHitPoints, previousHp + amount));
  const isUnconscious = newHp === 0;
  // Instant death if damage exceeds max HP below 0
  const isDead = (previousHp + amount) <= -character.maxHitPoints;

  const action = amount >= 0 ? "healed" : "took";
  const absAmount = Math.abs(amount);

  return {
    type: "hp_change",
    success: true,
    summary: `${character.name} ${action} ${absAmount} ${amount >= 0 ? "HP" : "damage"}: ${previousHp} → ${newHp}/${character.maxHitPoints} HP${isUnconscious ? " (UNCONSCIOUS)" : ""}${isDead ? " (DEAD)" : ""}`,
    details: {
      characterName: character.name,
      previousHp,
      change: amount,
      newHp,
      maxHp: character.maxHitPoints,
      isUnconscious,
      isDead,
    },
    isHidden: false,
  };
}

// ============================================================
// SPELL SLOT MANAGEMENT
// Validates and tracks spell slot usage.
// ============================================================

export interface SpellCastResult extends MechanicsResult {
  type: "spell_cast";
  details: {
    characterName: string;
    spellName: string;
    spellLevel: number;
    slotUsed: number;
    remainingSlots: Record<string, number>;
    isCantrip: boolean;
  };
}

/**
 * Validate and consume a spell slot.
 * Returns updated spell slots or failure if no slots available.
 *
 * AI-NOTE: Cantrips (level 0) don't consume slots.
 * The LLM should never track spell slots - always read from DB.
 */
export function castSpell(
  character: CharacterState,
  spellName: string,
  spellLevel: number
): SpellCastResult {
  const isCantrip = spellLevel === 0;

  if (isCantrip) {
    return {
      type: "spell_cast",
      success: true,
      summary: `${character.name} casts ${spellName} (cantrip)`,
      details: {
        characterName: character.name,
        spellName,
        spellLevel: 0,
        slotUsed: 0,
        remainingSlots: (character.spellSlots as Record<string, number>) || {},
        isCantrip: true,
      },
      isHidden: false,
    };
  }

  const slots = { ...((character.spellSlots as Record<string, number>) || {}) };
  const slotKey = String(spellLevel);

  if (!slots[slotKey] || slots[slotKey] <= 0) {
    return {
      type: "spell_cast",
      success: false,
      summary: `${character.name} cannot cast ${spellName}: no level ${spellLevel} spell slots remaining!`,
      details: {
        characterName: character.name,
        spellName,
        spellLevel,
        slotUsed: spellLevel,
        remainingSlots: slots,
        isCantrip: false,
      },
      isHidden: false,
    };
  }

  // Consume the slot
  slots[slotKey] = slots[slotKey] - 1;

  return {
    type: "spell_cast",
    success: true,
    summary: `${character.name} casts ${spellName} (level ${spellLevel}). Remaining level ${spellLevel} slots: ${slots[slotKey]}`,
    details: {
      characterName: character.name,
      spellName,
      spellLevel,
      slotUsed: spellLevel,
      remainingSlots: slots,
      isCantrip: false,
    },
    isHidden: false,
  };
}

// ============================================================
// INITIATIVE ROLLER
// Rolls initiative for all combatants at combat start.
// ============================================================

export interface InitiativeEntry {
  id: string; // "pc_1" or "npc_goblin_1"
  name: string;
  initiative: number;
  type: "pc" | "npc";
  hp: number;
  maxHp: number;
  ac: number;
  conditions: string[];
}

/**
 * Roll initiative for a set of PCs and NPCs.
 * Returns sorted initiative order (highest first).
 */
export function rollInitiative(
  characters: CharacterState[],
  npcCombatants: Array<{ id: string; name: string; stats: NpcCombatStats }>
): InitiativeEntry[] {
  const entries: InitiativeEntry[] = [];

  // Roll for PCs
  for (const char of characters) {
    const dexMod = getAbilityModifier(char, "dexterity");
    const roll = rollDie(20);
    entries.push({
      id: `pc_${char.id}`,
      name: char.name,
      initiative: roll + dexMod,
      type: "pc",
      hp: char.currentHitPoints,
      maxHp: char.maxHitPoints,
      ac: char.armorClass,
      conditions: [],
    });
  }

  // Roll for NPCs
  for (const npc of npcCombatants) {
    const dexMod = npc.stats.abilities
      ? calculateModifier(npc.stats.abilities.dexterity || 10)
      : 0;
    const roll = rollDie(20);
    entries.push({
      id: npc.id,
      name: npc.name,
      initiative: roll + dexMod,
      type: "npc",
      hp: npc.stats.currentHp,
      maxHp: npc.stats.maxHp,
      ac: npc.stats.ac,
      conditions: [],
    });
  }

  // Sort by initiative (highest first), break ties by dex
  entries.sort((a, b) => b.initiative - a.initiative);

  return entries;
}

// ============================================================
// DEATH SAVES
// ============================================================

export interface DeathSaveResult extends MechanicsResult {
  type: "death_save";
  details: {
    characterName: string;
    roll: number;
    successes: number;
    failures: number;
    stabilized: boolean;
    dead: boolean;
    nat20Recovery: boolean;
  };
}

/**
 * Roll a death saving throw.
 * Nat 20 = regain 1 HP. Nat 1 = 2 failures. 10+ = success.
 */
export function rollDeathSave(
  characterName: string,
  currentSuccesses: number,
  currentFailures: number
): DeathSaveResult {
  const roll = rollDie(20);
  let successes = currentSuccesses;
  let failures = currentFailures;
  let nat20Recovery = false;

  if (roll === 20) {
    // Nat 20: regain 1 HP
    nat20Recovery = true;
    successes = 0;
    failures = 0;
  } else if (roll === 1) {
    failures += 2;
  } else if (roll >= 10) {
    successes += 1;
  } else {
    failures += 1;
  }

  const stabilized = successes >= 3;
  const dead = failures >= 3;

  return {
    type: "death_save",
    success: roll >= 10,
    summary: nat20Recovery
      ? `${characterName} rolls a natural 20 on their death save and regains consciousness!`
      : `${characterName} death save: ${roll} → ${roll >= 10 ? "Success" : "Failure"} (${successes}/3 successes, ${failures}/3 failures)${stabilized ? " - STABILIZED" : ""}${dead ? " - DEAD" : ""}`,
    details: {
      characterName,
      roll,
      successes,
      failures,
      stabilized,
      dead,
      nat20Recovery,
    },
    isHidden: false,
  };
}

// ============================================================
// NPC GOAL ADVANCEMENT
// AI-NOTE: This runs between turns to advance NPC plans off-screen.
// The results are fed to the narrator so it can mention consequences.
// ============================================================

export interface NpcGoalResult extends MechanicsResult {
  type: "npc_goal_advance";
  details: {
    npcName: string;
    previousGoal: string;
    goalProgress: number;
    newProgress: number;
    goalCompleted: boolean;
  };
}

/**
 * Advance an NPC's goal progress by a given amount.
 * Returns whether the goal was completed.
 */
export function advanceNpcGoal(
  npcName: string,
  currentGoal: string,
  currentProgress: number,
  advanceAmount: number = 10
): NpcGoalResult {
  const newProgress = Math.min(100, currentProgress + advanceAmount);
  const goalCompleted = newProgress >= 100;

  return {
    type: "npc_goal_advance",
    success: true,
    summary: goalCompleted
      ? `${npcName} has completed their goal: "${currentGoal}"`
      : `${npcName}'s goal "${currentGoal}" advances: ${currentProgress}% → ${newProgress}%`,
    details: {
      npcName,
      previousGoal: currentGoal,
      goalProgress: currentProgress,
      newProgress,
      goalCompleted,
    },
    isHidden: true, // Players don't see NPC goal progress
  };
}
