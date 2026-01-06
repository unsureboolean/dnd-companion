/**
 * D&D 5e game data constants
 * Simplified version focusing on core PHB content
 */

export const ABILITY_SCORES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type AbilityScore = (typeof ABILITY_SCORES)[number];

export const SKILLS = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
] as const;

export type Skill = (typeof SKILLS)[number];

export const SKILL_ABILITY_MAP: Record<Skill, AbilityScore> = {
  acrobatics: "dexterity",
  animalHandling: "wisdom",
  arcana: "intelligence",
  athletics: "strength",
  deception: "charisma",
  history: "intelligence",
  insight: "wisdom",
  intimidation: "charisma",
  investigation: "intelligence",
  medicine: "wisdom",
  nature: "intelligence",
  perception: "wisdom",
  performance: "charisma",
  persuasion: "charisma",
  religion: "intelligence",
  sleightOfHand: "dexterity",
  stealth: "dexterity",
  survival: "wisdom",
};

export const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
] as const;

export interface Race {
  name: string;
  abilityBonuses: Partial<Record<AbilityScore, number>>;
  speed: number;
  features: string[];
  description: string;
}

export const RACES: Race[] = [
  {
    name: "Human",
    abilityBonuses: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1,
    },
    speed: 30,
    features: ["Extra Language"],
    description: "Versatile and adaptable, humans are the most common race.",
  },
  {
    name: "Elf",
    abilityBonuses: { dexterity: 2 },
    speed: 30,
    features: ["Darkvision", "Keen Senses", "Fey Ancestry", "Trance"],
    description: "Graceful and long-lived, elves are masters of magic and archery.",
  },
  {
    name: "Dwarf",
    abilityBonuses: { constitution: 2 },
    speed: 25,
    features: ["Darkvision", "Dwarven Resilience", "Stonecunning"],
    description: "Stout and hardy, dwarves are skilled craftsmen and warriors.",
  },
  {
    name: "Halfling",
    abilityBonuses: { dexterity: 2 },
    speed: 25,
    features: ["Lucky", "Brave", "Halfling Nimbleness"],
    description: "Small and nimble, halflings are known for their luck and courage.",
  },
  {
    name: "Dragonborn",
    abilityBonuses: { strength: 2, charisma: 1 },
    speed: 30,
    features: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance"],
    description: "Proud dragon-descended warriors with breath weapons.",
  },
  {
    name: "Gnome",
    abilityBonuses: { intelligence: 2 },
    speed: 25,
    features: ["Darkvision", "Gnome Cunning"],
    description: "Clever and curious, gnomes are inventive tinkerers.",
  },
  {
    name: "Half-Elf",
    abilityBonuses: { charisma: 2 },
    speed: 30,
    features: ["Darkvision", "Fey Ancestry", "Skill Versatility"],
    description: "Combining human ambition with elven grace.",
  },
  {
    name: "Half-Orc",
    abilityBonuses: { strength: 2, constitution: 1 },
    speed: 30,
    features: ["Darkvision", "Relentless Endurance", "Savage Attacks"],
    description: "Strong and fierce, half-orcs blend human and orcish heritage.",
  },
  {
    name: "Tiefling",
    abilityBonuses: { charisma: 2, intelligence: 1 },
    speed: 30,
    features: ["Darkvision", "Hellish Resistance", "Infernal Legacy"],
    description: "Bearing infernal heritage, tieflings often face prejudice.",
  },
];

export interface CharacterClass {
  name: string;
  hitDie: number;
  primaryAbility: AbilityScore[];
  savingThrows: AbilityScore[];
  skillChoices: number;
  availableSkills: Skill[];
  startingEquipment: string[];
  features: string[];
  description: string;
}

export const CLASSES: CharacterClass[] = [
  {
    name: "Fighter",
    hitDie: 10,
    primaryAbility: ["strength", "dexterity"],
    savingThrows: ["strength", "constitution"],
    skillChoices: 2,
    availableSkills: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"],
    startingEquipment: ["Chain mail", "Shield", "Martial weapon", "Light crossbow and 20 bolts", "Dungeoneer's pack"],
    features: ["Fighting Style", "Second Wind"],
    description: "Master of martial combat, skilled with weapons and armor.",
  },
  {
    name: "Wizard",
    hitDie: 6,
    primaryAbility: ["intelligence"],
    savingThrows: ["intelligence", "wisdom"],
    skillChoices: 2,
    availableSkills: ["arcana", "history", "insight", "investigation", "medicine", "religion"],
    startingEquipment: ["Quarterstaff", "Component pouch", "Scholar's pack", "Spellbook"],
    features: ["Spellcasting", "Arcane Recovery"],
    description: "Scholarly magic-user who masters arcane spells.",
  },
  {
    name: "Rogue",
    hitDie: 8,
    primaryAbility: ["dexterity"],
    savingThrows: ["dexterity", "intelligence"],
    skillChoices: 4,
    availableSkills: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"],
    startingEquipment: ["Rapier", "Shortbow and 20 arrows", "Burglar's pack", "Leather armor", "Two daggers", "Thieves' tools"],
    features: ["Expertise", "Sneak Attack", "Thieves' Cant"],
    description: "Skilled in stealth, deception, and precision strikes.",
  },
  {
    name: "Cleric",
    hitDie: 8,
    primaryAbility: ["wisdom"],
    savingThrows: ["wisdom", "charisma"],
    skillChoices: 2,
    availableSkills: ["history", "insight", "medicine", "persuasion", "religion"],
    startingEquipment: ["Mace", "Scale mail", "Light crossbow and 20 bolts", "Priest's pack", "Shield", "Holy symbol"],
    features: ["Spellcasting", "Divine Domain"],
    description: "Divine spellcaster who channels the power of their deity.",
  },
  {
    name: "Ranger",
    hitDie: 10,
    primaryAbility: ["dexterity", "wisdom"],
    savingThrows: ["strength", "dexterity"],
    skillChoices: 3,
    availableSkills: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"],
    startingEquipment: ["Scale mail", "Two shortswords", "Longbow and 20 arrows", "Explorer's pack"],
    features: ["Favored Enemy", "Natural Explorer"],
    description: "Wilderness warrior skilled in tracking and survival.",
  },
  {
    name: "Paladin",
    hitDie: 10,
    primaryAbility: ["strength", "charisma"],
    savingThrows: ["wisdom", "charisma"],
    skillChoices: 2,
    availableSkills: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"],
    startingEquipment: ["Chain mail", "Shield", "Martial weapon", "Five javelins", "Priest's pack", "Holy symbol"],
    features: ["Divine Sense", "Lay on Hands"],
    description: "Holy warrior bound by sacred oath.",
  },
  {
    name: "Barbarian",
    hitDie: 12,
    primaryAbility: ["strength"],
    savingThrows: ["strength", "constitution"],
    skillChoices: 2,
    availableSkills: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"],
    startingEquipment: ["Greataxe", "Two handaxes", "Explorer's pack", "Four javelins"],
    features: ["Rage", "Unarmored Defense"],
    description: "Fierce warrior who channels primal fury.",
  },
  {
    name: "Bard",
    hitDie: 8,
    primaryAbility: ["charisma"],
    savingThrows: ["dexterity", "charisma"],
    skillChoices: 3,
    availableSkills: ["acrobatics", "animalHandling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleightOfHand", "stealth", "survival"],
    startingEquipment: ["Rapier", "Diplomat's pack", "Lute", "Leather armor", "Dagger"],
    features: ["Spellcasting", "Bardic Inspiration"],
    description: "Inspiring performer who weaves magic through music.",
  },
];

export interface Background {
  name: string;
  skillProficiencies: Skill[];
  equipment: string[];
  feature: string;
  description: string;
}

export const BACKGROUNDS: Background[] = [
  {
    name: "Acolyte",
    skillProficiencies: ["insight", "religion"],
    equipment: ["Holy symbol", "Prayer book", "5 sticks of incense", "Vestments", "Common clothes", "Belt pouch with 15 gp"],
    feature: "Shelter of the Faithful",
    description: "You spent your life in service to a temple.",
  },
  {
    name: "Criminal",
    skillProficiencies: ["deception", "stealth"],
    equipment: ["Crowbar", "Dark common clothes with hood", "Belt pouch with 15 gp"],
    feature: "Criminal Contact",
    description: "You are an experienced criminal with a history of breaking the law.",
  },
  {
    name: "Folk Hero",
    skillProficiencies: ["animalHandling", "survival"],
    equipment: ["Artisan's tools", "Shovel", "Iron pot", "Common clothes", "Belt pouch with 10 gp"],
    feature: "Rustic Hospitality",
    description: "You come from humble origins and are a champion of the common people.",
  },
  {
    name: "Noble",
    skillProficiencies: ["history", "persuasion"],
    equipment: ["Fine clothes", "Signet ring", "Scroll of pedigree", "Purse with 25 gp"],
    feature: "Position of Privilege",
    description: "You come from the upper class and understand wealth and power.",
  },
  {
    name: "Sage",
    skillProficiencies: ["arcana", "history"],
    equipment: ["Bottle of ink", "Quill", "Small knife", "Letter from dead colleague", "Common clothes", "Belt pouch with 10 gp"],
    feature: "Researcher",
    description: "You spent years learning the lore of the multiverse.",
  },
  {
    name: "Soldier",
    skillProficiencies: ["athletics", "intimidation"],
    equipment: ["Insignia of rank", "Trophy from fallen enemy", "Dice set", "Common clothes", "Belt pouch with 10 gp"],
    feature: "Military Rank",
    description: "You have military training and experience in organized warfare.",
  },
  {
    name: "Outlander",
    skillProficiencies: ["athletics", "survival"],
    equipment: ["Staff", "Hunting trap", "Trophy from animal", "Traveler's clothes", "Belt pouch with 10 gp"],
    feature: "Wanderer",
    description: "You grew up in the wilds, far from civilization.",
  },
  {
    name: "Charlatan",
    skillProficiencies: ["deception", "sleightOfHand"],
    equipment: ["Fine clothes", "Disguise kit", "Tools of con", "Belt pouch with 15 gp"],
    feature: "False Identity",
    description: "You have always had a way with people and know how to manipulate them.",
  },
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}
