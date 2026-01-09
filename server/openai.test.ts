import { describe, expect, it } from "vitest";
import { invokeOpenAI } from "./openai";

describe("OpenAI API Integration", () => {
  it("should successfully call OpenAI API with valid key", async () => {
    // Simple test to validate the API key works
    const response = await invokeOpenAI({
      messages: [
        { role: "user", content: "Say 'test successful' and nothing else." }
      ],
      max_tokens: 20,
      temperature: 0,
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message.content).toBeTruthy();
    console.log("OpenAI API response:", response.choices[0].message.content);
  }, 30000); // 30 second timeout for API call
});
