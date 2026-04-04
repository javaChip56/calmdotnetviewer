export interface ArchitectureReference {
  reference: string;
  resolvedId: string | null;
  label: string;
  resolutionStatus: string;
}

export interface ArchitectureMetadata {
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureDocument {
  id: string;
  title: string;
  content: string;
  format: string;
  schema: string | null;
  linkedArchitectures: ArchitectureReference[];
  metadata: ArchitectureMetadata;
}

export interface ArchitectureSummary {
  id: string;
  title: string;
  schema: string | null;
  updatedAt: string;
}

export interface ValidationIssue {
  severity: string;
  code: string;
  message: string;
  path?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
}

export interface ParsedArchitecture {
  nodes: GraphNode[];
  edges: GraphEdge[];
  raw: unknown;
}
