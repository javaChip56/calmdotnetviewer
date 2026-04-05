import { describe, expect, it } from "vitest";
import {
  buildMermaidNodeDomIdPrefix,
  findRenderedMermaidNodeElements,
  resolveMermaidNodeIdFromElementId
} from "./mermaidNodeDom";

describe("mermaidNodeDom", () => {
  it("builds the Mermaid flowchart DOM id prefix for a rendered node", () => {
    expect(buildMermaidNodeDomIdPrefix("payments-api")).toBe("flowchart-payments-api-");
  });

  it("matches the rendered DOM id prefix for reserved Mermaid words", () => {
    expect(buildMermaidNodeDomIdPrefix("end-user")).toBe("flowchart-node_end-user-");
  });

  it("finds rendered node elements by their Mermaid DOM ids", () => {
    const matchingElements = [{ id: "flowchart-payments-api-0" }] as unknown as Element[];
    const host = {
      querySelectorAll: (selector: string) =>
        selector === '[id^="flowchart-payments-api-"]' ? matchingElements : []
    } as unknown as ParentNode;

    expect(findRenderedMermaidNodeElements(host, "payments-api")).toEqual(matchingElements);
    expect(findRenderedMermaidNodeElements(host, "missing-node")).toHaveLength(0);
  });

  it("resolves a node id from a rendered Mermaid element id", () => {
    expect(
      resolveMermaidNodeIdFromElementId("flowchart-payments-api-0", ["payments-api", "payments-db"])
    ).toBe("payments-api");

    expect(
      resolveMermaidNodeIdFromElementId("flowchart-node_end-user-1", ["end-user", "payments-db"])
    ).toBe("end-user");

    expect(
      resolveMermaidNodeIdFromElementId("flowchart-something-else-1", ["payments-api", "payments-db"])
    ).toBeNull();
  });
});
