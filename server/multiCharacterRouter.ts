import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export const multiCharacterRouter = router({
  /**
   * Get responses from multiple AI-controlled characters at once
   */
  getBatchCharacterResponses: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      characterIds: z.array(z.number()).min(1).max(3),
      prompt: z.string().min(1),
      includeContext: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify campaign ownership
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || campaign.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Verify all characters
      const characters = await Promise.all(
        input.characterIds.map(id => db.getCharacterById(id))
      );

      for (const character of characters) {
        if (!character || character.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied to one or more characters" });
        }
        if (!character.isAiControlled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `${character?.name} is not AI-controlled` });
        }
      }

      // Get campaign context if requested
      let contextInfo = "";
      let contextIds: number[] = [];
      
      if (input.includeContext) {
        const contextEntries = await db.getCampaignContext(input.campaignId);
        const recentContext = contextEntries.slice(0, 10);
        
        if (recentContext.length > 0) {
          contextInfo = "\n\nCampaign context:\n";
          recentContext.forEach(entry => {
            contextInfo += `- [${entry.entryType}] ${entry.title}: ${entry.content}\n`;
            contextIds.push(entry.id);
          });
        }
      }

      // Process each character
      const responses = await Promise.all(
        characters.map(async (character) => {
          if (!character) return null;

          const characterContext = `
You are roleplaying as ${character.name}, a level ${character.level} ${character.race} ${character.characterClass}.

Background: ${character.background}
Alignment: ${character.alignment || "Unknown"}

Personality: ${character.personality || "Not defined"}
Backstory: ${character.backstory || "Not defined"}
Ideals: ${character.ideals || "Not defined"}
Bonds: ${character.bonds || "Not defined"}
Flaws: ${character.flaws || "Not defined"}

Stay in character and respond as ${character.name} would, based on their personality and background.
`;

          // Get recent conversation history for this character
          const conversations = await db.getCampaignConversations(input.campaignId, character.id);
          const recentConversations = conversations.slice(-3);

          const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            {
              role: "system",
              content: characterContext + contextInfo,
            },
          ];

          recentConversations.forEach(conv => {
            if (conv.role === "user" || conv.role === "assistant") {
              messages.push({
                role: conv.role,
                content: conv.content,
              });
            }
          });

          messages.push({
            role: "user",
            content: input.prompt,
          });

          // Get AI response
          const response = await invokeLLM({ messages });
          const messageContent = response.choices[0]?.message?.content;
          const aiResponse = typeof messageContent === 'string' ? messageContent : "...";

          // Save conversation
          await db.createAiConversation({
            campaignId: input.campaignId,
            characterId: character.id,
            role: "user",
            content: input.prompt,
            contextUsed: contextIds,
          });

          await db.createAiConversation({
            campaignId: input.campaignId,
            characterId: character.id,
            role: "assistant",
            content: aiResponse,
            contextUsed: contextIds,
          });

          return {
            characterId: character.id,
            characterName: character.name,
            response: aiResponse,
          };
        })
      );

      return {
        responses: responses.filter(r => r !== null),
      };
    }),

  /**
   * Toggle AI control for a character
   */
  toggleAiControl: protectedProcedure
    .input(z.object({
      characterId: z.number(),
      isAiControlled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await db.updateCharacter(input.characterId, {
        isAiControlled: input.isAiControlled,
      });

      return { success: true };
    }),

  /**
   * Assign character to campaign
   */
  assignToCampaign: protectedProcedure
    .input(z.object({
      characterId: z.number(),
      campaignId: z.number().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const character = await db.getCharacterById(input.characterId);
      if (!character || character.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (input.campaignId !== null) {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign || campaign.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied to campaign" });
        }
      }

      await db.updateCharacter(input.characterId, {
        campaignId: input.campaignId,
      });

      return { success: true };
    }),
});
