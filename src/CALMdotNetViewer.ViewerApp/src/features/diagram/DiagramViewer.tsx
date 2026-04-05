import { useEffect, useRef, useState, type MouseEvent, type Ref } from "react";
import type { ParsedArchitecture } from "../architecture/types";
import { renderBlockArchitecture } from "./renderBlockArchitecture";
import { renderRelatedNodesDiagram } from "./renderRelatedNodesDiagram";
import { resolveRenderedMermaidNodeId } from "./mermaidNodeDom";

interface DiagramViewerProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  focusElementId: string | null;
  onSelectElement: (id: string) => void;
  onClearFocus: () => void;
}

interface RenderedDiagram {
  svg: string;
  warnings: string[];
  bindFunctions?: (element: Element) => void;
}

interface FocusedDiagramSet {
  architecture: RenderedDiagram;
  relatedNodes: RenderedDiagram;
  interfaceView: RenderedDiagram;
}

function DiagramSection({
  title,
  diagram,
  containerRef
}: {
  title: string;
  diagram: RenderedDiagram;
  containerRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="diagram-section">
      <h3>{title}</h3>
      <div
        ref={containerRef}
        className="diagram-canvas"
        dangerouslySetInnerHTML={{ __html: diagram.svg }}
      />
      {diagram.warnings.length > 0 ? (
        <div className="diagram-warnings">
          <h4>Diagram warnings</h4>
          <ul>
            {diagram.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function DiagramViewer({
  parsedArchitecture,
  selectedElementId,
  focusElementId,
  onSelectElement,
  onClearFocus
}: DiagramViewerProps) {
  const selectedNode = parsedArchitecture.nodes.find((node) => node.id === focusElementId) ?? null;
  const [mainDiagram, setMainDiagram] = useState<RenderedDiagram | null>(null);
  const [focusedDiagrams, setFocusedDiagrams] = useState<FocusedDiagramSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mainCanvasRef = useRef<HTMLDivElement | null>(null);
  const focusedArchitectureRef = useRef<HTMLDivElement | null>(null);
  const relatedNodesRef = useRef<HTMLDivElement | null>(null);
  const interfaceViewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagrams() {
      try {
        const nextMainDiagram = await renderBlockArchitecture(parsedArchitecture, selectedElementId, null);
        const nextFocusedDiagrams = focusElementId
          ? await Promise.all([
              renderBlockArchitecture(parsedArchitecture, selectedElementId, focusElementId),
              renderRelatedNodesDiagram(parsedArchitecture, focusElementId),
              renderBlockArchitecture(parsedArchitecture, selectedElementId, focusElementId, undefined, {
                "render-interfaces": true,
                "include-containers": "none",
                "include-children": "none",
                "edges": "connected"
              })
            ]).then(([architecture, relatedNodes, interfaceView]) => ({
              architecture,
              relatedNodes,
              interfaceView
            }))
          : null;

        if (cancelled) {
          return;
        }

        setMainDiagram(nextMainDiagram);
        setFocusedDiagrams(nextFocusedDiagrams);
        setError(null);
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : String(renderError));
          setMainDiagram(null);
          setFocusedDiagrams(null);
        }
      }
    }

    void renderDiagrams();

    return () => {
      cancelled = true;
    };
  }, [focusElementId, parsedArchitecture, selectedElementId]);

  useEffect(() => {
    const bindings: Array<[RenderedDiagram | null, HTMLDivElement | null]> = [
      [mainDiagram, mainCanvasRef.current],
      [focusedDiagrams?.architecture ?? null, focusedArchitectureRef.current],
      [focusedDiagrams?.relatedNodes ?? null, relatedNodesRef.current],
      [focusedDiagrams?.interfaceView ?? null, interfaceViewRef.current]
    ];

    for (const [diagram, element] of bindings) {
      if (diagram?.bindFunctions && element) {
        diagram.bindFunctions(element);
      }
    }
  }, [focusedDiagrams, mainDiagram]);

  function handleDiagramClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const nodeId = resolveRenderedMermaidNodeId(
      target,
      parsedArchitecture.nodes.map((node) => node.id),
      mainCanvasRef.current
    );

    if (!nodeId) {
      return;
    }

    event.preventDefault();
    onSelectElement(nodeId);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{selectedNode ? selectedNode.label : "Architecture Overview"}</h2>
        <div className="diagram-header-actions">
          <span className="panel-meta">
            {focusElementId ? "Node preview" : "Full architecture"}
          </span>
          {focusElementId ? (
            <button className="secondary-button" onClick={onClearFocus} type="button">
              Show full architecture
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="status-banner is-error">{error}</p> : null}

      {!focusElementId && mainDiagram ? (
        <div onClick={handleDiagramClick}>
          <DiagramSection
            title="Architecture Overview"
            diagram={mainDiagram}
            containerRef={mainCanvasRef}
          />
        </div>
      ) : null}

      {focusElementId && focusedDiagrams ? (
        <div className="diagram-focus-stack">
          <DiagramSection
            title="Architecture"
            diagram={focusedDiagrams.architecture}
            containerRef={focusedArchitectureRef}
          />
          <DiagramSection
            title="Related Nodes"
            diagram={focusedDiagrams.relatedNodes}
            containerRef={relatedNodesRef}
          />
          <DiagramSection
            title="Interface View"
            diagram={focusedDiagrams.interfaceView}
            containerRef={interfaceViewRef}
          />
        </div>
      ) : null}
    </section>
  );
}
