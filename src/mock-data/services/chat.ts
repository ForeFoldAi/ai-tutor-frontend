import type { RelatedTextbookImage } from "@/components/assistant-message-content";
import { delay } from "../delay";
import { createChatStream, generateChatAnswer, mockRelatedImages } from "../fixtures/chat";

export async function mockUploadPdf(_file: File): Promise<void> {
  await delay(500);
}

export async function mockSendChatMessage(query: string): Promise<string> {
  await delay(400);
  return generateChatAnswer(query);
}

export async function mockSendChapterChatMessage(
  query: string,
  ctx: { subject: string },
): Promise<{ answer: string; relatedImages: RelatedTextbookImage[] }> {
  await delay(400);
  return {
    answer: generateChatAnswer(query, ctx.subject),
    relatedImages: mockRelatedImages,
  };
}

export async function mockStreamChapterChatMessage(
  query: string,
  ctx: { subject: string },
  handlers: {
    onToken: (chunk: string) => void;
    onImages: (images: RelatedTextbookImage[]) => void;
  },
): Promise<string> {
  const answer = generateChatAnswer(query, ctx.subject);
  const stream = await createChatStream(answer);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line) as {
          type?: string;
          content?: string;
          images?: RelatedTextbookImage[];
        };
        if (evt.type === "token" && evt.content) {
          full += evt.content;
          handlers.onToken(evt.content);
        } else if (evt.type === "related_images" && Array.isArray(evt.images)) {
          handlers.onImages(evt.images);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return full;
}

export async function mockChatVoiceStream(_message: string): Promise<ReadableStream<Uint8Array>> {
  await delay(300);
  // Return empty audio stream for UI testing
  return new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
}

export async function mockVoiceHealthCheck(): Promise<boolean> {
  await delay(100);
  return true;
}

const FRAME_TEXT = 1;
const FRAME_IMAGES = 4;
const FRAME_DONE = 3;

export async function mockVoiceStream(
  message: string,
  subject?: string,
): Promise<ReadableStream<Uint8Array>> {
  const answer = generateChatAnswer(message, subject);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      await delay(200);
      const textBytes = encoder.encode(answer);
      const header = new Uint8Array(5);
      header[0] = FRAME_TEXT;
      header[1] = textBytes.length & 0xff;
      header[2] = (textBytes.length >> 8) & 0xff;
      header[3] = (textBytes.length >> 16) & 0xff;
      header[4] = (textBytes.length >> 24) & 0xff;
      controller.enqueue(new Uint8Array([...header, ...textBytes]));

      const imagesJson = encoder.encode(JSON.stringify(mockRelatedImages));
      const imgHeader = new Uint8Array(5);
      imgHeader[0] = FRAME_IMAGES;
      imgHeader[1] = imagesJson.length & 0xff;
      imgHeader[2] = (imagesJson.length >> 8) & 0xff;
      imgHeader[3] = (imagesJson.length >> 16) & 0xff;
      imgHeader[4] = (imagesJson.length >> 24) & 0xff;
      controller.enqueue(new Uint8Array([...imgHeader, ...imagesJson]));

      const doneHeader = new Uint8Array(5);
      doneHeader[0] = FRAME_DONE;
      controller.enqueue(doneHeader);
      controller.close();
    },
  });
}
