import Handlebars from "handlebars";
import mermaid from "mermaid";
import elkLayouts from "@mermaid-js/layout-elk";
import { RelatedNodesWidget } from "@repo/calm-widgets/widgets/related-nodes";
import { registerGlobalTemplateHelpers } from "@repo/calm-widgets/widget-helpers";
import type { ParsedArchitecture } from "../architecture/types";
import relatedNodesTemplate from "@repo/calm-widgets/widgets/related-nodes/related-nodes-template.hbs?raw";
import connectsTemplate from "@repo/calm-widgets/widgets/related-nodes/connects-relationship.hbs?raw";
import interactsTemplate from "@repo/calm-widgets/widgets/related-nodes/interacts-relationship.hbs?raw";
import composedOfTemplate from "@repo/calm-widgets/widgets/related-nodes/composed-of-relationship.hbs?raw";
import deployedInTemplate from "@repo/calm-widgets/widgets/related-nodes/deployed-in-relationship.hbs?raw";

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

  handlebars.registerPartial("interacts-relationship.hbs", interactsTemplate);
  handlebars.registerPartial("connects-relationship.hbs", connectsTemplate);
  handlebars.registerPartial("composed-of-relationship.hbs", composedOfTemplate);
  handlebars.registerPartial("deployed-in-relationship.hbs", deployedInTemplate);

  return handlebars;
}

function extractMermaidBlock(renderedTemplate: string): string {
  const match = renderedTemplate.match(/```mermaid\s*([\s\S]*?)```/);
  if (!match?.[1]) {
    throw new Error("Failed to extract Mermaid diagram from related-nodes template output.");
  }

  return match[1].trim();
}

export async function renderRelatedNodesDiagram(
  parsedArchitecture: ParsedArchitecture,
  nodeId: string
): Promise<{
  svg: string;
  mermaidCode: string;
  warnings: string[];
  bindFunctions?: (element: Element) => void;
}> {
  ensureMermaid();

  const handlebars = createHandlebars();
  const template = handlebars.compile(relatedNodesTemplate);
  const viewModel = RelatedNodesWidget.transformToViewModel?.(parsedArchitecture.canonicalModel, {
    "node-id": nodeId
  });

  if (!viewModel) {
    throw new Error(`Unable to build related nodes view for ${nodeId}.`);
  }

  const renderedTemplate = template(viewModel);
  const mermaidCode = extractMermaidBlock(renderedTemplate);
  const renderId = `calm-dotnet-related-${renderSequence++}`;
  const { svg, bindFunctions } = await mermaid.render(renderId, mermaidCode);

  return {
    svg,
    mermaidCode,
    warnings: [],
    bindFunctions
  };
}
