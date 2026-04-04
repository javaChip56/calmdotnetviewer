import type { ArchitectureDocument, ParsedArchitecture } from "../architecture/types";

interface DetailsPanelProps {
  architecture: ArchitectureDocument;
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
}

export function DetailsPanel({ architecture, parsedArchitecture, selectedElementId }: DetailsPanelProps) {
  const selectedNode = parsedArchitecture.nodes.find((node) => node.id === selectedElementId) ?? null;
  const selectedNodeRaw = selectedNode ? parsedArchitecture.nodeLookup[selectedNode.id] : parsedArchitecture.raw;

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Details</h2>
        <span className="panel-meta">{selectedNode ? selectedNode.id : "No selection"}</span>
      </div>

      <div className="details-summary">
        <p><strong>Architecture:</strong> {architecture.title}</p>
        <p><strong>Linked documents:</strong> {architecture.linkedArchitectures.length}</p>
      </div>

      {selectedNode ? (
        <div className="details-content">
          <dl>
            <dt>Label</dt>
            <dd>{selectedNode.label}</dd>
            <dt>Type</dt>
            <dd>{selectedNode.type}</dd>
            <dt>Id</dt>
            <dd><code>{selectedNode.id}</code></dd>
          </dl>
        </div>
      ) : (
        <p>Select a node to inspect its details.</p>
      )}

      <div className="details-raw">
        <h3>Raw JSON</h3>
        <pre>{JSON.stringify(selectedNodeRaw, null, 2)}</pre>
      </div>
    </aside>
  );
}
