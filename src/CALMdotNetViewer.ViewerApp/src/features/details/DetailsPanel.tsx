import type { ArchitectureDocument, ParsedArchitecture } from "../architecture/types";
import { resolveSelectedNodeLinkedArchitectures } from "../architecture/linkedArchitectureReferences";

interface DetailsPanelProps {
  architecture: ArchitectureDocument;
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  navigationParent: {
    id: string;
    title: string;
  } | null;
  onOpenLinkedArchitecture: (linkedId: string) => void;
  onReturnToParent: () => void;
}

export function DetailsPanel({
  architecture,
  parsedArchitecture,
  selectedElementId,
  navigationParent,
  onOpenLinkedArchitecture,
  onReturnToParent
}: DetailsPanelProps) {
  const selectedNode = parsedArchitecture.nodes.find((node) => node.id === selectedElementId) ?? null;
  const selectedNodeRaw = selectedNode ? parsedArchitecture.nodeLookup[selectedNode.id] : parsedArchitecture.raw;
  const linkedArchitectures = selectedNode
    ? resolveSelectedNodeLinkedArchitectures(selectedNodeRaw, architecture.linkedArchitectures)
    : [];

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Details</h2>
        <span className="panel-meta">{selectedNode ? selectedNode.id : "No selection"}</span>
      </div>

      <div className="details-summary">
        <p><strong>Architecture:</strong> {architecture.title}</p>
        <p><strong>Linked documents:</strong> {architecture.linkedArchitectures.length}</p>
        {navigationParent ? (
          <p>
            <strong>Opened from:</strong>{" "}
            <button className="inline-link-button" onClick={onReturnToParent} type="button">
              {navigationParent.title}
            </button>
          </p>
        ) : null}
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

      {linkedArchitectures.length > 0 ? (
        <div className="details-linked">
          <h3>Linked Architectures</h3>
          <ul className="details-linked-list">
            {linkedArchitectures.map((linkedArchitecture) => (
              <li key={linkedArchitecture.reference}>
                <div>
                  <strong>{linkedArchitecture.label}</strong>
                  <p>{linkedArchitecture.reference}</p>
                </div>
                <button
                  disabled={!linkedArchitecture.resolvedId}
                  onClick={() => linkedArchitecture.resolvedId && onOpenLinkedArchitecture(linkedArchitecture.resolvedId)}
                  type="button"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="details-raw">
        <h3>Raw JSON</h3>
        <pre>{JSON.stringify(selectedNodeRaw, null, 2)}</pre>
      </div>
    </aside>
  );
}
