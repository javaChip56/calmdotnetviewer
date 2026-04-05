import Handlebars from "handlebars";
import mermaid from "mermaid";
import elkLayouts from "@mermaid-js/layout-elk";
import { FlowSequenceWidget } from "@repo/calm-widgets/widgets/flow-sequence";
import { registerGlobalTemplateHelpers } from "@repo/calm-widgets/widget-helpers";
import type { ParsedArchitecture } from "../architecture/types";
import flowSequenceTemplate from "@repo/calm-widgets/widgets/flow-sequence/flow-sequence-template.hbs?raw";

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

  return handlebars;
}

function extractMermaidBlock(renderedTemplate: string): string {
  const match = renderedTemplate.match(/```mermaid\s*([\s\S]*?)```/);
  if (!match?.[1]) {
    throw new Error("Failed to extract Mermaid diagram from flow-sequence template output.");
  }

  return match[1].trim();
}

export async function renderFlowSequenceDiagram(
  parsedArchitecture: ParsedArchitecture,
  flowId: string
): Promise<{
  svg: string;
  mermaidCode: string;
  warnings: string[];
  bindFunctions?: (element: Element) => void;
}> {
  ensureMermaid();

  const handlebars = createHandlebars();
  const template = handlebars.compile(flowSequenceTemplate);
  const viewModel = FlowSequenceWidget.transformToViewModel?.(parsedArchitecture.canonicalModel, {
    "flow-id": flowId
  });

  if (!viewModel) {
    throw new Error(`Unable to build flow sequence view for ${flowId}.`);
  }

  const renderedTemplate = template(viewModel);
  const mermaidCode = extractMermaidBlock(renderedTemplate);
  const renderId = `calm-dotnet-flow-${renderSequence++}`;
  const { svg, bindFunctions } = await mermaid.render(renderId, mermaidCode);

  return {
    svg,
    mermaidCode,
    warnings: [],
    bindFunctions
  };
}
