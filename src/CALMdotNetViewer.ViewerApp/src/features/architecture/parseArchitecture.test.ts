import { describe, expect, it } from "vitest";
import { parseArchitecture } from "./parseArchitecture";

describe("parseArchitecture", () => {
  it("converts a CALM architecture document into canonical and graph data", () => {
    const parsed = parseArchitecture(`
      {
        "$schema": "https://calm.finos.org/release/1.1/meta/calm.json",
        "metadata": { "title": "Test Architecture" },
        "nodes": [
          { "unique-id": "frontend", "node-type": "webclient", "name": "Frontend" },
          { "unique-id": "backend", "node-type": "service", "name": "Backend" }
        ],
        "relationships": [
          {
            "unique-id": "frontend-backend",
            "relationship-type": {
              "connects": {
                "source": { "node": "frontend" },
                "destination": { "node": "backend" }
              }
            },
            "description": "Calls backend"
          }
        ]
      }
    `);

    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.nodes[0]).toMatchObject({
      id: "frontend",
      label: "Frontend",
      type: "webclient"
    });

    expect(parsed.edges).toHaveLength(1);
    expect(parsed.edges[0]).toMatchObject({
      id: "frontend-backend",
      source: "frontend",
      target: "backend",
      label: "Calls backend",
      type: "connects"
    });

    expect(parsed.canonicalModel.nodes[1]["unique-id"]).toBe("backend");
    expect(parsed.nodeLookup.frontend).toBeTruthy();
    expect(parsed.relationshipLookup["frontend-backend"]).toBeTruthy();
  });
});
