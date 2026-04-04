import type { GraphEdge, GraphNode, ParsedArchitecture } from "./types";

type JsonRecord = Record<string, unknown>;

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}

export function parseArchitecture(content: string): ParsedArchitecture {
  const raw = JSON.parse(content) as JsonRecord;

  const nodes: GraphNode[] = asArray(raw.nodes)
    .map((node) => ({
      id: String(node["unique-id"] ?? node.id ?? ""),
      label: String(node.label ?? node.name ?? node["unique-id"] ?? node.id ?? "Unnamed node"),
      type: String(node["node-type"] ?? node.type ?? "unknown")
    }))
    .filter((node) => node.id.length > 0);

  const edges: GraphEdge[] = asArray(raw.relationships).flatMap((relationship) => {
    const relationshipType = relationship["relationship-type"] as JsonRecord | undefined;
    const connects = relationshipType?.connects as JsonRecord | undefined;
    const source = (connects?.source as JsonRecord | undefined)?.node ?? relationship.source;
    const target = (connects?.destination as JsonRecord | undefined)?.node ?? relationship.target;

    if (!source || !target) {
      return [];
    }

    return [{
      id: String(relationship["unique-id"] ?? relationship.id ?? `${source}-${target}`),
      source: String(source),
      target: String(target),
      label: String(relationship.label ?? relationship.description ?? "connects"),
      type: "relationship"
    }];
  });

  return {
    nodes,
    edges,
    raw
  };
}
