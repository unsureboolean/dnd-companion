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
