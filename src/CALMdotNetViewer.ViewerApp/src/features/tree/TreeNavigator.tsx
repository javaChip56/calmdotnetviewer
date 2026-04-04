import type { ParsedArchitecture } from "../architecture/types";

interface TreeNavigatorProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  linkedNodeIds: Set<string>;
  onSelectElement: (id: string) => void;
  onOpenLinkedArchitecture: (linkedId: string) => void;
  resolveLinkedArchitectureId: (nodeId: string) => string | null;
}

export function TreeNavigator({
  parsedArchitecture,
  selectedElementId,
  linkedNodeIds,
  onSelectElement,
  onOpenLinkedArchitecture,
  resolveLinkedArchitectureId
}: TreeNavigatorProps) {
  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Model Elements</h2>
        <span className="panel-meta">{parsedArchitecture.nodes.length} nodes</span>
      </div>

      <div className="tree-group">
        <h3>Nodes</h3>
        <ul className="tree-list">
          {parsedArchitecture.nodes.map((node) => (
            <li key={node.id}>
              <button
                className={`tree-item${selectedElementId === node.id ? " is-selected" : ""}`}
                onClick={() => {
                  const linkedArchitectureId = resolveLinkedArchitectureId(node.id);
                  if (linkedArchitectureId) {
                    onOpenLinkedArchitecture(linkedArchitectureId);
                    return;
                  }

                  onSelectElement(node.id);
                }}
                type="button"
              >
                <span>
                  {node.label}
                  {linkedNodeIds.has(node.id) ? " (linked)" : ""}
                </span>
                <small>{node.type}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
