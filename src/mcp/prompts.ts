import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

const DesignPromptArgs = {
  designId: z.string().min(1),
}

const PatternPromptArgs = {
  patternId: z.string().min(1),
}

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    'analyze_design',
    {
      title: 'Analyze FreeSewing design',
      description: 'Guide an agent through metadata, measurements, options, and parts inspection.',
      argsSchema: DesignPromptArgs,
    },
    ({ designId }) => prompt(`Analyze FreeSewing design "${designId}".

Use inspect_design first, then summarize:
- what garment/block the design produces;
- required and optional measurements;
- option groups that materially affect fit or style;
- visible parts and hidden dependency parts;
- any constraints an agent should honor before drafting.`),
  )

  server.registerPrompt(
    'draft_and_validate',
    {
      title: 'Draft and validate design',
      description: 'Guide an agent through drafting, SVG rendering, renderProps, and validation.',
      argsSchema: DesignPromptArgs,
    },
    ({ designId }) => prompt(`Draft and validate FreeSewing design "${designId}".

Use get_measurement_requirements and get_design_options before draft_design. Draft with explicit measurements/options or a known measurement fixture. Then call validate_pattern, get_render_props, and render_svg only after draft_design returns a patternId.`),
  )

  server.registerPrompt(
    'debug_failed_pattern',
    {
      title: 'Debug failed pattern',
      description: 'Guide an agent through explaining validation failures.',
      argsSchema: PatternPromptArgs,
    },
    ({ patternId }) => prompt(`Debug failed pattern "${patternId}".

Use validate_pattern and explain_failure. Focus on missing measurements, invalid options, draft/runtime errors, empty SVG output, missing renderProps, parts count, and paths count. Suggest the smallest input change that should make the pattern draft successfully.`),
  )

  server.registerPrompt(
    'compare_size_matrix',
    {
      title: 'Compare size matrix',
      description: 'Guide an agent through evaluating stability across measurement sets.',
      argsSchema: DesignPromptArgs,
    },
    ({ designId }) => prompt(`Compare size matrix for FreeSewing design "${designId}".

Run run_size_matrix with at least three measurement sets. Compare success rates, SVG availability, parts count, paths count, warnings, and errors. Highlight whether the size matrix is stable for MVP purposes.`),
  )

  server.registerPrompt(
    'suggest_supported_options',
    {
      title: 'Suggest supported options',
      description: 'Guide an agent to suggest only options supported by an installed design.',
      argsSchema: DesignPromptArgs,
    },
    ({ designId }) => prompt(`Suggest supported options for FreeSewing design "${designId}".

Use get_design_options. Only suggest option keys returned by the tool. Do not invent FreeSewing options, do not modify SVG directly, and do not imply that unsupported garments can be generated in this MVP.`),
  )
}

function prompt(text: string) {
  return {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text,
        },
      },
    ],
  }
}
