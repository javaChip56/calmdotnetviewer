import { useEffect, useRef, useState, type MouseEvent, type Ref } from "react";
import type { ParsedArchitecture } from "../architecture/types";
import { renderBlockArchitecture } from "./renderBlockArchitecture";
import { renderFlowSequenceDiagram } from "./renderFlowSequenceDiagram";
import { renderRelatedNodesDiagram } from "./renderRelatedNodesDiagram";
import { findRenderedMermaidNodeElements, resolveRenderedMermaidNodeId } from "./mermaidNodeDom";
import { PanZoomManager } from "./panZoomManager";

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

interface FocusedFlowDiagramSet {
  architecture: RenderedDiagram;
  flowSequence: RenderedDiagram;
  interfaces: RenderedDiagram;
}

function DiagramSection({
  title,
  diagram,
  containerRef,
  onClick,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit
}: {
  title: string;
  diagram: RenderedDiagram;
  containerRef?: Ref<HTMLDivElement>;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onFit?: () => void;
}) {
  return (
    <div className="diagram-section">
      <div className="diagram-section-header">
        <h3>{title}</h3>
        <div className="diagram-controls" aria-label={`${title} controls`}>
          <button className="diagram-control-btn" onClick={onZoomOut} type="button">
            -
          </button>
          <button className="diagram-control-btn" onClick={onZoomIn} type="button">
            +
          </button>
          <button className="diagram-control-btn" onClick={onReset} type="button">
            Reset
          </button>
          <button className="diagram-control-btn" onClick={onFit} type="button">
            Fit
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="diagram-canvas"
        onClick={onClick}
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
  const selectedFlow = parsedArchitecture.flows.find((flow) => flow.id === focusElementId) ?? null;
  const [mainDiagram, setMainDiagram] = useState<RenderedDiagram | null>(null);
  const [focusedDiagrams, setFocusedDiagrams] = useState<FocusedDiagramSet | null>(null);
  const [focusedFlowDiagrams, setFocusedFlowDiagrams] = useState<FocusedFlowDiagramSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mainCanvasRef = useRef<HTMLDivElement | null>(null);
  const focusedArchitectureRef = useRef<HTMLDivElement | null>(null);
  const relatedNodesRef = useRef<HTMLDivElement | null>(null);
  const interfaceViewRef = useRef<HTMLDivElement | null>(null);
  const flowArchitectureRef = useRef<HTMLDivElement | null>(null);
  const flowSequenceRef = useRef<HTMLDivElement | null>(null);
  const flowInterfacesRef = useRef<HTMLDivElement | null>(null);
  const mainPanZoomRef = useRef<PanZoomManager | null>(null);
  const focusedArchitecturePanZoomRef = useRef<PanZoomManager | null>(null);
  const relatedNodesPanZoomRef = useRef<PanZoomManager | null>(null);
  const interfaceViewPanZoomRef = useRef<PanZoomManager | null>(null);
  const flowArchitecturePanZoomRef = useRef<PanZoomManager | null>(null);
  const flowSequencePanZoomRef = useRef<PanZoomManager | null>(null);
  const flowInterfacesPanZoomRef = useRef<PanZoomManager | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagrams() {
      try {
        const selectedNodeId = parsedArchitecture.nodes.some((node) => node.id === selectedElementId)
          ? selectedElementId
          : null;
        const nextMainDiagram = await renderBlockArchitecture(parsedArchitecture, selectedNodeId, null);
        const nextFocusedDiagrams = selectedNode
          ? await Promise.all([
              renderBlockArchitecture(parsedArchitecture, selectedNode.id, selectedNode.id),
              renderRelatedNodesDiagram(parsedArchitecture, selectedNode.id),
              renderBlockArchitecture(parsedArchitecture, selectedNode.id, selectedNode.id, undefined, {
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
        const nextFocusedFlowDiagrams = selectedFlow
          ? await Promise.all([
              renderBlockArchitecture(parsedArchitecture, null, null, undefined, {
                "focus-flows": selectedFlow.id
              }),
              renderFlowSequenceDiagram(parsedArchitecture, selectedFlow.id),
              renderBlockArchitecture(parsedArchitecture, null, null, undefined, {
                "focus-flows": selectedFlow.id,
                "render-interfaces": true,
                "edges": "connected",
                "include-containers": "none"
              })
            ]).then(([architecture, flowSequence, interfaces]) => ({
              architecture,
              flowSequence,
              interfaces
            }))
          : null;

        if (cancelled) {
          return;
        }

        setMainDiagram(nextMainDiagram);
        setFocusedDiagrams(nextFocusedDiagrams);
        setFocusedFlowDiagrams(nextFocusedFlowDiagrams);
        setError(null);
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : String(renderError));
          setMainDiagram(null);
          setFocusedDiagrams(null);
          setFocusedFlowDiagrams(null);
        }
      }
    }

    void renderDiagrams();

    return () => {
      cancelled = true;
    };
  }, [focusElementId, parsedArchitecture, selectedElementId, selectedFlow, selectedNode]);

  useEffect(() => {
    const bindings: Array<[RenderedDiagram | null, HTMLDivElement | null]> = [
      [mainDiagram, mainCanvasRef.current],
      [focusedDiagrams?.architecture ?? null, focusedArchitectureRef.current],
      [focusedDiagrams?.relatedNodes ?? null, relatedNodesRef.current],
      [focusedDiagrams?.interfaceView ?? null, interfaceViewRef.current],
      [focusedFlowDiagrams?.architecture ?? null, flowArchitectureRef.current],
      [focusedFlowDiagrams?.flowSequence ?? null, flowSequenceRef.current],
      [focusedFlowDiagrams?.interfaces ?? null, flowInterfacesRef.current]
    ];

    for (const [diagram, element] of bindings) {
      if (diagram?.bindFunctions && element) {
        diagram.bindFunctions(element);
      }
    }
  }, [focusedDiagrams, focusedFlowDiagrams, mainDiagram]);

  useEffect(() => {
    const sections: Array<[HTMLDivElement | null, React.MutableRefObject<PanZoomManager | null>]> = [
      [mainCanvasRef.current, mainPanZoomRef],
      [focusedArchitectureRef.current, focusedArchitecturePanZoomRef],
      [relatedNodesRef.current, relatedNodesPanZoomRef],
      [interfaceViewRef.current, interfaceViewPanZoomRef],
      [flowArchitectureRef.current, flowArchitecturePanZoomRef],
      [flowSequenceRef.current, flowSequencePanZoomRef],
      [flowInterfacesRef.current, flowInterfacesPanZoomRef]
    ];

    for (const [container, managerRef] of sections) {
      managerRef.current?.destroy();
      managerRef.current = null;

      const svgElement = container?.querySelector("svg");
      if (!container || !(svgElement instanceof SVGSVGElement)) {
        continue;
      }

      const manager = new PanZoomManager();
      manager.initialize(svgElement);
      managerRef.current = manager;
    }

    return () => {
      for (const [, managerRef] of sections) {
        managerRef.current?.destroy();
        managerRef.current = null;
      }
    };
  }, [focusedDiagrams, focusedFlowDiagrams, mainDiagram]);

  useEffect(() => {
    const containers = [
      mainCanvasRef.current,
      focusedArchitectureRef.current,
      relatedNodesRef.current,
      interfaceViewRef.current,
      flowArchitectureRef.current,
      flowSequenceRef.current,
      flowInterfacesRef.current
    ];

    for (const container of containers) {
      if (!container) {
        continue;
      }

      for (const node of parsedArchitecture.nodes) {
        const renderedElements = findRenderedMermaidNodeElements(container, node.id);
        for (const element of renderedElements) {
          element.setAttribute("data-calm-node-id", node.id);
          element.classList.add("calm-node-click-target");
        }
      }
    }
  }, [focusedDiagrams, focusedFlowDiagrams, mainDiagram, parsedArchitecture.nodes]);

  function handleDiagramClick(event: MouseEvent<HTMLDivElement>, container: HTMLDivElement | null) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const taggedNodeElement = target.closest("[data-calm-node-id]");
    const taggedNodeId = taggedNodeElement?.getAttribute("data-calm-node-id");
    if (taggedNodeId) {
      event.preventDefault();
      onSelectElement(taggedNodeId);
      return;
    }

    const nodeId = resolveRenderedMermaidNodeId(
      target,
      parsedArchitecture.nodes.map((node) => node.id),
      container
    );

    if (!nodeId) {
      return;
    }

    event.preventDefault();
    onSelectElement(nodeId);
  }

  return (
    <section className="panel panel-diagram-viewer">
      <div className="panel-header">
        <h2>{selectedNode ? selectedNode.label : selectedFlow ? selectedFlow.label : "Architecture Overview"}</h2>
        <div className="diagram-header-actions">
          <span className="panel-meta">
            {selectedNode ? "Node preview" : selectedFlow ? "Flow preview" : "Full architecture"}
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
        <DiagramSection
          title="Architecture Overview"
          diagram={mainDiagram}
          containerRef={mainCanvasRef}
          onClick={(event) => handleDiagramClick(event, mainCanvasRef.current)}
          onZoomIn={() => mainPanZoomRef.current?.zoomIn()}
          onZoomOut={() => mainPanZoomRef.current?.zoomOut()}
          onReset={() => mainPanZoomRef.current?.reset()}
          onFit={() => mainPanZoomRef.current?.fit()}
        />
      ) : null}

      {selectedNode && focusedDiagrams ? (
        <div className="diagram-focus-stack">
          <DiagramSection
            title="Architecture"
            diagram={focusedDiagrams.architecture}
            containerRef={focusedArchitectureRef}
            onClick={(event) => handleDiagramClick(event, focusedArchitectureRef.current)}
            onZoomIn={() => focusedArchitecturePanZoomRef.current?.zoomIn()}
            onZoomOut={() => focusedArchitecturePanZoomRef.current?.zoomOut()}
            onReset={() => focusedArchitecturePanZoomRef.current?.reset()}
            onFit={() => focusedArchitecturePanZoomRef.current?.fit()}
          />
          <DiagramSection
            title="Related Nodes"
            diagram={focusedDiagrams.relatedNodes}
            containerRef={relatedNodesRef}
            onClick={(event) => handleDiagramClick(event, relatedNodesRef.current)}
            onZoomIn={() => relatedNodesPanZoomRef.current?.zoomIn()}
            onZoomOut={() => relatedNodesPanZoomRef.current?.zoomOut()}
            onReset={() => relatedNodesPanZoomRef.current?.reset()}
            onFit={() => relatedNodesPanZoomRef.current?.fit()}
          />
          <DiagramSection
            title="Interface View"
            diagram={focusedDiagrams.interfaceView}
            containerRef={interfaceViewRef}
            onClick={(event) => handleDiagramClick(event, interfaceViewRef.current)}
            onZoomIn={() => interfaceViewPanZoomRef.current?.zoomIn()}
            onZoomOut={() => interfaceViewPanZoomRef.current?.zoomOut()}
            onReset={() => interfaceViewPanZoomRef.current?.reset()}
            onFit={() => interfaceViewPanZoomRef.current?.fit()}
          />
        </div>
      ) : null}

      {selectedFlow && focusedFlowDiagrams ? (
        <div className="diagram-focus-stack">
          <DiagramSection
            title="Architecture"
            diagram={focusedFlowDiagrams.architecture}
            containerRef={flowArchitectureRef}
            onClick={(event) => handleDiagramClick(event, flowArchitectureRef.current)}
            onZoomIn={() => flowArchitecturePanZoomRef.current?.zoomIn()}
            onZoomOut={() => flowArchitecturePanZoomRef.current?.zoomOut()}
            onReset={() => flowArchitecturePanZoomRef.current?.reset()}
            onFit={() => flowArchitecturePanZoomRef.current?.fit()}
          />
          <DiagramSection
            title="Flow Sequence"
            diagram={focusedFlowDiagrams.flowSequence}
            containerRef={flowSequenceRef}
            onZoomIn={() => flowSequencePanZoomRef.current?.zoomIn()}
            onZoomOut={() => flowSequencePanZoomRef.current?.zoomOut()}
            onReset={() => flowSequencePanZoomRef.current?.reset()}
            onFit={() => flowSequencePanZoomRef.current?.fit()}
          />
          <DiagramSection
            title="Interfaces"
            diagram={focusedFlowDiagrams.interfaces}
            containerRef={flowInterfacesRef}
            onClick={(event) => handleDiagramClick(event, flowInterfacesRef.current)}
            onZoomIn={() => flowInterfacesPanZoomRef.current?.zoomIn()}
            onZoomOut={() => flowInterfacesPanZoomRef.current?.zoomOut()}
            onReset={() => flowInterfacesPanZoomRef.current?.reset()}
            onFit={() => flowInterfacesPanZoomRef.current?.fit()}
          />
        </div>
      ) : null}
    </section>
  );
}
