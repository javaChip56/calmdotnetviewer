# CALMdotNetViewer Product Specification

## Project Name

The project name is `CALMdotNetViewer`.

## Purpose

This document captures the feasibility assessment and initial target architecture for building `CALMdotNetViewer`, a .NET web application that reproduces the core user-facing capabilities of the existing CALM VS Code plugin.

The goal is not to replicate the VS Code extension shell. The goal is to reproduce the capabilities that matter in a browser-based application.

## In Scope

The initial application scope focuses on these core capabilities:

- Load a CALM architecture JSON file
- Provide a node viewer, including a rendered diagram
- Support navigation across different levels of the diagram

For this document, "different levels of the diagram" means:

- Viewing the full architecture
- Focusing on a selected node, relationship, or flow
- Navigating into linked or more detailed architectures when a CALM model references them

## Product Goals

The first release of the application should:

- Allow a user to load a CALM architecture document into a browser-based application
- Render the architecture in a way that is easy to inspect and navigate
- Let the user move between architecture levels without needing VS Code
- Establish a technical foundation that can later support validation, persistence, and collaboration

## Non-Goals

The first release does not aim to provide:

- Full parity with VS Code editor integrations such as hover, CodeLens, and Problems panel integration
- A browser-based source-code editor replacement
- A pure C# implementation of all CALM parsing, validation, and rendering logic
- Full documentation generation and authoring workflows in the MVP

## Primary Users

### Architecture Consumer

A user who needs to open an existing CALM architecture and understand its structure quickly.

### Architecture Maintainer

A user who needs to inspect nodes, relationships, and linked architectures in order to review or refine a model.

### Technical Reviewer

A user who needs to move through architecture levels to understand dependencies, decomposition, and linked details.

## User Stories

### Load Architecture

- As an architecture consumer, I want to upload a CALM JSON document so that I can inspect it in the web app.
- As an architecture maintainer, I want to open a previously stored architecture so that I can continue reviewing it later.
- As a technical reviewer, I want the app to reject or flag invalid architecture files so that I know when a document cannot be rendered reliably.

### View Nodes and Diagram

- As an architecture consumer, I want to see a visual diagram of the architecture so that I can understand the structure quickly.
- As an architecture consumer, I want to click a node and view its details so that I can inspect the model without reading raw JSON only.
- As an architecture maintainer, I want to pan and zoom the diagram so that I can work with large architectures comfortably.

### Navigate Across Levels

- As a technical reviewer, I want to focus the view on a selected node so that I can inspect part of the architecture in isolation.
- As an architecture maintainer, I want to use a tree view to move between nodes, relationships, and flows so that I can navigate large models efficiently.
- As an architecture consumer, I want to open linked detailed architectures so that I can drill into deeper architecture levels from the current view.

## Functional Requirements

### FR-1 Load Architecture

- The system shall allow a user to upload a CALM architecture JSON document.
- The system shall allow a user to open a previously stored architecture document.
- The system shall parse the uploaded or stored document into a renderable internal model.
- The system shall report when a document cannot be parsed or is not renderable.

### FR-2 Render Architecture Diagram

- The system shall display the architecture as a visual diagram.
- The system shall support rendering of the full architecture view.
- The system shall support pan and zoom interactions on the diagram.
- The system shall visually distinguish the selected element from the rest of the diagram.

### FR-3 Show Node and Element Details

- The system shall allow a user to select a node from the diagram.
- The system shall allow a user to select a node, relationship, or flow from a navigation tree.
- The system shall display details for the selected element.
- The system shall provide access to the raw JSON or structured metadata for the selected element.

### FR-4 Navigate Architecture Levels

- The system shall allow a user to return from a focused selection to the full architecture view.
- The system shall allow a user to focus the viewer on a selected node, relationship, or flow where supported by the rendering logic.
- The system shall allow a user to open a linked detailed architecture when the current model provides such a reference.
- The system shall maintain enough navigation context for the user to understand where they are within the architecture hierarchy.

### FR-5 Document Navigation Model

- The system shall identify architectures using stable application-level identifiers rather than editor file handles.
- The system shall support route-based navigation for current document context and focused selection state.
- The system shall support application-managed resolution of linked architecture references.

## Feasibility Summary

Building a .NET web application with these capabilities is feasible.

The strongest implementation path is:

- ASP.NET Core for hosting, APIs, storage, authentication, and document management
- A TypeScript web frontend for the CALM viewer experience
- Reuse of the existing CALM TypeScript packages where possible

This is preferable to a pure C# rewrite because the current CALM parsing, validation, documentation, and diagram tooling already lives mostly in reusable TypeScript packages rather than inside the VS Code shell.

## Key Observation from the VS Code Plugin

The existing VS Code extension contains two broad categories of code:

1. VS Code-specific integration
- Commands
- Tree view registration
- Editor integration
- Diagnostics panel integration
- Webview lifecycle and extension activation

2. CALM-specific logic that is already reusable or close to reusable
- Model parsing and normalization
- Tree-view presentation logic
- Preview and diagram rendering logic
- Validation and schema loading through shared libraries
- Documentation and template processing

This separation makes a web port practical.

## Gap Analysis

### 1. Load CALM Architecture JSON

#### Existing capability in the VS Code plugin

The current plugin already supports:

- Reading JSON and YAML CALM documents
- Parsing and normalizing CALM model structures
- Detecting timelines versus architectures
- Validating documents against CALM schemas
- Resolving linked documents through mapping rules

#### Reuse potential

Reuse potential is high.

The most important reusable logic sits in shared TypeScript packages rather than in VS Code APIs.

#### Gaps for a .NET web app

The browser does not have the same local workspace model as VS Code. The web app needs a replacement for:

- Opening local files from the editor workspace
- Resolving local filesystem paths
- Monitoring active editor state

#### Web equivalent

The .NET web app should support one or more of these document-loading patterns:

- File upload
- Paste raw JSON into the UI
- Open from server-managed storage
- Open from a Git-backed repository source

#### Recommendation

For an MVP:

- Start with upload and persisted server-side storage
- Keep CALM parsing and validation in reusable TypeScript logic
- Avoid a full C# parser/validator rewrite in the first version

### 2. Node Viewer, Including the Diagram

#### Existing capability in the VS Code plugin

The plugin already provides:

- Browser-based diagram rendering
- Preview state management
- Mermaid-based rendering
- Pan and zoom behavior
- Focused rendering for selected model elements
- Model and documentation views

#### Reuse potential

Reuse potential is high.

This is the easiest part of the existing plugin to port because the rendering logic already targets a browser runtime.

#### Gaps for a .NET web app

The web app must replace:

- VS Code webview messaging
- VS Code-specific styling and theming
- Extension command wiring

#### Web equivalent

The web app should present a normal browser UI with:

- A left-side navigation panel
- A central diagram canvas
- A details panel for the selected item

#### Recommendation

Keep the viewer and diagram pipeline in TypeScript and host it inside the .NET app.

### 3. Navigation to Different Levels of the Diagram

#### Existing capability in the VS Code plugin

The plugin already supports:

- Tree-based navigation across nodes, relationships, and flows
- Focused selections within the current architecture
- Navigation to linked detailed architectures
- Relative-path and mapping-based document resolution

#### Reuse potential

Reuse potential is medium to high.

The selection and tree logic are reusable, but the navigation implementation currently assumes:

- Editor tabs
- Workspace files
- Active documents

#### Gaps for a .NET web app

The web application needs to replace filesystem navigation with application-level navigation.

That means defining:

- Stable document identifiers
- Route-based navigation
- API-backed reference resolution

#### Web equivalent

The web app should use routes such as:

- `/architectures/{id}`
- `/architectures/{id}?focus={elementId}`
- `/architectures/{id}/linked/{linkedId}`

#### Recommendation

Design web navigation around document identity and application routes instead of file paths.

## Recommended Target Architecture

### Overview

The preferred architecture is:

- ASP.NET Core backend
- TypeScript frontend
- Reuse of CALM TypeScript packages

This gives the new app a .NET operational surface while preserving maximum reuse from the existing CALM ecosystem.

### Backend Responsibilities

ASP.NET Core should own:

- Serving the frontend
- Authentication and authorization
- Document storage
- Document metadata
- Versioning and audit history if needed
- API endpoints for loading and navigating architectures

Suggested API surface for the MVP:

- `GET /api/architectures/{id}`
- `POST /api/architectures`
- `POST /api/architectures/validate`
- `GET /api/architectures/{id}/linked`

Suggested backend responsibilities by concern:

- Document ingestion and storage
- Document lookup by stable identifier
- Linked document resolution
- Validation orchestration
- Authentication and authorization when introduced

### Frontend Responsibilities

The TypeScript frontend should own:

- Rendering the architecture diagram
- Tree and node navigation
- Focus state
- Selected node details
- Diagram pan and zoom
- Route-based navigation between linked architectures

Suggested page layout:

- Left panel: architecture tree
- Center panel: diagram viewer
- Right panel: selected node details and raw JSON

Suggested frontend modules:

- Document loader
- Architecture state store
- Diagram viewer
- Tree navigator
- Details panel
- Route and navigation coordinator

### Reuse Strategy

The web app should reuse existing CALM TypeScript packages where possible:

- `@finos/calm-shared` for validation, schema loading, document loading, and docify-related logic
- `@finos/calm-models` for CALM model types
- `@finos/calm-widgets` for diagram and documentation widget generation

The web app should adapt selected logic from the VS Code plugin:

- Model parsing and normalization
- Tree view presentation logic
- Selection and focused preview behavior
- Linked architecture resolution patterns

The web app should replace all VS Code-specific orchestration and UI registration code.

## MVP Feature Definition

### 1. Load Architecture

The application must allow a user to:

- Upload a CALM architecture JSON file
- Open a previously stored architecture
- Validate the architecture enough to determine whether it is renderable

### 2. View Architecture

The application must allow a user to:

- View the full architecture diagram
- Pan and zoom the diagram
- Select nodes and inspect their details
- View supporting metadata for the selected element

### 3. Navigate Architecture Levels

The application must allow a user to:

- Move from the full architecture to a focused node view
- Navigate through the tree of nodes, relationships, and flows
- Open linked detailed architectures from the selected element when available
- Return back to the broader architecture context

## Non-Functional Requirements

### NFR-1 Performance

- The application should render typical CALM architecture documents without perceptible lag during ordinary selection and navigation.
- The application should keep node selection and focus changes responsive for normal interactive use.
- The application should support pan and zoom without blocking the user interface under expected MVP document sizes.

### NFR-2 Usability

- The application should present the diagram, navigation tree, and details in a layout that is understandable without prior knowledge of the VS Code extension.
- The application should make it obvious which architecture element is currently selected.
- The application should provide a clear way to return from a focused view to the full architecture view.

### NFR-3 Reliability

- The application should fail gracefully when a document cannot be parsed or rendered.
- The application should preserve enough state so that route refreshes or browser navigation do not leave the application in an inconsistent state.

### NFR-4 Maintainability

- The application should maximize reuse of existing CALM TypeScript packages where practical.
- The application should isolate .NET hosting concerns from CALM rendering and viewer concerns.
- The application should avoid tight coupling between navigation state and storage implementation details.

### NFR-5 Extensibility

- The application should be structured so that validation, collaboration, and documentation features can be added later without major rework of the viewer.
- The application should support future persistence backends such as database-backed or Git-backed storage.

## Acceptance Criteria

### AC-1 Load Architecture

- A user can upload a valid CALM JSON file and see it opened in the application.
- A user can open a previously stored architecture by identifier.
- When an invalid file is uploaded, the user sees a clear error state instead of a broken or blank viewer.

### AC-2 View Diagram

- After loading a valid architecture, the user sees a rendered architecture diagram.
- The user can pan and zoom the diagram.
- The user can click a node and observe a visible selected state.
- After selection, the user sees details for the selected element in a details panel.

### AC-3 Navigate via Tree

- The user can browse nodes, relationships, and flows in a navigation tree.
- Selecting an item in the tree updates the diagram focus or selected state.
- The selected element in the tree and the selected element in the diagram remain consistent.

### AC-4 Navigate Across Levels

- The user can move from the full architecture view to a focused node or element view.
- The user can return from a focused view to the full architecture view.
- If a selected element references a linked architecture, the user can navigate to that linked architecture.

### AC-5 Route-Based Navigation

- The application URL reflects the currently opened architecture.
- The application can represent focused selection state through routing or query parameters.
- Reloading the page preserves enough route state to restore the current architecture context.

## Suggested Delivery Phases

### Phase 1

- ASP.NET Core host application
- TypeScript frontend shell
- Single-document upload and load
- Diagram rendering
- Node selection and details panel

### Phase 2

- Tree navigation
- Focused views for nodes, relationships, and flows
- Linked architecture navigation

### Phase 3

- Persistent document storage
- Validation workflows
- Versioning, audit, and collaboration features
- Optional Git-backed sources

## Risks and Constraints

### Main architectural risk

The main risk is attempting to force the whole CALM logic stack into pure .NET too early.

That would turn a reuse-focused implementation into a rewrite-heavy implementation.

### Recommended constraint

Treat .NET as the application host and system boundary, not as the mandatory implementation language for every CALM processing concern.

### Other constraints

- Browser applications do not have direct access to local workspace files the way VS Code does
- Cross-document navigation needs document IDs or canonical references instead of file-path assumptions
- Some plugin code still contains VS Code type dependencies and will need extraction or replacement

## Open Questions

- Will the MVP support JSON only, or JSON and YAML from the start?
- Will linked architecture references be stored as application document IDs, URL mappings, or both?
- Will validation run fully in the browser, through a Node-based companion service, or through a server-side wrapper?
- Does the first release require persistence and user authentication, or can it begin as an upload-first viewer?

## Implementation Blueprint

### Solution Structure

The recommended solution structure is:

- `dotnet/CALMdotNetViewer.Web` for the ASP.NET Core host and API
- `dotnet/CALMdotNetViewer.ViewerApp` for the TypeScript frontend
- `dotnet/docs` for product and technical design notes if the scope grows

The .NET project should own hosting, storage, API contracts, and operational concerns.

The TypeScript project should own the CALM viewer experience, including diagram rendering, element selection, and navigation behavior.

### Frontend Modules

| Module | Responsibility | Notes |
|---|---|---|
| App Shell | Page layout, top-level UI composition, error boundaries | Hosts tree, diagram, and details panels |
| Router | Route parsing and route updates | Supports architecture ID and focus state |
| Architecture API Client | Calls backend endpoints | Encapsulates fetch logic and DTO mapping |
| Viewer State Store | Holds current document, selected element, linked navigation context, and loading state | Can be implemented with Zustand to align with the existing plugin approach |
| Document Loader | Converts API payloads into renderable frontend state | Bridges backend payloads and CALM packages |
| Diagram Renderer | Renders the architecture diagram and focus state | Reuses browser-friendly Mermaid and widget logic where practical |
| Tree Navigator | Displays nodes, relationships, and flows in a navigation tree | Can adapt logic from the existing tree view model |
| Details Panel | Shows selected element details and structured metadata | Should support raw JSON inspection |
| Navigation Coordinator | Handles moving between full view, focused view, and linked architectures | Replaces VS Code editor navigation behavior |
| Validation Banner | Displays parse and validation errors in the UI | Separate from the viewer to keep failure states clear |

### Backend Components

| Component | Responsibility | Notes |
|---|---|---|
| Architecture Controller | Public API for upload, retrieval, and navigation | Entry point for frontend requests |
| Architecture Storage Service | Stores and retrieves architecture documents | Can start with filesystem or database-backed persistence |
| Architecture Reference Resolver | Resolves linked architecture references | Replaces local workspace path resolution |
| Validation Orchestrator | Runs validation workflows and returns UI-friendly results | May wrap a Node-based validation layer |
| Document Metadata Service | Tracks identifiers, titles, timestamps, and source metadata | Supports browsing and future versioning |
| Auth Layer | Authentication and authorization | Optional in MVP, important for later phases |

### Route Design

| Route | Purpose |
|---|---|
| `/architectures/:id` | Open an architecture in full-view mode |
| `/architectures/:id?focus=:elementId` | Open an architecture with a focused selection |
| `/architectures/:id/linked/:linkedId` | Open a linked architecture from the current architecture context |
| `/upload` | Upload-first entry point for a new architecture document |

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/architectures` | Upload and create a stored architecture document |
| `GET` | `/api/architectures/{id}` | Retrieve an architecture by stable identifier |
| `GET` | `/api/architectures/{id}/summary` | Retrieve lightweight metadata for tree or list views |
| `POST` | `/api/architectures/validate` | Validate a document payload before or after save |
| `GET` | `/api/architectures/{id}/linked` | Resolve linked architectures available from the current document |
| `GET` | `/api/architectures/{id}/linked/{linkedId}` | Resolve and return a specific linked architecture |

### API Contract Sketch

#### Upload Request

```json
{
  "fileName": "payments.json",
  "content": "{ ... raw calm json ... }",
  "contentType": "application/json"
}
```

#### Architecture Response

```json
{
  "id": "arch-001",
  "title": "Payments Architecture",
  "content": "{ ... raw calm json ... }",
  "format": "json",
  "schema": "https://calm.finos.org/release/1.1/meta/calm.json",
  "linkedArchitectures": [
    {
      "reference": "https://specs.internal/payment-service",
      "resolvedId": "arch-002",
      "label": "Payment Service"
    }
  ],
  "metadata": {
    "createdAt": "2026-04-04T00:00:00Z",
    "updatedAt": "2026-04-04T00:00:00Z"
  }
}
```

#### Validation Response

```json
{
  "isValid": true,
  "errors": [],
  "warnings": []
}
```

## Data Model

### Core Backend Data Contracts

| Model | Purpose | Key Fields |
|---|---|---|
| `ArchitectureDocument` | Persisted architecture asset | `Id`, `Title`, `Content`, `Format`, `Schema`, `CreatedAt`, `UpdatedAt` |
| `ArchitectureSummary` | Lightweight list and navigation view | `Id`, `Title`, `Schema`, `UpdatedAt` |
| `ArchitectureReference` | Linked architecture relationship | `Reference`, `ResolvedId`, `Label`, `ResolutionStatus` |
| `ValidationIssue` | Validation output item | `Severity`, `Code`, `Message`, `Path`, `LineStart`, `LineEnd` |
| `ValidationResult` | Validation response | `IsValid`, `Errors`, `Warnings` |

### Frontend View State

| Model | Purpose | Key Fields |
|---|---|---|
| `ViewerState` | Overall page state | `currentArchitectureId`, `isLoading`, `error`, `selectedElementId`, `focusedElementId` |
| `LoadedArchitecture` | Renderable architecture state | `id`, `title`, `rawContent`, `parsedModel`, `graphData`, `linkedArchitectures` |
| `SelectionState` | Current user selection | `selectedElementId`, `selectedElementType`, `selectedElementDetails` |
| `NavigationState` | Current location within the architecture graph | `currentRoute`, `parentArchitectureId`, `breadcrumbs` |

### Persistence Recommendation

The initial persistence approach should be simple and replaceable:

- Start with a database table or document store for architecture documents
- Store the raw document content as submitted
- Store summary metadata separately if list views become important
- Resolve linked architectures through explicit reference records or a mapping service

## Implementation Plan

### Frontend Work Breakdown

| Work Item | Description | Dependencies |
|---|---|---|
| Frontend Shell | Create the main page layout and route handling | None |
| Viewer Store | Implement centralized state for document, selection, and focus | Frontend Shell |
| Upload Flow | Build upload UI and API integration | Frontend Shell, API Client |
| Diagram Viewer | Integrate CALM rendering and diagram interactions | Viewer Store, Document Loader |
| Tree Navigator | Display nodes, relationships, and flows | Viewer Store, parsed model |
| Details Panel | Show metadata and raw JSON for the selected element | Viewer Store |
| Linked Navigation | Add route-based transitions to linked architectures | Router, API Client, Viewer Store |
| Error and Validation UX | Show parse and validation issues clearly | API Client, Validation endpoint |

### Backend Work Breakdown

| Work Item | Description | Dependencies |
|---|---|---|
| API Project Setup | Create ASP.NET Core project structure and base configuration | None |
| Storage Layer | Implement architecture persistence and retrieval | API Project Setup |
| Upload Endpoint | Accept and store architecture content | Storage Layer |
| Get Architecture Endpoint | Return stored document and metadata | Storage Layer |
| Linked Reference Resolver | Resolve linked architectures by stored mapping or references | Storage Layer |
| Validation Endpoint | Expose validation to the frontend | Validation strategy decision |
| Security Layer | Add authentication and authorization if required | API foundation |

## Delivery Backlog

### Phase 0: Technical Foundation

| Priority | Backlog Item | Outcome |
|---|---|---|
| P0 | Decide validation hosting model | Confirms whether validation runs in browser, Node service, or server wrapper |
| P0 | Define architecture ID strategy | Enables route-based and cross-document navigation |
| P0 | Create solution skeleton for ASP.NET Core and frontend app | Establishes the implementation foundation |

### Phase 1: MVP Viewer

| Priority | Backlog Item | Outcome |
|---|---|---|
| P0 | Upload CALM JSON and store it | User can load documents into the app |
| P0 | Retrieve architecture by ID | App can open saved architectures |
| P0 | Render full architecture diagram | User can see the architecture visually |
| P0 | Select node and show details | User can inspect individual elements |
| P0 | Support pan and zoom | Large architectures are usable |
| P1 | Expose validation result in UI | User gets clear feedback on invalid input |

### Phase 2: Structured Navigation

| Priority | Backlog Item | Outcome |
|---|---|---|
| P0 | Add tree navigator for nodes, relationships, and flows | User can navigate large models efficiently |
| P0 | Add focused selection route state | Full-view and focused-view navigation become stable |
| P0 | Add linked architecture resolution | User can drill into deeper architecture levels |
| P1 | Add breadcrumbs or navigation history | User can keep context across levels |

### Phase 3: Operational Maturity

| Priority | Backlog Item | Outcome |
|---|---|---|
| P0 | Add persistent storage hardening | Viewer becomes reliable for ongoing use |
| P1 | Add authentication and authorization | Access can be controlled in shared environments |
| P1 | Add document summaries and browsing views | Users can browse a library of architectures |
| P1 | Add versioning and audit metadata | Review and governance workflows become possible |
| P2 | Add Git-backed source integration | Documents can be sourced from repositories |

## Recommended First Sprint

The first sprint should aim to prove the end-to-end path with the least architecture risk.

Recommended sprint goals:

- Create the ASP.NET Core host and frontend app skeleton
- Implement upload and retrieve architecture APIs
- Build a single-page viewer that can load one architecture by ID
- Render the full diagram for a loaded architecture
- Support node selection and details display

Definition of done for the first sprint:

- A user can upload a CALM JSON document
- The document is stored and assigned an identifier
- The user can open the document by route
- The user can see the diagram and select at least one node for inspection

## Final Recommendation

Proceed with a .NET web application, but implement the CALM viewer experience as a TypeScript frontend hosted by ASP.NET Core.

This approach provides:

- Fastest path to a usable MVP
- Maximum reuse of existing CALM logic
- Lowest risk compared with a pure C# rewrite
- A clean path to future enterprise features such as authentication, persistence, and governance

## Assumptions

- The immediate goal is a web app, not a browser-based code editor replacement
- The first version does not need full parity with VS Code editor integrations such as hover, CodeLens, and diagnostics panels
- Reuse of local TypeScript CALM packages is acceptable within the .NET solution architecture
