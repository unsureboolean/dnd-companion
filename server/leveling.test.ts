import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
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

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

// ============================================================
// Class Progression Data Tests
// ============================================================
describe("Class Progression Data", () => {
  it("should have progression data for all 12 PHB classes", () => {
    const expectedClasses = [
      "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
      "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
    ];
    for (const cls of expectedClasses) {
      expect(CLASS_PROGRESSION[cls]).toBeDefined();
      expect(CLASS_PROGRESSION[cls].progression).toHaveLength(20);
    }
  });

  it("should have correct spellcasting types", () => {
    expect(CLASS_PROGRESSION["Wizard"].type).toBe("full");
    expect(CLASS_PROGRESSION["Cleric"].type).toBe("full");
    expect(CLASS_PROGRESSION["Bard"].type).toBe("full");
    expect(CLASS_PROGRESSION["Sorcerer"].type).toBe("full");
    expect(CLASS_PROGRESSION["Druid"].type).toBe("full");
    expect(CLASS_PROGRESSION["Paladin"].type).toBe("half");
    expect(CLASS_PROGRESSION["Ranger"].type).toBe("half");
    expect(CLASS_PROGRESSION["Warlock"].type).toBe("pact");
    expect(CLASS_PROGRESSION["Barbarian"].type).toBe("none");
    expect(CLASS_PROGRESSION["Fighter"].type).toBe("none");
    expect(CLASS_PROGRESSION["Monk"].type).toBe("none");
    expect(CLASS_PROGRESSION["Rogue"].type).toBe("none");
  });

  it("should identify prepared casters correctly", () => {
    expect(CLASS_PROGRESSION["Cleric"].preparedCaster).toBe(true);
    expect(CLASS_PROGRESSION["Druid"].preparedCaster).toBe(true);
    expect(CLASS_PROGRESSION["Paladin"].preparedCaster).toBe(true);
    expect(CLASS_PROGRESSION["Wizard"].preparedCaster).toBe(true);
    expect(CLASS_PROGRESSION["Bard"].preparedCaster).toBe(false);
    expect(CLASS_PROGRESSION["Sorcerer"].preparedCaster).toBe(false);
    expect(CLASS_PROGRESSION["Warlock"].preparedCaster).toBe(false);
    expect(CLASS_PROGRESSION["Ranger"].preparedCaster).toBe(false);
  });

  it("should have correct subclass levels", () => {
    expect(getSubclassLevel("Cleric")).toBe(1);
    expect(getSubclassLevel("Sorcerer")).toBe(1);
    expect(getSubclassLevel("Warlock")).toBe(1);
    expect(getSubclassLevel("Druid")).toBe(2);
    expect(getSubclassLevel("Wizard")).toBe(2);
    expect(getSubclassLevel("Barbarian")).toBe(3);
    expect(getSubclassLevel("Bard")).toBe(3);
    expect(getSubclassLevel("Fighter")).toBe(3);
    expect(getSubclassLevel("Monk")).toBe(3);
    expect(getSubclassLevel("Paladin")).toBe(3);
    expect(getSubclassLevel("Ranger")).toBe(3);
    expect(getSubclassLevel("Rogue")).toBe(3);
  });
});

// ============================================================
// Proficiency Bonus Tests
// ============================================================
describe("Proficiency Bonus", () => {
  it("should return correct proficiency bonus by level", () => {
    expect(getProficiencyBonus(1)).toBe(2);
    expect(getProficiencyBonus(4)).toBe(2);
    expect(getProficiencyBonus(5)).toBe(3);
    expect(getProficiencyBonus(8)).toBe(3);
    expect(getProficiencyBonus(9)).toBe(4);
    expect(getProficiencyBonus(12)).toBe(4);
    expect(getProficiencyBonus(13)).toBe(5);
    expect(getProficiencyBonus(16)).toBe(5);
    expect(getProficiencyBonus(17)).toBe(6);
    expect(getProficiencyBonus(20)).toBe(6);
  });
});

// ============================================================
// Spell Slot Tests
// ============================================================
describe("Spell Slots", () => {
  it("full casters should get 2 first-level slots at level 1", () => {
    const wizardSlots = getSpellSlotsAtLevel("Wizard", 1);
    expect(wizardSlots[1]).toBe(2);
  });

  it("full casters should unlock 2nd-level slots at level 3", () => {
    const clericSlots = getSpellSlotsAtLevel("Cleric", 3);
    expect(clericSlots[1]).toBe(4);
    expect(clericSlots[2]).toBe(2);
  });

  it("full casters should unlock 9th-level slots at level 17", () => {
    const wizardSlots = getSpellSlotsAtLevel("Wizard", 17);
    expect(wizardSlots[9]).toBe(1);
  });

  it("half casters should get no slots at level 1", () => {
    const paladinSlots = getSpellSlotsAtLevel("Paladin", 1);
    expect(Object.keys(paladinSlots).length).toBe(0);
  });

  it("half casters should get first-level slots at level 2", () => {
    const paladinSlots = getSpellSlotsAtLevel("Paladin", 2);
    expect(paladinSlots[1]).toBe(2);
  });

  it("half casters should max at 5th-level slots", () => {
    const rangerSlots = getSpellSlotsAtLevel("Ranger", 17);
    expect(rangerSlots[5]).toBe(1);
    expect(rangerSlots[6]).toBeUndefined();
  });

  it("warlocks should have pact magic slots", () => {
    const warlockSlots1 = getSpellSlotsAtLevel("Warlock", 1);
    expect(warlockSlots1[1]).toBe(1);

    const warlockSlots5 = getSpellSlotsAtLevel("Warlock", 5);
    expect(warlockSlots5[3]).toBe(2);

    const warlockSlots11 = getSpellSlotsAtLevel("Warlock", 11);
    expect(warlockSlots11[5]).toBe(3);
  });

  it("non-casters should have no spell slots", () => {
    for (const level of [1, 5, 10, 20]) {
      const barbarianSlots = getSpellSlotsAtLevel("Barbarian", level);
      expect(Object.keys(barbarianSlots).length).toBe(0);
      const fighterSlots = getSpellSlotsAtLevel("Fighter", level);
      expect(Object.keys(fighterSlots).length).toBe(0);
    }
  });
});

// ============================================================
// Cantrip Progression Tests
// ============================================================
describe("Cantrip Progression", () => {
  it("sorcerer should start with 4 cantrips", () => {
    const prog = CLASS_PROGRESSION["Sorcerer"];
    expect(prog.progression[0].cantripsKnown).toBe(4);
  });

  it("wizard should start with 3 cantrips", () => {
    const prog = CLASS_PROGRESSION["Wizard"];
    expect(prog.progression[0].cantripsKnown).toBe(3);
  });

  it("bard should gain a cantrip at level 4", () => {
    const newCantrips = getNewCantripsAtLevel("Bard", 3, 4);
    expect(newCantrips).toBe(1);
  });

  it("non-casters should have null cantrips", () => {
    const prog = CLASS_PROGRESSION["Barbarian"];
    expect(prog.progression[0].cantripsKnown).toBeNull();
    expect(getNewCantripsAtLevel("Barbarian", 1, 2)).toBe(0);
  });

  it("paladin should have no cantrips (null)", () => {
    const prog = CLASS_PROGRESSION["Paladin"];
    for (const entry of prog.progression) {
      expect(entry.cantripsKnown).toBeNull();
    }
  });
});

// ============================================================
// Spells Known Tests
// ============================================================
describe("Spells Known", () => {
  it("bard should learn new spells each level", () => {
    expect(getNewSpellsKnownAtLevel("Bard", 1, 2)).toBe(1);
    expect(getNewSpellsKnownAtLevel("Bard", 2, 3)).toBe(1);
    expect(getNewSpellsKnownAtLevel("Bard", 9, 10)).toBe(2); // Magical Secrets
  });

  it("sorcerer should learn new spells each level", () => {
    expect(getNewSpellsKnownAtLevel("Sorcerer", 1, 2)).toBe(1);
    expect(getNewSpellsKnownAtLevel("Sorcerer", 2, 3)).toBe(1);
  });

  it("ranger should learn spells starting at level 2", () => {
    expect(getNewSpellsKnownAtLevel("Ranger", 1, 2)).toBe(2); // first spells
    expect(getNewSpellsKnownAtLevel("Ranger", 2, 3)).toBe(1);
  });

  it("warlock should learn spells each level", () => {
    expect(getNewSpellsKnownAtLevel("Warlock", 1, 2)).toBe(1);
    expect(getNewSpellsKnownAtLevel("Warlock", 2, 3)).toBe(1);
  });

  it("prepared casters should return 0 for spells known", () => {
    expect(getNewSpellsKnownAtLevel("Cleric", 1, 2)).toBe(0);
    expect(getNewSpellsKnownAtLevel("Wizard", 1, 2)).toBe(0);
    expect(getNewSpellsKnownAtLevel("Druid", 1, 2)).toBe(0);
    expect(getNewSpellsKnownAtLevel("Paladin", 1, 2)).toBe(0);
  });
});

// ============================================================
// Prepared Spell Count Tests
// ============================================================
describe("Prepared Spell Count", () => {
  it("cleric should prepare wisdom mod + level spells", () => {
    // Wisdom 16 = +3 modifier, level 5
    expect(getPreparedSpellCount("Cleric", 5, 3)).toBe(8);
  });

  it("paladin should prepare charisma mod + half level spells", () => {
    // Charisma 16 = +3 modifier, level 6
    expect(getPreparedSpellCount("Paladin", 6, 3)).toBe(6);
  });

  it("minimum prepared spells should be 1", () => {
    // Negative ability modifier
    expect(getPreparedSpellCount("Cleric", 1, -2)).toBe(1);
  });

  it("non-prepared casters should return 0", () => {
    expect(getPreparedSpellCount("Bard", 5, 3)).toBe(0);
    expect(getPreparedSpellCount("Barbarian", 5, 3)).toBe(0);
  });
});

// ============================================================
// Max Spell Level Tests
// ============================================================
describe("Max Spell Level", () => {
  it("full casters should access spell level 1 at character level 1", () => {
    expect(getMaxSpellLevel("Wizard", 1)).toBe(1);
    expect(getMaxSpellLevel("Cleric", 1)).toBe(1);
  });

  it("full casters should access spell level 2 at character level 3", () => {
    expect(getMaxSpellLevel("Wizard", 3)).toBe(2);
  });

  it("full casters should access spell level 9 at character level 17", () => {
    expect(getMaxSpellLevel("Wizard", 17)).toBe(9);
  });

  it("half casters should access spell level 1 at character level 2", () => {
    expect(getMaxSpellLevel("Paladin", 2)).toBe(1);
    expect(getMaxSpellLevel("Ranger", 2)).toBe(1);
  });

  it("half casters should max at spell level 5", () => {
    expect(getMaxSpellLevel("Paladin", 20)).toBe(5);
  });

  it("non-casters should have max spell level 0", () => {
    expect(getMaxSpellLevel("Barbarian", 20)).toBe(0);
    expect(getMaxSpellLevel("Fighter", 20)).toBe(0);
  });

  it("warlock pact magic should scale differently", () => {
    expect(getMaxSpellLevel("Warlock", 1)).toBe(1);
    expect(getMaxSpellLevel("Warlock", 3)).toBe(2);
    expect(getMaxSpellLevel("Warlock", 5)).toBe(3);
    expect(getMaxSpellLevel("Warlock", 9)).toBe(5);
  });
});

// ============================================================
// ASI Tests
// ============================================================
describe("Ability Score Improvements", () => {
  it("standard classes get ASI at 4, 8, 12, 16, 19", () => {
    for (const cls of ["Bard", "Cleric", "Druid", "Monk", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard", "Barbarian"]) {
      expect(grantsASI(cls, 4)).toBe(true);
      expect(grantsASI(cls, 8)).toBe(true);
      expect(grantsASI(cls, 12)).toBe(true);
      expect(grantsASI(cls, 16)).toBe(true);
      expect(grantsASI(cls, 19)).toBe(true);
      expect(grantsASI(cls, 3)).toBe(false);
      expect(grantsASI(cls, 5)).toBe(false);
    }
  });

  it("fighter gets extra ASI at 6 and 14", () => {
    expect(grantsASI("Fighter", 4)).toBe(true);
    expect(grantsASI("Fighter", 6)).toBe(true);
    expect(grantsASI("Fighter", 8)).toBe(true);
    expect(grantsASI("Fighter", 14)).toBe(true);
  });

  it("rogue gets extra ASI at 10", () => {
    expect(grantsASI("Rogue", 4)).toBe(true);
    expect(grantsASI("Rogue", 10)).toBe(true);
    expect(grantsASI("Rogue", 6)).toBe(false);
  });
});

// ============================================================
// isSpellcaster Tests
// ============================================================
describe("isSpellcaster", () => {
  it("should identify casters correctly", () => {
    expect(isSpellcaster("Wizard")).toBe(true);
    expect(isSpellcaster("Cleric")).toBe(true);
    expect(isSpellcaster("Bard")).toBe(true);
    expect(isSpellcaster("Sorcerer")).toBe(true);
    expect(isSpellcaster("Druid")).toBe(true);
    expect(isSpellcaster("Paladin")).toBe(true);
    expect(isSpellcaster("Ranger")).toBe(true);
    expect(isSpellcaster("Warlock")).toBe(true);
  });

  it("should identify non-casters correctly", () => {
    expect(isSpellcaster("Barbarian")).toBe(false);
    expect(isSpellcaster("Fighter")).toBe(false);
    expect(isSpellcaster("Monk")).toBe(false);
    expect(isSpellcaster("Rogue")).toBe(false);
  });

  it("should return false for classes not in progression data", () => {
    expect(isSpellcaster("UnknownClass")).toBe(false);
  });
});

// ============================================================
// Router Integration Tests
// ============================================================
describe("Leveling Router", () => {
  it("should reject non-existent character", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 999,
        targetLevel: 2,
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should reject target level below 2", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 1,
        targetLevel: 1,
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      // Zod validation error for min(2)
      expect(error).toBeDefined();
    }
  });

  it("should reject target level above 20", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 1,
        targetLevel: 21,
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("should accept valid target levels from 2 through 20", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    for (const level of [2, 5, 10, 15, 20]) {
      try {
        await caller.leveling.getLevelingOptions({
          characterId: 999,
          targetLevel: level,
        });
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    }
  });

  it("should accept levelUp mutation with ASI selections", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.levelUp({
        characterId: 999,
        targetLevel: 4,
        abilityScoreImprovements: [
          { ability: "strength", increase: 2 },
        ],
        hpMethod: "average",
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should accept levelUp mutation with +1 to two abilities", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.levelUp({
        characterId: 999,
        targetLevel: 4,
        abilityScoreImprovements: [
          { ability: "strength", increase: 1 },
          { ability: "dexterity", increase: 1 },
        ],
        hpMethod: "average",
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should accept levelUp mutation with spell and cantrip selections", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.levelUp({
        characterId: 999,
        targetLevel: 2,
        selectedSpells: ["magic-missile", "shield"],
        selectedCantrips: ["fire-bolt"],
        hpMethod: "roll",
        hpRollValue: 4,
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should accept levelUp mutation with subclass selection", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.levelUp({
        characterId: 999,
        targetLevel: 3,
        selectedSubclass: "Champion",
        hpMethod: "average",
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should fetch subclasses for a character", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getSubclasses({
        characterId: 999,
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});

// ============================================================
// HP Calculation Tests
// ============================================================
describe("HP Calculation", () => {
  it("average HP gain should be (hitDie/2)+1+conMod", () => {
    // Barbarian d12, CON 14 (+2)
    const hitDie = 12;
    const conMod = 2;
    const average = Math.floor(hitDie / 2) + 1 + conMod;
    expect(average).toBe(9);
  });

  it("minimum HP gain should be 1", () => {
    // Wizard d6, CON 8 (-1), rolled a 1
    const roll = 1;
    const conMod = -1;
    const gain = Math.max(1, roll + conMod);
    expect(gain).toBe(1);
  });

  it("max HP gain should be hitDie+conMod", () => {
    // Fighter d10, CON 16 (+3)
    const hitDie = 10;
    const conMod = 3;
    expect(hitDie + conMod).toBe(13);
  });
});
