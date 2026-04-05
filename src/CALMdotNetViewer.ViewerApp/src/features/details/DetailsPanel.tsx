import type { ArchitectureDocument, ParsedArchitecture } from "../architecture/types";

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

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function buildOverviewEntries(selectedNodeRaw: unknown): DetailEntry[] {
  if (!isRecord(selectedNodeRaw)) {
    return [];
  }

  return [
    { label: "Unique Id", value: toDisplayValue(selectedNodeRaw["unique-id"]) },
    { label: "Name", value: toDisplayValue(selectedNodeRaw.name) },
    { label: "Description", value: toDisplayValue(selectedNodeRaw.description) },
    { label: "Node Type", value: toDisplayValue(selectedNodeRaw["node-type"]) }
  ];
}

function buildMetadataEntries(selectedNodeRaw: unknown): DetailEntry[] {
  if (!isRecord(selectedNodeRaw) || !isRecord(selectedNodeRaw.metadata)) {
    return [];
  }

  return Object.entries(selectedNodeRaw.metadata).map(([key, value]) => ({
    label: key,
    value: toDisplayValue(value)
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
          <dd>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailsPanel({
  architecture,
  parsedArchitecture,
  selectedElementId,
  navigationParent: _navigationParent,
  onOpenLinkedArchitecture: _onOpenLinkedArchitecture,
  onReturnToParent: _onReturnToParent
}: DetailsPanelProps) {
  const selectedNode = parsedArchitecture.nodes.find((node) => node.id === selectedElementId) ?? null;
  const selectedNodeRaw = selectedNode ? parsedArchitecture.nodeLookup[selectedNode.id] : null;
  const overviewEntries = buildOverviewEntries(selectedNodeRaw);
  const metadataEntries = buildMetadataEntries(selectedNodeRaw);

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>{selectedNode?.label ?? architecture.title}</h2>
        <span className="panel-meta">{selectedNode ? "Node details" : "No selection"}</span>
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
        <p>Select a node from the architecture diagram or the tree to view its preview.</p>
      )}
    </aside>
  );
}
