import { describe, expect, it } from "vitest";
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Campaign Management", () => {
  it("should create a campaign", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "The Lost Mines of Phandelver",
      description: "A classic D&D adventure",
    });

    expect(campaign).toBeDefined();
    expect(campaign.name).toBe("The Lost Mines of Phandelver");
    expect(campaign.description).toBe("A classic D&D adventure");
    expect(campaign.userId).toBe(1);
  });

  it("should retrieve a campaign by id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.campaigns.create({
      name: "Storm King's Thunder",
      description: "Giants threaten the Sword Coast",
    });

    const retrieved = await caller.campaigns.get({ id: created.id });

    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.name).toBe("Storm King's Thunder");
  });

  it("should list all user campaigns", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({
      name: "Campaign 1",
      description: "First campaign",
    });

    await caller.campaigns.create({
      name: "Campaign 2",
      description: "Second campaign",
    });

    const campaigns = await caller.campaigns.list();
    expect(campaigns.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Context Management", () => {
  it("should create context entries for a campaign", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Test Campaign",
      description: "For context testing",
    });

    const contextEntry = await caller.context.create({
      campaignId: campaign.id,
      entryType: "npc",
      title: "Sildar Hallwinter",
      content: "A member of the Lords' Alliance, rescued from goblins",
      tags: ["ally", "quest-giver"],
    });

    expect(contextEntry).toBeDefined();
    expect(contextEntry.title).toBe("Sildar Hallwinter");
    expect(contextEntry.entryType).toBe("npc");
    expect(contextEntry.campaignId).toBe(campaign.id);
  });

  it("should retrieve all context entries for a campaign", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Context Test Campaign",
    });

    await caller.context.create({
      campaignId: campaign.id,
      entryType: "location",
      title: "Phandalin",
      content: "A small frontier town",
    });

    await caller.context.create({
      campaignId: campaign.id,
      entryType: "event",
      title: "Goblin Ambush",
      content: "Party was ambushed on the Triboar Trail",
    });

    const entries = await caller.context.list({ campaignId: campaign.id });
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  it("should delete a context entry", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Delete Test Campaign",
    });

    const entry = await caller.context.create({
      campaignId: campaign.id,
      entryType: "item",
      title: "Magic Sword",
      content: "A glowing longsword",
    });

    const result = await caller.context.delete({ id: entry.id });
    expect(result.success).toBe(true);
  });
});
