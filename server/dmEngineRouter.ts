/**
 * DM ENGINE ROUTER
 * ================
 * tRPC procedures that expose the DM engine to the frontend.
 * This replaces the old aiRouter's getDmResponse for DM mode.
 *
 * AI-NOTE: The old aiRouter still handles character-specific AI responses.
 * This router handles the full DM loop with mechanics separation.
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as stateManager from "./engine/stateManager";
import { runDmLoop } from "./engine/dmLoop";

export const dmEngineRouter = router({
  /**
   * Main DM interaction endpoint.
   * Processes player input through the full logic loop:
   * Intent → Pre-checks → Mechanics → Narration → State Update
   */
  interact: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        playerInput: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify campaign ownership
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Get conversation history for context
      const conversations = await db.getCampaignConversations(input.campaignId);
      const dmConversations = conversations
        .filter((c) => !c.characterId)
        .slice(-10)
        .map((c) => ({
          role: c.role as "user" | "assistant",
          content: c.content,
        }));

      // Run the DM loop
      const result = await runDmLoop({
        campaignId: input.campaignId,
        campaignName: campaign.name,
        campaignDescription: campaign.description,
        playerInput: input.playerInput,
        conversationHistory: dmConversations,
      });

      // Save conversation to DB
      await db.createAiConversation({
        campaignId: input.campaignId,
        characterId: null,
        role: "user",
        content: input.playerInput,
        contextUsed: [],
      });

      await db.createAiConversation({
        campaignId: input.campaignId,
        characterId: null,
        role: "assistant",
        content: result.narration,
        contextUsed: [],
      });

      return {
        narration: result.narration,
        mechanicsResults: result.mechanicsResults.filter((r) => !r.isHidden),
        hiddenResults: result.mechanicsResults.filter((r) => r.isHidden),
        turnNumber: result.turnNumber,
        gameMode: result.snapshot.gameState.mode,
        inGameTime: result.snapshot.gameState.inGameTime,
      };
    }),

  /**
   * Get the current game state for a campaign.
   */
  getGameState: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const snapshot = await stateManager.buildGameSnapshot(input.campaignId);
      return {
        gameState: snapshot.gameState,
        currentLocation: snapshot.currentLocation,
        npcsAtLocation: snapshot.npcsAtLocation,
        activeEncounter: snapshot.activeEncounter,
        partyCharacters: snapshot.partyCharacters.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          race: c.race,
          characterClass: c.characterClass,
          currentHitPoints: c.currentHitPoints,
          maxHitPoints: c.maxHitPoints,
          armorClass: c.armorClass,
        })),
      };
    }),

  /**
   * Get mechanics log for a campaign.
   */
  getMechanicsLog: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return stateManager.getRecentMechanics(input.campaignId, input.limit);
    }),

  /**
   * Get all NPCs in a campaign.
   */
  getNpcs: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return stateManager.getCampaignNpcs(input.campaignId);
    }),

  /**
   * Get all locations in a campaign.
   */
  getLocations: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return stateManager.getCampaignLocations(input.campaignId);
    }),

  /**
   * Manually create an NPC (DM tool).
   */
  createNpc: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        name: z.string().min(1),
        npcType: z.enum(["friendly", "neutral", "hostile", "merchant", "quest_giver", "boss"]).default("neutral"),
        description: z.string().optional(),
        currentGoal: z.string().optional(),
        disposition: z.number().min(-100).max(100).default(0),
        personalityNotes: z.string().optional(),
        stats: z
          .object({
            ac: z.number(),
            maxHp: z.number(),
            attackBonus: z.number(),
            damageDice: z.string(),
            speed: z.number().default(30),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const gameState = await stateManager.getOrCreateGameState(input.campaignId);
      const npcId = await stateManager.createNpc({
        campaignId: input.campaignId,
        name: input.name,
        npcType: input.npcType,
        description: input.description,
        locationId: gameState.currentLocationId || undefined,
        currentGoal: input.currentGoal,
        disposition: input.disposition,
        stats: input.stats || null,
        personalityNotes: input.personalityNotes,
      });

      return { id: npcId, name: input.name };
    }),

  /**
   * Manually create a location (DM tool).
   */
  createLocation: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        hiddenObjects: z
          .array(
            z.object({
              name: z.string(),
              dc: z.number(),
              type: z.enum(["trap", "secret_door", "hidden_item", "clue", "other"]),
              description: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const hiddenObjs = input.hiddenObjects?.map((o) => ({
        ...o,
        discovered: false,
      }));

      const locationId = await stateManager.createLocation({
        campaignId: input.campaignId,
        name: input.name,
        description: input.description,
        baseDescription: input.description,
        hiddenObjects: hiddenObjs || [],
      });

      return { id: locationId, name: input.name };
    }),

  /**
   * Initialize or reset game state for a campaign.
   */
  initializeGameState: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const gameState = await stateManager.getOrCreateGameState(input.campaignId);
      return gameState;
    }),
});
