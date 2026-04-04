import type { ParsedArchitecture } from "../architecture/types";

interface TreeNavigatorProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
}

export function TreeNavigator({
  parsedArchitecture,
  selectedElementId,
  onSelectElement
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
                onClick={() => onSelectElement(node.id)}
                type="button"
              >
                <span>{node.label}</span>
                <small>{node.type}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
