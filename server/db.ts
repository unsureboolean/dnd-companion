import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  campaigns, 
  Campaign,
  InsertCampaign,
  characters,
  Character,
  InsertCharacter,
  contextEntries,
  ContextEntry,
  InsertContextEntry,
  sessionLogs,
  SessionLog,
  InsertSessionLog,
  aiConversations,
  AiConversation,
  InsertAiConversation,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User functions ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Campaign functions ============

export async function createCampaign(campaign: InsertCampaign): Promise<Campaign> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaigns).values(campaign);
  const insertedId = Number(result[0].insertId);
  
  const [inserted] = await db.select().from(campaigns).where(eq(campaigns.id, insertedId));
  if (!inserted) throw new Error("Failed to retrieve inserted campaign");
  
  return inserted;
}

export async function getUserCampaigns(userId: number): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.updatedAt));
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(campaigns).set(updates).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(campaigns).where(eq(campaigns.id, id));
}

// ============ Character functions ============

export async function createCharacter(character: InsertCharacter): Promise<Character> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(characters).values(character);
  const insertedId = Number(result[0].insertId);
  
  const [inserted] = await db.select().from(characters).where(eq(characters.id, insertedId));
  if (!inserted) throw new Error("Failed to retrieve inserted character");
  
  return inserted;
}

export async function getUserCharacters(userId: number): Promise<Character[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(characters).where(eq(characters.userId, userId)).orderBy(desc(characters.updatedAt));
}

export async function getCampaignCharacters(campaignId: number): Promise<Character[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(characters).where(eq(characters.campaignId, campaignId));
}

export async function getCharacterById(id: number): Promise<Character | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return result[0];
}

export async function updateCharacter(id: number, updates: Partial<InsertCharacter>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(characters).set(updates).where(eq(characters.id, id));
}

export async function deleteCharacter(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(characters).where(eq(characters.id, id));
}

// ============ Context Entry functions ============

export async function createContextEntry(entry: InsertContextEntry): Promise<ContextEntry> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(contextEntries).values(entry);
  const insertedId = Number(result[0].insertId);
  
  const [inserted] = await db.select().from(contextEntries).where(eq(contextEntries.id, insertedId));
  if (!inserted) throw new Error("Failed to retrieve inserted context entry");
  
  return inserted;
}

export async function getCampaignContext(campaignId: number): Promise<ContextEntry[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(contextEntries).where(eq(contextEntries.campaignId, campaignId)).orderBy(desc(contextEntries.createdAt));
}

export async function updateContextEntry(id: number, updates: Partial<InsertContextEntry>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contextEntries).set(updates).where(eq(contextEntries.id, id));
}

export async function deleteContextEntry(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(contextEntries).where(eq(contextEntries.id, id));
}

// ============ Session Log functions ============

export async function createSessionLog(log: InsertSessionLog): Promise<SessionLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(sessionLogs).values(log);
  const insertedId = Number(result[0].insertId);
  
  const [inserted] = await db.select().from(sessionLogs).where(eq(sessionLogs.id, insertedId));
  if (!inserted) throw new Error("Failed to retrieve inserted session log");
  
  return inserted;
}

export async function getCampaignSessionLogs(campaignId: number, sessionNumber?: number): Promise<SessionLog[]> {
  const db = await getDb();
  if (!db) return [];

  if (sessionNumber !== undefined) {
    return db.select().from(sessionLogs)
      .where(and(eq(sessionLogs.campaignId, campaignId), eq(sessionLogs.sessionNumber, sessionNumber)))
      .orderBy(sessionLogs.timestamp);
  }

  return db.select().from(sessionLogs).where(eq(sessionLogs.campaignId, campaignId)).orderBy(sessionLogs.timestamp);
}

export async function deleteSessionLog(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(sessionLogs).where(eq(sessionLogs.id, id));
}

// ============ AI Conversation functions ============

export async function createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiConversations).values(conversation);
  const insertedId = Number(result[0].insertId);
  
  const [inserted] = await db.select().from(aiConversations).where(eq(aiConversations.id, insertedId));
  if (!inserted) throw new Error("Failed to retrieve inserted conversation");
  
  return inserted;
}

export async function getCampaignConversations(campaignId: number, characterId?: number): Promise<AiConversation[]> {
  const db = await getDb();
  if (!db) return [];

  if (characterId !== undefined) {
    return db.select().from(aiConversations)
      .where(and(eq(aiConversations.campaignId, campaignId), eq(aiConversations.characterId, characterId)))
      .orderBy(aiConversations.createdAt);
  }

  return db.select().from(aiConversations).where(eq(aiConversations.campaignId, campaignId)).orderBy(aiConversations.createdAt);
}

export async function deleteAiConversation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(aiConversations).where(eq(aiConversations.id, id));
}
