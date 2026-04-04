import { useEffect } from "react";
import { architectureApiClient } from "../../api/architectureApiClient";
import { useViewerStore } from "../../store/viewerStore";
import { DetailsPanel } from "../details/DetailsPanel";
import { DiagramViewer } from "../diagram/DiagramViewer";
import { TreeNavigator } from "../tree/TreeNavigator";
import { parseArchitecture } from "./parseArchitecture";

export function ArchitectureWorkspace() {
  const {
    architecture,
    parsedArchitecture,
    selectedElementId,
    isLoading,
    error,
    setArchitecture,
    setSelectedElementId,
    setLoading,
    setError
  } = useViewerStore();

  useEffect(() => {
    let cancelled = false;

    async function loadDefaultArchitecture() {
      try {
        setLoading(true);
        const loadedArchitecture = await architectureApiClient.getArchitecture("payments-architecture");
        if (cancelled) {
          return;
        }

        setArchitecture(loadedArchitecture, parseArchitecture(loadedArchitecture.content));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDefaultArchitecture();

    return () => {
      cancelled = true;
    };
  }, [setArchitecture, setError, setLoading]);

  if (isLoading) {
    return <p className="status-banner">Loading sample architecture...</p>;
  }

  if (error) {
    return <p className="status-banner is-error">{error}</p>;
  }

  if (!architecture || !parsedArchitecture) {
    return <p className="status-banner">No architecture loaded.</p>;
  }

  return (
    <>
      <header className="workspace-header">
        <div>
          <h1>{architecture.title}</h1>
          <p className="subtitle">CALMdotNetViewer frontend scaffold</p>
        </div>
        <div className="workspace-meta">
          <span>{architecture.id}</span>
          <span>{parsedArchitecture.nodes.length} nodes</span>
          <span>{parsedArchitecture.edges.length} relationships</span>
        </div>
      </header>

      <main className="workspace-grid">
        <TreeNavigator
          parsedArchitecture={parsedArchitecture}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
        />
        <DiagramViewer
          parsedArchitecture={parsedArchitecture}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
        />
        <DetailsPanel
          parsedArchitecture={parsedArchitecture}
          selectedElementId={selectedElementId}
        />
      </main>
    </>
  );
}
