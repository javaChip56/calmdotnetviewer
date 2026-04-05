import { mermaidId } from "@repo/calm-widgets/widgets/block-architecture/core/utils";

const FLOWCHART_DOM_ID_PREFIX = "flowchart-";

export function buildMermaidNodeDomIdPrefix(nodeId: string): string {
  return `${FLOWCHART_DOM_ID_PREFIX}${mermaidId(nodeId)}-`;
}

function matchesMermaidNodeDomId(elementId: string, nodeId: string): boolean {
  const prefix = buildMermaidNodeDomIdPrefix(nodeId);
  return elementId === prefix || elementId.startsWith(prefix) || elementId.includes(`-${prefix}`);
}

export function resolveMermaidNodeIdFromElementId(
  elementId: string | null | undefined,
  nodeIds: string[]
): string | null {
  if (!elementId) {
    return null;
  }

  for (const nodeId of nodeIds) {
    if (matchesMermaidNodeDomId(elementId, nodeId)) {
      return nodeId;
    }
  }

  return null;
}

export function findRenderedMermaidNodeElements(
  container: ParentNode,
  nodeId: string
): Element[] {
  return Array.from(container.querySelectorAll("[id]")).filter((element) =>
    matchesMermaidNodeDomId(element.getAttribute("id") ?? "", nodeId)
  );
}

export function resolveRenderedMermaidNodeId(
  target: Element,
  nodeIds: string[],
  stopAt?: Element | null
): string | null {
  let current: Element | null = target;

  while (current && current !== stopAt) {
    const resolvedNodeId = resolveMermaidNodeIdFromElementId(current.getAttribute("id"), nodeIds);
    if (resolvedNodeId) {
      return resolvedNodeId;
    }

    current = current.parentElement;
  }

  return null;
}
