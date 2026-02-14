/**
 * DM LOGIC LOOP
 * =============
 * The core game loop that processes player input through:
 * 1. Intent Classification (LLM with function calling)
 * 2. Pre-Narration Checks (passive perception, NPC goals)
 * 3. Mechanics Execution (dice rolls, state changes)
 * 4. State Update (persist to DB)
 * 5. Narration (LLM generates prose from mechanical results)
 *
 * AI-NOTE: The LLM uses OpenAI function calling to REQUEST mechanical
 * actions. It never performs them directly. The code executes the
 * mechanics and feeds results back to the LLM for narration.
 */

import { invokeOpenAI } from "../openai";
import * as mechanics from "./mechanics";
import * as state from "./stateManager";
import * as memory from "./embeddingService";
import * as memoryPipeline from "./memoryPipeline";
import type { CharacterState, MechanicsResult, HiddenObject } from "./mechanics";
import type { GameSnapshot } from "./stateManager";
import type { Npc } from "../../drizzle/schema";

// ============================================================
// FUNCTION CALLING TOOL DEFINITIONS
// These are the tools the LLM can call to request mechanics.
// AI-NOTE: Add new tools here when extending the mechanics engine.
// ============================================================

const DM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "roll_skill_check",
      description: "Roll a skill check for a character against a difficulty class (DC). Use this when a character attempts something that requires a skill.",
      parameters: {
        type: "object",
        properties: {
          characterId: { type: "number", description: "The character's database ID" },
          skill: {
            type: "string",
            enum: [
              "acrobatics", "animalHandling", "arcana", "athletics", "deception",
              "history", "insight", "intimidation", "investigation", "medicine",
              "nature", "perception", "performance", "persuasion", "religion",
              "sleightOfHand", "stealth", "survival",
            ],
            description: "The skill to check",
          },
          dc: { type: "number", description: "The difficulty class (DC) to beat" },
          advantage: { type: "boolean", description: "Whether the character has advantage" },
          disadvantage: { type: "boolean", description: "Whether the character has disadvantage" },
        },
        required: ["characterId", "skill", "dc"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "roll_saving_throw",
      description: "Roll a saving throw for a character against a DC. Use when a character needs to resist an effect.",
      parameters: {
        type: "object",
        properties: {
          characterId: { type: "number", description: "The character's database ID" },
          ability: {
            type: "string",
            enum: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
            description: "The ability for the saving throw",
          },
          dc: { type: "number", description: "The difficulty class to beat" },
          advantage: { type: "boolean" },
          disadvantage: { type: "boolean" },
        },
        required: ["characterId", "ability", "dc"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "roll_attack",
      description: "Roll an attack against a target. Handles attack roll and damage if hit. Use for melee, ranged, or spell attacks.",
      parameters: {
        type: "object",
        properties: {
          attackerName: { type: "string", description: "Name of the attacker" },
          attackBonus: { type: "number", description: "The attack bonus modifier" },
          targetName: { type: "string", description: "Name of the target" },
          targetAc: { type: "number", description: "The target's armor class" },
          damageDice: { type: "string", description: "Damage dice notation, e.g., '1d8+3'" },
          damageType: { type: "string", description: "Type of damage (slashing, piercing, fire, etc.)" },
          weapon: { type: "string", description: "Name of the weapon or spell used" },
          advantage: { type: "boolean" },
          disadvantage: { type: "boolean" },
        },
        required: ["attackerName", "attackBonus", "targetName", "targetAc", "damageDice", "weapon"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cast_spell",
      description: "Cast a spell, consuming a spell slot. Validates that the character has available slots. Cantrips (level 0) don't consume slots.",
      parameters: {
        type: "object",
        properties: {
          characterId: { type: "number", description: "The caster's character ID" },
          spellName: { type: "string", description: "Name of the spell" },
          spellLevel: { type: "number", description: "Level of the spell (0 for cantrips)" },
        },
        required: ["characterId", "spellName", "spellLevel"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_hp",
      description: "Apply healing or damage to a character. Use positive numbers for healing, negative for damage.",
      parameters: {
        type: "object",
        properties: {
          characterId: { type: "number", description: "The character's database ID" },
          amount: { type: "number", description: "HP change: positive for healing, negative for damage" },
          reason: { type: "string", description: "Why the HP is changing" },
        },
        required: ["characterId", "amount", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "start_combat",
      description: "Initiate combat encounter. Rolls initiative for all participants and enters combat mode.",
      parameters: {
        type: "object",
        properties: {
          enemyNames: {
            type: "array",
            items: { type: "string" },
            description: "Names of enemy combatants",
          },
          enemyStats: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                ac: { type: "number" },
                maxHp: { type: "number" },
                attackBonus: { type: "number" },
                damageDice: { type: "string" },
              },
            },
            description: "Stats for each enemy",
          },
        },
        required: ["enemyNames", "enemyStats"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "end_combat",
      description: "End the current combat encounter and return to exploration mode.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why combat ended (victory, retreat, surrender, etc.)" },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "move_to_location",
      description: "Move the party to a different location. Updates game state and triggers passive checks.",
      parameters: {
        type: "object",
        properties: {
          locationId: { type: "number", description: "ID of the destination location" },
          locationName: { type: "string", description: "Name of the destination (for creating new locations)" },
          locationDescription: { type: "string", description: "Description of the location if it's new" },
          hiddenObjects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                dc: { type: "number" },
                type: { type: "string", enum: ["trap", "secret_door", "hidden_item", "clue", "other"] },
                description: { type: "string" },
              },
            },
            description: "Hidden objects in the new location with their DCs",
          },
        },
        required: ["locationName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_npc",
      description: "Create a new NPC in the current location with a goal and personality.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "NPC name" },
          npcType: { type: "string", enum: ["friendly", "neutral", "hostile", "merchant", "quest_giver", "boss"] },
          description: { type: "string", description: "Short description" },
          currentGoal: { type: "string", description: "What is this NPC currently trying to accomplish?" },
          disposition: { type: "number", description: "Attitude toward party: -100 (hostile) to 100 (allied)" },
          personalityNotes: { type: "string", description: "How this NPC speaks and behaves" },
          stats: {
            type: "object",
            properties: {
              ac: { type: "number" },
              maxHp: { type: "number" },
              attackBonus: { type: "number" },
              damageDice: { type: "string" },
              speed: { type: "number" },
            },
            description: "Combat stats (optional, for hostile NPCs)",
          },
        },
        required: ["name", "npcType", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "advance_time",
      description: "Advance the in-game time. Use for rests, travel, or passage of time.",
      parameters: {
        type: "object",
        properties: {
          newTime: { type: "string", description: "New time description, e.g., 'Day 2, Evening'" },
          mode: { type: "string", enum: ["exploration", "combat", "social", "rest"], description: "New game mode" },
        },
        required: ["newTime"],
      },
    },
  },
];

// ============================================================
// TOOL EXECUTION
// Processes function calls from the LLM and returns results.
// AI-NOTE: Each tool call is validated, executed, logged, and
// the result is returned for the LLM to narrate.
// ============================================================

/**
 * Execute a single tool call from the LLM.
 * Returns a MechanicsResult that gets fed back to the narrator.
 */
async function executeTool(
  campaignId: number,
  turnNumber: number,
  toolName: string,
  args: Record<string, unknown>,
  characterMap: Map<number, CharacterState>
): Promise<MechanicsResult> {
  switch (toolName) {
    case "roll_skill_check": {
      const charState = characterMap.get(args.characterId as number);
      if (!charState) {
        return {
          type: "error",
          success: false,
          summary: `Character ${args.characterId} not found`,
          details: { error: "character_not_found" },
          isHidden: false,
        };
      }
      const result = mechanics.resolveSkillCheck(
        charState,
        args.skill as any,
        args.dc as number,
        { advantage: args.advantage as boolean, disadvantage: args.disadvantage as boolean }
      );
      await state.logMechanicsEvent(campaignId, turnNumber, result, `pc_${charState.id}`, undefined);
      return result;
    }

    case "roll_saving_throw": {
      const charState = characterMap.get(args.characterId as number);
      if (!charState) {
        return {
          type: "error",
          success: false,
          summary: `Character ${args.characterId} not found`,
          details: { error: "character_not_found" },
          isHidden: false,
        };
      }
      const result = mechanics.resolveSavingThrow(
        charState,
        args.ability as any,
        args.dc as number,
        { advantage: args.advantage as boolean, disadvantage: args.disadvantage as boolean }
      );
      await state.logMechanicsEvent(campaignId, turnNumber, result, `pc_${charState.id}`, undefined);
      return result;
    }

    case "roll_attack": {
      const result = mechanics.resolveAttack(
        args.attackerName as string,
        args.attackBonus as number,
        args.targetName as string,
        args.targetAc as number,
        args.damageDice as string,
        (args.damageType as string) || "slashing",
        args.weapon as string,
        { advantage: args.advantage as boolean, disadvantage: args.disadvantage as boolean }
      );
      await state.logMechanicsEvent(
        campaignId, turnNumber, result,
        args.attackerName as string,
        args.targetName as string
      );
      return result;
    }

    case "cast_spell": {
      const charState = characterMap.get(args.characterId as number);
      if (!charState) {
        return {
          type: "error",
          success: false,
          summary: `Character ${args.characterId} not found`,
          details: { error: "character_not_found" },
          isHidden: false,
        };
      }
      const result = mechanics.castSpell(charState, args.spellName as string, args.spellLevel as number);
      if (result.success && !result.details.isCantrip) {
        // Persist spell slot consumption to DB
        await state.updateCharacterSpellSlots(charState.id, result.details.remainingSlots);
      }
      await state.logMechanicsEvent(campaignId, turnNumber, result, `pc_${charState.id}`, undefined);
      return result;
    }

    case "update_hp": {
      const charState = characterMap.get(args.characterId as number);
      if (!charState) {
        return {
          type: "error",
          success: false,
          summary: `Character ${args.characterId} not found`,
          details: { error: "character_not_found" },
          isHidden: false,
        };
      }
      const result = mechanics.applyHpChange(charState, args.amount as number);
      // Persist HP change to DB
      await state.updateCharacterHp(charState.id, result.details.newHp);
      // Update local state so subsequent tool calls see the new HP
      charState.currentHitPoints = result.details.newHp;
      await state.logMechanicsEvent(campaignId, turnNumber, result, `pc_${charState.id}`, undefined);
      return result;
    }

    case "start_combat": {
      const partyChars = Array.from(characterMap.values());
      const enemyStats = (args.enemyStats as any[]) || [];
      const npcCombatants = enemyStats.map((e: any, i: number) => ({
        id: `npc_enemy_${i}`,
        name: e.name || (args.enemyNames as string[])?.[i] || `Enemy ${i + 1}`,
        stats: {
          ac: e.ac || 12,
          maxHp: e.maxHp || 10,
          currentHp: e.maxHp || 10,
          attackBonus: e.attackBonus || 3,
          damageDice: e.damageDice || "1d6+1",
          speed: 30,
        },
      }));

      const initiativeOrder = mechanics.rollInitiative(partyChars, npcCombatants);
      const gameStateData = await state.getOrCreateGameState(campaignId);
      await state.createEncounter(campaignId, initiativeOrder, gameStateData.currentLocationId || undefined);
      await state.updateGameState(campaignId, { mode: "combat" });

      const result: MechanicsResult = {
        type: "initiative_roll",
        success: true,
        summary: `Combat started! Initiative order: ${initiativeOrder.map((e) => `${e.name} (${e.initiative})`).join(", ")}`,
        details: { initiativeOrder },
        isHidden: false,
      };
      await state.logMechanicsEvent(campaignId, turnNumber, result);
      return result;
    }

    case "end_combat": {
      const encounter = await state.getActiveEncounter(campaignId);
      if (encounter) {
        await state.updateEncounter(encounter.id, { isActive: false });
      }
      await state.updateGameState(campaignId, { mode: "exploration" });

      const result: MechanicsResult = {
        type: "state_change",
        success: true,
        summary: `Combat ended: ${args.reason}. Returning to exploration mode.`,
        details: { reason: args.reason, newMode: "exploration" },
        isHidden: false,
      };
      await state.logMechanicsEvent(campaignId, turnNumber, result);
      return result;
    }

    case "move_to_location": {
      let locationId = args.locationId as number | undefined;

      // Create new location if no ID provided
      if (!locationId) {
        const hiddenObjs = (args.hiddenObjects as any[])?.map((o: any) => ({
          name: o.name,
          dc: o.dc,
          type: o.type || "other",
          description: o.description || "",
          discovered: false,
        })) || [];

        locationId = await state.createLocation({
          campaignId,
          name: args.locationName as string,
          description: args.locationDescription as string,
          baseDescription: args.locationDescription as string,
          hiddenObjects: hiddenObjs,
        });
      }

      await state.updateGameState(campaignId, { currentLocationId: locationId });
      await state.markLocationVisited(locationId);

      const result: MechanicsResult = {
        type: "state_change",
        success: true,
        summary: `Party moved to: ${args.locationName}`,
        details: { locationId, locationName: args.locationName },
        isHidden: false,
      };
      await state.logMechanicsEvent(campaignId, turnNumber, result);
      return result;
    }

    case "create_npc": {
      const gameStateData = await state.getOrCreateGameState(campaignId);
      const npcId = await state.createNpc({
        campaignId,
        name: args.name as string,
        npcType: args.npcType as any,
        description: args.description as string,
        locationId: gameStateData.currentLocationId || undefined,
        currentGoal: args.currentGoal as string,
        disposition: (args.disposition as number) || 0,
        personalityNotes: args.personalityNotes as string,
        stats: args.stats || null,
      });

      const result: MechanicsResult = {
        type: "state_change",
        success: true,
        summary: `NPC created: ${args.name} (${args.npcType})`,
        details: { npcId, name: args.name, npcType: args.npcType },
        isHidden: false,
      };
      await state.logMechanicsEvent(campaignId, turnNumber, result);
      return result;
    }

    case "advance_time": {
      const updates: any = { inGameTime: args.newTime as string };
      if (args.mode) updates.mode = args.mode;
      await state.updateGameState(campaignId, updates);

      const result: MechanicsResult = {
        type: "state_change",
        success: true,
        summary: `Time advanced to: ${args.newTime}${args.mode ? ` (${args.mode} mode)` : ""}`,
        details: { newTime: args.newTime, mode: args.mode },
        isHidden: false,
      };
      await state.logMechanicsEvent(campaignId, turnNumber, result);
      return result;
    }

    default:
      return {
        type: "error",
        success: false,
        summary: `Unknown tool: ${toolName}`,
        details: { error: "unknown_tool", toolName },
        isHidden: false,
      };
  }
}

// ============================================================
// PRE-NARRATION CHECKS
// Run before the narrator generates text.
// ============================================================

/**
 * Run all pre-narration checks:
 * 1. Passive perception/investigation vs hidden objects
 * 2. NPC goal advancement (off-screen)
 */
async function runPreNarrationChecks(
  campaignId: number,
  turnNumber: number,
  snapshot: GameSnapshot
): Promise<{ passiveResults: MechanicsResult[]; npcResults: MechanicsResult[]; discoveries: string[] }> {
  const passiveResults: MechanicsResult[] = [];
  const npcResults: MechanicsResult[] = [];
  const discoveries: string[] = [];

  // 1. Passive checks against hidden objects in current location
  if (snapshot.currentLocation?.hiddenObjects) {
    const hiddenObjects = snapshot.currentLocation.hiddenObjects as HiddenObject[];
    const undiscovered = hiddenObjects.filter((o) => !o.discovered);

    if (undiscovered.length > 0) {
      const results = mechanics.runPassiveChecks(snapshot.partyCharacters, undiscovered);
      for (const r of results) {
        passiveResults.push(r);
        if (r.success) {
          discoveries.push(r.details.objectName as string);
        }
        await state.logMechanicsEvent(campaignId, turnNumber, r);
      }

      // Mark discovered objects in DB
      if (discoveries.length > 0 && snapshot.currentLocation) {
        await state.markObjectsDiscovered(snapshot.currentLocation.id, discoveries);
      }
    }
  }

  // 2. NPC goal advancement (every 3 turns, NPCs make progress)
  if (turnNumber % 3 === 0) {
    const allNpcs = await state.getCampaignNpcs(campaignId);
    for (const npc of allNpcs) {
      if (npc.currentGoal && (npc.goalProgress || 0) < 100) {
        const result = mechanics.advanceNpcGoal(
          npc.name,
          npc.currentGoal,
          npc.goalProgress || 0,
          10
        );
        npcResults.push(result);
        await state.updateNpcGoal(npc.id, { goalProgress: result.details.newProgress as number });
        await state.logMechanicsEvent(campaignId, turnNumber, result, npc.name);
      }
    }
  }

  return { passiveResults, npcResults, discoveries };
}

// ============================================================
// CONTEXT BUILDER
// Builds the system prompt with full game state for the narrator.
// ============================================================

function buildSystemPrompt(snapshot: GameSnapshot, campaignName: string, campaignDescription: string | null, memoryContext: string = ""): string {
  let prompt = `You are the Dungeon Master for the D&D 5e campaign "${campaignName}".
${campaignDescription ? `Campaign: ${campaignDescription}` : ""}

CRITICAL RULES:
- You MUST NOT invent dice rolls, damage numbers, HP values, or any mechanical results.
- You MUST use the provided function calling tools for ALL mechanical actions.
- When a player attempts something that requires a check, call the appropriate tool.
- Narrate based ONLY on the mechanical results provided to you.
- Be vivid, creative, and fair in your narration.
- Stay consistent with the established world state below.

CURRENT GAME STATE:
- Mode: ${snapshot.gameState.mode}
- Time: ${snapshot.gameState.inGameTime || "Unknown"}
- Turn: ${snapshot.gameState.turnNumber}
`;

  // Party info
  if (snapshot.partyCharacters.length > 0) {
    prompt += `\nPARTY MEMBERS:\n`;
    for (const c of snapshot.partyCharacters) {
      prompt += `- ${c.name} (Level ${c.level} ${c.race} ${c.characterClass}): HP ${c.currentHitPoints}/${c.maxHitPoints}, AC ${c.armorClass}\n`;
      prompt += `  STR:${c.strength} DEX:${c.dexterity} CON:${c.constitution} INT:${c.intelligence} WIS:${c.wisdom} CHA:${c.charisma}\n`;
      if (c.spells?.length) prompt += `  Known spells: ${c.spells.join(", ")}\n`;
      if (c.equipment?.length) prompt += `  Equipment: ${c.equipment.join(", ")}\n`;
    }
  }

  // Current location
  if (snapshot.currentLocation) {
    prompt += `\nCURRENT LOCATION: ${snapshot.currentLocation.name}\n`;
    prompt += `${snapshot.currentLocation.description || snapshot.currentLocation.baseDescription || "No description available."}\n`;
  }

  // NPCs present
  if (snapshot.npcsAtLocation.length > 0) {
    prompt += `\nNPCs PRESENT:\n`;
    for (const npc of snapshot.npcsAtLocation) {
      prompt += `- ${npc.name} (${npc.npcType}): ${npc.description || "No description"}\n`;
      if (npc.personalityNotes) prompt += `  Personality: ${npc.personalityNotes}\n`;
      if (npc.currentGoal) prompt += `  Current goal: ${npc.currentGoal} (${npc.goalProgress}% complete)\n`;
    }
  }

  // Active encounter
  if (snapshot.activeEncounter) {
    const order = snapshot.activeEncounter.initiativeOrder as mechanics.InitiativeEntry[];
    prompt += `\nACTIVE COMBAT (Round ${snapshot.activeEncounter.currentRound}):\n`;
    prompt += `Initiative order:\n`;
    if (order) {
      order.forEach((e, i) => {
        const marker = i === snapshot.activeEncounter!.currentTurnIndex ? ">>>" : "   ";
        prompt += `${marker} ${e.name}: Initiative ${e.initiative}, HP ${e.hp}/${e.maxHp}, AC ${e.ac}${e.conditions.length ? ` [${e.conditions.join(", ")}]` : ""}\n`;
      });
    }
  }

  // Long-term memories from vector store (RAG)
  if (memoryContext) {
    prompt += memoryContext;
  }

  // Recent mechanics (for continuity)
  if (snapshot.recentMechanics.length > 0) {
    prompt += `\nRECENT EVENTS:\n`;
    for (const m of snapshot.recentMechanics.slice(0, 5)) {
      if (!m.isHidden) {
        prompt += `- ${m.summary}\n`;
      }
    }
  }

  // Discoveries from passive checks
  if (snapshot.newDiscoveries.length > 0) {
    prompt += `\nNEW DISCOVERIES (weave these into your narration naturally):\n`;
    for (const d of snapshot.newDiscoveries) {
      prompt += `- The party has noticed: ${d}\n`;
    }
  }

  return prompt;
}

// ============================================================
// MAIN DM LOOP
// This is the entry point called by the tRPC router.
// ============================================================

export interface DmLoopInput {
  campaignId: number;
  campaignName: string;
  campaignDescription: string | null;
  playerInput: string;
  /** Previous conversation messages for context */
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface DmLoopOutput {
  /** The narrative prose from the DM */
  narration: string;
  /** Structured mechanics results (shown in UI alongside narration) */
  mechanicsResults: MechanicsResult[];
  /** Updated game snapshot after all changes */
  snapshot: GameSnapshot;
  /** The turn number this response was generated for */
  turnNumber: number;
}

/**
 * Main DM loop entry point.
 *
 * AI-NOTE: This is the function that implements the full logic loop:
 * Player Input → Intent (LLM) → Pre-checks (Code) → Mechanics (Code) → Narration (LLM) → State Update (DB)
 */
export async function runDmLoop(input: DmLoopInput): Promise<DmLoopOutput> {
  const { campaignId, campaignName, campaignDescription, playerInput, conversationHistory } = input;

  // Step 0: Advance the turn counter
  const turnNumber = await state.advanceTurn(campaignId);

  // Step 1: Build initial game snapshot
  let snapshot = await state.buildGameSnapshot(campaignId);

  // Step 2: Run pre-narration checks (passive perception, NPC goals)
  const preChecks = await runPreNarrationChecks(campaignId, turnNumber, snapshot);

  // Rebuild snapshot with discoveries
  snapshot = await state.buildGameSnapshot(campaignId, preChecks.discoveries);

  // Step 3: RAG - Search vector memory for relevant long-term context
  // AI-NOTE: This is the key RAG step. We embed the player's input,
  // search for semantically similar memories, and inject them into
  // the system prompt so the DM can recall past events.
  let memoryContext = "";
  try {
    const relevantMemories = await memory.searchMemories(
      campaignId,
      playerInput,
      8,    // top-K results
      0.3   // similarity threshold
    );
    if (relevantMemories.length > 0) {
      memoryContext = memory.formatMemoriesForContext(relevantMemories);
    }
  } catch (e) {
    // Don't fail the turn if memory search fails
    console.error("[DmLoop] Memory search failed:", e);
  }

  // Step 4: Build the system prompt with full game state + memories
  const systemPrompt = buildSystemPrompt(snapshot, campaignName, campaignDescription, memoryContext);

  // Build message history
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history (last 10 messages for context)
  if (conversationHistory) {
    const recent = conversationHistory.slice(-10);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add current player input
  messages.push({ role: "user", content: playerInput });

  // Step 5: Call LLM with function calling tools
  // The LLM will decide what mechanics to invoke based on the player's input
  const allMechanicsResults: MechanicsResult[] = [
    ...preChecks.passiveResults,
    ...preChecks.npcResults,
  ];

  // Build character map for tool execution
  const characterMap = new Map<number, CharacterState>();
  for (const c of snapshot.partyCharacters) {
    characterMap.set(c.id, c);
  }

  // Iterative tool calling loop - LLM may call multiple tools
  let maxIterations = 10; // Safety limit
  let currentMessages = [...messages];

  while (maxIterations > 0) {
    maxIterations--;

    const response = await invokeOpenAI({
      messages: currentMessages as any,
      tools: DM_TOOLS as any,
      tool_choice: maxIterations === 9 ? "auto" : "auto", // Let LLM decide
    });

    const choice = response.choices[0];

    // If the LLM wants to call tools
    if (choice.finish_reason === "tool_calls" || (choice.message as any).tool_calls) {
      const toolCalls = (choice.message as any).tool_calls || [];

      // Add the assistant message with tool calls to conversation
      currentMessages.push(choice.message as any);

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown>;
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        const result = await executeTool(campaignId, turnNumber, toolName, toolArgs, characterMap);
        allMechanicsResults.push(result);

        // Feed the result back to the LLM
        currentMessages.push({
          role: "tool" as any,
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        } as any);
      }

      // Continue the loop - LLM may want to call more tools
      continue;
    }

    // LLM is done with tool calls and has generated narration
    const narration = typeof choice.message.content === "string"
      ? choice.message.content
      : "The dungeon master ponders the situation...";

    // Step 6: Build final snapshot after all state changes
    const finalSnapshot = await state.buildGameSnapshot(campaignId);

    // Step 7: Auto-embed this turn's content into vector memory
    // AI-NOTE: This runs async after the response is built.
    // We don't await it to avoid slowing down the response.
    const gameStateObj = await state.getOrCreateGameState(campaignId);
    memoryPipeline.embedTurnResults({
      campaignId,
      turnNumber,
      sessionNumber: gameStateObj.sessionNumber,
      playerInput,
      narration,
      mechanicsResults: allMechanicsResults,
    }).catch((e) => console.error("[DmLoop] Memory embedding failed:", e));

    return {
      narration,
      mechanicsResults: allMechanicsResults,
      snapshot: finalSnapshot,
      turnNumber,
    };
  }

  // Safety fallback if we hit max iterations
  const finalSnapshot = await state.buildGameSnapshot(campaignId);
  return {
    narration: "The dungeon master takes a moment to gather their thoughts...",
    mechanicsResults: allMechanicsResults,
    snapshot: finalSnapshot,
    turnNumber,
  };
}
