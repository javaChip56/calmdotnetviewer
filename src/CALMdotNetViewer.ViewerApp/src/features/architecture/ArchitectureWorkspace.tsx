import { useEffect, useState, type ChangeEvent } from "react";
import { architectureApiClient } from "../../api/architectureApiClient";
import { useViewerStore } from "../../store/viewerStore";
import { DetailsPanel } from "../details/DetailsPanel";
import { DiagramViewer } from "../diagram/DiagramViewer";
import { TreeNavigator } from "../tree/TreeNavigator";
import { parseArchitecture } from "./parseArchitecture";
import type { ArchitectureSummary } from "./types";
import {
  formatValidationError,
  formatValidationNotice,
  selectInitialArchitectureId
} from "./workspaceState";

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
  const [architectures, setArchitectures] = useState<ArchitectureSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeWorkspace() {
      try {
        setLoading(true);
        setError(null);
        const availableArchitectures = await architectureApiClient.getArchitectures();
        if (cancelled) {
          return;
        }

        setArchitectures(availableArchitectures);
        const initialArchitectureId = selectInitialArchitectureId(availableArchitectures);
        if (!initialArchitectureId) {
          setNotice("No architectures are currently available. Upload a CALM JSON file to get started.");
          return;
        }

        const loadedArchitecture = await architectureApiClient.getArchitecture(initialArchitectureId);
        if (cancelled) {
          return;
        }

        setArchitecture(loadedArchitecture, parseArchitecture(loadedArchitecture.content));
        setNotice(null);
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

    void initializeWorkspace();

    return () => {
      cancelled = true;
    };
  }, [setArchitecture, setError, setLoading]);

  async function handleArchitectureChange(event: ChangeEvent<HTMLSelectElement>) {
    const architectureId = event.target.value;
    if (!architectureId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const loadedArchitecture = await architectureApiClient.getArchitecture(architectureId);
      setArchitecture(loadedArchitecture, parseArchitecture(loadedArchitecture.content));
      setNotice(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const content = await file.text();
      const validation = await architectureApiClient.validateArchitecture(content, file.name);
      const validationError = formatValidationError(validation);
      if (validationError) {
        setError(validationError);
        setNotice(null);
        return;
      }

      const createdArchitecture = await architectureApiClient.createArchitecture(
        file.name,
        content,
        file.type || "application/json"
      );
      const availableArchitectures = await architectureApiClient.getArchitectures();

      setArchitectures(availableArchitectures);
      setArchitecture(createdArchitecture, parseArchitecture(createdArchitecture.content));
      setNotice(formatValidationNotice(validation) ?? `Loaded ${file.name} successfully.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="workspace-header">
        <div>
          <h1>{architecture?.title ?? "CALMdotNetViewer"}</h1>
          <p className="subtitle">Open a stored architecture or upload a CALM JSON file to inspect it in the viewer.</p>
        </div>
        <div className="workspace-controls">
          <label className="field-group">
            <span>Open architecture</span>
            <select
              disabled={architectures.length === 0}
              value={architecture?.id ?? ""}
              onChange={handleArchitectureChange}
            >
              {architectures.length === 0 ? (
                <option value="">No stored architectures</option>
              ) : (
                architectures.map((summary) => (
                  <option key={summary.id} value={summary.id}>
                    {summary.title}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="upload-button">
            <input accept=".json,application/json" onChange={handleFileUpload} type="file" />
            Upload JSON
          </label>
        </div>
      </header>

      <section className="workspace-meta">
        {architecture ? <span>{architecture.id}</span> : null}
        {parsedArchitecture ? <span>{parsedArchitecture.nodes.length} nodes</span> : null}
        {parsedArchitecture ? <span>{parsedArchitecture.edges.length} relationships</span> : null}
        <span>{architectures.length} loaded documents</span>
      </section>

      {isLoading && !architecture ? (
        <p className="status-banner">Loading architecture...</p>
      ) : null}

      {error ? (
        <p className="status-banner is-error">{error}</p>
      ) : null}

      {notice ? (
        <p className="status-banner is-info">{notice}</p>
      ) : null}

      {architecture && parsedArchitecture ? (
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
            architecture={architecture}
            parsedArchitecture={parsedArchitecture}
            selectedElementId={selectedElementId}
          />
        </main>
      ) : (
        <section className="panel">
          <div className="panel-header">
            <h2>No architecture loaded</h2>
            <span className="panel-meta">Upload to begin</span>
          </div>
          <p>Select an existing document from the list or upload a CALM JSON file to load it into the viewer.</p>
        </section>
      )}
    </>
  );
}
