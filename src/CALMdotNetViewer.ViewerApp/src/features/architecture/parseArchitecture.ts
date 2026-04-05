import { CalmCore } from "@finos/calm-models/model";
import type { CalmCoreCanonicalModel, CalmRelationshipCanonicalModel } from "@finos/calm-models/canonical";
import { toKindView } from "@finos/calm-models/canonical";
import type { CalmCoreSchema } from "@finos/calm-models/types";
import type { GraphEdge, GraphFlow, GraphNode, GraphRelationship, ParsedArchitecture } from "./types";

type JsonRecord = Record<string, unknown>;

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}

function toGraphEdges(relationships: CalmRelationshipCanonicalModel[]): GraphEdge[] {
  return relationships.flatMap((relationship) => {
    const kind = toKindView(relationship["relationship-type"]);

    switch (kind.kind) {
      case "connects":
        return [{
          id: relationship["unique-id"],
          source: kind.source.node,
          target: kind.destination.node,
          label: relationship.description ?? relationship.protocol ?? "connects",
          type: "connects"
        }];
      case "interacts":
        return kind.nodes.map((nodeId: string) => ({
          id: `${relationship["unique-id"]}:${nodeId}`,
          source: kind.actor,
          target: nodeId,
          label: relationship.description ?? "interacts",
          type: "interacts"
        }));
      case "deployed-in":
        return kind.nodes.map((nodeId: string) => ({
          id: `${relationship["unique-id"]}:${nodeId}`,
          source: nodeId,
          target: kind.container,
          label: relationship.description ?? "deployed-in",
          type: "deployed-in"
        }));
      case "composed-of":
        return kind.nodes.map((nodeId: string) => ({
          id: `${relationship["unique-id"]}:${nodeId}`,
          source: nodeId,
          target: kind.container,
          label: relationship.description ?? "composed-of",
          type: "composed-of"
        }));
      case "options":
        return [];
      default:
        return [];
    }
  });
}

export function parseArchitecture(content: string): ParsedArchitecture {
  const raw = JSON.parse(content) as CalmCoreSchema & JsonRecord;
  const canonicalModel: CalmCoreCanonicalModel = CalmCore.fromSchema(raw).toCanonicalSchema();

  const nodes: GraphNode[] = canonicalModel.nodes.map((node) => ({
    id: node["unique-id"],
    label: node.name,
    type: node["node-type"]
  }));

  const edges = toGraphEdges(canonicalModel.relationships ?? []);
  const relationships: GraphRelationship[] = (canonicalModel.relationships ?? []).map((relationship) => {
    const kind = toKindView(relationship["relationship-type"]);

    return {
      id: relationship["unique-id"],
      label: relationship.description ?? relationship.protocol ?? relationship["unique-id"],
      type: kind.kind
    };
  });
  const flows: GraphFlow[] = (canonicalModel.flows ?? []).map((flow) => ({
    id: flow["unique-id"],
    label: flow.name ?? flow.description ?? flow["unique-id"],
    description: flow.description ?? ""
  }));

  const nodeLookup = Object.fromEntries(
    asArray(raw.nodes).map((node) => [String(node["unique-id"] ?? node.id ?? ""), node])
  );

  const relationshipLookup = Object.fromEntries(
    asArray(raw.relationships).map((relationship) => [
      String(relationship["unique-id"] ?? relationship.id ?? ""),
      relationship
    ])
  );

  const flowLookup = Object.fromEntries(
    asArray(raw.flows).map((flow) => [String(flow["unique-id"] ?? flow.id ?? ""), flow])
  );

  return {
    nodes,
    edges,
    relationships,
    flows,
    raw,
    canonicalModel,
    nodeLookup,
    relationshipLookup,
    flowLookup
  };
}
