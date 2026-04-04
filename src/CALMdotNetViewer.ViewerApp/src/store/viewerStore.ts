import { create } from "zustand";
import type { ArchitectureDocument, ParsedArchitecture } from "../features/architecture/types";

interface ViewerStore {
  architecture: ArchitectureDocument | null;
  parsedArchitecture: ParsedArchitecture | null;
  selectedElementId: string | null;
  isLoading: boolean;
  error: string | null;
  setArchitecture: (architecture: ArchitectureDocument, parsedArchitecture: ParsedArchitecture) => void;
  setSelectedElementId: (id: string | null) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
}

export const useViewerStore = create<ViewerStore>((set) => ({
  architecture: null,
  parsedArchitecture: null,
  selectedElementId: null,
  isLoading: false,
  error: null,
  setArchitecture: (architecture, parsedArchitecture) =>
    set({
      architecture,
      parsedArchitecture,
      selectedElementId: parsedArchitecture.nodes[0]?.id ?? null,
      error: null
    }),
  setSelectedElementId: (id) => set({ selectedElementId: id }),
  setLoading: (value) => set({ isLoading: value }),
  setError: (message) => set({ error: message })
}));
