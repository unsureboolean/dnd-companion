/**
 * STATE MANAGER
 * =============
 * Reads and writes all game state to the database.
 * This is the bridge between the mechanics engine and the DB.
 *
 * AI-NOTE: Every state mutation in the game goes through this module.
 * The mechanics engine computes results, then this module persists them.
 * The narrator reads state through this module to build context.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  characters,
  gameState,
  npcs,
  locations,
  encounterState,
  mechanicsLog,
  contextEntries,
  type Character,
  type GameState,
  type Npc,
  type Location,
  type EncounterState,
  type MechanicsLog,
} from "../../drizzle/schema";
import type { CharacterState, MechanicsResult, InitiativeEntry, HiddenObject } from "./mechanics";

// ============================================================
// GAME STATE OPERATIONS
// ============================================================

/**
 * Get or create the game state for a campaign.
 * Every campaign has exactly one active game state.
 */
export async function getOrCreateGameState(campaignId: number): Promise<GameState> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(gameState)
    .where(eq(gameState.campaignId, campaignId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  // Create default game state
  await db.insert(gameState).values({
    campaignId,
    mode: "exploration",
    inGameTime: "Day 1, Morning",
    sessionNumber: 1,
    turnNumber: 0,
  });

  const created = await db
    .select()
    .from(gameState)
    .where(eq(gameState.campaignId, campaignId))
    .limit(1);

  return created[0];
}

/**
 * Update game state fields.
 */
export async function updateGameState(
  campaignId: number,
  updates: Partial<{
    mode: "exploration" | "combat" | "social" | "rest";
    currentLocationId: number | null;
    inGameTime: string;
    environmentalConditions: unknown;
    activeEffects: unknown;
    sessionNumber: number;
    turnNumber: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(gameState)
    .set(updates)
    .where(eq(gameState.campaignId, campaignId));
}

/**
 * Increment the turn counter and return the new turn number.
 * AI-NOTE: Called at the start of every DM loop iteration.
 */
export async function advanceTurn(campaignId: number): Promise<number> {
  const state = await getOrCreateGameState(campaignId);
  const newTurn = state.turnNumber + 1;
  await updateGameState(campaignId, { turnNumber: newTurn });
  return newTurn;
}

// ============================================================
// CHARACTER STATE OPERATIONS
// Read character data as CharacterState for the mechanics engine.
// ============================================================

/**
 * Load a character's full state from the DB for mechanics calculations.
 * AI-NOTE: This is the ONLY way the mechanics engine should get character data.
 */
export async function loadCharacterState(characterId: number): Promise<CharacterState | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);

  if (rows.length === 0) return null;

  const c = rows[0];
  return {
    id: c.id,
    name: c.name,
    level: c.level,
    characterClass: c.characterClass,
    race: c.race,
    strength: c.strength,
    dexterity: c.dexterity,
    constitution: c.constitution,
    intelligence: c.intelligence,
    wisdom: c.wisdom,
    charisma: c.charisma,
    maxHitPoints: c.maxHitPoints,
    currentHitPoints: c.currentHitPoints,
    armorClass: c.armorClass,
    skills: c.skills as Record<string, boolean> | null,
    savingThrows: c.savingThrows as Record<string, boolean> | null,
    equipment: c.equipment as string[] | null,
    spells: c.spells as string[] | null,
    cantrips: c.cantrips as string[] | null,
    spellSlots: c.spellSlots as Record<string, number> | null,
    features: c.features as string[] | null,
  };
}

/**
 * Load all characters in a campaign for party-wide checks.
 */
export async function loadCampaignCharacters(campaignId: number): Promise<CharacterState[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.campaignId, campaignId));

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    characterClass: c.characterClass,
    race: c.race,
    strength: c.strength,
    dexterity: c.dexterity,
    constitution: c.constitution,
    intelligence: c.intelligence,
    wisdom: c.wisdom,
    charisma: c.charisma,
    maxHitPoints: c.maxHitPoints,
    currentHitPoints: c.currentHitPoints,
    armorClass: c.armorClass,
    skills: c.skills as Record<string, boolean> | null,
    savingThrows: c.savingThrows as Record<string, boolean> | null,
    equipment: c.equipment as string[] | null,
    spells: c.spells as string[] | null,
    cantrips: c.cantrips as string[] | null,
    spellSlots: c.spellSlots as Record<string, number> | null,
    features: c.features as string[] | null,
  }));
}

/**
 * Persist HP changes to the database.
 */
export async function updateCharacterHp(
  characterId: number,
  newHp: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(characters)
    .set({ currentHitPoints: newHp })
    .where(eq(characters.id, characterId));
}

/**
 * Persist spell slot changes to the database.
 */
export async function updateCharacterSpellSlots(
  characterId: number,
  newSlots: Record<string, number>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(characters)
    .set({ spellSlots: newSlots })
    .where(eq(characters.id, characterId));
}

/**
 * Update character equipment (add/remove items).
 */
export async function updateCharacterEquipment(
  characterId: number,
  equipment: string[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(characters)
    .set({ equipment })
    .where(eq(characters.id, characterId));
}

// ============================================================
// NPC OPERATIONS
// ============================================================

/**
 * Get all active NPCs in a campaign.
 */
export async function getCampaignNpcs(campaignId: number): Promise<Npc[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(npcs)
    .where(and(eq(npcs.campaignId, campaignId), eq(npcs.isActive, true)));
}

/**
 * Get NPCs at a specific location.
 */
export async function getNpcsAtLocation(
  campaignId: number,
  locationId: number
): Promise<Npc[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(npcs)
    .where(
      and(
        eq(npcs.campaignId, campaignId),
        eq(npcs.locationId, locationId),
        eq(npcs.isActive, true)
      )
    );
}

/**
 * Create a new NPC.
 */
export async function createNpc(data: {
  campaignId: number;
  name: string;
  npcType?: "friendly" | "neutral" | "hostile" | "merchant" | "quest_giver" | "boss";
  description?: string;
  locationId?: number;
  currentGoal?: string;
  disposition?: number;
  stats?: unknown;
  personalityNotes?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(npcs).values(data);
  return result[0].insertId;
}

/**
 * Update NPC goal progress.
 * AI-NOTE: Called by the NPC goal advancement system between turns.
 */
export async function updateNpcGoal(
  npcId: number,
  updates: Partial<{
    currentGoal: string;
    goalProgress: number;
    disposition: number;
    locationId: number;
    isActive: boolean;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(npcs).set(updates).where(eq(npcs.id, npcId));
}

// ============================================================
// LOCATION OPERATIONS
// ============================================================

/**
 * Get a location by ID.
 */
export async function getLocation(locationId: number): Promise<Location | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.id, locationId))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get all locations in a campaign.
 */
export async function getCampaignLocations(campaignId: number): Promise<Location[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(locations).where(eq(locations.campaignId, campaignId));
}

/**
 * Create a new location.
 */
export async function createLocation(data: {
  campaignId: number;
  name: string;
  description?: string;
  baseDescription?: string;
  connectedLocationIds?: unknown;
  hiddenObjects?: unknown;
  hazards?: unknown;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(locations).values(data);
  return result[0].insertId;
}

/**
 * Mark hidden objects as discovered in a location.
 * AI-NOTE: Called after passive checks reveal hidden objects.
 */
export async function markObjectsDiscovered(
  locationId: number,
  discoveredNames: string[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const location = await getLocation(locationId);
  if (!location || !location.hiddenObjects) return;

  const objects = location.hiddenObjects as HiddenObject[];
  const updated = objects.map((obj) =>
    discoveredNames.includes(obj.name) ? { ...obj, discovered: true } : obj
  );

  await db
    .update(locations)
    .set({ hiddenObjects: updated })
    .where(eq(locations.id, locationId));
}

/**
 * Mark a location as visited.
 */
export async function markLocationVisited(locationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(locations)
    .set({ isVisited: true })
    .where(eq(locations.id, locationId));
}

// ============================================================
// ENCOUNTER STATE OPERATIONS
// ============================================================

/**
 * Get the active encounter for a campaign (if any).
 */
export async function getActiveEncounter(
  campaignId: number
): Promise<EncounterState | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(encounterState)
    .where(
      and(
        eq(encounterState.campaignId, campaignId),
        eq(encounterState.isActive, true)
      )
    )
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Create a new encounter with initiative order.
 */
export async function createEncounter(
  campaignId: number,
  initiativeOrder: InitiativeEntry[],
  locationId?: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deactivate any existing encounters
  await db
    .update(encounterState)
    .set({ isActive: false })
    .where(eq(encounterState.campaignId, campaignId));

  const result = await db.insert(encounterState).values({
    campaignId,
    isActive: true,
    currentRound: 1,
    currentTurnIndex: 0,
    initiativeOrder,
    locationId,
  });

  return result[0].insertId;
}

/**
 * Update encounter state (initiative order, turn index, round).
 */
export async function updateEncounter(
  encounterId: number,
  updates: Partial<{
    currentRound: number;
    currentTurnIndex: number;
    initiativeOrder: InitiativeEntry[];
    isActive: boolean;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(encounterState)
    .set(updates)
    .where(eq(encounterState.id, encounterId));
}

// ============================================================
// MECHANICS LOG
// Every dice roll and state change is logged here.
// AI-NOTE: The UI reads this to show structured mechanics data
// alongside the narrative prose.
// ============================================================

/**
 * Log a mechanics event.
 * AI-NOTE: EVERY mechanical action should be logged here.
 * This provides the audit trail and feeds the narrator.
 */
export async function logMechanicsEvent(
  campaignId: number,
  turnNumber: number,
  result: MechanicsResult,
  actorId?: string,
  targetId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(mechanicsLog).values({
    campaignId,
    turnNumber,
    eventType: result.type as any,
    actorId: actorId || null,
    targetId: targetId || null,
    details: result.details,
    summary: result.summary,
    isHidden: result.isHidden,
  });
}

/**
 * Get mechanics log for a specific turn.
 */
export async function getMechanicsForTurn(
  campaignId: number,
  turnNumber: number
): Promise<MechanicsLog[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(mechanicsLog)
    .where(
      and(
        eq(mechanicsLog.campaignId, campaignId),
        eq(mechanicsLog.turnNumber, turnNumber)
      )
    );
}

/**
 * Get recent mechanics log entries for context.
 */
export async function getRecentMechanics(
  campaignId: number,
  limit: number = 20
): Promise<MechanicsLog[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(mechanicsLog)
    .where(eq(mechanicsLog.campaignId, campaignId))
    .orderBy(desc(mechanicsLog.id))
    .limit(limit);
}

// ============================================================
// CONTEXT SNAPSHOT
// Builds a complete snapshot of game state for the narrator.
// AI-NOTE: This is injected into the LLM context every turn.
// ============================================================

export interface GameSnapshot {
  gameState: GameState;
  partyCharacters: CharacterState[];
  currentLocation: Location | null;
  npcsAtLocation: Npc[];
  activeEncounter: EncounterState | null;
  recentMechanics: MechanicsLog[];
  /** Hidden objects that were discovered this turn (from passive checks) */
  newDiscoveries: string[];
}

/**
 * Build a complete game state snapshot for the narrator.
 * This is the data the LLM receives to generate narration.
 *
 * AI-NOTE: The narrator should ONLY use data from this snapshot.
 * It should NEVER invent stats, HP values, or dice results.
 */
export async function buildGameSnapshot(
  campaignId: number,
  newDiscoveries: string[] = []
): Promise<GameSnapshot> {
  const state = await getOrCreateGameState(campaignId);
  const partyCharacters = await loadCampaignCharacters(campaignId);
  const currentLocation = state.currentLocationId
    ? await getLocation(state.currentLocationId)
    : null;
  const npcsAtLocation = state.currentLocationId
    ? await getNpcsAtLocation(campaignId, state.currentLocationId)
    : [];
  const activeEncounter = await getActiveEncounter(campaignId);
  const recentMechanics = await getRecentMechanics(campaignId, 10);

  return {
    gameState: state,
    partyCharacters,
    currentLocation,
    npcsAtLocation,
    activeEncounter,
    recentMechanics,
    newDiscoveries,
  };
}
