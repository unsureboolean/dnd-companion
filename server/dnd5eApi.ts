/**
 * D&D 5e API Integration Service
 * Fetches official D&D 5e content from https://www.dnd5eapi.co/
 * Used for spells, cantrips, class features, and other official content
 */

const API_BASE = "https://www.dnd5eapi.co/api";

interface D5eSpell {
  index: string;
  name: string;
  level: number;
  school: { index: string; name: string };
  classes: Array<{ index: string; name: string }>;
  ritual: boolean;
  concentration: boolean;
  casting_time: string;
  range: string;
  components: string[];
  duration: string;
  description: string[];
  higher_level?: string[];
}

interface D5eClass {
  index: string;
  name: string;
  hit_die: number;
  class_levels: string;
  multi_classing: {
    prerequisite_options?: Array<{ choose: number; from: Array<{ ability_score: { name: string } }> }>;
    proficiencies_gained?: Array<{ index: string; name: string }>;
  };
}

interface D5eClassFeature {
  index: string;
  name: string;
  level: number;
  class: { index: string; name: string };
  desc: string[];
}

/**
 * Fetch all spells for a specific class
 * CACHE: Results should be cached as this data rarely changes
 */
export async function getSpellsByClass(className: string): Promise<D5eSpell[]> {
  try {
    // Get class index from name
    const classesRes = await fetch(`${API_BASE}/classes`);
    const classesData = (await classesRes.json()) as { results: Array<{ index: string; name: string }> };
    const classIndex = classesData.results.find((c) => c.name.toLowerCase() === className.toLowerCase())?.index;

    if (!classIndex) {
      console.warn(`Class ${className} not found in D&D 5e API`);
      return [];
    }

    // Get spells for this class
    const spellsRes = await fetch(`${API_BASE}/classes/${classIndex}/spells`);
    const spellsData = (await spellsRes.json()) as { results: Array<{ index: string }> };

    // Fetch detailed spell data
    const spells: D5eSpell[] = [];
    for (const spell of spellsData.results) {
      try {
        const spellRes = await fetch(`${API_BASE}/spells/${spell.index}`);
        const spellData = (await spellRes.json()) as D5eSpell;
        spells.push(spellData);
      } catch (error) {
        console.error(`Failed to fetch spell ${spell.index}:`, error);
      }
    }

    return spells;
  } catch (error) {
    console.error("Failed to fetch spells from D&D 5e API:", error);
    return [];
  }
}

/**
 * Fetch cantrips (0-level spells) for a specific class
 * CACHE: Results should be cached as this data rarely changes
 */
export async function getCantripsByClass(className: string): Promise<D5eSpell[]> {
  const spells = await getSpellsByClass(className);
  return spells.filter((s) => s.level === 0);
}

/**
 * Fetch spells of a specific level for a class
 * CACHE: Results should be cached as this data rarely changes
 */
export async function getSpellsByLevel(className: string, level: number): Promise<D5eSpell[]> {
  const spells = await getSpellsByClass(className);
  return spells.filter((s) => s.level === level);
}

/**
 * Fetch class features for a specific level
 * CACHE: Results should be cached as this data rarely changes
 */
export async function getClassFeaturesByLevel(className: string, level: number): Promise<D5eClassFeature[]> {
  try {
    // Get class index from name
    const classesRes = await fetch(`${API_BASE}/classes`);
    const classesData = (await classesRes.json()) as { results: Array<{ index: string; name: string }> };
    const classIndex = classesData.results.find((c) => c.name.toLowerCase() === className.toLowerCase())?.index;

    if (!classIndex) {
      console.warn(`Class ${className} not found in D&D 5e API`);
      return [];
    }

    // Get all features for this class
    const featuresRes = await fetch(`${API_BASE}/classes/${classIndex}/features`);
    const featuresData = (await featuresRes.json()) as { results: D5eClassFeature[] };

    // Filter features for the specific level
    return featuresData.results.filter((f) => f.level === level);
  } catch (error) {
    console.error("Failed to fetch class features from D&D 5e API:", error);
    return [];
  }
}

/**
 * Fetch all class data
 * CACHE: Results should be cached as this data rarely changes
 */
export async function getAllClasses(): Promise<D5eClass[]> {
  try {
    const res = await fetch(`${API_BASE}/classes`);
    const data = (await res.json()) as { results: D5eClass[] };
    return data.results;
  } catch (error) {
    console.error("Failed to fetch classes from D&D 5e API:", error);
    return [];
  }
}

/**
 * Fetch spell details by index
 * CACHE: Results should be cached as this data rarely changes
 */
export async function getSpellByIndex(spellIndex: string): Promise<D5eSpell | null> {
  try {
    const res = await fetch(`${API_BASE}/spells/${spellIndex}`);
    if (!res.ok) return null;
    return (await res.json()) as D5eSpell;
  } catch (error) {
    console.error(`Failed to fetch spell ${spellIndex}:`, error);
    return null;
  }
}
