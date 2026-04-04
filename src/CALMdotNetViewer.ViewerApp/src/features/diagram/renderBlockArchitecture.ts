import Handlebars from "handlebars";
import mermaid from "mermaid";
import elkLayouts from "@mermaid-js/layout-elk";
import type { BlockArchOptions } from "@repo/calm-widgets/widgets/block-architecture";
import { transformToBlockArchVM } from "@repo/calm-widgets/widgets/block-architecture";
import { registerGlobalTemplateHelpers } from "@repo/calm-widgets/widget-helpers";
import type { ParsedArchitecture } from "../architecture/types";
import blockArchitectureTemplate from "@repo/calm-widgets/widgets/block-architecture/block-architecture.hbs?raw";
import containerTemplate from "@repo/calm-widgets/widgets/block-architecture/container.hbs?raw";
import clickLinksTemplate from "@repo/calm-widgets/widgets/block-architecture/click-links.hbs?raw";
import typedNodeTemplate from "@repo/calm-widgets/widgets/block-architecture/typed-node.hbs?raw";

let mermaidInitialized = false;
let renderSequence = 0;

function ensureMermaid(): void {
  if (mermaidInitialized) {
    return;
  }

  mermaid.registerLayoutLoaders(elkLayouts);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    deterministicIds: true,
    logLevel: "error",
    flowchart: {
      htmlLabels: false,
      useMaxWidth: true
    }
  });

  mermaidInitialized = true;
}

function createHandlebars(): typeof Handlebars {
  const handlebars = Handlebars.create();
  const helpers = registerGlobalTemplateHelpers();

  for (const [name, helper] of Object.entries(helpers)) {
    handlebars.registerHelper(name, helper as Handlebars.HelperDelegate);
  }

  handlebars.registerPartial("container.hbs", containerTemplate);
  handlebars.registerPartial("click-links.hbs", clickLinksTemplate);
  handlebars.registerPartial("typed-node.hbs", typedNodeTemplate);

  return handlebars;
}

function extractMermaidBlock(renderedTemplate: string): string {
  const match = renderedTemplate.match(/```mermaid\s*([\s\S]*?)```/);
  if (!match?.[1]) {
    throw new Error("Failed to extract Mermaid diagram from block-architecture template output.");
  }

  return match[1].trim();
}

export async function renderBlockArchitecture(
  parsedArchitecture: ParsedArchitecture,
  selectedElementId: string | null
): Promise<{ svg: string; mermaidCode: string; warnings: string[] }> {
  ensureMermaid();

  const handlebars = createHandlebars();
  const template = handlebars.compile(blockArchitectureTemplate);

  const options: BlockArchOptions = {
    "render-node-type-shapes": true,
    "include-containers": "all",
    "include-children": "all",
    "edges": "connected",
    "edge-labels": "description",
    "layout-engine": "elk",
    ...(selectedElementId ? { "highlight-nodes": selectedElementId } : {})
  };

  const viewModel = transformToBlockArchVM(parsedArchitecture.canonicalModel, options);
  const renderedTemplate = template(viewModel);
  const mermaidCode = extractMermaidBlock(renderedTemplate);
  const renderId = `calm-dotnet-viewer-${renderSequence++}`;
  const { svg } = await mermaid.render(renderId, mermaidCode);

  return {
    svg,
    mermaidCode,
    warnings: viewModel.warnings ?? []
  };
}
