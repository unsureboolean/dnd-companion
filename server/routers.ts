import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { aiRouter } from "./aiRouter";
import { multiCharacterRouter } from "./multiCharacterRouter";
import { characterGeneratorRouter } from "./characterGeneratorRouter";
import { levelingRouter } from "./levelingRouter";

export const appRouter = router({
  system: systemRouter,
  ai: aiRouter,
  multiCharacter: multiCharacterRouter,
  characterGenerator: characterGeneratorRouter,
  leveling: levelingRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  campaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCampaigns(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCampaign({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
        });
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }
        if (campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your campaign" });
        }
        return campaign;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        const { id, ...updates } = input;
        await db.updateCampaign(id, updates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        await db.deleteCampaign(input.id);
        return { success: true };
      }),
  }),

  characters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCharacters(ctx.user.id);
    }),
    
    listByCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return db.getCampaignCharacters(input.campaignId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number().optional(),
        name: z.string().min(1).max(255),
        race: z.string(),
        characterClass: z.string(),
        background: z.string(),
        level: z.number().min(1).max(20).default(1),
        strength: z.number().min(1).max(30),
        dexterity: z.number().min(1).max(30),
        constitution: z.number().min(1).max(30),
        intelligence: z.number().min(1).max(30),
        wisdom: z.number().min(1).max(30),
        charisma: z.number().min(1).max(30),
        alignment: z.string().optional(),
        personality: z.string().optional(),
        backstory: z.string().optional(),
        ideals: z.string().optional(),
        bonds: z.string().optional(),
        flaws: z.string().optional(),
        skills: z.record(z.string(), z.boolean()).optional(),
        savingThrows: z.record(z.string(), z.boolean()).optional(),
        equipment: z.array(z.string()).optional(),
        spells: z.array(z.string()).optional(),
        features: z.array(z.string()).optional(),
        maxHitPoints: z.number(),
        currentHitPoints: z.number(),
        armorClass: z.number(),
        isAiControlled: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.campaignId) {
          const campaign = await db.getCampaignById(input.campaignId);
          if (!campaign || campaign.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        
        return db.createCharacter({
          userId: ctx.user.id,
          ...input,
        });
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });
        }
        if (character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your character" });
        }
        return character;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        level: z.number().optional(),
        experiencePoints: z.number().optional(),
        currentHitPoints: z.number().optional(),
        maxHitPoints: z.number().optional(),
        armorClass: z.number().optional(),
        personality: z.string().optional(),
        backstory: z.string().optional(),
        ideals: z.string().optional(),
        bonds: z.string().optional(),
        flaws: z.string().optional(),
        equipment: z.array(z.string()).optional(),
        spells: z.array(z.string()).optional(),
        features: z.array(z.string()).optional(),
        skills: z.record(z.string(), z.boolean()).optional(),
        isAiControlled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.id);
        if (!character || character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        const { id, ...updates } = input;
        await db.updateCharacter(id, updates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.id);
        if (!character || character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        await db.deleteCharacter(input.id);
        return { success: true };
      }),
  }),

  context: router({
    list: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return db.getCampaignContext(input.campaignId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        entryType: z.enum(["event", "npc", "location", "plot", "item", "other"]),
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        return db.createContextEntry(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateContextEntry(id, updates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteContextEntry(input.id);
        return { success: true };
      }),
  }),

  sessions: router({
    list: protectedProcedure
      .input(z.object({ 
        campaignId: z.number(),
        sessionNumber: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return db.getCampaignSessionLogs(input.campaignId, input.sessionNumber);
      }),
    
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        sessionNumber: z.number(),
        entryType: z.enum(["narration", "character_action", "dm_note", "combat", "dialogue"]),
        characterId: z.number().optional(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        return db.createSessionLog(input);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSessionLog(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
