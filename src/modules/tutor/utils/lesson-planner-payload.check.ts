import assert from "node:assert/strict";
import { resolveSelectedTopics } from "./lesson-planner-payload";

const topics = resolveSelectedTopics({
  subject: "Math",
  grade: "9",
  sections: ["A"],
  chapter: "Fractions",
  topics: ["Mixed Numbers", "Mixed Numbers"],
  customTopics: "Improper Fractions, Mixed Numbers",
  pptTemplate: "clean_academic",
  pptSlideCount: "12",
  duration: "45",
  learningObjectives: "",
  prepareOptions: {} as never,
});

assert.deepEqual(topics, ["Mixed Numbers", "Improper Fractions"]);
console.log("lesson-planner-payload topics check: ok");
