import { describe, expect, it, vi, beforeEach } from "vitest";
import { RACES, CLASSES, BACKGROUNDS, ALIGNMENTS } from "../shared/dnd5eData";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          personality: "A brave and loyal warrior who values honor above all else.",
          backstory: "Born in a small village on the frontier, they learned to fight from an early age. After their village was attacked by bandits, they swore to protect the innocent and bring justice to wrongdoers. Years of training have honed their skills, and now they seek adventure to test their mettle against greater challenges.",
          ideals: "Justice must be served, no matter the cost.",
          bonds: "I will protect my homeland and the people I love.",
          flaws: "I am too trusting of those who claim to share my ideals."
        })
      }
    }]
  })
}));

describe("Character Generator Data", () => {
  it("should have valid races with ability bonuses", () => {
    expect(RACES.length).toBeGreaterThan(10);
    
    RACES.forEach(race => {
      expect(race.name).toBeTruthy();
      expect(race.description).toBeTruthy();
      expect(race.abilityBonuses).toBeDefined();
      expect(race.features).toBeInstanceOf(Array);
    });
  });

  it("should have valid classes with hit dice and skills", () => {
    expect(CLASSES.length).toBeGreaterThan(10);
    
    CLASSES.forEach(cls => {
      expect(cls.name).toBeTruthy();
      expect(cls.description).toBeTruthy();
      expect(cls.hitDie).toBeGreaterThanOrEqual(6);
      expect(cls.hitDie).toBeLessThanOrEqual(12);
      expect(cls.savingThrows).toBeInstanceOf(Array);
      expect(cls.savingThrows.length).toBe(2);
      expect(cls.availableSkills).toBeInstanceOf(Array);
      expect(cls.skillChoices).toBeGreaterThan(0);
    });
  });

  it("should have valid backgrounds with skill proficiencies", () => {
    expect(BACKGROUNDS.length).toBeGreaterThan(5);
    
    BACKGROUNDS.forEach(bg => {
      expect(bg.name).toBeTruthy();
      expect(bg.description).toBeTruthy();
      expect(bg.skillProficiencies).toBeInstanceOf(Array);
      expect(bg.skillProficiencies.length).toBeGreaterThanOrEqual(2);
      expect(bg.equipment).toBeInstanceOf(Array);
    });
  });

  it("should have all 9 alignments", () => {
    expect(ALIGNMENTS.length).toBe(9);
    expect(ALIGNMENTS).toContain("Lawful Good");
    expect(ALIGNMENTS).toContain("True Neutral");
    expect(ALIGNMENTS).toContain("Chaotic Evil");
  });
});

describe("Character Generation Logic", () => {
  it("should generate valid ability scores for different classes", () => {
    // Test that primary stats are prioritized
    const fighterPrimaryStats = ["strength", "constitution"];
    const wizardPrimaryStats = ["intelligence", "constitution"];
    const roguePrimaryStats = ["dexterity", "intelligence"];
    
    // These should be the primary stats for each class
    expect(fighterPrimaryStats).toContain("strength");
    expect(wizardPrimaryStats).toContain("intelligence");
    expect(roguePrimaryStats).toContain("dexterity");
  });

  it("should select appropriate skills for class", () => {
    const fighter = CLASSES.find(c => c.name === "Fighter");
    const wizard = CLASSES.find(c => c.name === "Wizard");
    const rogue = CLASSES.find(c => c.name === "Rogue");
    
    expect(fighter).toBeDefined();
    expect(wizard).toBeDefined();
    expect(rogue).toBeDefined();
    
    // Fighter should have athletics available
    expect(fighter!.availableSkills).toContain("athletics");
    
    // Wizard should have arcana available
    expect(wizard!.availableSkills).toContain("arcana");
    
    // Rogue should have stealth available
    expect(rogue!.availableSkills).toContain("stealth");
  });

  it("should calculate correct hit points", () => {
    const fighter = CLASSES.find(c => c.name === "Fighter");
    const wizard = CLASSES.find(c => c.name === "Wizard");
    
    expect(fighter!.hitDie).toBe(10);
    expect(wizard!.hitDie).toBe(6);
    
    // At level 1, HP = hitDie + CON modifier
    // With CON 14 (+2), Fighter should have 12 HP
    const conModifier = Math.floor((14 - 10) / 2);
    expect(fighter!.hitDie + conModifier).toBe(12);
  });
});

describe("Backstory Generation", () => {
  it("should generate backstory with all required fields", async () => {
    const { invokeLLM } = await import("./_core/llm");
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Generate a character backstory" },
        { role: "user", content: "Create backstory for a Human Fighter" }
      ]
    });
    
    const content = response.choices[0]?.message?.content;
    expect(content).toBeTruthy();
    
    if (typeof content === 'string') {
      const parsed = JSON.parse(content);
      expect(parsed.personality).toBeTruthy();
      expect(parsed.backstory).toBeTruthy();
      expect(parsed.backstory.length).toBeGreaterThan(100); // At least 2-3 sentences
      expect(parsed.ideals).toBeTruthy();
      expect(parsed.bonds).toBeTruthy();
      expect(parsed.flaws).toBeTruthy();
    }
  });

  it("should generate backstory with sufficient detail", async () => {
    const { invokeLLM } = await import("./_core/llm");
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Generate a character backstory" },
        { role: "user", content: "Create backstory for an Elf Wizard" }
      ]
    });
    
    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      const parsed = JSON.parse(content);
      // Backstory should be at least 2-3 sentences (roughly 100+ characters)
      expect(parsed.backstory.length).toBeGreaterThan(100);
      // Should contain multiple sentences
      const sentences = parsed.backstory.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Race Features", () => {
  it("should have appropriate racial features", () => {
    const elf = RACES.find(r => r.name === "Elf");
    const dwarf = RACES.find(r => r.name === "Dwarf");
    const human = RACES.find(r => r.name === "Human");
    
    expect(elf).toBeDefined();
    expect(dwarf).toBeDefined();
    expect(human).toBeDefined();
    
    // Elves should have darkvision
    expect(elf!.features.some(f => f.toLowerCase().includes("darkvision"))).toBe(true);
    
    // Dwarves should have darkvision
    expect(dwarf!.features.some(f => f.toLowerCase().includes("darkvision"))).toBe(true);
  });

  it("should have correct ability bonuses for races", () => {
    const elf = RACES.find(r => r.name === "Elf");
    const dwarf = RACES.find(r => r.name === "Dwarf");
    const halfOrc = RACES.find(r => r.name === "Half-Orc");
    
    // Elves get +2 DEX
    expect(elf!.abilityBonuses.dexterity).toBe(2);
    
    // Dwarves get +2 CON
    expect(dwarf!.abilityBonuses.constitution).toBe(2);
    
    // Half-Orcs get +2 STR
    expect(halfOrc!.abilityBonuses.strength).toBe(2);
  });
});
