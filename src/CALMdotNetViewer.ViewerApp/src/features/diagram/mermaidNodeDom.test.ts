import { describe, expect, it } from "vitest";
import {
  buildMermaidNodeDomIdPrefix,
  findRenderedMermaidNodeElements
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
});
