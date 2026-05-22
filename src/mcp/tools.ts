import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  draftDesign,
  explainFailure,
  getRenderProps,
  renderSvg,
  validatePattern,
} from '../freesewing/draft.js'
import {
  getDesignOptions,
  getMeasurementRequirements,
  inspectDesign,
  listDesigns,
} from '../freesewing/inspect.js'
import { runSizeMatrix } from '../validation/size-matrix.js'
import {
  checkDesignPackage,
  compareDesignCatalog,
  discoverFreeSewingDesigns,
  installDesignPackage,
  registerSupportedDesign,
  verifyInstalledDesign,
} from '../freesewing/catalog.js'
import {
  CheckDesignPackageInputSchema,
  DesignIdSchema,
  DiscoverFreeSewingDesignsInputSchema,
  DraftDesignInputSchema,
  InstallDesignPackageInputSchema,
  PatternIdSchema,
  RegisterSupportedDesignInputSchema,
  RunSizeMatrixInputSchema,
} from '../schemas/tool-inputs.js'

export function registerTools(server: McpServer) {
  server.registerTool(
    'list_designs',
    {
      title: 'List FreeSewing designs',
      description: 'List the FreeSewing designs currently registered as supported.',
    },
    async () => jsonResult(await listDesigns()),
  )

  server.registerTool(
    'discover_freesewing_designs',
    {
      title: 'Discover official FreeSewing designs',
      description:
        'Discover official FreeSewing design packages from npm, or list locally installed design packages with online=false.',
      inputSchema: DiscoverFreeSewingDesignsInputSchema,
    },
    async (input: z.infer<typeof DiscoverFreeSewingDesignsInputSchema>) =>
      jsonResult(await discoverFreeSewingDesigns(input)),
  )

  server.registerTool(
    'compare_design_catalog',
    {
      title: 'Compare design catalog',
      description:
        'Compare official FreeSewing designs against locally installed packages and the supported registry.',
      inputSchema: DiscoverFreeSewingDesignsInputSchema,
    },
    async (input: z.infer<typeof DiscoverFreeSewingDesignsInputSchema>) =>
      jsonResult(await compareDesignCatalog(input)),
  )

  server.registerTool(
    'check_design_package',
    {
      title: 'Check design package',
      description:
        'Check whether an official FreeSewing design package is installed, npm-available, and already supported.',
      inputSchema: CheckDesignPackageInputSchema,
    },
    async (input: z.infer<typeof CheckDesignPackageInputSchema>) =>
      jsonResult(await checkDesignPackage(input)),
  )

  server.registerTool(
    'verify_design_package',
    {
      title: 'Verify installed design package',
      description:
        'Verify an installed FreeSewing design package by importing it, reading config, drafting, rendering SVG, and extracting renderProps.',
      inputSchema: CheckDesignPackageInputSchema,
    },
    async (input: z.infer<typeof CheckDesignPackageInputSchema>) =>
      jsonResult(await verifyInstalledDesign(input)),
  )

  server.registerTool(
    'install_design_package',
    {
      title: 'Install FreeSewing design package',
      description:
        'Install an official @freesewing/* design package. Defaults to dryRun=true; actual install requires confirm="INSTALL_FREESEWING_DESIGN".',
      inputSchema: InstallDesignPackageInputSchema,
    },
    async (input: z.infer<typeof InstallDesignPackageInputSchema>) =>
      jsonResult(await installDesignPackage(input)),
  )

  server.registerTool(
    'register_supported_design',
    {
      title: 'Register supported design',
      description:
        'Verify an installed FreeSewing design package and add it to catalog/supported-designs.json so normal draft/inspect tools can use it.',
      inputSchema: RegisterSupportedDesignInputSchema,
    },
    async (input: z.infer<typeof RegisterSupportedDesignInputSchema>) =>
      jsonResult(await registerSupportedDesign(input)),
  )

  server.registerTool(
    'inspect_design',
    {
      title: 'Inspect FreeSewing design',
      description: 'Return metadata, parts, measurements, options, and dependencies for a design.',
      inputSchema: DesignIdSchema,
    },
    async (input: z.infer<typeof DesignIdSchema>) => jsonResult(await inspectDesign(input.designId)),
  )

  server.registerTool(
    'get_design_options',
    {
      title: 'Get design options',
      description: 'Return supported option definitions for a FreeSewing design.',
      inputSchema: DesignIdSchema,
    },
    async (input: z.infer<typeof DesignIdSchema>) =>
      jsonResult({
        designId: input.designId,
        options: await getDesignOptions(input.designId),
      }),
  )

  server.registerTool(
    'get_measurement_requirements',
    {
      title: 'Get measurement requirements',
      description: 'Return required and optional measurements for a FreeSewing design.',
      inputSchema: DesignIdSchema,
    },
    async (input: z.infer<typeof DesignIdSchema>) =>
      jsonResult({
        designId: input.designId,
        measurements: await getMeasurementRequirements(input.designId),
      }),
  )

  server.registerTool(
    'draft_design',
    {
      title: 'Draft design',
      description:
        'Draft a FreeSewing design with measurements/options, render SVG, save renderProps, and produce a validation report.',
      inputSchema: DraftDesignInputSchema,
    },
    async (input: z.infer<typeof DraftDesignInputSchema>) => jsonResult(await draftDesign(input)),
  )

  server.registerTool(
    'render_svg',
    {
      title: 'Render SVG',
      description: 'Return the SVG output for a previously drafted patternId.',
      inputSchema: PatternIdSchema,
    },
    async (input: z.infer<typeof PatternIdSchema>) => jsonResult(await renderSvg(input.patternId)),
  )

  server.registerTool(
    'get_render_props',
    {
      title: 'Get render props',
      description: 'Return structured FreeSewing renderProps for a previously drafted patternId.',
      inputSchema: PatternIdSchema,
    },
    async (input: z.infer<typeof PatternIdSchema>) =>
      jsonResult(await getRenderProps(input.patternId)),
  )

  server.registerTool(
    'validate_pattern',
    {
      title: 'Validate pattern',
      description: 'Run the MVP validation report for a previously drafted patternId.',
      inputSchema: PatternIdSchema,
    },
    async (input: z.infer<typeof PatternIdSchema>) =>
      jsonResult(await validatePattern(input.patternId)),
  )

  server.registerTool(
    'run_size_matrix',
    {
      title: 'Run size matrix',
      description:
        'Draft and validate a design across multiple measurement sets. Defaults to small, standard, and large fixtures.',
      inputSchema: RunSizeMatrixInputSchema,
    },
    async (input: z.infer<typeof RunSizeMatrixInputSchema>) =>
      jsonResult(await runSizeMatrix(input)),
  )

  server.registerTool(
    'explain_failure',
    {
      title: 'Explain failed pattern',
      description: 'Summarize validation failures and next actions for a patternId.',
      inputSchema: PatternIdSchema,
    },
    async (input: z.infer<typeof PatternIdSchema>) =>
      jsonResult(await explainFailure(input.patternId)),
  )
}

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}
