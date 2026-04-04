import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ParsedArchitecture } from "../architecture/types";
import { findRenderedMermaidNodeElements } from "./mermaidNodeDom";
import { renderBlockArchitecture } from "./renderBlockArchitecture";
import { renderRelatedNodesDiagram } from "./renderRelatedNodesDiagram";

interface DiagramViewerProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  focusElementId: string | null;
  onSelectElement: (id: string) => void;
  onClearFocus: () => void;
}

export function DiagramViewer({
  parsedArchitecture,
  selectedElementId,
  focusElementId,
  onSelectElement,
  onClearFocus
}: DiagramViewerProps) {
  const [svg, setSvg] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const bindFunctionsRef = useRef<((element: Element) => void) | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const result = focusElementId
          ? await renderRelatedNodesDiagram(parsedArchitecture, focusElementId)
          : await renderBlockArchitecture(parsedArchitecture, selectedElementId, null);
        if (cancelled) {
          return;
        }

        setSvg(result.svg);
        setWarnings(result.warnings);
        setError(null);
        bindFunctionsRef.current = result.bindFunctions;
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : String(renderError));
          setSvg("");
          setWarnings([]);
          bindFunctionsRef.current = undefined;
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [focusElementId, parsedArchitecture, selectedElementId]);

  useEffect(() => {
    if (!svg || !canvasRef.current || !bindFunctionsRef.current) {
      return;
    }

    bindFunctionsRef.current(canvasRef.current);
  }, [svg]);

  useEffect(() => {
    if (!svg || !canvasRef.current) {
      return;
    }

    const cleanupHandlers: Array<() => void> = [];

    for (const node of parsedArchitecture.nodes) {
      const nodeId = node.id;
      const nodeElements = findRenderedMermaidNodeElements(canvasRef.current, nodeId);

      for (const nodeElement of nodeElements) {
        nodeElement.setAttribute("data-calm-node-id", nodeId);
        nodeElement.classList.add("calm-node-click-target");

        const handleNodeClick = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelectElement(nodeId);
        };

        nodeElement.addEventListener("click", handleNodeClick);
        cleanupHandlers.push(() => {
          nodeElement.removeEventListener("click", handleNodeClick);
        });
      }
    }

    return () => {
      for (const cleanup of cleanupHandlers) {
        cleanup();
      }
    };
  }, [onSelectElement, parsedArchitecture.nodes, svg]);

  function handleDiagramClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const nodeElement = target.closest("[data-calm-node-id]");
    const nodeId = nodeElement?.getAttribute("data-calm-node-id");
    if (nodeId) {
      event.preventDefault();
      onSelectElement(nodeId);
      return;
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Diagram</h2>
        <div className="diagram-header-actions">
          <span className="panel-meta">
            {focusElementId ? `Node view: ${focusElementId}` : "Full architecture"}
          </span>
          {focusElementId ? (
            <button className="secondary-button" onClick={onClearFocus} type="button">
              Show full architecture
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="status-banner is-error">{error}</p>
      ) : (
        <div
          ref={canvasRef}
          className="diagram-canvas"
          onClick={handleDiagramClick}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <div className="diagram-node-picker">
        <h3>Focus a node</h3>
        <div className="diagram-node-list">
          {parsedArchitecture.nodes.map((node) => (
            <button
              key={node.id}
              className={`diagram-node${focusElementId === node.id ? " is-selected" : ""}`}
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
