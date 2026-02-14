/**
 * EMBEDDING SERVICE
 * =================
 * Handles text embedding via OpenAI and cosine similarity search
 * for RAG-based long-term DM memory.
 *
 * AI-NOTE: This module is the bridge between game content and vector memory.
 * It embeds text using OpenAI text-embedding-3-small (1536 dims),
 * stores vectors in MySQL as JSON arrays, and performs cosine similarity
 * search in the application layer.
 *
 * ARCHITECTURE:
 * 1. Content is created (session log, context entry, narration, etc.)
 * 2. embedAndStore() converts it to a vector and saves to memoryEmbeddings
 * 3. When the DM needs context, searchMemories() finds relevant memories
 * 4. Top-K results are injected into the LLM context window
 */

import axios from "axios";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  memoryEmbeddings,
  type MemoryEmbedding,
  type InsertMemoryEmbedding,
} from "../../drizzle/schema";

// ============================================================
// CONFIGURATION
// AI-NOTE: Adjust these constants to tune memory behavior.
// ============================================================

/** OpenAI embedding model - 1536 dimensions, good balance of quality/cost */
const EMBEDDING_MODEL = "text-embedding-3-small";

/** Maximum number of memories to return from a search */
const DEFAULT_TOP_K = 8;

/** Minimum similarity score to include a memory (0-1 scale) */
const DEFAULT_SIMILARITY_THRESHOLD = 0.3;

/** Maximum text length to embed (longer texts are truncated) */
const MAX_EMBED_LENGTH = 8000;

// ============================================================
// EMBEDDING GENERATION
// ============================================================

/**
 * Generate an embedding vector for a text string using OpenAI.
 * Returns a float array of 1536 dimensions.
 *
 * AI-NOTE: This costs ~$0.02 per 1M tokens. A typical session
 * generates maybe 50-100 embeddings, so cost is negligible.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set - cannot generate embeddings");
  }

  // Truncate if too long
  const truncated = text.length > MAX_EMBED_LENGTH
    ? text.substring(0, MAX_EMBED_LENGTH)
    : text;

  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: EMBEDDING_MODEL,
      input: truncated,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call (batch).
 * More efficient than calling generateEmbedding() in a loop.
 *
 * AI-NOTE: OpenAI supports batch embedding - use this for bulk operations
 * like embedding all existing context entries when initializing a campaign.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set - cannot generate embeddings");
  }

  const truncated = texts.map((t) =>
    t.length > MAX_EMBED_LENGTH ? t.substring(0, MAX_EMBED_LENGTH) : t
  );

  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: EMBEDDING_MODEL,
      input: truncated,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  // Sort by index to maintain order
  const sorted = response.data.data.sort(
    (a: { index: number }, b: { index: number }) => a.index - b.index
  );
  return sorted.map((d: { embedding: number[] }) => d.embedding);
}

// ============================================================
// COSINE SIMILARITY
// AI-NOTE: Computed in JS since MySQL doesn't have native vector ops.
// For a typical campaign (<5000 memories), this is fast enough.
// If scale becomes an issue, migrate to Pinecone or pgvector.
// ============================================================

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ============================================================
// MEMORY STORAGE
// ============================================================

/**
 * Embed text content and store it as a memory in the database.
 * This is the primary way to add memories to the vector store.
 *
 * AI-NOTE: Call this whenever new content is created that the DM
 * should be able to recall later. The memory type helps with
 * filtering and display in the UI.
 */
export async function embedAndStore(params: {
  campaignId: number;
  memoryType: InsertMemoryEmbedding["memoryType"];
  content: string;
  summary?: string;
  sourceId?: number;
  sourceTable?: string;
  sessionNumber?: number;
  turnNumber?: number;
  importanceBoost?: number;
  tags?: string[];
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate embedding vector
  const embedding = await generateEmbedding(params.content);

  // Auto-generate summary if not provided (first 200 chars)
  const summary = params.summary || params.content.substring(0, 200);

  // Store in database
  const result = await db.insert(memoryEmbeddings).values({
    campaignId: params.campaignId,
    memoryType: params.memoryType,
    content: params.content,
    summary,
    embedding,
    sourceId: params.sourceId || null,
    sourceTable: params.sourceTable || null,
    sessionNumber: params.sessionNumber || null,
    turnNumber: params.turnNumber || null,
    importanceBoost: params.importanceBoost || 0,
    tags: params.tags || null,
  });

  return result[0].insertId;
}

/**
 * Batch embed and store multiple memories at once.
 * Used for initializing a campaign's memory from existing content.
 *
 * AI-NOTE: Call this when a user first enables the DM engine on
 * a campaign that already has context entries and session logs.
 */
export async function batchEmbedAndStore(
  items: Array<{
    campaignId: number;
    memoryType: InsertMemoryEmbedding["memoryType"];
    content: string;
    summary?: string;
    sourceId?: number;
    sourceTable?: string;
    sessionNumber?: number;
    turnNumber?: number;
    tags?: string[];
  }>
): Promise<number> {
  if (items.length === 0) return 0;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate all embeddings in batch
  const texts = items.map((i) => i.content);
  const embeddings = await generateEmbeddingsBatch(texts);

  // Build insert values
  const values: InsertMemoryEmbedding[] = items.map((item, idx) => ({
    campaignId: item.campaignId,
    memoryType: item.memoryType,
    content: item.content,
    summary: item.summary || item.content.substring(0, 200),
    embedding: embeddings[idx],
    sourceId: item.sourceId || null,
    sourceTable: item.sourceTable || null,
    sessionNumber: item.sessionNumber || null,
    turnNumber: item.turnNumber || null,
    importanceBoost: 0,
    tags: item.tags || null,
  }));

  // Insert in chunks of 50 to avoid query size limits
  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await db.insert(memoryEmbeddings).values(chunk);
    inserted += chunk.length;
  }

  return inserted;
}

// ============================================================
// SEMANTIC SEARCH
// AI-NOTE: This is the core RAG retrieval function.
// It embeds the query, loads all campaign memories, computes
// similarity, and returns the top-K most relevant results.
// ============================================================

export interface MemorySearchResult {
  memory: MemoryEmbedding;
  similarity: number;
}

/**
 * Search campaign memories by semantic similarity to a query.
 * Returns the top-K most relevant memories above the threshold.
 *
 * AI-NOTE: This is called in the DM loop before narration to
 * inject relevant long-term context into the LLM prompt.
 *
 * @param campaignId - Campaign to search within
 * @param query - The text to find similar memories for
 * @param topK - Maximum number of results (default: 8)
 * @param threshold - Minimum similarity score (default: 0.3)
 * @param memoryTypes - Optional filter by memory type
 */
export async function searchMemories(
  campaignId: number,
  query: string,
  topK: number = DEFAULT_TOP_K,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  memoryTypes?: string[]
): Promise<MemorySearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  // Step 1: Embed the query
  const queryEmbedding = await generateEmbedding(query);

  // Step 2: Load all memories for this campaign
  // AI-NOTE: For campaigns with <5000 memories, loading all into memory
  // and computing similarity in JS is fast enough (<100ms).
  // If this becomes a bottleneck, add pagination or migrate to a vector DB.
  const allMemories = await db
    .select()
    .from(memoryEmbeddings)
    .where(eq(memoryEmbeddings.campaignId, campaignId));

  // Step 3: Compute similarity for each memory
  const scored: MemorySearchResult[] = allMemories
    .filter((m) => {
      // Optional type filter
      if (memoryTypes && memoryTypes.length > 0) {
        return memoryTypes.includes(m.memoryType);
      }
      return true;
    })
    .map((m) => {
      const embedding = m.embedding as number[];
      const baseSimilarity = cosineSimilarity(queryEmbedding, embedding);
      // Apply importance boost (each point adds 0.02 to similarity)
      const boostedSimilarity = baseSimilarity + (m.importanceBoost || 0) * 0.02;
      return {
        memory: m,
        similarity: Math.min(boostedSimilarity, 1.0), // Cap at 1.0
      };
    })
    .filter((r) => r.similarity >= threshold);

  // Step 4: Sort by similarity (descending) and return top-K
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

/**
 * Format search results into a context string for the LLM.
 * This is what gets injected into the system prompt.
 *
 * AI-NOTE: The format is designed to be clear and structured
 * so the LLM can easily reference specific memories.
 */
export function formatMemoriesForContext(results: MemorySearchResult[]): string {
  if (results.length === 0) return "";

  let context = "\nRELEVANT MEMORIES (from past sessions and events):\n";
  context += "Use these to maintain consistency and recall past events accurately.\n\n";

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const typeLabel = r.memory.memoryType.replace(/_/g, " ");
    const sessionInfo = r.memory.sessionNumber
      ? ` (Session ${r.memory.sessionNumber})`
      : "";
    const relevance = Math.round(r.similarity * 100);

    context += `[Memory ${i + 1} - ${typeLabel}${sessionInfo} - ${relevance}% relevant]\n`;
    context += `${r.memory.content}\n\n`;
  }

  return context;
}

// ============================================================
// MEMORY MANAGEMENT
// ============================================================

/**
 * Get all memories for a campaign (for the UI memory browser).
 */
export async function getCampaignMemories(
  campaignId: number
): Promise<MemoryEmbedding[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(memoryEmbeddings)
    .where(eq(memoryEmbeddings.campaignId, campaignId));
}

/**
 * Delete a specific memory.
 */
export async function deleteMemory(memoryId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(memoryEmbeddings)
    .where(eq(memoryEmbeddings.id, memoryId));
}

/**
 * Update the importance boost for a memory.
 */
export async function updateMemoryImportance(
  memoryId: number,
  importanceBoost: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(memoryEmbeddings)
    .set({ importanceBoost })
    .where(eq(memoryEmbeddings.id, memoryId));
}

/**
 * Get the count of memories for a campaign.
 */
export async function getMemoryCount(campaignId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select()
    .from(memoryEmbeddings)
    .where(eq(memoryEmbeddings.campaignId, campaignId));

  return rows.length;
}
