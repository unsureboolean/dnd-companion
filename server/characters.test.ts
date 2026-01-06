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

describe("Character Creation", () => {
  it("should create a character with valid D&D 5e stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const character = await caller.characters.create({
      name: "Thorin Ironforge",
      race: "Dwarf",
      characterClass: "Fighter",
      background: "Soldier",
      level: 1,
      strength: 16,
      dexterity: 12,
      constitution: 15,
      intelligence: 10,
      wisdom: 13,
      charisma: 8,
      alignment: "Lawful Good",
      personality: "Gruff but loyal warrior",
      backstory: "Former soldier seeking redemption",
      skills: {
        athletics: true,
        intimidation: true,
      },
      savingThrows: {
        strength: true,
        constitution: true,
      },
      equipment: ["Chain mail", "Shield", "Battleaxe"],
      features: ["Darkvision", "Dwarven Resilience"],
      maxHitPoints: 13,
      currentHitPoints: 13,
      armorClass: 18,
    });

    expect(character).toBeDefined();
    expect(character.name).toBe("Thorin Ironforge");
    expect(character.race).toBe("Dwarf");
    expect(character.characterClass).toBe("Fighter");
    expect(character.level).toBe(1);
    expect(character.strength).toBe(16);
    expect(character.userId).toBe(1);
  });

  it("should retrieve a character by id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.characters.create({
      name: "Elara Moonwhisper",
      race: "Elf",
      characterClass: "Wizard",
      background: "Sage",
      level: 1,
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 16,
      wisdom: 13,
      charisma: 10,
      skills: { arcana: true, history: true },
      savingThrows: { intelligence: true, wisdom: true },
      equipment: ["Quarterstaff", "Spellbook"],
      features: ["Darkvision", "Keen Senses"],
      maxHitPoints: 8,
      currentHitPoints: 8,
      armorClass: 12,
    });

    const retrieved = await caller.characters.get({ id: created.id });

    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.name).toBe("Elara Moonwhisper");
    expect(retrieved.intelligence).toBe(16);
  });

  it("should update character hit points", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const character = await caller.characters.create({
      name: "Garrick the Bold",
      race: "Human",
      characterClass: "Paladin",
      background: "Noble",
      level: 1,
      strength: 15,
      dexterity: 10,
      constitution: 14,
      intelligence: 10,
      wisdom: 12,
      charisma: 16,
      skills: { persuasion: true, religion: true },
      savingThrows: { wisdom: true, charisma: true },
      equipment: ["Chain mail", "Shield", "Longsword"],
      features: ["Divine Sense", "Lay on Hands"],
      maxHitPoints: 12,
      currentHitPoints: 12,
      armorClass: 18,
    });

    await caller.characters.update({
      id: character.id,
      currentHitPoints: 8,
    });

    const updated = await caller.characters.get({ id: character.id });
    expect(updated.currentHitPoints).toBe(8);
    expect(updated.maxHitPoints).toBe(12);
  });

  it("should list all user characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.characters.create({
      name: "Character 1",
      race: "Human",
      characterClass: "Fighter",
      background: "Soldier",
      level: 1,
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
      skills: {},
      savingThrows: {},
      equipment: [],
      features: [],
      maxHitPoints: 10,
      currentHitPoints: 10,
      armorClass: 16,
    });

    await caller.characters.create({
      name: "Character 2",
      race: "Elf",
      characterClass: "Wizard",
      background: "Sage",
      level: 1,
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 16,
      wisdom: 13,
      charisma: 10,
      skills: {},
      savingThrows: {},
      equipment: [],
      features: [],
      maxHitPoints: 8,
      currentHitPoints: 8,
      armorClass: 12,
    });

    const characters = await caller.characters.list();
    expect(characters.length).toBeGreaterThanOrEqual(2);
  });
});
