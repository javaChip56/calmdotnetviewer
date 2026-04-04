import { useEffect, useState } from "react";
import type { ParsedArchitecture } from "../architecture/types";
import { renderBlockArchitecture } from "./renderBlockArchitecture";

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
  const [svg, setSvg] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const result = await renderBlockArchitecture(parsedArchitecture, selectedElementId);
        if (cancelled) {
          return;
        }

        setSvg(result.svg);
        setWarnings(result.warnings);
        setError(null);
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : String(renderError));
          setSvg("");
          setWarnings([]);
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [parsedArchitecture, selectedElementId]);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Diagram</h2>
        <span className="panel-meta">Block-architecture widget + Mermaid</span>
      </div>

      {error ? (
        <p className="status-banner is-error">{error}</p>
      ) : (
        <div
          className="diagram-canvas"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <div className="diagram-node-picker">
        <h3>Highlight a node</h3>
        <div className="diagram-node-list">
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

      {warnings.length > 0 ? (
        <div className="diagram-warnings">
          <h3>Diagram warnings</h3>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
