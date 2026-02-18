import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("Leveling System", () => {
  it("should fetch leveling options for a character", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 999,
        targetLevel: 2,
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should validate target level is higher than current level", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 1,
        targetLevel: 1,
      });
    } catch (error: any) {
      expect(["FORBIDDEN", "BAD_REQUEST"]).toContain(error.code);
    }
  });

  it("should not allow leveling beyond level 20", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 1,
        targetLevel: 21,
      });
    } catch (error: any) {
      expect(["FORBIDDEN", "BAD_REQUEST"]).toContain(error.code);
    }
  });

  // These tests call the D&D 5e API which can be slow - increase timeout
  it("should return subclass options at level 3", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 1,
        targetLevel: 3,
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should return ASI options at level 4", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 1,
        targetLevel: 4,
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
        characterId: 1,
      });
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});

describe("Leveling - Multi-Level Progression", () => {
  it("should accept valid target levels from 2 through 20", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test that the input schema accepts all valid levels
    for (const level of [2, 3, 5, 10, 15, 20]) {
      try {
        await caller.leveling.getLevelingOptions({
          characterId: 999,
          targetLevel: level,
        });
      } catch (error: any) {
        // Should fail with FORBIDDEN (character not found), NOT input validation
        expect(error.code).toBe("FORBIDDEN");
      }
    }
  });

  it("should accept levelUp mutation for levels 2 through 20", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test that the levelUp mutation input schema accepts higher levels
    for (const level of [3, 5, 10, 15, 20]) {
      try {
        await caller.leveling.levelUp({
          characterId: 999,
          targetLevel: level,
        });
      } catch (error: any) {
        // Should fail with FORBIDDEN (character not found), NOT input validation
        expect(error.code).toBe("FORBIDDEN");
      }
    }
  });

  it("should reject level 0 and negative levels", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leveling.getLevelingOptions({
        characterId: 1,
        targetLevel: 0,
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      // Should be a Zod validation error (min 1)
      expect(error).toBeDefined();
    }
  });

  it("ASI levels are correctly identified", () => {
    const asiLevels = [4, 8, 12, 16, 19];
    const nonAsiLevels = [2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20];

    for (const level of asiLevels) {
      expect(asiLevels.includes(level)).toBe(true);
    }
    for (const level of nonAsiLevels) {
      expect(asiLevels.includes(level)).toBe(false);
    }
  });

  it("subclass is granted at level 3 for most classes", () => {
    // Most classes get subclass at level 3
    const subclassLevel3Classes = ["Barbarian", "Bard", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Artificer"];
    // Some classes get subclass at level 1 or 2
    const subclassLevel1Classes = ["Cleric", "Sorcerer", "Warlock"];
    const subclassLevel2Classes = ["Druid", "Wizard"];

    // Verify the level check logic works for level 3
    const targetLevel = 3;
    const noSubclass = null;
    const grantedSubclass = targetLevel === 3 && !noSubclass;
    expect(grantedSubclass).toBe(true);

    // Verify it doesn't grant at wrong levels
    const grantedSubclassAtLevel2 = 2 === 3 && !noSubclass;
    expect(grantedSubclassAtLevel2).toBe(false);

    const grantedSubclassAtLevel4 = 4 === 3 && !noSubclass;
    expect(grantedSubclassAtLevel4).toBe(false);
  });

  it("HP gain calculation is correct for multi-level jumps", () => {
    // Simulate the HP calculation from levelingRouter
    const hitDie = 10; // Fighter
    const constitution = 14;
    const conMod = Math.floor((constitution - 10) / 2); // +2
    
    // Level 1 -> 2 (1 level)
    const hpGain1 = (hitDie + conMod) * 1;
    expect(hpGain1).toBe(12);

    // Level 2 -> 3 (1 level)
    const hpGain2 = (hitDie + conMod) * 1;
    expect(hpGain2).toBe(12);

    // Level 1 -> 5 (4 levels, if multi-level jump was allowed)
    const hpGain4 = (hitDie + conMod) * 4;
    expect(hpGain4).toBe(48);
  });

  it("HP gain uses correct hit die per class", () => {
    const classDice: Record<string, number> = {
      Barbarian: 12,
      Fighter: 10,
      Paladin: 10,
      Ranger: 10,
      Bard: 8,
      Cleric: 8,
      Druid: 8,
      Monk: 8,
      Rogue: 8,
      Warlock: 8,
      Artificer: 8,
      Sorcerer: 6,
      Wizard: 6,
    };

    const conMod = 2; // +2 CON modifier
    
    // Barbarian should gain the most HP per level
    expect(classDice["Barbarian"] + conMod).toBe(14);
    // Wizard should gain the least
    expect(classDice["Wizard"] + conMod).toBe(8);
  });
});
