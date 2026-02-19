/**
 * Character Leveling Router
 * Comprehensive D&D 5e level-up system with class-specific spell, cantrip,
 * subclass, ASI, and hit point choices.
 */

import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { getSpellsByClass, getCantripsByClass, getClassFeaturesByLevel } from "./dnd5eApi";
import { CLASSES } from "../shared/dnd5eData";
import {
  CLASS_PROGRESSION,
  getNewCantripsAtLevel,
  getNewSpellsKnownAtLevel,
  getMaxSpellLevel,
  getSpellSlotsAtLevel,
  getPreparedSpellCount,
  isSpellcaster,
  grantsASI,
  getSubclassLevel,
  getProficiencyBonus,
} from "../shared/classProgression";

// Simple in-memory cache for D&D 5e API results (they never change)
const spellCache = new Map<string, any[]>();
const cantripCache = new Map<string, any[]>();

async function getCachedSpells(className: string) {
  if (spellCache.has(className)) return spellCache.get(className)!;
  const spells = await getSpellsByClass(className);
  spellCache.set(className, spells);
  return spells;
}

async function getCachedCantrips(className: string) {
  if (cantripCache.has(className)) return cantripCache.get(className)!;
  const cantrips = await getCantripsByClass(className);
  cantripCache.set(className, cantrips);
  return cantrips;
}

export const levelingRouter = router({
  /**
   * Get comprehensive leveling options for a character at a target level.
   * Returns class-specific data: spells to pick, cantrips to pick, features gained,
   * ASI availability, subclass choice, spell slot changes, and HP options.
   */
  getLevelingOptions: protectedProcedure
    .input(z.object({
      characterId: z.number(),
      targetLevel: z.number().min(2).max(20),
    }))
    .query(async ({ ctx, input }) => {
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your character" });
      }

      if (input.targetLevel <= character.level) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Target level must be higher than current level" });
      }

      const className = character.characterClass;
      const classData = CLASSES.find((c) => c.name === className);
      if (!classData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const progression = CLASS_PROGRESSION[className];
      const currentLevel = character.level;
      const targetLevel = input.targetLevel;

      // ---- Class Features ----
      let classFeatures: Array<{ index: string; name: string; description: string }> = [];
      try {
        const features = await getClassFeaturesByLevel(className, targetLevel);
        classFeatures = features.map((f) => ({
          index: f.index,
          name: f.name,
          description: Array.isArray(f.desc) ? f.desc.join("\n") : String(f.desc || ""),
        }));
      } catch {
        // API may fail; features are informational, not blocking
      }

      // ---- Spellcasting ----
      const isCaster = isSpellcaster(className);
      const maxSpellLevel = getMaxSpellLevel(className, targetLevel);
      const prevMaxSpellLevel = getMaxSpellLevel(className, currentLevel);
      const newSpellSlots = getSpellSlotsAtLevel(className, targetLevel);
      const prevSpellSlots = getSpellSlotsAtLevel(className, currentLevel);

      // How many new cantrips to pick
      const newCantripsCount = getNewCantripsAtLevel(className, currentLevel, targetLevel);

      // How many new spells to pick (for "known" casters)
      const newSpellsKnownCount = getNewSpellsKnownAtLevel(className, currentLevel, targetLevel);

      // For prepared casters, calculate how many they can prepare
      const isPreparedCaster = progression?.preparedCaster ?? false;
      let preparedSpellCount = 0;
      if (isPreparedCaster && progression?.ability) {
        const abilityKey = progression.ability as keyof typeof character;
        const abilityScore = (character[abilityKey] as number) || 10;
        const abilityMod = Math.floor((abilityScore - 10) / 2);
        preparedSpellCount = getPreparedSpellCount(className, targetLevel, abilityMod);
      }

      // Fetch available spells and cantrips from D&D 5e API
      let availableSpells: any[] = [];
      let availableCantrips: any[] = [];

      if (isCaster) {
        try {
          const allSpells = await getCachedSpells(className);
          const allCantrips = await getCachedCantrips(className);

          // Filter spells by max spell level accessible at target level
          availableSpells = allSpells
            .filter((s) => s.level > 0 && s.level <= maxSpellLevel)
            .map((s) => ({
              index: s.index,
              name: s.name,
              level: s.level,
              school: s.school?.name || "Unknown",
              castingTime: s.casting_time || "1 action",
              range: s.range || "Self",
              concentration: s.concentration || false,
              ritual: s.ritual || false,
              description: (s.description?.[0] || "").substring(0, 200),
              components: s.components || [],
              duration: s.duration || "Instantaneous",
            }));

          availableCantrips = allCantrips.map((c) => ({
            index: c.index,
            name: c.name,
            school: c.school?.name || "Unknown",
            castingTime: c.casting_time || "1 action",
            range: c.range || "Self",
            description: (c.description?.[0] || "").substring(0, 200),
          }));
        } catch {
          // API failure is non-blocking
        }
      }

      // Filter out already-known spells and cantrips
      const knownSpells = new Set((character.spells as string[]) || []);
      const knownCantrips = new Set((character.cantrips as string[]) || []);
      availableSpells = availableSpells.filter((s) => !knownSpells.has(s.index));
      availableCantrips = availableCantrips.filter((c) => !knownCantrips.has(c.index));

      // ---- ASI ----
      const grantedASI = grantsASI(className, targetLevel);

      // ---- Subclass ----
      const subclassLevel = getSubclassLevel(className);
      const grantedSubclass = targetLevel === subclassLevel && !character.subclass;

      // ---- Hit Points ----
      const hitDie = classData.hitDie;
      const conMod = Math.floor((character.constitution - 10) / 2);
      const averageHpGain = Math.floor(hitDie / 2) + 1 + conMod; // PHB average
      const maxHpGain = hitDie + conMod;
      const minHpGain = 1 + conMod; // minimum 1 from die

      // ---- Proficiency Bonus ----
      const newProficiencyBonus = getProficiencyBonus(targetLevel);
      const oldProficiencyBonus = getProficiencyBonus(currentLevel);
      const proficiencyBonusIncreased = newProficiencyBonus > oldProficiencyBonus;

      return {
        currentLevel,
        targetLevel,
        className,

        // Spellcasting info
        isCaster,
        spellcastingAbility: progression?.ability || null,
        isPreparedCaster,
        preparedFormula: progression?.preparedFormula || null,
        preparedSpellCount,
        maxSpellLevel,
        prevMaxSpellLevel,
        newSpellSlots,
        prevSpellSlots,
        unlockedNewSpellLevel: maxSpellLevel > prevMaxSpellLevel,

        // Spells to pick
        newSpellsKnownCount,
        availableSpells,
        knownSpellCount: knownSpells.size,

        // Cantrips to pick
        newCantripsCount,
        availableCantrips,
        knownCantripCount: knownCantrips.size,

        // Class features
        classFeatures,

        // ASI
        grantedASI,
        currentAbilityScores: {
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
        },

        // Subclass
        grantedSubclass,
        subclasses: grantedSubclass ? (classData.subclasses || []) : [],

        // Hit Points
        hitDie,
        conMod,
        averageHpGain,
        maxHpGain,
        minHpGain,

        // Proficiency
        newProficiencyBonus,
        proficiencyBonusIncreased,
      };
    }),

  /**
   * Level up a character with all selected options
   */
  levelUp: protectedProcedure
    .input(z.object({
      characterId: z.number(),
      targetLevel: z.number().min(2).max(20),
      // Spell selections
      selectedSpells: z.array(z.string()).optional(),
      selectedCantrips: z.array(z.string()).optional(),
      // Subclass
      selectedSubclass: z.string().optional(),
      // ASI: support +2 to one ability OR +1 to two abilities
      abilityScoreImprovements: z.array(z.object({
        ability: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
        increase: z.number().min(1).max(2),
      })).optional(),
      // HP: "roll" with a specific value, or "average"
      hpMethod: z.enum(["average", "roll"]).default("average"),
      hpRollValue: z.number().optional(), // only used if hpMethod is "roll"
    }))
    .mutation(async ({ ctx, input }) => {
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your character" });
      }

      if (input.targetLevel <= character.level) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Target level must be higher than current level" });
      }

      const className = character.characterClass;
      const classData = CLASSES.find((c) => c.name === className);
      if (!classData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const conMod = Math.floor((character.constitution - 10) / 2);
      const hitDie = classData.hitDie;

      // Calculate HP gain
      let hpGain: number;
      if (input.hpMethod === "roll" && input.hpRollValue !== undefined) {
        // Validate roll is within hit die range
        if (input.hpRollValue < 1 || input.hpRollValue > hitDie) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Roll must be between 1 and ${hitDie}` });
        }
        hpGain = input.hpRollValue + conMod;
      } else {
        // Average: (hitDie / 2) + 1 per PHB rules
        hpGain = Math.floor(hitDie / 2) + 1 + conMod;
      }
      // Minimum 1 HP gain per level
      hpGain = Math.max(1, hpGain);

      const newMaxHp = character.maxHitPoints + hpGain;
      const newCurrentHp = character.currentHitPoints + hpGain;

      // Prepare updates
      const updates: Record<string, unknown> = {
        level: input.targetLevel,
        maxHitPoints: newMaxHp,
        currentHitPoints: newCurrentHp,
      };

      // Update spell slots
      const newSlots = getSpellSlotsAtLevel(className, input.targetLevel);
      if (Object.keys(newSlots).length > 0) {
        updates.spellSlots = newSlots;
      }

      // Add selected spells
      if (input.selectedSpells && input.selectedSpells.length > 0) {
        const currentSpells = (character.spells as string[]) || [];
        const spellSet = new Set([...currentSpells, ...input.selectedSpells]);
        updates.spells = Array.from(spellSet);
      }

      // Add selected cantrips
      if (input.selectedCantrips && input.selectedCantrips.length > 0) {
        const currentCantrips = (character.cantrips as string[]) || [];
        const cantripSet = new Set([...currentCantrips, ...input.selectedCantrips]);
        updates.cantrips = Array.from(cantripSet);
      }

      // Apply subclass selection
      if (input.selectedSubclass) {
        updates.subclass = input.selectedSubclass;
      }

      // Apply ability score improvements (supports +2 to one or +1 to two)
      if (input.abilityScoreImprovements && input.abilityScoreImprovements.length > 0) {
        // Validate total increase is exactly 2
        const totalIncrease = input.abilityScoreImprovements.reduce((sum, asi) => sum + asi.increase, 0);
        if (totalIncrease !== 2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ASI must total exactly +2 (either +2 to one ability or +1 to two)" });
        }

        for (const asi of input.abilityScoreImprovements) {
          const currentScore = character[asi.ability as keyof typeof character] as number;
          const newScore = Math.min(20, currentScore + asi.increase); // Cap at 20
          updates[asi.ability] = newScore;
        }

        // Track ASI usage
        const asiUsed = (character.abilityScoreImprovements as Record<string, boolean>) || {};
        asiUsed[`level_${input.targetLevel}`] = true;
        updates.abilityScoreImprovements = asiUsed;
      }

      // Update class features gained
      try {
        const features = await getClassFeaturesByLevel(className, input.targetLevel);
        if (features.length > 0) {
          const currentFeatures = (character.features as string[]) || [];
          const newFeatureNames = features.map((f) => f.name);
          const featureSet = new Set([...currentFeatures, ...newFeatureNames]);
          updates.features = Array.from(featureSet);
        }
      } catch {
        // Non-blocking
      }

      // Update character in database
      await db.updateCharacter(input.characterId, updates);

      return {
        success: true,
        newLevel: input.targetLevel,
        newMaxHp,
        newCurrentHp,
        hpGain,
        message: `Character leveled up to level ${input.targetLevel}!`,
      };
    }),

  /**
   * Get available subclasses for a character's class
   */
  getSubclasses: protectedProcedure
    .input(z.object({
      characterId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your character" });
      }

      const classData = CLASSES.find((c) => c.name === character.characterClass);
      if (!classData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return classData.subclasses || [];
    }),
});
