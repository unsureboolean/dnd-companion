import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeOpenAI } from "./openai";
import { RACES, CLASSES, BACKGROUNDS, ALIGNMENTS, STANDARD_ARRAY, SKILLS } from "../shared/dnd5eData";

// Name generation data by race
const RACE_NAMES: Record<string, { male: string[]; female: string[]; surnames: string[] }> = {
  Human: {
    male: ["Aldric", "Bran", "Cedric", "Dorian", "Edmund", "Felix", "Gareth", "Hugo", "Ivan", "Jasper", "Kael", "Lucian", "Marcus", "Nolan", "Owen", "Pierce", "Quinn", "Roland", "Sebastian", "Theron"],
    female: ["Alara", "Brianna", "Celeste", "Diana", "Elena", "Fiona", "Gwendolyn", "Helena", "Iris", "Julia", "Kira", "Lydia", "Miranda", "Natalia", "Ophelia", "Petra", "Quinn", "Rosalind", "Seraphina", "Thalia"],
    surnames: ["Ashford", "Blackwood", "Cromwell", "Dunstan", "Everhart", "Fairfax", "Greystone", "Hawthorne", "Ironside", "Jasper", "Kingsley", "Lancaster", "Mercer", "Northwood", "Oakenshield", "Pemberton", "Queensbury", "Ravenscroft", "Stormwind", "Thornwood"],
  },
  Elf: {
    male: ["Aelindor", "Caelum", "Erevan", "Faelar", "Galinndan", "Hadarai", "Ivellios", "Kyran", "Laucian", "Mindartis", "Nailo", "Paelias", "Quarion", "Riardon", "Soveliss", "Thamior", "Varis", "Xiloscient", "Zelphar", "Aramil"],
    female: ["Adrie", "Birel", "Caelynn", "Drusilia", "Enna", "Felosial", "Gaelira", "Ielenia", "Keyleth", "Lia", "Mialee", "Naivara", "Quelenna", "Sariel", "Shanairra", "Thia", "Vadania", "Valanthe", "Xanaphia", "Yaeldrin"],
    surnames: ["Amakiir", "Brightwood", "Galanodel", "Holimion", "Ilphelkiir", "Liadon", "Meliamne", "Naïlo", "Siannodel", "Xiloscient"],
  },
  Dwarf: {
    male: ["Adrik", "Baern", "Brottor", "Darrak", "Eberk", "Flint", "Gardain", "Harbek", "Kildrak", "Morgran", "Orsik", "Rangrim", "Rurik", "Taklinn", "Thoradin", "Thorin", "Tordek", "Traubon", "Ulfgar", "Vondal"],
    female: ["Amber", "Artin", "Audhild", "Bardryn", "Dagnal", "Diesa", "Eldeth", "Falkrunn", "Gunnloda", "Helja", "Hlin", "Kathra", "Kristryd", "Liftrasa", "Mardred", "Riswynn", "Sannl", "Torbera", "Vistra", "Wendra"],
    surnames: ["Balderk", "Battlehammer", "Brawnanvil", "Dankil", "Fireforge", "Frostbeard", "Gorunn", "Holderhek", "Ironfist", "Loderr", "Lutgehr", "Rumnaheim", "Strakeln", "Torunn", "Ungart"],
  },
  Halfling: {
    male: ["Alton", "Ander", "Cade", "Corrin", "Eldon", "Errich", "Finnan", "Garret", "Lindal", "Lyle", "Merric", "Milo", "Osborn", "Perrin", "Reed", "Roscoe", "Wellby", "Wendel", "Wilbur", "Yarro"],
    female: ["Andry", "Bree", "Callie", "Cora", "Euphemia", "Jillian", "Kithri", "Lavinia", "Lidda", "Merla", "Nedda", "Paela", "Portia", "Seraphina", "Shaena", "Trym", "Vani", "Verna", "Wella", "Yondalla"],
    surnames: ["Brushgather", "Goodbarrel", "Greenbottle", "Highhill", "Hilltopple", "Leagallow", "Tealeaf", "Thorngage", "Tosscobble", "Underbough"],
  },
  Dragonborn: {
    male: ["Arjhan", "Balasar", "Bharash", "Donaar", "Ghesh", "Heskan", "Kriv", "Medrash", "Mehen", "Nadarr", "Pandjed", "Patrin", "Rhogar", "Shamash", "Shedinn", "Tarhun", "Torinn", "Vrak", "Xarzith", "Zedaar"],
    female: ["Akra", "Biri", "Daar", "Farideh", "Harann", "Havilar", "Jheri", "Kava", "Korinn", "Mishann", "Nala", "Perra", "Raiann", "Sora", "Surina", "Thava", "Uadjit", "Vezera", "Yrjixtilex", "Zofira"],
    surnames: ["Clethtinthiallor", "Daardendrian", "Delmirev", "Drachedandion", "Fenkenkabradon", "Kepeshkmolik", "Kerrhylon", "Kimbatuul", "Linxakasendalor", "Myastan"],
  },
  Gnome: {
    male: ["Alston", "Alvyn", "Boddynock", "Brocc", "Burgell", "Dimble", "Eldon", "Erky", "Fonkin", "Frug", "Gerbo", "Gimble", "Glim", "Jebeddo", "Kellen", "Namfoodle", "Orryn", "Roondar", "Seebo", "Sindri"],
    female: ["Bimpnottin", "Breena", "Caramip", "Carlin", "Donella", "Duvamil", "Ella", "Ellyjobell", "Ellywick", "Lilli", "Loopmottin", "Lorilla", "Mardnab", "Nissa", "Nyx", "Oda", "Orla", "Roywyn", "Shamil", "Tana"],
    surnames: ["Beren", "Daergel", "Folkor", "Garrick", "Nackle", "Murnig", "Ningel", "Raulnor", "Scheppen", "Timbers", "Turen"],
  },
  "Half-Elf": {
    male: ["Aldric", "Caelum", "Darion", "Eamon", "Faelan", "Gideon", "Hadrian", "Ilyan", "Jorin", "Kael", "Lorcan", "Marius", "Nerin", "Orion", "Phelan", "Quillon", "Renn", "Silas", "Theron", "Vaelin"],
    female: ["Aelindra", "Brienna", "Caelia", "Dara", "Elara", "Faye", "Giselle", "Helena", "Iliana", "Jasmine", "Kira", "Lyra", "Miriel", "Nadia", "Ophira", "Phaedra", "Rhiannon", "Seraphine", "Tamsin", "Vanya"],
    surnames: ["Amastacia", "Brightmoon", "Dawntracker", "Evenwood", "Gladewalker", "Moonwhisper", "Silverleaf", "Starfallen", "Sunshadow", "Windrunner"],
  },
  "Half-Orc": {
    male: ["Dench", "Feng", "Gell", "Henk", "Holg", "Imsh", "Keth", "Krusk", "Mhurren", "Ront", "Shump", "Thokk", "Urzul", "Varg", "Wrugg", "Yurk", "Zorn", "Grom", "Muzgash", "Nargol"],
    female: ["Baggi", "Emen", "Engong", "Kansif", "Myev", "Neega", "Ovak", "Ownka", "Shautha", "Sutha", "Vola", "Volen", "Yevelda", "Grisha", "Hulmarra", "Murook", "Nayeli", "Shel", "Tanarukk", "Zhola"],
    surnames: ["Bloodfist", "Bonecrusher", "Doomhammer", "Gorefang", "Ironhide", "Skullsplitter", "Stonefist", "Thunderfury", "Warbringer", "Worldbreaker"],
  },
  Tiefling: {
    male: ["Akmenos", "Amnon", "Barakas", "Damakos", "Ekemon", "Iados", "Kairon", "Leucis", "Melech", "Mordai", "Morthos", "Pelaios", "Skamos", "Therai", "Zariel", "Zephon", "Malachar", "Nethys", "Oriax", "Valcor"],
    female: ["Akta", "Anakis", "Bryseis", "Criella", "Damaia", "Ea", "Kallista", "Lerissa", "Makaria", "Nemeia", "Orianna", "Phelaia", "Rieta", "Sariel", "Velara", "Xarrai", "Zariel", "Lilith", "Morrigan", "Seraphel"],
    surnames: ["Ashbringer", "Darkflame", "Duskwalker", "Emberheart", "Hellborn", "Infernalis", "Nightshade", "Shadowmend", "Soulfire", "Voidtouched"],
  },
};

// Default names for races not in the list
const DEFAULT_NAMES = {
  male: ["Aldric", "Bran", "Cedric", "Dorian", "Edmund", "Felix", "Gareth", "Hugo", "Ivan", "Jasper"],
  female: ["Alara", "Brianna", "Celeste", "Diana", "Elena", "Fiona", "Gwendolyn", "Helena", "Iris", "Julia"],
  surnames: ["Ashford", "Blackwood", "Cromwell", "Dunstan", "Everhart", "Fairfax", "Greystone", "Hawthorne", "Ironside", "Jasper"],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomName(race: string): string {
  const raceNames = RACE_NAMES[race] || DEFAULT_NAMES;
  const isMale = Math.random() > 0.5;
  const firstName = getRandomElement(isMale ? raceNames.male : raceNames.female);
  const lastName = getRandomElement(raceNames.surnames);
  return `${firstName} ${lastName}`;
}

function generateAbilityScores(primaryAbilities: string[]): Record<string, number> {
  // Sort standard array and assign highest to primary abilities
  const sortedScores = [...STANDARD_ARRAY].sort((a, b) => b - a);
  const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
  const scores: Record<string, number> = {};
  
  // Assign highest scores to primary abilities
  let scoreIndex = 0;
  for (const ability of primaryAbilities) {
    if (scoreIndex < sortedScores.length) {
      scores[ability] = sortedScores[scoreIndex++];
    }
  }
  
  // Assign remaining scores to other abilities
  for (const ability of abilities) {
    if (!scores[ability] && scoreIndex < sortedScores.length) {
      scores[ability] = sortedScores[scoreIndex++];
    }
  }
  
  return scores;
}

function selectSkills(classData: typeof CLASSES[0], backgroundData: typeof BACKGROUNDS[0]): string[] {
  const skills = new Set<string>();
  
  // Add background skills
  backgroundData.skillProficiencies.forEach(skill => skills.add(skill));
  
  // Add class skills (up to skillChoices)
  const availableClassSkills = classData.availableSkills.filter(s => !skills.has(s));
  for (let i = 0; i < classData.skillChoices && i < availableClassSkills.length; i++) {
    skills.add(getRandomElement(availableClassSkills.filter(s => !skills.has(s))));
  }
  
  return Array.from(skills);
}

export const characterGeneratorRouter = router({
  /**
   * Generate a complete character from partial input
   */
  generateCharacter: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      race: z.string().optional(),
      characterClass: z.string().optional(),
      background: z.string().optional(),
      alignment: z.string().optional(),
      generateBackstory: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      // Select random values for any missing fields
      const race = input.race || getRandomElement(RACES).name;
      const characterClass = input.characterClass || getRandomElement(CLASSES).name;
      const background = input.background || getRandomElement(BACKGROUNDS).name;
      const alignment = input.alignment || getRandomElement([...ALIGNMENTS]);
      const name = input.name || generateRandomName(race);
      
      // Get full data objects
      const raceData = RACES.find(r => r.name === race) || RACES[0];
      const classData = CLASSES.find(c => c.name === characterClass) || CLASSES[0];
      const backgroundData = BACKGROUNDS.find(b => b.name === background) || BACKGROUNDS[0];
      
      // Generate ability scores optimized for class
      const baseScores = generateAbilityScores(classData.primaryAbility);
      
      // Apply racial bonuses
      const finalScores = { ...baseScores };
      for (const [ability, bonus] of Object.entries(raceData.abilityBonuses)) {
        finalScores[ability] = (finalScores[ability] || 10) + bonus;
      }
      
      // Select skills
      const skills = selectSkills(classData, backgroundData);
      const skillsObject: Record<string, boolean> = {};
      skills.forEach(skill => skillsObject[skill] = true);
      
      // Calculate HP
      const conMod = Math.floor((finalScores.constitution - 10) / 2);
      const maxHp = classData.hitDie + conMod;
      
      // Calculate AC (base 10 + dex mod, simplified)
      const dexMod = Math.floor((finalScores.dexterity - 10) / 2);
      const armorClass = 10 + dexMod;
      
      // Generate backstory if requested
      let personality = "";
      let backstory = "";
      let ideals = "";
      let bonds = "";
      let flaws = "";
      
      if (input.generateBackstory) {
        const backstoryPrompt = `Generate a rich, detailed backstory for a D&D 5e character with the following traits:

Name: ${name}
Race: ${race} - ${raceData.description}
Class: ${characterClass} - ${classData.description}
Background: ${background} - ${backgroundData.description}
Alignment: ${alignment}

Generate the following in JSON format:
{
  "personality": "2-3 personality traits that define how this character acts and thinks",
  "backstory": "A 3-5 paragraph origin story that explains how they became a ${characterClass}, their upbringing as a ${race}, key life events, and what drives them to adventure. Include specific names of places, people, and events.",
  "ideals": "1-2 core beliefs or principles they hold dear",
  "bonds": "1-2 connections to people, places, or things they care about",
  "flaws": "1-2 weaknesses, fears, or vices"
}

Make the backstory engaging, specific, and true to the character's race, class, and background. Include dramatic moments and personal details that make them feel like a real person.`;

        try {
          const response = await invokeOpenAI({
            messages: [
              { role: "system", content: "You are a creative D&D character backstory writer. Generate detailed, engaging backstories that bring characters to life. Always respond with valid JSON." },
              { role: "user", content: backstoryPrompt },
            ],
            response_format: { type: "json_object" },
          });
          
          const content = response.choices[0]?.message?.content;
          if (content && typeof content === 'string') {
            const parsed = JSON.parse(content);
            // ENSURE ALL FIELDS ARE STRINGS - convert arrays to comma-separated strings
            personality = Array.isArray(parsed.personality) ? parsed.personality.join(", ") : (parsed.personality || "");
            backstory = Array.isArray(parsed.backstory) ? parsed.backstory.join(" ") : (parsed.backstory || "");
            ideals = Array.isArray(parsed.ideals) ? parsed.ideals.join(", ") : (parsed.ideals || "");
            bonds = Array.isArray(parsed.bonds) ? parsed.bonds.join(", ") : (parsed.bonds || "");
            flaws = Array.isArray(parsed.flaws) ? parsed.flaws.join(", ") : (parsed.flaws || "");
          }
        } catch (error) {
          console.error("Failed to generate backstory:", error);
          // Use defaults if generation fails
          personality = `A ${alignment.toLowerCase()} ${race} who embodies the spirit of a ${characterClass}.`;
          backstory = `${name} grew up following the path of the ${background}, eventually becoming a ${characterClass}.`;
          ideals = `The ideals of a true ${characterClass}.`;
          bonds = `Connections forged through their ${background} background.`;
          flaws = `The typical weaknesses of their kind.`;
        }
      }
      
      return {
        name,
        race,
        characterClass,
        background,
        alignment,
        level: 1,
        strength: finalScores.strength,
        dexterity: finalScores.dexterity,
        constitution: finalScores.constitution,
        intelligence: finalScores.intelligence,
        wisdom: finalScores.wisdom,
        charisma: finalScores.charisma,
        maxHitPoints: maxHp,
        currentHitPoints: maxHp,
        armorClass,
        skills: skillsObject,
        equipment: [...classData.startingEquipment, ...backgroundData.equipment],
        personality,
        backstory,
        ideals,
        bonds,
        flaws,
        raceFeatures: raceData.features,
        classFeatures: classData.features,
      };
    }),

  /**
   * Generate or expand backstory for an existing character
   */
  generateBackstory: protectedProcedure
    .input(z.object({
      name: z.string(),
      race: z.string(),
      characterClass: z.string(),
      background: z.string(),
      alignment: z.string(),
      existingBackstory: z.string().optional(),
      personality: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const raceData = RACES.find(r => r.name === input.race);
      const classData = CLASSES.find(c => c.name === input.characterClass);
      const backgroundData = BACKGROUNDS.find(b => b.name === input.background);
      
      const expandPrompt = input.existingBackstory 
        ? `Expand and enrich the following backstory for a D&D character:

Current backstory: ${input.existingBackstory}
${input.personality ? `Current personality: ${input.personality}` : ""}

Character details:
Name: ${input.name}
Race: ${input.race} - ${raceData?.description || ""}
Class: ${input.characterClass} - ${classData?.description || ""}
Background: ${input.background} - ${backgroundData?.description || ""}
Alignment: ${input.alignment}

Expand this backstory to be more detailed and engaging. Add specific names, places, events, and emotional depth. Keep the core elements but make it richer.`
        : `Generate a rich, detailed backstory for a D&D 5e character:

Name: ${input.name}
Race: ${input.race} - ${raceData?.description || ""}
Class: ${input.characterClass} - ${classData?.description || ""}
Background: ${input.background} - ${backgroundData?.description || ""}
Alignment: ${input.alignment}

Create an engaging origin story with specific details.`;

      const response = await invokeOpenAI({
        messages: [
          { role: "system", content: "You are a creative D&D character backstory writer. Generate detailed, engaging backstories that bring characters to life. Always respond with valid JSON." },
          { role: "user", content: expandPrompt + `

Respond in JSON format:
{
  "personality": "2-3 personality traits",
  "backstory": "3-5 paragraph detailed origin story",
  "ideals": "Core beliefs",
  "bonds": "Important connections",
  "flaws": "Weaknesses or vices"
}` },
        ],
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0]?.message?.content;
      if (content && typeof content === 'string') {
        const parsed = JSON.parse(content);
        // ENSURE ALL FIELDS ARE STRINGS - convert arrays to comma-separated strings
        return {
          personality: Array.isArray(parsed.personality) ? parsed.personality.join(", ") : (parsed.personality || ""),
          backstory: Array.isArray(parsed.backstory) ? parsed.backstory.join(" ") : (parsed.backstory || ""),
          ideals: Array.isArray(parsed.ideals) ? parsed.ideals.join(", ") : (parsed.ideals || ""),
          bonds: Array.isArray(parsed.bonds) ? parsed.bonds.join(", ") : (parsed.bonds || ""),
          flaws: Array.isArray(parsed.flaws) ? parsed.flaws.join(", ") : (parsed.flaws || ""),
        };
      }
      
      throw new Error("Failed to generate backstory");
    }),

  /**
   * Generate a portrait for a character using DALL-E
   */
  generatePortrait: protectedProcedure
    .input(z.object({
      characterId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getCharacterById, updateCharacter } = await import("./db");
      const { generateOpenAIImage, createCharacterPortraitPrompt } = await import("./openai");
      const { storagePut } = await import("./storage");
      
      const character = await getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        const { TRPCError } = await import("@trpc/server");
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      
      // Generate portrait prompt
      const prompt = createCharacterPortraitPrompt({
        name: character.name,
        race: character.race,
        characterClass: character.characterClass,
        background: character.background || undefined,
        alignment: character.alignment || undefined,
        personality: character.personality || undefined,
      });
      
      // Generate image with DALL-E
      const imageResponse = await generateOpenAIImage({
        prompt,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });
      
      const imageUrl = imageResponse.data[0]?.url;
      if (!imageUrl) {
        throw new Error("Failed to generate portrait");
      }
      
      // Download the image and upload to S3
      const axios = (await import("axios")).default;
      const imageData = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const buffer = Buffer.from(imageData.data);
      
      // Generate a unique filename
      const filename = `portraits/${character.id}-${Date.now()}.png`;
      const { url: s3Url } = await storagePut(filename, buffer, "image/png");
      
      // Update character with portrait URL
      await updateCharacter(input.characterId, {
        portraitUrl: s3Url,
      });
      
      return {
        portraitUrl: s3Url,
      };
    }),

  /**
   * Get available options for character generation
   */
  getOptions: protectedProcedure.query(() => {
    return {
      races: RACES.map(r => ({ name: r.name, description: r.description })),
      classes: CLASSES.map(c => ({ name: c.name, description: c.description })),
      backgrounds: BACKGROUNDS.map(b => ({ name: b.name, description: b.description })),
      alignments: [...ALIGNMENTS],
    };
  }),
});
