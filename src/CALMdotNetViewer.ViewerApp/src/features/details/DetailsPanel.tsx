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

type DetailEntry = {
  label: string;
  value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function toOverviewEntries(selectedNodeRaw: unknown): DetailEntry[] {
  if (!isRecord(selectedNodeRaw)) {
    return [];
  }

  const hiddenKeys = new Set(["metadata", "details", "controls", "interfaces"]);

  return Object.entries(selectedNodeRaw)
    .filter(([key, value]) => !hiddenKeys.has(key) && !isRecord(value) && !Array.isArray(value))
    .map(([key, value]) => ({
      label: key,
      value: stringifyValue(value)
    }));
}

function toMetadataEntries(selectedNodeRaw: unknown): DetailEntry[] {
  if (!isRecord(selectedNodeRaw) || !isRecord(selectedNodeRaw.metadata)) {
    return [];
  }

  return Object.entries(selectedNodeRaw.metadata).map(([key, value]) => ({
    label: key,
    value: stringifyValue(value)
  }));
}

function DetailList({ entries }: { entries: DetailEntry[] }) {
  if (entries.length === 0) {
    return <p className="details-empty">No data available.</p>;
  }

  return (
    <dl className="details-list">
      {entries.map((entry) => (
        <div className="details-list-row" key={entry.label}>
          <dt>{entry.label}</dt>
          <dd>{entry.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
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
  const overviewEntries = toOverviewEntries(selectedNodeRaw);
  const metadataEntries = toMetadataEntries(selectedNodeRaw);

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Node Preview</h2>
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
        <>
          <section className="details-section">
            <h3>Overview</h3>
            <DetailList entries={overviewEntries} />
          </section>

          <section className="details-section">
            <h3>Metadata</h3>
            <DetailList entries={metadataEntries} />
          </section>
        </>
      ) : (
        <p>Select a node to inspect its overview and metadata.</p>
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
