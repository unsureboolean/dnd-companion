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
  userId: int("userId").notNull(), // owner of the campaign
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
  spells: json("spells"), // list of known spells
  features: json("features"), // class/race features
  
  // HP and combat
  maxHitPoints: int("maxHitPoints").notNull(),
  currentHitPoints: int("currentHitPoints").notNull(),
  armorClass: int("armorClass").notNull(),
  
  // AI control flag
  isAiControlled: boolean("isAiControlled").default(false).notNull(),
  
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
