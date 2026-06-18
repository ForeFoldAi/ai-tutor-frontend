import type { RelatedTextbookImage } from "@/components/assistant-message-content";

const MOCK_RESPONSES = [
  "That's a great question! Let me explain this concept step by step.",
  "Excellent question! This is an important concept to understand.",
  "I'd be happy to help you understand this better.",
];

export function generateChatAnswer(query: string, subject?: string): string {
  const intro = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  const topic = subject ? ` in **${subject}**` : "";
  return (
    `${intro}\n\n` +
    `Based on your question about "${query.slice(0, 80)}${query.length > 80 ? "…" : ""}"${topic}, ` +
    `here's a clear explanation:\n\n` +
    `**Key concepts:**\n` +
    `- Understanding the fundamentals is essential\n` +
    `- Practice with real examples reinforces learning\n` +
    `- Connect ideas to what you already know\n\n` +
    `Would you like me to go deeper on any part of this topic?`
  );
}

export const mockRelatedImages: RelatedTextbookImage[] = [
  {
    url: "https://placehold.co/400x300/e2e8f0/64748b?text=Textbook+Diagram",
    caption: "Illustration from textbook",
    page: 12,
  },
];

export async function createChatStream(answer: string): Promise<ReadableStream<Uint8Array>> {
  const words = answer.split(" ");
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 40));
        const chunk = words[i] + (i < words.length - 1 ? " " : "");
        const line = JSON.stringify({ type: "token", content: chunk }) + "\n";
        controller.enqueue(encoder.encode(line));
      }
      const imagesLine =
        JSON.stringify({ type: "related_images", images: mockRelatedImages }) + "\n";
      controller.enqueue(encoder.encode(imagesLine));
      controller.close();
    },
  });
}
