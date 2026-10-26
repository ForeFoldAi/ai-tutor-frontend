/**
 * Run: node --experimental-strip-types src/modules/master-admin/utils/upload-progress.test.ts
 */
import assert from "node:assert/strict";
import { expectedFinishMs, typicalDurationMs, uploadStage } from "./upload-progress.ts";

const now = Date.parse("2026-10-26T12:00:00Z");
const ago = (min: number) => new Date(now - min * 60_000).toISOString();
const row = (o: object) => ({
  upload_date: ago(60),
  ocr_status: "QUEUED",
  chunk_status: "QUEUED",
  embedding_status: "QUEUED",
  processing_started_at: null,
  processing_finished_at: null,
  ...o,
}) as Parameters<typeof uploadStage>[0];

const done = row({ chunk_status: "EMBEDDED", embedding_status: "EMBEDDED", processing_started_at: ago(50), processing_finished_at: ago(40) });
const legacyDone = row({ chunk_status: "EMBEDDED", embedding_status: "EMBEDDED" });
const chunking = row({ chunk_status: "PROCESSING", embedding_status: "PROCESSING", processing_started_at: ago(5) });
const images = row({ chunk_status: "EMBEDDED", embedding_status: "EMBEDDED", processing_started_at: ago(8) });
const stuck = row({ chunk_status: "PROCESSING", embedding_status: "PROCESSING", processing_started_at: ago(41) });
const stuckNoStart = row({ chunk_status: "PROCESSING", embedding_status: "PROCESSING" });
const q1 = row({ upload_date: ago(3) });
const q2 = row({ upload_date: ago(2) });

assert.equal(uploadStage(done, now), "completed");
assert.equal(uploadStage(legacyDone, now), "completed");
assert.equal(uploadStage(chunking, now), "chunking");
assert.equal(uploadStage(images, now), "images");
assert.equal(uploadStage(stuck, now), "stuck");
assert.equal(uploadStage(stuckNoStart, now), "stuck");
assert.equal(uploadStage(row({ embedding_status: "FAILED" }), now), "failed");
assert.equal(uploadStage(q1, now), "queued");

const all = [done, chunking, q1, q2, stuck];
const typical = typicalDurationMs(all);
assert.equal(typical, 10 * 60_000);
assert.equal(expectedFinishMs(chunking, all, typical, now), now + 5 * 60_000);
// q1 waits for chunking's remaining 5 min, then its own 10.
assert.equal(expectedFinishMs(q1, all, typical, now), now + 15 * 60_000);
assert.equal(expectedFinishMs(q2, all, typical, now), now + 25 * 60_000);
assert.equal(expectedFinishMs(stuck, all, typical, now), null);
assert.equal(typicalDurationMs([]), 12 * 60_000);

console.log("upload-progress ok");
