import { describe, expect, it } from "vitest";
import {
  rollDie,
  rollMultipleDice,
  rollFromNotation,
  rollWithAdvantage,
  rollWithDisadvantage,
  getAbilityModifier,
  getSkillBonus,
  getSavingThrowBonus,
  getPassiveScore,
  resolveSkillCheck,
  resolveSavingThrow,
  resolveAttack,
  castSpell,
  applyHpChange,
  rollInitiative,
  runPassiveChecks,
  advanceNpcGoal,
  rollDeathSave,
  type CharacterState,
  type HiddenObject,
} from "./mechanics";
import { calculateModifier } from "../../shared/dnd5eData";

// Helper to create a test character state
function makeTestCharacter(overrides?: Partial<CharacterState>): CharacterState {
  return {
    id: 1,
    name: "Thorn Ironforge",
    race: "Dwarf",
    characterClass: "Fighter",
    level: 5,
    strength: 16,
    dexterity: 12,
    constitution: 14,
    intelligence: 10,
    wisdom: 13,
    charisma: 8,
    maxHitPoints: 44,
    currentHitPoints: 44,
    armorClass: 18,
    skills: { athletics: true, perception: true, intimidation: true },
    savingThrows: { strength: true, constitution: true },
    spells: [],
    cantrips: [],
    spellSlots: {},
    equipment: ["longsword", "shield", "chain mail"],
    features: [],
    ...overrides,
  };
}

describe("Dice Engine", () => {
  it("rollDie returns value within expected range", () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(20);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    }
  });

  it("rollMultipleDice returns correct number of dice", () => {
    const results = rollMultipleDice(3, 6);
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });

  it("rollFromNotation parses dice notation correctly", () => {
    for (let i = 0; i < 20; i++) {
      const result = rollFromNotation("2d6+3");
      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
      expect(result.total).toBeGreaterThanOrEqual(5); // 2+3
      expect(result.total).toBeLessThanOrEqual(15); // 12+3
      expect(result.notation).toBe("2d6+3");
    }
  });

  it("rollWithAdvantage returns higher of two rolls", () => {
    for (let i = 0; i < 50; i++) {
      const result = rollWithAdvantage();
      expect(result.rolls).toHaveLength(2);
      expect(result.result).toBe(Math.max(result.rolls[0], result.rolls[1]));
    }
  });

  it("rollWithDisadvantage returns lower of two rolls", () => {
    for (let i = 0; i < 50; i++) {
      const result = rollWithDisadvantage();
      expect(result.rolls).toHaveLength(2);
      expect(result.result).toBe(Math.min(result.rolls[0], result.rolls[1]));
    }
  });
});

describe("Ability Modifier Calculation", () => {
  it("calculates standard modifiers correctly", () => {
    expect(calculateModifier(10)).toBe(0);
    expect(calculateModifier(11)).toBe(0);
    expect(calculateModifier(12)).toBe(1);
    expect(calculateModifier(14)).toBe(2);
    expect(calculateModifier(16)).toBe(3);
    expect(calculateModifier(20)).toBe(5);
    expect(calculateModifier(8)).toBe(-1);
    expect(calculateModifier(6)).toBe(-2);
    expect(calculateModifier(1)).toBe(-5);
  });
});

describe("Skill Bonus Calculation", () => {
  it("calculates proficient skill bonus correctly", () => {
    const char = makeTestCharacter();
    // Athletics: STR (16 = +3) + proficiency bonus at level 5 (+3) = 6
    const bonus = getSkillBonus(char, "athletics");
    expect(bonus).toBe(6);
  });

  it("calculates non-proficient skill bonus correctly", () => {
    const char = makeTestCharacter({ dexterity: 18 }); // DEX +4
    // Stealth: DEX (+4), not proficient = 4
    const bonus = getSkillBonus(char, "stealth");
    expect(bonus).toBe(4);
  });
});

describe("Saving Throw Bonus Calculation", () => {
  it("calculates proficient saving throw bonus", () => {
    const char = makeTestCharacter();
    // STR save: +3 (mod) + 3 (prof at level 5) = 6
    const bonus = getSavingThrowBonus(char, "strength");
    expect(bonus).toBe(6);
  });

  it("calculates non-proficient saving throw bonus", () => {
    const char = makeTestCharacter();
    // CHA save: -1 (mod from CHA 8), not proficient = -1
    const bonus = getSavingThrowBonus(char, "charisma");
    expect(bonus).toBe(-1);
  });
});

describe("Skill Check Resolution", () => {
  it("returns a valid skill check result", () => {
    const char = makeTestCharacter();
    const result = resolveSkillCheck(char, "athletics", 15);

    expect(result.type).toBe("skill_check");
    expect(typeof result.success).toBe("boolean");
    expect(result.details.skill).toBe("athletics");
    expect(result.details.dc).toBe(15);
    expect(typeof result.details.roll).toBe("number");
    expect(typeof result.details.bonus).toBe("number");
    expect(typeof result.details.total).toBe("number");
    // Athletics: STR (16 = +3) + proficiency (3) = +6
    expect(result.details.bonus).toBe(6);
  });

  it("uses correct ability for different skills", () => {
    const char = makeTestCharacter({ dexterity: 18 }); // DEX +4
    const result = resolveSkillCheck(char, "stealth", 10);
    // Stealth uses DEX, not proficient = +4 only
    expect(result.details.bonus).toBe(4);
  });

  it("includes summary string", () => {
    const char = makeTestCharacter();
    const result = resolveSkillCheck(char, "athletics", 15);
    expect(result.summary).toContain("Thorn Ironforge");
    expect(result.summary).toContain("athletics");
    expect(result.summary).toContain("DC 15");
  });
});

describe("Saving Throw Resolution", () => {
  it("returns a valid saving throw result", () => {
    const char = makeTestCharacter();
    const result = resolveSavingThrow(char, "strength", 14);

    expect(result.type).toBe("saving_throw");
    expect(result.details.ability).toBe("strength");
    expect(result.details.dc).toBe(14);
    // STR save proficient: +3 (mod) + 3 (prof) = +6
    expect(result.details.bonus).toBe(6);
  });

  it("handles non-proficient saving throws", () => {
    const char = makeTestCharacter();
    const result = resolveSavingThrow(char, "charisma", 12);
    // CHA save not proficient: -1 (mod from CHA 8)
    expect(result.details.bonus).toBe(-1);
  });
});

describe("Attack Resolution", () => {
  it("returns valid attack result", () => {
    const result = resolveAttack("Thorn", 7, "Goblin", 13, "1d8+3", "slashing", "longsword");
    expect(result.type).toBe("attack_roll");
    expect(result.details.attackerName).toBe("Thorn");
    expect(result.details.targetName).toBe("Goblin");
    expect(typeof result.details.attackRoll).toBe("number");
    expect(typeof result.details.attackTotal).toBe("number");
    expect(result.details.weapon).toBe("longsword");
  });

  it("rolls damage only on hit", () => {
    // Run many times to get both hits and misses
    let hitCount = 0;
    let missCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = resolveAttack("Thorn", 7, "Goblin", 13, "1d8+3", "slashing", "longsword");
      if (result.details.hit) {
        hitCount++;
        expect(result.details.damageTotal).toBeGreaterThan(0);
      } else {
        missCount++;
        expect(result.details.damageTotal).toBeUndefined();
      }
    }
    // With +7 vs AC 13, should hit on 6+ (75% chance)
    expect(hitCount).toBeGreaterThan(0);
  });
});

describe("Spell Casting", () => {
  it("allows cantrips without consuming slots", () => {
    const char = makeTestCharacter({ spells: ["Fire Bolt"], cantrips: ["Fire Bolt"] });
    const result = castSpell(char, "Fire Bolt", 0);
    expect(result.success).toBe(true);
    expect(result.details.isCantrip).toBe(true);
    expect(result.type).toBe("spell_cast");
  });

  it("consumes spell slots for leveled spells", () => {
    const char = makeTestCharacter({
      spells: ["Shield"],
      spellSlots: { "1": 2 },
    });
    const result = castSpell(char, "Shield", 1);
    expect(result.success).toBe(true);
    expect(result.details.remainingSlots["1"]).toBe(1);
  });

  it("fails when no spell slots remain", () => {
    const char = makeTestCharacter({
      spells: ["Shield"],
      spellSlots: { "1": 0 },
    });
    const result = castSpell(char, "Shield", 1);
    expect(result.success).toBe(false);
  });
});

describe("HP Management", () => {
  it("applies damage correctly", () => {
    const char = makeTestCharacter({ currentHitPoints: 30, maxHitPoints: 44 });
    const result = applyHpChange(char, -10);
    expect(result.details.newHp).toBe(20);
    expect(result.details.change).toBe(-10);
    expect(result.type).toBe("hp_change");
  });

  it("applies healing correctly, capped at max", () => {
    const char = makeTestCharacter({ currentHitPoints: 30, maxHitPoints: 44 });
    const result = applyHpChange(char, 20);
    expect(result.details.newHp).toBe(44); // Capped at max
  });

  it("does not go below 0 HP", () => {
    const char = makeTestCharacter({ currentHitPoints: 5, maxHitPoints: 44 });
    const result = applyHpChange(char, -100);
    expect(result.details.newHp).toBe(0);
    expect(result.details.isUnconscious).toBe(true);
  });

  it("detects instant death", () => {
    const char = makeTestCharacter({ currentHitPoints: 10, maxHitPoints: 44 });
    const result = applyHpChange(char, -55); // 10 + (-55) = -45, which is <= -44
    expect(result.details.isDead).toBe(true);
  });
});

describe("Initiative", () => {
  it("rolls initiative for party and NPCs", () => {
    const party = [makeTestCharacter()];
    const npcs = [
      {
        id: "goblin_1",
        name: "Goblin",
        stats: { ac: 13, maxHp: 7, currentHp: 7, attackBonus: 4, damageDice: "1d6+2", speed: 30 },
      },
    ];
    const order = rollInitiative(party, npcs);
    expect(order.length).toBe(2);
    // Should be sorted by initiative descending
    expect(order[0].initiative).toBeGreaterThanOrEqual(order[1].initiative);
    // Check structure
    expect(order[0]).toHaveProperty("id");
    expect(order[0]).toHaveProperty("name");
    expect(order[0]).toHaveProperty("hp");
    expect(order[0]).toHaveProperty("ac");
  });
});

describe("Passive Checks", () => {
  it("detects objects when passive perception beats DC", () => {
    const char = makeTestCharacter({ wisdom: 20 }); // WIS +5, perception proficient, prof bonus +3 = passive 18
    const objects: HiddenObject[] = [
      { name: "Hidden Trap", dc: 12, type: "trap", description: "A pit trap", discovered: false },
    ];
    const results = runPassiveChecks([char], objects);
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    expect(results[0].details.objectName).toBe("Hidden Trap");
    expect(results[0].isHidden).toBe(true); // DCs are hidden from players
  });

  it("does not detect objects when passive perception is too low", () => {
    const char = makeTestCharacter({ wisdom: 8 }); // WIS -1, perception proficient, prof +3 = passive 12
    const objects: HiddenObject[] = [
      { name: "Hidden Trap", dc: 20, type: "trap", description: "A well-hidden trap", discovered: false },
    ];
    const results = runPassiveChecks([char], objects);
    expect(results.length).toBe(0);
  });

  it("skips already discovered objects", () => {
    const char = makeTestCharacter({ wisdom: 20 });
    const objects: HiddenObject[] = [
      { name: "Hidden Trap", dc: 5, type: "trap", description: "A pit trap", discovered: true },
    ];
    const results = runPassiveChecks([char], objects);
    expect(results.length).toBe(0);
  });
});

describe("Death Saves", () => {
  it("returns valid death save result", () => {
    const result = rollDeathSave("Thorn", 0, 0);
    expect(result.type).toBe("death_save");
    expect(typeof result.details.roll).toBe("number");
    expect(typeof result.details.successes).toBe("number");
    expect(typeof result.details.failures).toBe("number");
  });
});

describe("NPC Goal Advancement", () => {
  it("advances NPC goal progress", () => {
    const result = advanceNpcGoal("Goblin Chief", "Gather reinforcements", 30, 15);
    expect(result.type).toBe("npc_goal_advance");
    expect(result.details.newProgress).toBe(45);
    expect(result.details.npcName).toBe("Goblin Chief");
    expect(result.isHidden).toBe(true); // Players don't see this
  });

  it("caps progress at 100", () => {
    const result = advanceNpcGoal("Goblin Chief", "Gather reinforcements", 95, 15);
    expect(result.details.newProgress).toBe(100);
    expect(result.details.goalCompleted).toBe(true);
  });
});
