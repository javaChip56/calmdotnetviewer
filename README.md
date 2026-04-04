# CALMdotNetViewer

`CALMdotNetViewer` is a .NET-hosted web application for viewing CALM architecture documents in the browser.

The current implementation includes:

- An ASP.NET Core backend in `src/CALMdotNetViewer.Web`
- A React and TypeScript viewer app in `src/CALMdotNetViewer.ViewerApp`
- Sample CALM architecture JSON files loaded by the backend from a configurable folder
- GitHub Actions workflows for CI, automated code review, and release publishing

## Repository Layout

```text
dotnet/
├── .github/workflows/                # GitHub CI/CD workflows
├── src/
│   ├── CALMdotNetViewer.sln          # Solution file
│   ├── CALMdotNetViewer.Web/         # ASP.NET Core backend
│   ├── CALMdotNetViewer.Web.Tests/   # xUnit backend tests
│   └── CALMdotNetViewer.ViewerApp/   # React + TypeScript frontend
├── specs.md                          # Product and architecture specification
└── README.md                         # This file
```

## Prerequisites

- .NET SDK 9.0+
- Node.js 24+
- npm 11+

## Local Development

### 1. Restore backend dependencies

```powershell
dotnet restore src/CALMdotNetViewer.sln
```

### 2. Install frontend dependencies

```powershell
cd src/CALMdotNetViewer.ViewerApp
npm install
```

### 3. Run the backend

From the `dotnet/` folder:

```powershell
dotnet run --project src/CALMdotNetViewer.Web
```

By default the backend runs on:

- `http://localhost:5073`
- `https://localhost:7027`

### 4. Run the frontend

From `src/CALMdotNetViewer.ViewerApp`:

```powershell
npm run dev
```

The Vite dev server runs on:

- `http://localhost:5173`

The frontend proxies `/api` and `/health` requests to the ASP.NET Core backend.

## Build Commands

### Build backend

```powershell
dotnet build src/CALMdotNetViewer.sln
```

### Build frontend

```powershell
cd src/CALMdotNetViewer.ViewerApp
npm run build
```

## Test Commands

### Run backend tests

```powershell
dotnet test src/CALMdotNetViewer.sln
```

### Run frontend tests

```powershell
cd src/CALMdotNetViewer.ViewerApp
npm test
```

## Architecture Source Folder

The backend reads architecture JSON files from a folder configured in:

- `src/CALMdotNetViewer.Web/appsettings.json`
- `src/CALMdotNetViewer.Web/appsettings.Development.json`

Current setting:

```json
"ArchitectureSource": {
  "FolderPath": "SampleData"
}
```

Notes:

- Relative paths are resolved from the ASP.NET Core content root
- Absolute paths are supported
- If the folder does not exist, the backend throws a clear startup error

## GitHub Workflows

### CI

Workflow file:

- `.github/workflows/ci.yml`

Runs on:

- pushes to `main`
- pull requests

What it does:

- restores .NET dependencies
- installs frontend dependencies
- builds the .NET solution
- runs backend tests
- runs frontend tests
- builds the frontend app

### Code Review

Workflow file:

- `.github/workflows/code-review.yml`

Runs on:

- pushes to `main`
- pull requests

What it does:

- runs GitHub CodeQL analysis for:
  - C#
  - JavaScript/TypeScript

This is automated static analysis. If you want required human review before merge, configure branch protection rules on GitHub for `main`.

### Release

Workflow file:

- `.github/workflows/release.yml`

Runs on:

- pushed tags matching `v*`

Rules:

- the tagged commit must be reachable from `main`

What it does:

- restores and builds the .NET solution
- runs backend tests
- runs frontend tests
- builds the frontend
- publishes the ASP.NET Core app
- packages release artifacts
- creates a GitHub Release with attached tarballs

## Current Release Artifacts

The release workflow currently publishes:

- packaged ASP.NET Core web app
- packaged frontend `dist` output

## Notes

- The frontend currently imports local CALM source modules from the monorepo during build
- The frontend build works, but the Mermaid-based bundle is currently large and may need optimization later
- `npm audit` currently reports high-severity vulnerabilities in the frontend dependency tree and should be reviewed separately
