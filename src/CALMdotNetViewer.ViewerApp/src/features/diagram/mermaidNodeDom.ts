import { mermaidId } from "@repo/calm-widgets/widgets/block-architecture/core/utils";

const FLOWCHART_DOM_ID_PREFIX = "flowchart-";

export function buildMermaidNodeDomIdPrefix(nodeId: string): string {
  return `${FLOWCHART_DOM_ID_PREFIX}${mermaidId(nodeId)}-`;
}

export function findRenderedMermaidNodeElements(
  container: ParentNode,
  nodeId: string
): Element[] {
  const selector = `[id^="${buildMermaidNodeDomIdPrefix(nodeId)}"]`;
  return Array.from(container.querySelectorAll(selector));
}
