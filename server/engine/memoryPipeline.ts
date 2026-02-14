/**
 * MEMORY PIPELINE
 * ===============
 * Automatically embeds game content into the vector memory store.
 * This module is called after each DM loop turn to persist
 * important events as searchable memories.
 *
 * AI-NOTE: The pipeline decides WHAT to embed based on the turn's
 * results. Not everything gets embedded - we filter for meaningful
 * content to keep the memory store focused and costs low.
 *
 * EMBEDDING STRATEGY:
 * - DM narration: Always embed (it's the core narrative)
 * - Player actions: Embed if they have consequences
 * - Combat events: Embed notable moments (crits, kills, near-deaths)
 * - NPC interactions: Always embed (important for continuity)
 * - Location discoveries: Always embed
 * - Plot points: Always embed with high importance boost
 */

import { embedAndStore } from "./embeddingService";
import type { MechanicsResult } from "./mechanics";

// ============================================================
// AUTO-EMBEDDING AFTER DM TURNS
// ============================================================

/**
 * Process a completed DM turn and embed relevant content.
 * Called at the end of each DM loop iteration.
 *
 * AI-NOTE: This is the main entry point. It analyzes the turn's
 * narration and mechanics results to decide what to embed.
 */
export async function embedTurnResults(params: {
  campaignId: number;
  turnNumber: number;
  sessionNumber: number;
  playerInput: string;
  narration: string;
  mechanicsResults: MechanicsResult[];
}): Promise<number> {
  const { campaignId, turnNumber, sessionNumber, playerInput, narration, mechanicsResults } = params;
  let memoriesCreated = 0;

  // 1. Always embed the narration (core narrative memory)
  try {
    await embedAndStore({
      campaignId,
      memoryType: "session_narration",
      content: `[Turn ${turnNumber}] DM: ${narration}`,
      summary: narration.substring(0, 200),
      sessionNumber,
      turnNumber,
      tags: extractTags(narration),
    });
    memoriesCreated++;
  } catch (e) {
    console.error("[MemoryPipeline] Failed to embed narration:", e);
  }

  // 2. Embed the player action if it's meaningful
  if (playerInput.length > 10) {
    try {
      await embedAndStore({
        campaignId,
        memoryType: "player_action",
        content: `[Turn ${turnNumber}] Player: ${playerInput}`,
        summary: playerInput.substring(0, 200),
        sessionNumber,
        turnNumber,
        tags: extractTags(playerInput),
      });
      memoriesCreated++;
    } catch (e) {
      console.error("[MemoryPipeline] Failed to embed player action:", e);
    }
  }

  // 3. Embed notable mechanics events
  for (const result of mechanicsResults) {
    if (shouldEmbedMechanics(result)) {
      try {
        const memoryType = getMemoryTypeForMechanics(result);
        const importance = getImportanceForMechanics(result);

        await embedAndStore({
          campaignId,
          memoryType,
          content: `[Turn ${turnNumber}] ${result.summary}`,
          summary: result.summary,
          sessionNumber,
          turnNumber,
          importanceBoost: importance,
          tags: extractMechanicsTags(result),
        });
        memoriesCreated++;
      } catch (e) {
        console.error("[MemoryPipeline] Failed to embed mechanics:", e);
      }
    }
  }

  return memoriesCreated;
}

// ============================================================
// EMBED CONTEXT ENTRIES
// When users manually add context, embed it immediately.
// ============================================================

/**
 * Embed a user-created context entry.
 * Called when a new context entry is added to a campaign.
 */
export async function embedContextEntry(params: {
  campaignId: number;
  entryType: string;
  title: string;
  content: string;
  sourceId: number;
}): Promise<void> {
  try {
    await embedAndStore({
      campaignId: params.campaignId,
      memoryType: "context_entry",
      content: `[${params.entryType}] ${params.title}: ${params.content}`,
      summary: `${params.title}: ${params.content.substring(0, 150)}`,
      sourceId: params.sourceId,
      sourceTable: "contextEntries",
      importanceBoost: 2, // User-created context is always important
      tags: [params.entryType, params.title],
    });
  } catch (e) {
    console.error("[MemoryPipeline] Failed to embed context entry:", e);
  }
}

/**
 * Embed an NPC creation or update.
 */
export async function embedNpcEvent(params: {
  campaignId: number;
  npcName: string;
  description: string;
  currentGoal?: string;
  turnNumber?: number;
  sessionNumber?: number;
}): Promise<void> {
  try {
    let content = `NPC ${params.npcName}: ${params.description}`;
    if (params.currentGoal) {
      content += ` Current goal: ${params.currentGoal}`;
    }

    await embedAndStore({
      campaignId: params.campaignId,
      memoryType: "npc_interaction",
      content,
      summary: `NPC: ${params.npcName} - ${params.description.substring(0, 100)}`,
      turnNumber: params.turnNumber,
      sessionNumber: params.sessionNumber,
      importanceBoost: 1,
      tags: [params.npcName, "npc"],
    });
  } catch (e) {
    console.error("[MemoryPipeline] Failed to embed NPC event:", e);
  }
}

/**
 * Embed a location discovery.
 */
export async function embedLocationDiscovery(params: {
  campaignId: number;
  locationName: string;
  description: string;
  turnNumber?: number;
  sessionNumber?: number;
}): Promise<void> {
  try {
    await embedAndStore({
      campaignId: params.campaignId,
      memoryType: "location_discovery",
      content: `Location discovered: ${params.locationName}. ${params.description}`,
      summary: `Discovered: ${params.locationName}`,
      turnNumber: params.turnNumber,
      sessionNumber: params.sessionNumber,
      importanceBoost: 1,
      tags: [params.locationName, "location"],
    });
  } catch (e) {
    console.error("[MemoryPipeline] Failed to embed location discovery:", e);
  }
}

// ============================================================
// FILTERING HELPERS
// Decide what's worth embedding to keep memory focused.
// ============================================================

/**
 * Determine if a mechanics result is worth embedding.
 * AI-NOTE: We don't embed every dice roll - only notable ones.
 */
function shouldEmbedMechanics(result: MechanicsResult): boolean {
  // Always embed these types
  if (result.type === "npc_goal") return true;
  if (result.type === "passive_check" && result.success) return true;

  // Embed combat events that are notable
  if (result.type === "attack") {
    const details = result.details as Record<string, unknown>;
    // Critical hits, kills, or significant damage
    if (details.critical) return true;
    if (details.targetHpAfter === 0) return true;
  }

  // Embed skill checks that succeed or critically fail
  if (result.type === "skill_check" || result.type === "saving_throw") {
    const details = result.details as Record<string, unknown>;
    if (details.roll === 20 || details.roll === 1) return true;
    // Embed all checks (they provide context)
    return true;
  }

  // Embed spell casting
  if (result.type === "spell_cast") return true;

  // Embed combat start/end
  if (result.type === "combat_start" || result.type === "combat_end") return true;

  // Embed location moves
  if (result.type === "location_move") return true;

  return false;
}

/**
 * Map a mechanics result to a memory type.
 */
function getMemoryTypeForMechanics(result: MechanicsResult): "combat_event" | "npc_interaction" | "location_discovery" | "plot_point" | "item_event" | "character_moment" {
  switch (result.type) {
    case "attack":
    case "combat_start":
    case "combat_end":
      return "combat_event";
    case "npc_goal":
      return "npc_interaction";
    case "location_move":
    case "passive_check":
      return "location_discovery";
    case "spell_cast":
      return "character_moment";
    default:
      return "character_moment";
  }
}

/**
 * Determine importance boost for a mechanics result.
 * Higher values make the memory more likely to surface in searches.
 */
function getImportanceForMechanics(result: MechanicsResult): number {
  const details = result.details as Record<string, unknown>;

  // Critical hits and kills are very memorable
  if (details.critical) return 3;
  if (details.targetHpAfter === 0) return 2;

  // Natural 20s and 1s are memorable
  if (details.roll === 20) return 2;
  if (details.roll === 1) return 1;

  // Combat start/end
  if (result.type === "combat_start" || result.type === "combat_end") return 1;

  return 0;
}

// ============================================================
// TAG EXTRACTION
// Extract searchable tags from text content.
// AI-NOTE: Tags help with filtering and improve search relevance.
// ============================================================

/**
 * Extract potential tags from narrative text.
 * Looks for capitalized proper nouns as likely NPC/location names.
 */
function extractTags(text: string): string[] {
  const tags: string[] = [];

  // Find capitalized words that might be proper nouns (2+ chars)
  const properNouns = text.match(/\b[A-Z][a-z]{2,}\b/g);
  if (properNouns) {
    // Deduplicate and take top 5
    const unique = Array.from(new Set(properNouns));
    tags.push(...unique.slice(0, 5));
  }

  return tags;
}

/**
 * Extract tags from mechanics results.
 */
function extractMechanicsTags(result: MechanicsResult): string[] {
  const tags: string[] = [result.type];
  const details = result.details as Record<string, unknown>;

  if (details.characterName) tags.push(details.characterName as string);
  if (details.attackerName) tags.push(details.attackerName as string);
  if (details.targetName) tags.push(details.targetName as string);
  if (details.skill) tags.push(details.skill as string);
  if (details.spellName) tags.push(details.spellName as string);
  if (details.npcName) tags.push(details.npcName as string);
  if (details.locationName) tags.push(details.locationName as string);

  return tags.filter(Boolean);
}
