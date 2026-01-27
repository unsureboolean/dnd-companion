/**
 * Character Leveling Router
 * Handles character leveling, spell selection, ability score improvements, and subclass selection
 */

import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { getSpellsByLevel, getCantripsByClass, getClassFeaturesByLevel } from "./dnd5eApi";
import { CLASSES } from "../shared/dnd5eData";

export const levelingRouter = router({
  /**
   * Get leveling options for a character (spells, cantrips, features, ASIs)
   */
  getLevelingOptions: protectedProcedure
    .input(z.object({
      characterId: z.number(),
      targetLevel: z.number().min(1).max(20),
    }))
    .query(async ({ ctx, input }) => {
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your character" });
      }

      if (input.targetLevel <= character.level) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Target level must be higher than current level" });
      }

      const classData = CLASSES.find((c) => c.name === character.characterClass);
      if (!classData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      // Fetch new spells and cantrips available at this level
      const newSpells = await getSpellsByLevel(character.characterClass, input.targetLevel);
      const cantrips = await getCantripsByClass(character.characterClass);
      const classFeatures = await getClassFeaturesByLevel(character.characterClass, input.targetLevel);

      // Check if this level grants an Ability Score Improvement (ASI)
      // ASIs are granted at levels 4, 8, 12, 16, 19
      const grantedASI = [4, 8, 12, 16, 19].includes(input.targetLevel);

      // Check if this level grants a subclass choice (usually level 3)
      const grantedSubclass = input.targetLevel === 3 && !character.subclass;

      return {
        currentLevel: character.level,
        targetLevel: input.targetLevel,
        availableSpells: newSpells.map((s) => ({
          index: s.index,
          name: s.name,
          level: s.level,
          school: s.school.name,
          castingTime: s.casting_time,
          range: s.range,
          concentration: s.concentration,
          ritual: s.ritual,
          description: s.description[0] || "",
        })),
        availableCantrips: cantrips.map((c) => ({
          index: c.index,
          name: c.name,
          school: c.school.name,
          castingTime: c.casting_time,
          range: c.range,
          description: c.description[0] || "",
        })),
        newClassFeatures: classFeatures.map((f) => ({
          index: f.index,
          name: f.name,
          description: f.desc.join(" "),
        })),
        grantedASI,
        grantedSubclass,
        subclasses: grantedSubclass ? classData.subclasses || [] : [],
        hitPointsGain: classData.hitDie,
      };
    }),

  /**
   * Level up a character with selected options
   */
  levelUp: protectedProcedure
    .input(z.object({
      characterId: z.number(),
      targetLevel: z.number().min(1).max(20),
      selectedSpells: z.array(z.string()).optional(), // spell indices
      selectedCantrips: z.array(z.string()).optional(), // cantrip indices
      selectedSubclass: z.string().optional(),
      abilityScoreImprovement: z.object({
        ability: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
        increase: z.number().min(1).max(2), // +1 or +2
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your character" });
      }

      if (input.targetLevel <= character.level) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Target level must be higher than current level" });
      }

      const classData = CLASSES.find((c) => c.name === character.characterClass);
      if (!classData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      // Calculate new HP
      const conMod = Math.floor((character.constitution - 10) / 2);
      const levelDifference = input.targetLevel - character.level;
      const hpGain = (classData.hitDie + conMod) * levelDifference;
      const newMaxHp = character.maxHitPoints + hpGain;
      const newCurrentHp = character.currentHitPoints + hpGain;

      // Prepare updates
      const updates: Record<string, unknown> = {
        level: input.targetLevel,
        maxHitPoints: newMaxHp,
        currentHitPoints: newCurrentHp,
      };

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

      // Apply ability score improvement
      if (input.abilityScoreImprovement) {
        const { ability, increase } = input.abilityScoreImprovement;
        const currentScore = character[ability as keyof typeof character] as number;
        updates[ability] = currentScore + increase;

        // Track ASI usage
        const asiUsed = (character.abilityScoreImprovements as Record<string, boolean>) || {};
        asiUsed[`level_${input.targetLevel}`] = true;
        updates.abilityScoreImprovements = asiUsed;
      }

      // Update character in database
      await db.updateCharacter(input.characterId, updates);

      return {
        success: true,
        newLevel: input.targetLevel,
        newMaxHp,
        newCurrentHp,
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
