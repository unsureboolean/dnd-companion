import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { invokeOpenAI } from "./openai";

export const aiRouter = router({
  /**
   * Get AI response for a character action/dialogue
   */
  getCharacterResponse: protectedProcedure
    .input(z.object({
      characterId: z.number(),
      campaignId: z.number(),
      prompt: z.string().min(1),
      includeContext: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify character ownership
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Verify campaign ownership
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Build character context
      const characterContext = `
You are roleplaying as ${character.name}, a level ${character.level} ${character.race} ${character.characterClass}.

Background: ${character.background}
Alignment: ${character.alignment || "Unknown"}

Personality: ${character.personality || "Not defined"}
Backstory: ${character.backstory || "Not defined"}
Ideals: ${character.ideals || "Not defined"}
Bonds: ${character.bonds || "Not defined"}
Flaws: ${character.flaws || "Not defined"}

Ability Scores:
- Strength: ${character.strength}
- Dexterity: ${character.dexterity}
- Constitution: ${character.constitution}
- Intelligence: ${character.intelligence}
- Wisdom: ${character.wisdom}
- Charisma: ${character.charisma}

Stay in character and respond as ${character.name} would, based on their personality, background, and current situation.
`;

      // Get recent context entries if requested
      let contextInfo = "";
      let contextIds: number[] = [];
      
      if (input.includeContext) {
        const contextEntries = await db.getCampaignContext(input.campaignId);
        const recentContext = contextEntries.slice(0, 10); // Last 10 entries
        
        if (recentContext.length > 0) {
          contextInfo = "\n\nRecent campaign context:\n";
          recentContext.forEach(entry => {
            contextInfo += `- [${entry.entryType}] ${entry.title}: ${entry.content}\n`;
            contextIds.push(entry.id);
          });
        }
      }

      // Get recent conversation history
      const conversations = await db.getCampaignConversations(input.campaignId, input.characterId);
      const recentConversations = conversations.slice(-5); // Last 5 messages

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: characterContext + contextInfo,
        },
      ];

      // Add conversation history
      recentConversations.forEach(conv => {
        if (conv.role === "user" || conv.role === "assistant") {
          messages.push({
            role: conv.role,
            content: conv.content,
          });
        }
      });

      // Add current prompt
      messages.push({
        role: "user",
        content: input.prompt,
      });

      // Get AI response
      const response = await invokeOpenAI({ messages });
      const messageContent = response.choices[0]?.message?.content;
      const aiResponse = typeof messageContent === 'string' ? messageContent : "I'm not sure how to respond.";

      // Save conversation
      await db.createAiConversation({
        campaignId: input.campaignId,
        characterId: input.characterId,
        role: "user",
        content: input.prompt,
        contextUsed: contextIds,
      });

      await db.createAiConversation({
        campaignId: input.campaignId,
        characterId: input.characterId,
        role: "assistant",
        content: aiResponse,
        contextUsed: contextIds,
      });

      return {
        response: aiResponse,
        character: {
          id: character.id,
          name: character.name,
        },
      };
    }),

  /**
   * Get DM narration/response
   */
  getDmResponse: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      prompt: z.string().min(1),
      includeContext: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify campaign ownership
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Build DM context
      let dmContext = `
You are the Dungeon Master for the campaign "${campaign.name}".
${campaign.description ? `Campaign Description: ${campaign.description}` : ""}

Your role is to:
- Narrate the story and describe scenes vividly
- Control NPCs and monsters
- Adjudicate rules fairly
- Create engaging challenges and encounters
- Respond to player actions with appropriate consequences

Be creative, descriptive, and fair. Keep the story engaging and respond to player actions appropriately.
`;

      // Get campaign context
      let contextInfo = "";
      let contextIds: number[] = [];
      
      if (input.includeContext) {
        const contextEntries = await db.getCampaignContext(input.campaignId);
        const recentContext = contextEntries.slice(0, 15);
        
        if (recentContext.length > 0) {
          contextInfo = "\n\nCampaign context:\n";
          recentContext.forEach(entry => {
            contextInfo += `- [${entry.entryType}] ${entry.title}: ${entry.content}\n`;
            contextIds.push(entry.id);
          });
        }
      }

      // Get recent DM conversations (no characterId)
      const conversations = await db.getCampaignConversations(input.campaignId);
      const dmConversations = conversations.filter(c => !c.characterId).slice(-8);

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: dmContext + contextInfo,
        },
      ];

      // Add conversation history
      dmConversations.forEach(conv => {
        if (conv.role === "user" || conv.role === "assistant") {
          messages.push({
            role: conv.role,
            content: conv.content,
          });
        }
      });

      // Add current prompt
      messages.push({
        role: "user",
        content: input.prompt,
      });

      // Get AI response
      const response = await invokeOpenAI({ messages });
      const messageContent = response.choices[0]?.message?.content;
      const aiResponse = typeof messageContent === 'string' ? messageContent : "The dungeon master ponders...";

      // Save conversation
      await db.createAiConversation({
        campaignId: input.campaignId,
        characterId: null,
        role: "user",
        content: input.prompt,
        contextUsed: contextIds,
      });

      await db.createAiConversation({
        campaignId: input.campaignId,
        characterId: null,
        role: "assistant",
        content: aiResponse,
        contextUsed: contextIds,
      });

      return {
        response: aiResponse,
      };
    }),

  /**
   * Get conversation history
   */
  getConversationHistory: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      characterId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return db.getCampaignConversations(input.campaignId, input.characterId);
    }),
});
