import type { ParsedArchitecture } from "../architecture/types";

interface DiagramViewerProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
}

export function DiagramViewer({
  parsedArchitecture,
  selectedElementId,
  onSelectElement
}: DiagramViewerProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Diagram</h2>
        <span className="panel-meta">Placeholder viewer scaffold</span>
      </div>

      <div className="diagram-grid">
        {parsedArchitecture.nodes.map((node) => (
          <button
            key={node.id}
            className={`diagram-node${selectedElementId === node.id ? " is-selected" : ""}`}
            onClick={() => onSelectElement(node.id)}
            type="button"
          >
            <strong>{node.label}</strong>
            <span>{node.type}</span>
          </button>
        ))}
      </div>

      <div className="diagram-relationships">
        <h3>Relationships</h3>
        <ul>
          {parsedArchitecture.edges.map((edge) => (
            <li key={edge.id}>
              <code>{edge.source}</code> -&gt; <code>{edge.target}</code> ({edge.label})
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
