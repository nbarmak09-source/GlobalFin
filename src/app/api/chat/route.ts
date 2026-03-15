import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a knowledgeable financial research assistant. You help users understand stock markets, analyze companies, explain financial concepts, and discuss investment strategies.

Key guidelines:
- Provide accurate, well-reasoned analysis based on publicly available information
- Explain complex financial concepts in clear, accessible language
- When discussing specific stocks, include relevant metrics and context
- Always note that you cannot provide personalized investment advice
- Use data and facts to support your analysis
- Be concise but thorough in your responses
- Format responses with markdown for readability`;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 10_000;

function validateMessages(messages: unknown): { role: "user" | "assistant"; content: string }[] | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null;
  }
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m == null || typeof m !== "object" || !("role" in m) || !("content" in m)) {
      return null;
    }
    const role = String(m.role);
    const content = String(m.content);
    if (content.length > MAX_MESSAGE_LENGTH) {
      return null;
    }
    if (role !== "user" && role !== "assistant") {
      return null;
    }
    out.push({ role: role as "user" | "assistant", content });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const messages = validateMessages(body.messages);
    if (!messages) {
      return new Response(
        JSON.stringify({
          error: `messages must be an array of 1–${MAX_MESSAGES} objects with role and content (content max ${MAX_MESSAGE_LENGTH} chars)`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
          controller.close();
          console.error("Stream error:", error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
