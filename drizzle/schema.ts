import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Campaigns - represents a D&D campaign/adventure
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  playerCharacterId: int("playerCharacterId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Characters - D&D 5e character sheets
 */
export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  campaignId: int("campaignId"), // nullable - character can exist without campaign
  name: varchar("name", { length: 255 }).notNull(),
  race: varchar("race", { length: 100 }).notNull(),
  characterClass: varchar("characterClass", { length: 100 }).notNull(),
  background: varchar("background", { length: 100 }).notNull(),
  level: int("level").default(1).notNull(),
  
  // Ability scores
  strength: int("strength").notNull(),
  dexterity: int("dexterity").notNull(),
  constitution: int("constitution").notNull(),
  intelligence: int("intelligence").notNull(),
  wisdom: int("wisdom").notNull(),
  charisma: int("charisma").notNull(),
  
  // Character details
  alignment: varchar("alignment", { length: 50 }),
  experiencePoints: int("experiencePoints").default(0).notNull(),
  
  // Personality and roleplay
  personality: text("personality"), // personality traits for AI
  backstory: text("backstory"),
  ideals: text("ideals"),
  bonds: text("bonds"),
  flaws: text("flaws"),
  
  // Game mechanics (stored as JSON for flexibility)
  skills: json("skills"), // skill proficiencies
  savingThrows: json("savingThrows"), // saving throw proficiencies
  equipment: json("equipment"), // list of equipment
  spells: json("spells"), // list of known spells (spell names/indices)
  cantrips: json("cantrips"), // list of known cantrips (spell names/indices)
  spellSlots: json("spellSlots"), // spell slots per level {1: 4, 2: 3, ...}
  features: json("features"), // class/race features
  abilityScoreImprovements: json("abilityScoreImprovements"), // track ASIs used per level
  subclass: varchar("subclass", { length: 100 }), // chosen subclass/archetype
  
  // HP and combat
  maxHitPoints: int("maxHitPoints").notNull(),
  currentHitPoints: int("currentHitPoints").notNull(),
  armorClass: int("armorClass").notNull(),
  
  // AI control flag
  isAiControlled: boolean("isAiControlled").default(false).notNull(),
  
  // Character portrait URL
  portraitUrl: text("portraitUrl"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

/**
 * Context entries - important game events, NPCs, locations, plot points
 */
export const contextEntries = mysqlTable("contextEntries", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  entryType: mysqlEnum("entryType", ["event", "npc", "location", "plot", "item", "other"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  tags: json("tags"), // for easier searching/filtering
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContextEntry = typeof contextEntries.$inferSelect;
export type InsertContextEntry = typeof contextEntries.$inferInsert;

/**
 * Session logs - timestamped campaign session entries
 */
export const sessionLogs = mysqlTable("sessionLogs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sessionNumber: int("sessionNumber").notNull(),
  entryType: mysqlEnum("entryType", ["narration", "character_action", "dm_note", "combat", "dialogue"]).notNull(),
  characterId: int("characterId"), // nullable - DM narration has no character
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SessionLog = typeof sessionLogs.$inferSelect;
export type InsertSessionLog = typeof sessionLogs.$inferInsert;

/**
 * AI conversations - tracks AI character responses and DM interactions
 */
export const aiConversations = mysqlTable("aiConversations", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  characterId: int("characterId"), // nullable for DM mode
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  contextUsed: json("contextUsed"), // IDs of context entries used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;

// ============================================================
// DM ENGINE TABLES
// These tables form the "source of truth" layer that the LLM
// reads from but never writes to directly. All mutations go
// through the mechanics engine.
// ============================================================

/**
 * Game State - tracks the current state of a campaign session
 * This is the "world clock" - what mode are we in, where are we, what time is it
 */
export const gameState = mysqlTable("gameState", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  /** Current mode: exploration, combat, social, rest */
  mode: mysqlEnum("mode", ["exploration", "combat", "social", "rest"]).default("exploration").notNull(),
  /** Current location reference (matches a location entry) */
  currentLocationId: int("currentLocationId"),
  /** In-game time tracking (e.g., "Day 3, Evening") */
  inGameTime: varchar("inGameTime", { length: 255 }).default("Day 1, Morning"),
  /** Environmental conditions (weather, lighting, etc.) */
  environmentalConditions: json("environmentalConditions"),
  /** Active global effects (e.g., "magical darkness in the dungeon") */
  activeEffects: json("activeEffects"),
  /** Session counter */
  sessionNumber: int("sessionNumber").default(1).notNull(),
  /** Turn counter within the current session */
  turnNumber: int("turnNumber").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameState = typeof gameState.$inferSelect;
export type InsertGameState = typeof gameState.$inferInsert;

/**
 * NPCs - non-player characters with goals that advance off-screen
 * The current_goal field is KEY: if players ignore an NPC, the system
 * can advance their plans between turns.
 */
export const npcs = mysqlTable("npcs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** NPC type for quick filtering */
  npcType: mysqlEnum("npcType", ["friendly", "neutral", "hostile", "merchant", "quest_giver", "boss"]).default("neutral").notNull(),
  /** Short description for context injection */
  description: text("description"),
  /** Current location (matches a location entry or free text) */
  locationId: int("locationId"),
  /** CRITICAL: What is this NPC currently trying to do? */
  currentGoal: text("currentGoal"),
  /** How far along are they in their goal? 0-100 */
  goalProgress: int("goalProgress").default(0),
  /** Disposition toward the party: -100 (hostile) to 100 (allied) */
  disposition: int("disposition").default(0),
  /** Combat stats (AC, HP, attacks) - JSON for flexibility */
  stats: json("stats"),
  /** Personality notes for the narrator */
  personalityNotes: text("personalityNotes"),
  /** Is this NPC currently alive and active? */
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Npc = typeof npcs.$inferSelect;
export type InsertNpc = typeof npcs.$inferInsert;

/**
 * Locations - places in the world with hidden objects and DCs
 * Hidden objects are checked against passive perception BEFORE
 * the room description is generated, so the narrator knows what to reveal.
 */
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** What the party sees on first entering (base description) */
  baseDescription: text("baseDescription"),
  /** Connected location IDs for navigation */
  connectedLocationIds: json("connectedLocationIds"),
  /** Hidden objects with DCs: [{name, dc, type, description, discovered}] */
  hiddenObjects: json("hiddenObjects"),
  /** Environmental hazards or effects */
  hazards: json("hazards"),
  /** Is this location currently accessible? */
  isAccessible: boolean("isAccessible").default(true).notNull(),
  /** Has the party visited this location? */
  isVisited: boolean("isVisited").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Encounter State - active combat tracking
 * This is the source of truth for initiative order, HP, conditions.
 * The initiative tracker UI reads from this, not from LLM output.
 */
export const encounterState = mysqlTable("encounterState", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  /** Is this encounter currently active? */
  isActive: boolean("isActive").default(true).notNull(),
  /** Current round number */
  currentRound: int("currentRound").default(1).notNull(),
  /** Index into initiative order for whose turn it is */
  currentTurnIndex: int("currentTurnIndex").default(0).notNull(),
  /** Initiative order: [{id, name, initiative, type: 'pc'|'npc', hp, maxHp, ac, conditions}] */
  initiativeOrder: json("initiativeOrder"),
  /** Location where the encounter is happening */
  locationId: int("locationId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EncounterState = typeof encounterState.$inferSelect;
export type InsertEncounterState = typeof encounterState.$inferInsert;

/**
 * Mechanics Log - every dice roll, check, and state change is logged here.
 * This provides an audit trail and feeds the narrator with exact results.
 * The UI can show these as structured data alongside narrative prose.
 */
export const mechanicsLog = mysqlTable("mechanicsLog", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  /** Turn number this happened on */
  turnNumber: int("turnNumber").notNull(),
  /** What type of mechanical event */
  eventType: mysqlEnum("eventType", [
    "skill_check", "attack_roll", "saving_throw", "damage",
    "healing", "spell_cast", "item_use", "hp_change",
    "condition_change", "initiative_roll", "death_save",
    "passive_check", "npc_goal_advance", "state_change"
  ]).notNull(),
  /** Who initiated this (character ID or NPC name) */
  actorId: varchar("actorId", { length: 255 }),
  /** Target of the action (if any) */
  targetId: varchar("targetId", { length: 255 }),
  /** Full mechanical details as JSON */
  details: json("details"),
  /** Human-readable summary (e.g., "Rolled 18 + 5 = 23 vs DC 15: SUCCESS") */
  summary: text("summary"),
  /** Was this visible to players or hidden (e.g., passive checks)? */
  isHidden: boolean("isHidden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MechanicsLog = typeof mechanicsLog.$inferSelect;
export type InsertMechanicsLog = typeof mechanicsLog.$inferInsert;

// ============================================================
// VECTOR MEMORY TABLES
// Stores embeddings for RAG-based long-term DM memory.
// AI-NOTE: Text content is embedded via OpenAI text-embedding-3-small
// and stored as JSON arrays. Cosine similarity is computed in the
// application layer for semantic search.
// ============================================================

/**
 * Memory Embeddings - stores vector representations of game content
 * for semantic search / RAG. Each row is one "memory" that the AI DM
 * can retrieve when relevant to the current conversation.
 *
 * AI-NOTE: The embedding column stores a JSON array of floats (1536 dims
 * for text-embedding-3-small). Cosine similarity is computed in JS,
 * not in SQL, because MySQL doesn't have native vector ops.
 */
export const memoryEmbeddings = mysqlTable("memoryEmbeddings", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  /** What type of content this memory represents */
  memoryType: mysqlEnum("memoryType", [
    "session_narration",   // DM narration from a session
    "player_action",       // Something a player did
    "npc_interaction",     // Dialogue or interaction with an NPC
    "combat_event",        // A notable combat moment
    "location_discovery",  // Discovering a new place
    "plot_point",          // Major story beat
    "item_event",          // Finding/using an important item
    "lore",                // World lore or backstory
    "context_entry",       // User-created context entry
    "character_moment",    // Character development moment
  ]).notNull(),
  /** The original text content that was embedded */
  content: text("content").notNull(),
  /** Short summary for display in the UI */
  summary: varchar("summary", { length: 500 }),
  /** The embedding vector as a JSON array of floats */
  embedding: json("embedding").notNull(),
  /** Reference to the source record (session log ID, context entry ID, etc.) */
  sourceId: int("sourceId"),
  /** Source table name for traceability */
  sourceTable: varchar("sourceTable", { length: 100 }),
  /** Which session/turn this memory is from */
  sessionNumber: int("sessionNumber"),
  turnNumber: int("turnNumber"),
  /** Relevance score boost (manual override for important memories) */
  importanceBoost: int("importanceBoost").default(0),
  /** Tags for filtering (e.g., NPC names, location names) */
  tags: json("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemoryEmbedding = typeof memoryEmbeddings.$inferSelect;
export type InsertMemoryEmbedding = typeof memoryEmbeddings.$inferInsert;
