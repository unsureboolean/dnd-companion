import axios from "axios";

const OPENAI_API_URL = "https://api.openai.com/v1";

type Role = "system" | "user" | "assistant" | "tool";

interface Message {
  role: Role;
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ChatCompletionRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_object" | "text";
  };
  /** OpenAI function calling tools */
  tools?: ToolDefinition[];
  /** Tool choice: 'none', 'auto', 'required', or specific function */
  tool_choice?: "none" | "auto" | "required" | { type: "function"; function: { name: string } };
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  n?: number;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

interface ImageGenerationResponse {
  created: number;
  data: {
    url: string;
    revised_prompt?: string;
  }[];
}

/**
 * Get the OpenAI API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Invoke OpenAI Chat Completion API
 */
export async function invokeOpenAI(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const apiKey = getApiKey();
  
  const response = await axios.post<ChatCompletionResponse>(
    `${OPENAI_API_URL}/chat/completions`,
    {
      model: request.model || "gpt-4o-mini",
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2000,
      ...(request.response_format && { response_format: request.response_format }),
      ...(request.tools && { tools: request.tools }),
      ...(request.tool_choice && { tool_choice: request.tool_choice }),
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Generate an image using OpenAI DALL-E
 */
export async function generateOpenAIImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  const apiKey = getApiKey();
  
  const response = await axios.post<ImageGenerationResponse>(
    `${OPENAI_API_URL}/images/generations`,
    {
      model: request.model || "dall-e-3",
      prompt: request.prompt,
      n: request.n || 1,
      size: request.size || "1024x1024",
      quality: request.quality || "standard",
      style: request.style || "vivid",
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Helper to create a D&D character portrait prompt
 */
export function createCharacterPortraitPrompt(character: {
  name: string;
  race: string;
  characterClass: string;
  background?: string;
  alignment?: string;
  personality?: string;
}): string {
  return `Fantasy character portrait in a detailed painterly style for Dungeons & Dragons. 
A ${character.race} ${character.characterClass}${character.background ? ` with a ${character.background} background` : ''}.
${character.personality ? `Personality: ${character.personality}.` : ''}
The character should look heroic and adventurous, with appropriate gear and attire for their class.
Medieval fantasy setting, dramatic lighting, high detail, portrait composition showing head and shoulders.
Style: Digital fantasy art, similar to official D&D artwork.`;
}
