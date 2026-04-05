import { mermaidId } from "@repo/calm-widgets/widgets/block-architecture/core/utils";

const FLOWCHART_DOM_ID_PREFIX = "flowchart-";

export function buildMermaidNodeDomIdPrefix(nodeId: string): string {
  return `${FLOWCHART_DOM_ID_PREFIX}${mermaidId(nodeId)}-`;
}

export function resolveMermaidNodeIdFromElementId(
  elementId: string | null | undefined,
  nodeIds: string[]
): string | null {
  if (!elementId) {
    return null;
  }

  for (const nodeId of nodeIds) {
    if (elementId.startsWith(buildMermaidNodeDomIdPrefix(nodeId))) {
      return nodeId;
    }
  }

  return null;
}

export function findRenderedMermaidNodeElements(
  container: ParentNode,
  nodeId: string
): Element[] {
  const selector = `[id^="${buildMermaidNodeDomIdPrefix(nodeId)}"]`;
  return Array.from(container.querySelectorAll(selector));
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
