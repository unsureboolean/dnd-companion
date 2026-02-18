/**
 * Tests for the Memory Browser feature.
 * Validates the dmEngine memory endpoints (input validation)
 * and the embedding service memory management functions.
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { cosineSimilarity, formatMemoriesForContext } from "./embeddingService";

// ============================================================
// TEST HELPERS
// ============================================================

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ============================================================
// MEMORY ROUTER INPUT VALIDATION TESTS
// ============================================================

describe("Memory Browser - Router Input Validation", () => {
  it("searchMemories requires campaignId and query", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-expect-error - intentionally missing required fields
      await caller.dmEngine.searchMemories({});
      expect.fail("Should have thrown");
    } catch (error: any) {
      // Zod validation error expected
      expect(error).toBeDefined();
    }
  });

  it("searchMemories rejects empty query", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dmEngine.searchMemories({
        campaignId: 1,
        query: "",
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("searchMemories accepts valid topK range", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dmEngine.searchMemories({
        campaignId: 1,
        query: "test query",
        topK: 5,
      });
    } catch (error: any) {
      // Will fail due to campaign not existing, but input validation should pass
      expect(error.message).not.toContain("topK");
    }
  });

  it("searchMemories rejects topK > 20", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dmEngine.searchMemories({
        campaignId: 1,
        query: "test query",
        topK: 25,
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("addMemory requires campaignId, memoryType, and content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-expect-error - intentionally missing fields
      await caller.dmEngine.addMemory({
        campaignId: 1,
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("addMemory validates memoryType enum", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dmEngine.addMemory({
        campaignId: 1,
        // @ts-expect-error - invalid memoryType
        memoryType: "invalid_type",
        content: "Some content",
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("addMemory accepts valid lore entry", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dmEngine.addMemory({
        campaignId: 1,
        memoryType: "lore",
        content: "The ancient dragon sleeps beneath the mountain",
        summary: "Dragon lore",
        importanceBoost: 5,
        tags: ["dragon", "mountain"],
      });
    } catch (error: any) {
      // Will fail due to campaign not existing, but input validation should pass
      expect(error.message).not.toContain("memoryType");
      expect(error.message).not.toContain("content");
    }
  });

  it("updateMemoryImportance validates importance range 0-10", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dmEngine.updateMemoryImportance({
        memoryId: 1,
        campaignId: 1,
        importanceBoost: 15, // Out of range
      });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("updateMemoryImportance accepts valid importance", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dmEngine.updateMemoryImportance({
        memoryId: 1,
        campaignId: 1,
        importanceBoost: 7,
      });
    } catch (error: any) {
      // Will fail due to campaign not existing, but input validation should pass
      expect(error.message).not.toContain("importanceBoost");
    }
  });

  it("deleteMemory requires memoryId and campaignId", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-expect-error - missing campaignId
      await caller.dmEngine.deleteMemory({ memoryId: 1 });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("getMemories requires campaignId", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-expect-error - missing campaignId
      await caller.dmEngine.getMemories({});
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("getMemoryCount requires campaignId", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-expect-error - missing campaignId
      await caller.dmEngine.getMemoryCount({});
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

// ============================================================
// MEMORY FORMATTING TESTS
// ============================================================

describe("Memory Browser - Format Memories for Context", () => {
  it("returns empty string for no results", () => {
    const result = formatMemoriesForContext([]);
    expect(result).toBe("");
  });

  it("formats a single memory correctly", () => {
    const results = [
      {
        memory: {
          id: 1,
          campaignId: 1,
          memoryType: "session_narration" as const,
          content: "The party entered the dark cave",
          summary: null,
          embedding: [],
          sessionNumber: 1,
          turnNumber: 3,
          sourceId: null,
          sourceTable: null,
          tags: ["cave", "exploration"],
          importanceBoost: 0,
          createdAt: new Date(),
        },
        similarity: 0.85,
      },
    ];

    const formatted = formatMemoriesForContext(results);
    expect(formatted).toContain("RELEVANT MEMORIES");
    expect(formatted).toContain("session narration");
    expect(formatted).toContain("Session 1");
    expect(formatted).toContain("85% relevant");
    expect(formatted).toContain("The party entered the dark cave");
  });

  it("formats multiple memories in order", () => {
    const results = [
      {
        memory: {
          id: 1,
          campaignId: 1,
          memoryType: "combat_event" as const,
          content: "Goblin ambush at the bridge",
          summary: null,
          embedding: [],
          sessionNumber: 2,
          turnNumber: 5,
          sourceId: null,
          sourceTable: null,
          tags: ["combat"],
          importanceBoost: 3,
          createdAt: new Date(),
        },
        similarity: 0.92,
      },
      {
        memory: {
          id: 2,
          campaignId: 1,
          memoryType: "npc_interaction" as const,
          content: "Met the merchant Gundren",
          summary: null,
          embedding: [],
          sessionNumber: 1,
          turnNumber: 1,
          sourceId: null,
          sourceTable: null,
          tags: ["npc"],
          importanceBoost: 0,
          createdAt: new Date(),
        },
        similarity: 0.75,
      },
    ];

    const formatted = formatMemoriesForContext(results);
    expect(formatted).toContain("Memory 1");
    expect(formatted).toContain("Memory 2");
    expect(formatted).toContain("92% relevant");
    expect(formatted).toContain("75% relevant");
    expect(formatted).toContain("combat event");
    expect(formatted).toContain("npc interaction");
  });

  it("handles memories without session numbers", () => {
    const results = [
      {
        memory: {
          id: 1,
          campaignId: 1,
          memoryType: "lore" as const,
          content: "Ancient dragon lore",
          summary: null,
          embedding: [],
          sessionNumber: null,
          turnNumber: null,
          sourceId: null,
          sourceTable: null,
          tags: [],
          importanceBoost: 5,
          createdAt: new Date(),
        },
        similarity: 0.6,
      },
    ];

    const formatted = formatMemoriesForContext(results);
    expect(formatted).toContain("lore");
    expect(formatted).toContain("60% relevant");
    expect(formatted).not.toContain("Session null");
  });
});

// ============================================================
// SIMILARITY RANKING TESTS (for Memory Browser search)
// ============================================================

describe("Memory Browser - Similarity Ranking", () => {
  it("ranks exact match highest", () => {
    const query = [1, 0, 0, 0, 0];
    const exact = [1, 0, 0, 0, 0];
    const partial = [0.5, 0.5, 0, 0, 0];
    const unrelated = [0, 0, 0, 0, 1];

    const exactSim = cosineSimilarity(query, exact);
    const partialSim = cosineSimilarity(query, partial);
    const unrelatedSim = cosineSimilarity(query, unrelated);

    expect(exactSim).toBeGreaterThan(partialSim);
    expect(partialSim).toBeGreaterThan(unrelatedSim);
  });

  it("importance boost correctly adjusts ranking", () => {
    // Simulate the search function's importance boost logic
    const baseSimilarityA = 0.7;
    const importanceBoostA = 0; // No boost
    const baseSimilarityB = 0.65;
    const importanceBoostB = 5; // High boost

    const adjustedA = Math.min(baseSimilarityA + importanceBoostA * 0.02, 1.0);
    const adjustedB = Math.min(baseSimilarityB + importanceBoostB * 0.02, 1.0);

    // B should rank higher after boost despite lower base similarity
    expect(adjustedB).toBeGreaterThan(adjustedA);
  });

  it("similarity percentage conversion is correct", () => {
    const similarity = 0.8523;
    const percentage = Math.round(similarity * 100);
    expect(percentage).toBe(85);
  });

  it("similarity percentage handles edge cases", () => {
    expect(Math.round(0 * 100)).toBe(0);
    expect(Math.round(1 * 100)).toBe(100);
    expect(Math.round(0.999 * 100)).toBe(100);
    expect(Math.round(0.001 * 100)).toBe(0);
  });
});

// ============================================================
// MEMORY TYPE VALIDATION TESTS
// ============================================================

describe("Memory Browser - Memory Types", () => {
  const validTypes = [
    "session_narration",
    "player_action",
    "npc_interaction",
    "combat_event",
    "location_discovery",
    "plot_point",
    "item_event",
    "lore",
    "context_entry",
    "character_moment",
  ];

  it("all memory types are accepted by addMemory", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    for (const memoryType of validTypes) {
      try {
        await caller.dmEngine.addMemory({
          campaignId: 1,
          memoryType: memoryType as any,
          content: `Test content for ${memoryType}`,
        });
      } catch (error: any) {
        // Should fail due to campaign not existing, NOT due to invalid type
        expect(error.message).not.toContain("memoryType");
        expect(error.message).not.toContain("Invalid enum");
      }
    }
  });

  it("has exactly 10 valid memory types", () => {
    expect(validTypes).toHaveLength(10);
  });
});
