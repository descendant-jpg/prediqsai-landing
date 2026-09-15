import { describe, expect, it } from "vitest";

import { parseTopics } from "../services/topic-generator";

const FIVE = '["Alpha topic","Beta topic","Gamma topic","Delta topic","Epsilon topic"]';

describe("parseTopics", () => {
  it("parses a plain JSON array of 5 strings", () => {
    expect(parseTopics(FIVE)).toEqual([
      "Alpha topic",
      "Beta topic",
      "Gamma topic",
      "Delta topic",
      "Epsilon topic",
    ]);
  });

  it("strips markdown code fences", () => {
    expect(parseTopics("```json\n" + FIVE + "\n```")).toHaveLength(5);
    expect(parseTopics("```\n" + FIVE + "\n```")).toHaveLength(5);
  });

  it("throws on non-JSON output", () => {
    expect(() => parseTopics("Here are five topics: ...")).toThrow(/non-JSON/);
  });

  it("throws when output is not an array", () => {
    expect(() => parseTopics('{"topics": []}')).toThrow(/not a JSON array/);
  });

  it("throws when fewer than 5 usable topics remain", () => {
    expect(() => parseTopics('["One","Two","Three","Four"]')).toThrow(/usable topics/);
    expect(() => parseTopics('["One","","x","Two","Three"]')).toThrow(/usable topics/);
  });

  it("dedupes case-insensitively and trims", () => {
    const withDupes =
      '["  Alpha topic  ","alpha TOPIC","Beta topic","Gamma topic","Delta topic","Epsilon topic"]';
    const topics = parseTopics(withDupes);
    expect(topics).toHaveLength(5);
    expect(topics[0]).toBe("Alpha topic");
  });

  it("slices extras down to exactly 5", () => {
    const seven = JSON.stringify(["A one","B two","C three","D four","E five","F six","G seven"]);
    const topics = parseTopics(seven);
    expect(topics).toHaveLength(5);
    expect(topics[4]).toBe("E five");
  });

  it("rejects topics over 300 characters", () => {
    const long = "x".repeat(301);
    expect(() => parseTopics(JSON.stringify([long, "A","B","C","D"]))).toThrow(/usable topics/);
  });
});
