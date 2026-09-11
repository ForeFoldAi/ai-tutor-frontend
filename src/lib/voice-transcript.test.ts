import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTranscriptEvent } from "./voice-transcript.ts";

describe("applyTranscriptEvent", () => {
  it("pairs user and assistant by turnId", () => {
    let lines = applyTranscriptEvent([], {
      role: "user",
      text: "What do you mean by political map?",
      turnId: 1,
      pending: true,
    });
    lines = applyTranscriptEvent(lines, {
      role: "user",
      text: "What do you mean by political map?",
      turnId: 1,
      pending: false,
    });
    lines = applyTranscriptEvent(lines, {
      role: "assistant",
      text: "A political map shows boundaries.",
      turnId: 1,
    });
    assert.equal(lines.length, 2);
    assert.equal(lines[0].turnId, 1);
    assert.equal(lines[1].turnId, 1);
  });

  it("does not attach assistant to a different turn", () => {
    let lines = applyTranscriptEvent([], {
      role: "user",
      text: "What is my last question?",
      turnId: 2,
      pending: false,
    });
    lines = applyTranscriptEvent(lines, {
      role: "user",
      text: "I think it's simple.",
      turnId: 3,
      pending: false,
    });
    lines = applyTranscriptEvent(lines, {
      role: "assistant",
      text: "Your last question was political map.",
      turnId: 2,
    });
    assert.equal(lines.filter((l) => l.role === "assistant").length, 1);
    assert.equal(lines.find((l) => l.role === "assistant")?.turnId, 2);
    assert.equal(lines.filter((l) => l.role === "user").length, 2);
  });

  it("commits pending user when assistant text arrives with speech", () => {
    let lines = applyTranscriptEvent([], {
      role: "user",
      text: "What is my last question?",
      turnId: 2,
      pending: true,
    });
    lines = applyTranscriptEvent(lines, {
      role: "assistant",
      text: "Your last question was about maps.",
      turnId: 2,
    });
    assert.equal(lines.find((l) => l.role === "user")?.pending, false);
    assert.equal(lines.find((l) => l.role === "assistant")?.text, "Your last question was about maps.");
  });

  it("updates assistant text for the same turn as speech streams", () => {
    let lines = applyTranscriptEvent([], {
      role: "user",
      text: "What is photosynthesis?",
      turnId: 1,
      pending: false,
    });
    lines = applyTranscriptEvent(lines, {
      role: "assistant",
      text: "Photosynthesis makes food.",
      turnId: 1,
    });
    lines = applyTranscriptEvent(lines, {
      role: "assistant",
      text: "Photosynthesis makes food. Plants use sunlight.",
      turnId: 1,
    });
    assert.equal(lines.filter((l) => l.role === "assistant").length, 1);
    assert.equal(
      lines.find((l) => l.role === "assistant")?.text,
      "Photosynthesis makes food. Plants use sunlight.",
    );
  });

  it("does not shrink assistant text when a shorter partial arrives late", () => {
    let lines = applyTranscriptEvent([], {
      role: "user",
      text: "What is a square root?",
      turnId: 1,
      pending: false,
    });
    lines = applyTranscriptEvent(lines, {
      role: "assistant",
      text: "Want an example? Let's try 81.",
      turnId: 1,
    });
    lines = applyTranscriptEvent(lines, {
      role: "assistant",
      text: "Want an example? Let's",
      turnId: 1,
    });
    assert.equal(lines.find((l) => l.role === "assistant")?.text, "Want an example? Let's try 81.");
  });

  it("removes pending user on turn_cancelled", () => {
    let lines = applyTranscriptEvent([], {
      role: "user",
      text: "What is my last question?",
      turnId: 2,
      pending: true,
    });
    lines = applyTranscriptEvent(lines, { type: "turn_cancelled", turnId: 2 });
    assert.equal(lines.length, 0);
  });

  it("simulates delayed async ordering with stable turnIds", () => {
    let lines: ReturnType<typeof applyTranscriptEvent> extends infer T ? T : never = [];
    const events = [
      { role: "user", text: "Q1", turnId: 1, pending: true },
      { role: "user", text: "Q1", turnId: 1, pending: false },
      { role: "assistant", text: "A1", turnId: 1 },
      { role: "user", text: "Q2", turnId: 2, pending: true },
      { role: "user", text: "Q3", turnId: 3, pending: true },
      { role: "user", text: "Q2", turnId: 2, pending: false },
      { role: "assistant", text: "A2", turnId: 2 },
      { role: "user", text: "Q3", turnId: 3, pending: false },
      { role: "assistant", text: "A3", turnId: 3 },
    ] as const;
    for (const ev of events) lines = applyTranscriptEvent(lines, ev);
    assert.deepEqual(
      lines.map((l) => `${l.turnId}:${l.role[0]}`),
      ["1:u", "1:a", "2:u", "3:u", "2:a", "3:a"],
    );
  });

  it("acceptance: political map → recall → affirmation stay on their turns", () => {
    let lines: ReturnType<typeof applyTranscriptEvent> extends infer T ? T : never = [];
    const script = [
      { role: "user", text: "What do you mean by political map?", turnId: 1, pending: true },
      { role: "user", text: "What do you mean by political map?", turnId: 1, pending: false },
      { role: "assistant", text: "A political map shows boundaries.", turnId: 1 },
      { role: "user", text: "What is my last question?", turnId: 2, pending: true },
      { role: "user", text: "What is my last question?", turnId: 2, pending: false },
      { role: "assistant", text: 'Your last question was: "What do you mean by political map?"', turnId: 2 },
      { role: "user", text: "I think it's simple.", turnId: 3, pending: true },
      { role: "user", text: "I think it's simple.", turnId: 3, pending: false },
      { role: "assistant", text: "Glad that clicked — let's look at one more detail.", turnId: 3 },
    ] as const;
    for (const ev of script) lines = applyTranscriptEvent(lines, ev);
    assert.equal(lines.length, 6);
    assert.deepEqual(
      lines.map((l) => `${l.turnId}:${l.role[0]}`),
      ["1:u", "1:a", "2:u", "2:a", "3:u", "3:a"],
    );
  });
});
