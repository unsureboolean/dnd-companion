/**
 * D&D 5e game data constants
 * Expanded version with additional races, subclasses, spells, and utilities
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
  // Core PHB Races
  {
    name: "Human",
    abilityBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
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
  // Expanded Races
  {
    name: "Aasimar",
    abilityBonuses: { charisma: 2 },
    speed: 30,
    features: ["Darkvision", "Celestial Resistance", "Healing Hands", "Light Bearer"],
    description: "Touched by celestial power, aasimar are born to serve as champions of the gods.",
  },
  {
    name: "Firbolg",
    abilityBonuses: { wisdom: 2, strength: 1 },
    speed: 30,
    features: ["Firbolg Magic", "Hidden Step", "Powerful Build", "Speech of Beast and Leaf"],
    description: "Gentle giants who prefer to live in harmony with nature.",
  },
  {
    name: "Goliath",
    abilityBonuses: { strength: 2, constitution: 1 },
    speed: 30,
    features: ["Natural Athlete", "Stone's Endurance", "Powerful Build", "Mountain Born"],
    description: "Towering mountain dwellers who value competition and strength.",
  },
  {
    name: "Tabaxi",
    abilityBonuses: { dexterity: 2, charisma: 1 },
    speed: 30,
    features: ["Darkvision", "Feline Agility", "Cat's Claws", "Cat's Talent"],
    description: "Curious cat-folk driven by an insatiable wanderlust.",
  },
  {
    name: "Kenku",
    abilityBonuses: { dexterity: 2, wisdom: 1 },
    speed: 30,
    features: ["Expert Forgery", "Kenku Training", "Mimicry"],
    description: "Flightless bird-folk cursed to speak only in mimicked sounds.",
  },
  {
    name: "Lizardfolk",
    abilityBonuses: { constitution: 2, wisdom: 1 },
    speed: 30,
    features: ["Bite", "Cunning Artisan", "Hold Breath", "Hunter's Lore", "Natural Armor", "Hungry Jaws"],
    description: "Cold-blooded reptilian hunters with alien mindsets.",
  },
  {
    name: "Triton",
    abilityBonuses: { strength: 1, constitution: 1, charisma: 1 },
    speed: 30,
    features: ["Amphibious", "Control Air and Water", "Darkvision", "Emissary of the Sea", "Guardians of the Depths"],
    description: "Noble guardians of the ocean depths.",
  },
  {
    name: "Genasi (Air)",
    abilityBonuses: { constitution: 2, dexterity: 1 },
    speed: 30,
    features: ["Unending Breath", "Mingle with the Wind"],
    description: "Descendants of djinn, air genasi are free-spirited and capricious.",
  },
  {
    name: "Genasi (Earth)",
    abilityBonuses: { constitution: 2, strength: 1 },
    speed: 30,
    features: ["Earth Walk", "Merge with Stone"],
    description: "Descended from dao, earth genasi are patient and deliberate.",
  },
  {
    name: "Genasi (Fire)",
    abilityBonuses: { constitution: 2, intelligence: 1 },
    speed: 30,
    features: ["Darkvision", "Fire Resistance", "Reach to the Blaze"],
    description: "Born of efreeti, fire genasi are hot-tempered and passionate.",
  },
  {
    name: "Genasi (Water)",
    abilityBonuses: { constitution: 2, wisdom: 1 },
    speed: 30,
    features: ["Acid Resistance", "Amphibious", "Swim", "Call to the Wave"],
    description: "Descended from marids, water genasi are independent and adaptable.",
  },
  {
    name: "Tortle",
    abilityBonuses: { strength: 2, wisdom: 1 },
    speed: 30,
    features: ["Claws", "Hold Breath", "Natural Armor", "Shell Defense", "Survival Instinct"],
    description: "Turtle-like humanoids who carry their homes on their backs.",
  },
  {
    name: "Yuan-ti Pureblood",
    abilityBonuses: { charisma: 2, intelligence: 1 },
    speed: 30,
    features: ["Darkvision", "Innate Spellcasting", "Magic Resistance", "Poison Immunity"],
    description: "Snake-like humanoids with powerful magical abilities.",
  },
  {
    name: "Changeling",
    abilityBonuses: { charisma: 2 },
    speed: 30,
    features: ["Shapechanger", "Changeling Instincts"],
    description: "Shapeshifters who can alter their appearance at will.",
  },
  {
    name: "Warforged",
    abilityBonuses: { constitution: 2 },
    speed: 30,
    features: ["Constructed Resilience", "Sentry's Rest", "Integrated Protection", "Specialized Design"],
    description: "Living constructs created for war but now seeking purpose.",
  },
];

export interface Subclass {
  name: string;
  level: number;
  features: string[];
}

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
  subclasses: Subclass[];
}

export const CLASSES: CharacterClass[] = [
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
    subclasses: [
      { name: "Path of the Berserker", level: 3, features: ["Frenzy", "Mindless Rage", "Intimidating Presence", "Retaliation"] },
      { name: "Path of the Totem Warrior", level: 3, features: ["Spirit Seeker", "Totem Spirit", "Aspect of the Beast", "Spirit Walker", "Totemic Attunement"] },
      { name: "Path of the Ancestral Guardian", level: 3, features: ["Ancestral Protectors", "Spirit Shield", "Consult the Spirits", "Vengeful Ancestors"] },
      { name: "Path of the Storm Herald", level: 3, features: ["Storm Aura", "Storm Soul", "Shielding Storm", "Raging Storm"] },
      { name: "Path of the Zealot", level: 3, features: ["Divine Fury", "Warrior of the Gods", "Fanatical Focus", "Zealous Presence", "Rage Beyond Death"] },
    ],
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
    subclasses: [
      { name: "College of Lore", level: 3, features: ["Bonus Proficiencies", "Cutting Words", "Additional Magical Secrets", "Peerless Skill"] },
      { name: "College of Valor", level: 3, features: ["Bonus Proficiencies", "Combat Inspiration", "Extra Attack", "Battle Magic"] },
      { name: "College of Glamour", level: 3, features: ["Mantle of Inspiration", "Enthralling Performance", "Mantle of Majesty", "Unbreakable Majesty"] },
      { name: "College of Swords", level: 3, features: ["Bonus Proficiencies", "Fighting Style", "Blade Flourish", "Extra Attack", "Master's Flourish"] },
      { name: "College of Whispers", level: 3, features: ["Psychic Blades", "Words of Terror", "Mantle of Whispers", "Shadow Lore"] },
    ],
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
    subclasses: [
      { name: "Life Domain", level: 1, features: ["Bonus Proficiency", "Disciple of Life", "Channel Divinity: Preserve Life", "Blessed Healer", "Divine Strike", "Supreme Healing"] },
      { name: "Light Domain", level: 1, features: ["Bonus Cantrip", "Warding Flare", "Channel Divinity: Radiance of the Dawn", "Improved Flare", "Potent Spellcasting", "Corona of Light"] },
      { name: "Tempest Domain", level: 1, features: ["Bonus Proficiencies", "Wrath of the Storm", "Channel Divinity: Destructive Wrath", "Thunderbolt Strike", "Divine Strike", "Stormborn"] },
      { name: "War Domain", level: 1, features: ["Bonus Proficiencies", "War Priest", "Channel Divinity: Guided Strike", "Channel Divinity: War God's Blessing", "Divine Strike", "Avatar of Battle"] },
      { name: "Knowledge Domain", level: 1, features: ["Blessings of Knowledge", "Channel Divinity: Knowledge of the Ages", "Channel Divinity: Read Thoughts", "Potent Spellcasting", "Visions of the Past"] },
      { name: "Trickery Domain", level: 1, features: ["Blessing of the Trickster", "Channel Divinity: Invoke Duplicity", "Channel Divinity: Cloak of Shadows", "Divine Strike", "Improved Duplicity"] },
      { name: "Death Domain", level: 1, features: ["Bonus Proficiency", "Reaper", "Channel Divinity: Touch of Death", "Inescapable Destruction", "Divine Strike", "Improved Reaper"] },
      { name: "Grave Domain", level: 1, features: ["Circle of Mortality", "Eyes of the Grave", "Channel Divinity: Path to the Grave", "Sentinel at Death's Door", "Potent Spellcasting", "Keeper of Souls"] },
    ],
  },
  {
    name: "Druid",
    hitDie: 8,
    primaryAbility: ["wisdom"],
    savingThrows: ["intelligence", "wisdom"],
    skillChoices: 2,
    availableSkills: ["arcana", "animalHandling", "insight", "medicine", "nature", "perception", "religion", "survival"],
    startingEquipment: ["Wooden shield", "Scimitar", "Leather armor", "Explorer's pack", "Druidic focus"],
    features: ["Druidic", "Spellcasting"],
    description: "Priest of nature who draws power from the natural world.",
    subclasses: [
      { name: "Circle of the Land", level: 2, features: ["Bonus Cantrip", "Natural Recovery", "Circle Spells", "Land's Stride", "Nature's Ward", "Nature's Sanctuary"] },
      { name: "Circle of the Moon", level: 2, features: ["Combat Wild Shape", "Circle Forms", "Primal Strike", "Elemental Wild Shape", "Thousand Forms"] },
      { name: "Circle of Dreams", level: 2, features: ["Balm of the Summer Court", "Hearth of Moonlight and Shadow", "Hidden Paths", "Walker in Dreams"] },
      { name: "Circle of the Shepherd", level: 2, features: ["Speech of the Woods", "Spirit Totem", "Mighty Summoner", "Guardian Spirit", "Faithful Summons"] },
      { name: "Circle of Spores", level: 2, features: ["Halo of Spores", "Symbiotic Entity", "Fungal Infestation", "Spreading Spores", "Fungal Body"] },
    ],
  },
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
    subclasses: [
      { name: "Champion", level: 3, features: ["Improved Critical", "Remarkable Athlete", "Additional Fighting Style", "Superior Critical", "Survivor"] },
      { name: "Battle Master", level: 3, features: ["Combat Superiority", "Student of War", "Know Your Enemy", "Improved Combat Superiority", "Relentless"] },
      { name: "Eldritch Knight", level: 3, features: ["Spellcasting", "Weapon Bond", "War Magic", "Eldritch Strike", "Arcane Charge", "Improved War Magic"] },
      { name: "Cavalier", level: 3, features: ["Bonus Proficiency", "Born to the Saddle", "Unwavering Mark", "Warding Maneuver", "Hold the Line", "Ferocious Charger", "Vigilant Defender"] },
      { name: "Samurai", level: 3, features: ["Bonus Proficiency", "Fighting Spirit", "Elegant Courtier", "Tireless Spirit", "Rapid Strike", "Strength Before Death"] },
      { name: "Echo Knight", level: 3, features: ["Manifest Echo", "Unleash Incarnation", "Echo Avatar", "Shadow Martyr", "Reclaim Potential", "Legion of One"] },
    ],
  },
  {
    name: "Monk",
    hitDie: 8,
    primaryAbility: ["dexterity", "wisdom"],
    savingThrows: ["strength", "dexterity"],
    skillChoices: 2,
    availableSkills: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"],
    startingEquipment: ["Shortsword or any simple weapon", "Dungeoneer's pack or explorer's pack", "10 darts"],
    features: ["Unarmored Defense", "Martial Arts"],
    description: "Master of martial arts who harnesses ki energy.",
    subclasses: [
      { name: "Way of the Open Hand", level: 3, features: ["Open Hand Technique", "Wholeness of Body", "Tranquility", "Quivering Palm"] },
      { name: "Way of Shadow", level: 3, features: ["Shadow Arts", "Shadow Step", "Cloak of Shadows", "Opportunist"] },
      { name: "Way of the Four Elements", level: 3, features: ["Disciple of the Elements", "Elemental Disciplines"] },
      { name: "Way of the Drunken Master", level: 3, features: ["Bonus Proficiencies", "Drunken Technique", "Tipsy Sway", "Drunkard's Luck", "Intoxicated Frenzy"] },
      { name: "Way of the Kensei", level: 3, features: ["Path of the Kensei", "One with the Blade", "Sharpen the Blade", "Unerring Accuracy"] },
      { name: "Way of Mercy", level: 3, features: ["Implements of Mercy", "Hand of Healing", "Hand of Harm", "Physician's Touch", "Flurry of Healing and Harm", "Hand of Ultimate Mercy"] },
    ],
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
    subclasses: [
      { name: "Oath of Devotion", level: 3, features: ["Channel Divinity", "Aura of Devotion", "Purity of Spirit", "Holy Nimbus"] },
      { name: "Oath of the Ancients", level: 3, features: ["Channel Divinity", "Aura of Warding", "Undying Sentinel", "Elder Champion"] },
      { name: "Oath of Vengeance", level: 3, features: ["Channel Divinity", "Relentless Avenger", "Soul of Vengeance", "Avenging Angel"] },
      { name: "Oath of Conquest", level: 3, features: ["Channel Divinity", "Aura of Conquest", "Scornful Rebuke", "Invincible Conqueror"] },
      { name: "Oath of Redemption", level: 3, features: ["Channel Divinity", "Aura of the Guardian", "Protective Spirit", "Emissary of Redemption"] },
      { name: "Oathbreaker", level: 3, features: ["Channel Divinity", "Aura of Hate", "Supernatural Resistance", "Dread Lord"] },
    ],
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
    subclasses: [
      { name: "Hunter", level: 3, features: ["Hunter's Prey", "Defensive Tactics", "Multiattack", "Superior Hunter's Defense"] },
      { name: "Beast Master", level: 3, features: ["Ranger's Companion", "Exceptional Training", "Bestial Fury", "Share Spells"] },
      { name: "Gloom Stalker", level: 3, features: ["Dread Ambusher", "Umbral Sight", "Iron Mind", "Stalker's Flurry", "Shadowy Dodge"] },
      { name: "Horizon Walker", level: 3, features: ["Detect Portal", "Planar Warrior", "Ethereal Step", "Distant Strike", "Spectral Defense"] },
      { name: "Monster Slayer", level: 3, features: ["Hunter's Sense", "Slayer's Prey", "Supernatural Defense", "Magic-User's Nemesis", "Slayer's Counter"] },
      { name: "Swarmkeeper", level: 3, features: ["Gathered Swarm", "Writhing Tide", "Mighty Swarm", "Swarming Dispersal"] },
    ],
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
    subclasses: [
      { name: "Thief", level: 3, features: ["Fast Hands", "Second-Story Work", "Supreme Sneak", "Use Magic Device", "Thief's Reflexes"] },
      { name: "Assassin", level: 3, features: ["Bonus Proficiencies", "Assassinate", "Infiltration Expertise", "Impostor", "Death Strike"] },
      { name: "Arcane Trickster", level: 3, features: ["Spellcasting", "Mage Hand Legerdemain", "Magical Ambush", "Versatile Trickster", "Spell Thief"] },
      { name: "Mastermind", level: 3, features: ["Master of Intrigue", "Master of Tactics", "Insightful Manipulator", "Misdirection", "Soul of Deceit"] },
      { name: "Swashbuckler", level: 3, features: ["Fancy Footwork", "Rakish Audacity", "Panache", "Elegant Maneuver", "Master Duelist"] },
      { name: "Scout", level: 3, features: ["Skirmisher", "Survivalist", "Superior Mobility", "Ambush Master", "Sudden Strike"] },
      { name: "Phantom", level: 3, features: ["Whispers of the Dead", "Wails from the Grave", "Tokens of the Departed", "Ghost Walk", "Death's Friend"] },
      { name: "Soulknife", level: 3, features: ["Psionic Power", "Psychic Blades", "Soul Blades", "Psychic Veil", "Rend Mind"] },
    ],
  },
  {
    name: "Sorcerer",
    hitDie: 6,
    primaryAbility: ["charisma"],
    savingThrows: ["constitution", "charisma"],
    skillChoices: 2,
    availableSkills: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"],
    startingEquipment: ["Light crossbow and 20 bolts", "Component pouch or arcane focus", "Dungeoneer's pack or explorer's pack", "Two daggers"],
    features: ["Spellcasting", "Sorcerous Origin"],
    description: "Innate spellcaster with magical bloodline.",
    subclasses: [
      { name: "Draconic Bloodline", level: 1, features: ["Dragon Ancestor", "Draconic Resilience", "Elemental Affinity", "Dragon Wings", "Draconic Presence"] },
      { name: "Wild Magic", level: 1, features: ["Wild Magic Surge", "Tides of Chaos", "Bend Luck", "Controlled Chaos", "Spell Bombardment"] },
      { name: "Divine Soul", level: 1, features: ["Divine Magic", "Favored by the Gods", "Empowered Healing", "Otherworldly Wings", "Unearthly Recovery"] },
      { name: "Shadow Magic", level: 1, features: ["Eyes of the Dark", "Strength of the Grave", "Hound of Ill Omen", "Shadow Walk", "Umbral Form"] },
      { name: "Storm Sorcery", level: 1, features: ["Wind Speaker", "Tempestuous Magic", "Heart of the Storm", "Storm Guide", "Storm's Fury", "Wind Soul"] },
      { name: "Aberrant Mind", level: 1, features: ["Psionic Spells", "Telepathic Speech", "Psionic Sorcery", "Psychic Defenses", "Revelation in Flesh", "Warping Implosion"] },
      { name: "Clockwork Soul", level: 1, features: ["Clockwork Magic", "Restore Balance", "Bastion of Law", "Trance of Order", "Clockwork Cavalcade"] },
    ],
  },
  {
    name: "Warlock",
    hitDie: 8,
    primaryAbility: ["charisma"],
    savingThrows: ["wisdom", "charisma"],
    skillChoices: 2,
    availableSkills: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"],
    startingEquipment: ["Light crossbow and 20 bolts", "Component pouch or arcane focus", "Scholar's pack or dungeoneer's pack", "Leather armor", "Any simple weapon", "Two daggers"],
    features: ["Otherworldly Patron", "Pact Magic"],
    description: "Spellcaster who gains power through a pact with an otherworldly being.",
    subclasses: [
      { name: "The Archfey", level: 1, features: ["Fey Presence", "Misty Escape", "Beguiling Defenses", "Dark Delirium"] },
      { name: "The Fiend", level: 1, features: ["Dark One's Blessing", "Dark One's Own Luck", "Fiendish Resilience", "Hurl Through Hell"] },
      { name: "The Great Old One", level: 1, features: ["Awakened Mind", "Entropic Ward", "Thought Shield", "Create Thrall"] },
      { name: "The Celestial", level: 1, features: ["Bonus Cantrips", "Healing Light", "Radiant Soul", "Celestial Resilience", "Searing Vengeance"] },
      { name: "The Hexblade", level: 1, features: ["Hexblade's Curse", "Hex Warrior", "Accursed Specter", "Armor of Hexes", "Master of Hexes"] },
      { name: "The Fathomless", level: 1, features: ["Tentacle of the Deeps", "Gift of the Sea", "Oceanic Soul", "Guardian Coil", "Grasping Tentacles", "Fathomless Plunge"] },
      { name: "The Genie", level: 1, features: ["Genie's Vessel", "Elemental Gift", "Sanctuary Vessel", "Limited Wish"] },
    ],
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
    subclasses: [
      { name: "School of Abjuration", level: 2, features: ["Abjuration Savant", "Arcane Ward", "Projected Ward", "Improved Abjuration", "Spell Resistance"] },
      { name: "School of Conjuration", level: 2, features: ["Conjuration Savant", "Minor Conjuration", "Benign Transposition", "Focused Conjuration", "Durable Summons"] },
      { name: "School of Divination", level: 2, features: ["Divination Savant", "Portent", "Expert Divination", "The Third Eye", "Greater Portent"] },
      { name: "School of Enchantment", level: 2, features: ["Enchantment Savant", "Hypnotic Gaze", "Instinctive Charm", "Split Enchantment", "Alter Memories"] },
      { name: "School of Evocation", level: 2, features: ["Evocation Savant", "Sculpt Spells", "Potent Cantrip", "Empowered Evocation", "Overchannel"] },
      { name: "School of Illusion", level: 2, features: ["Illusion Savant", "Improved Minor Illusion", "Malleable Illusions", "Illusory Self", "Illusory Reality"] },
      { name: "School of Necromancy", level: 2, features: ["Necromancy Savant", "Grim Harvest", "Undead Thralls", "Inured to Undeath", "Command Undead"] },
      { name: "School of Transmutation", level: 2, features: ["Transmutation Savant", "Minor Alchemy", "Transmuter's Stone", "Shapechanger", "Master Transmuter"] },
      { name: "War Magic", level: 2, features: ["Arcane Deflection", "Tactical Wit", "Power Surge", "Durable Magic", "Deflecting Shroud"] },
      { name: "Bladesinging", level: 2, features: ["Training in War and Song", "Bladesong", "Extra Attack", "Song of Defense", "Song of Victory"] },
      { name: "Chronurgy Magic", level: 2, features: ["Chronal Shift", "Temporal Awareness", "Momentary Stasis", "Arcane Abeyance", "Convergent Future"] },
      { name: "Graviturgy Magic", level: 2, features: ["Adjust Density", "Gravity Well", "Violent Attraction", "Event Horizon"] },
    ],
  },
  {
    name: "Artificer",
    hitDie: 8,
    primaryAbility: ["intelligence"],
    savingThrows: ["constitution", "intelligence"],
    skillChoices: 2,
    availableSkills: ["arcana", "history", "investigation", "medicine", "nature", "perception", "sleightOfHand"],
    startingEquipment: ["Any two simple weapons", "Light crossbow and 20 bolts", "Studded leather armor", "Thieves' tools", "Dungeoneer's pack"],
    features: ["Magical Tinkering", "Spellcasting"],
    description: "Master of invention who creates magical items.",
    subclasses: [
      { name: "Alchemist", level: 3, features: ["Tool Proficiency", "Alchemist Spells", "Experimental Elixir", "Alchemical Savant", "Restorative Reagents", "Chemical Mastery"] },
      { name: "Armorer", level: 3, features: ["Tools of the Trade", "Armorer Spells", "Arcane Armor", "Armor Model", "Extra Attack", "Armor Modifications", "Perfected Armor"] },
      { name: "Artillerist", level: 3, features: ["Tool Proficiency", "Artillerist Spells", "Eldritch Cannon", "Arcane Firearm", "Explosive Cannon", "Fortified Position"] },
      { name: "Battle Smith", level: 3, features: ["Tool Proficiency", "Battle Smith Spells", "Battle Ready", "Steel Defender", "Extra Attack", "Arcane Jolt", "Improved Defender"] },
    ],
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
  {
    name: "Entertainer",
    skillProficiencies: ["acrobatics", "performance"],
    equipment: ["Musical instrument", "Favor of an admirer", "Costume", "Belt pouch with 15 gp"],
    feature: "By Popular Demand",
    description: "You thrive in front of an audience.",
  },
  {
    name: "Guild Artisan",
    skillProficiencies: ["insight", "persuasion"],
    equipment: ["Artisan's tools", "Letter of introduction", "Traveler's clothes", "Belt pouch with 15 gp"],
    feature: "Guild Membership",
    description: "You are a member of an artisan's guild.",
  },
  {
    name: "Hermit",
    skillProficiencies: ["medicine", "religion"],
    equipment: ["Scroll case with notes", "Winter blanket", "Common clothes", "Herbalism kit", "Belt pouch with 5 gp"],
    feature: "Discovery",
    description: "You lived in seclusion for a formative part of your life.",
  },
  {
    name: "Sailor",
    skillProficiencies: ["athletics", "perception"],
    equipment: ["Belaying pin", "50 feet silk rope", "Lucky charm", "Common clothes", "Belt pouch with 10 gp"],
    feature: "Ship's Passage",
    description: "You sailed on a seagoing vessel for years.",
  },
  {
    name: "Urchin",
    skillProficiencies: ["sleightOfHand", "stealth"],
    equipment: ["Small knife", "Map of home city", "Pet mouse", "Token of parents", "Common clothes", "Belt pouch with 10 gp"],
    feature: "City Secrets",
    description: "You grew up on the streets alone, orphaned, and poor.",
  },
  {
    name: "Haunted One",
    skillProficiencies: ["arcana", "investigation"],
    equipment: ["Monster hunter's pack", "Trinket of special significance", "Common clothes", "Belt pouch with 1 gp"],
    feature: "Heart of Darkness",
    description: "You have survived a harrowing experience that left its mark on you.",
  },
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const DICE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const;
export type DiceType = (typeof DICE_TYPES)[number];

export const CONDITIONS = [
  { name: "Blinded", description: "Can't see, auto-fails checks requiring sight. Attack rolls against have advantage, attacks have disadvantage." },
  { name: "Charmed", description: "Can't attack the charmer. Charmer has advantage on social checks." },
  { name: "Deafened", description: "Can't hear, auto-fails checks requiring hearing." },
  { name: "Exhaustion", description: "Cumulative levels with increasing penalties, level 6 is death." },
  { name: "Frightened", description: "Disadvantage on checks and attacks while source of fear is visible. Can't willingly move closer." },
  { name: "Grappled", description: "Speed becomes 0, can't benefit from speed bonuses." },
  { name: "Incapacitated", description: "Can't take actions or reactions." },
  { name: "Invisible", description: "Impossible to see without magic. Attacks against have disadvantage, attacks have advantage." },
  { name: "Paralyzed", description: "Incapacitated, can't move or speak. Auto-fails STR/DEX saves. Attacks have advantage, hits within 5ft are crits." },
  { name: "Petrified", description: "Transformed to stone. Incapacitated, unaware. Resistance to all damage. Immune to poison and disease." },
  { name: "Poisoned", description: "Disadvantage on attack rolls and ability checks." },
  { name: "Prone", description: "Can only crawl. Disadvantage on attacks. Melee attacks have advantage, ranged have disadvantage." },
  { name: "Restrained", description: "Speed 0. Attacks against have advantage, attacks have disadvantage. Disadvantage on DEX saves." },
  { name: "Stunned", description: "Incapacitated, can't move, can only speak falteringly. Auto-fails STR/DEX saves. Attacks have advantage." },
  { name: "Unconscious", description: "Incapacitated, can't move or speak, unaware. Drops held items, falls prone. Auto-fails STR/DEX saves. Attacks have advantage, hits within 5ft are crits." },
] as const;

// Utility functions
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollMultipleDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => rollDice(sides));
}

export function rollWithAdvantage(sides: number): { rolls: number[]; result: number } {
  const rolls = [rollDice(sides), rollDice(sides)];
  return { rolls, result: Math.max(...rolls) };
}

export function rollWithDisadvantage(sides: number): { rolls: number[]; result: number } {
  const rolls = [rollDice(sides), rollDice(sides)];
  return { rolls, result: Math.min(...rolls) };
}

export function parseDiceNotation(notation: string): { count: number; sides: number; modifier: number } | null {
  const match = notation.toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  
  return {
    count: match[1] ? parseInt(match[1]) : 1,
    sides: parseInt(match[2]),
    modifier: match[3] ? parseInt(match[3]) : 0,
  };
}

export function rollFromNotation(notation: string): { rolls: number[]; total: number; notation: string } | null {
  const parsed = parseDiceNotation(notation);
  if (!parsed) return null;
  
  const rolls = rollMultipleDice(parsed.count, parsed.sides);
  const total = rolls.reduce((sum, r) => sum + r, 0) + parsed.modifier;
  
  return { rolls, total, notation };
}
