import { afterEach, describe, expect, it, vi } from "vitest";
import { aiChatApi, type AIChatMessage } from "./aiChatApi";

vi.mock("./api", () => ({ api: {} }));
vi.mock("@/lib/env", () => ({ env: { apiUrl: "http://test/api/v1" } }));

const userMessage: AIChatMessage = {
  id: "u2",
  chatId: "chat-1",
  role: "user",
  content: "hello again",
  createdAt: "2026-11-20T00:00:00.000Z",
};
const assistantMessage: AIChatMessage = {
  id: "a2",
  chatId: "chat-1",
  role: "assistant",
  content: "hi there",
  createdAt: "2026-11-20T00:00:01.000Z",
};

const frame = (event: object) => `data: ${JSON.stringify(event)}\n\n`;

/** Fake a fetch whose body streams `parts` (as separate network reads) and then ends. */
function mockSse(parts: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function runRegenerate() {
  const calls: string[] = [];
  const callbacks = {
    onChunk: vi.fn((chunk: string) => void calls.push(`chunk:${chunk}`)),
    onUserMessage: vi.fn((message: AIChatMessage) => void calls.push(`user:${message.id}`)),
    onComplete: vi.fn((message: AIChatMessage | null) => void calls.push(`done:${message?.id}`)),
    onError: vi.fn((error: string) => void calls.push(`error:${error}`)),
  };
  aiChatApi.streamRegenerate(
    "m1",
    callbacks.onChunk,
    callbacks.onUserMessage,
    callbacks.onComplete,
    callbacks.onError,
  );
  const settled = vi.waitFor(() => {
    expect(callbacks.onComplete.mock.calls.length + callbacks.onError.mock.calls.length).toBeGreaterThan(0);
  });
  return { calls, callbacks, settled };
}

afterEach(() => vi.unstubAllGlobals());

describe("aiChatApi.streamRegenerate", () => {
  it("posts to the regenerate-stream endpoint with credentials", async () => {
    const fetchMock = mockSse([frame({ type: "done", data: { assistantMessage, isNewChat: false } })]);
    const { settled } = runRegenerate();
    await settled;
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/ai-chat/message/m1/regenerate-stream",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("handles the frames the backend sends: user_message, chunk*, done (no messages_deleted)", async () => {
    mockSse([
      frame({ type: "user_message", data: userMessage }),
      frame({ type: "chunk", data: "hi " }),
      frame({ type: "chunk", data: "there" }),
      frame({ type: "done", data: { assistantMessage, isNewChat: false } }),
    ]);
    const { calls, callbacks, settled } = runRegenerate();
    await settled;

    expect(callbacks.onUserMessage).toHaveBeenCalledWith(userMessage);
    expect(callbacks.onComplete).toHaveBeenCalledWith(assistantMessage);
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(calls).toEqual(["user:u2", "chunk:hi ", "chunk:there", "done:a2"]);
  });

  it("reassembles a frame split across network reads and ignores heartbeats", async () => {
    const whole = frame({ type: "user_message", data: userMessage });
    mockSse([
      ": hb\n\n",
      whole.slice(0, 20),
      whole.slice(20),
      frame({ type: "done", data: { assistantMessage } }),
    ]);
    const { callbacks, settled } = runRegenerate();
    await settled;

    expect(callbacks.onUserMessage).toHaveBeenCalledTimes(1);
    expect(callbacks.onUserMessage).toHaveBeenCalledWith(userMessage);
    expect(callbacks.onComplete).toHaveBeenCalledWith(assistantMessage);
  });

  it("reports an event: error frame through onError", async () => {
    mockSse([
      frame({ type: "user_message", data: userMessage }),
      `event: error\ndata: ${JSON.stringify({ type: "error", data: "AI busy" })}\n\n`,
    ]);
    const { callbacks, settled } = runRegenerate();
    await settled;

    expect(callbacks.onError).toHaveBeenCalledWith("AI busy");
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });
});
