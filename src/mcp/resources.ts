import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  getDesignMetadata,
  getDesignOptions,
  getMeasurementRequirements,
  listDesigns,
} from '../freesewing/inspect.js'
import { listMeasurementFixtures, loadMeasurementFixture } from '../freesewing/fixtures.js'
import {
  getPatternFilePaths,
  listPatternMetadata,
  readJson,
  readPatternMetadata,
  readText,
} from '../freesewing/storage.js'

export function registerResources(server: McpServer) {
  server.registerResource(
    'design-metadata',
    new ResourceTemplate('design://{designId}/metadata', {
      list: async () => ({
        resources: (await listDesigns()).map((design) => ({
          uri: `design://${design.id}/metadata`,
          name: `${design.id} metadata`,
          mimeType: 'application/json',
        })),
      }),
      complete: {
        designId: async () => (await listDesigns()).map((design) => design.id),
      },
    }),
    {
      title: 'Design metadata',
      mimeType: 'application/json',
    },
    async (uri, variables) =>
      jsonResource(uri.href, await getDesignMetadata(String(variables.designId))),
  )

  server.registerResource(
    'design-options',
    new ResourceTemplate('design://{designId}/options', {
      list: async () => ({
        resources: (await listDesigns()).map((design) => ({
          uri: `design://${design.id}/options`,
          name: `${design.id} options`,
          mimeType: 'application/json',
        })),
      }),
      complete: {
        designId: async () => (await listDesigns()).map((design) => design.id),
      },
    }),
    {
      title: 'Design options',
      mimeType: 'application/json',
    },
    async (uri, variables) =>
      jsonResource(uri.href, await getDesignOptions(String(variables.designId))),
  )

  server.registerResource(
    'design-measurements',
    new ResourceTemplate('design://{designId}/measurements', {
      list: async () => ({
        resources: (await listDesigns()).map((design) => ({
          uri: `design://${design.id}/measurements`,
          name: `${design.id} measurements`,
          mimeType: 'application/json',
        })),
      }),
      complete: {
        designId: async () => (await listDesigns()).map((design) => design.id),
      },
    }),
    {
      title: 'Design measurements',
      mimeType: 'application/json',
    },
    async (uri, variables) =>
      jsonResource(uri.href, await getMeasurementRequirements(String(variables.designId))),
  )

  server.registerResource(
    'pattern-svg',
    new ResourceTemplate('pattern://{patternId}/svg', {
      list: async () => ({
        resources: (await listPatternMetadata())
          .filter((pattern) => pattern.renderSuccess)
          .map((pattern) => ({
            uri: `pattern://${pattern.patternId}/svg`,
            name: `${pattern.patternId} SVG`,
            mimeType: 'image/svg+xml',
          })),
      }),
    }),
    {
      title: 'Pattern SVG',
      mimeType: 'image/svg+xml',
    },
    async (uri, variables) => {
      const pattern = await readPatternMetadata(String(variables.patternId))
      return textResource(uri.href, await readText(pattern.files.svg), 'image/svg+xml')
    },
  )

  server.registerResource(
    'pattern-render-props',
    new ResourceTemplate('pattern://{patternId}/render-props', {
      list: async () => ({
        resources: (await listPatternMetadata()).map((pattern) => ({
          uri: `pattern://${pattern.patternId}/render-props`,
          name: `${pattern.patternId} renderProps`,
          mimeType: 'application/json',
        })),
      }),
    }),
    {
      title: 'Pattern renderProps',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const files = getPatternFilePaths(String(variables.patternId))
      return jsonResource(uri.href, await readJson(files.renderProps))
    },
  )

  server.registerResource(
    'pattern-validation-report',
    new ResourceTemplate('pattern://{patternId}/validation-report', {
      list: async () => ({
        resources: (await listPatternMetadata()).map((pattern) => ({
          uri: `pattern://${pattern.patternId}/validation-report`,
          name: `${pattern.patternId} validation report`,
          mimeType: 'application/json',
        })),
      }),
    }),
    {
      title: 'Pattern validation report',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const files = getPatternFilePaths(String(variables.patternId))
      return jsonResource(uri.href, await readJson(files.validationReport))
    },
  )

  server.registerResource(
    'measurement-fixtures',
    new ResourceTemplate('measurements://fixtures/{setId}', {
      list: async () => ({
        resources: (await listMeasurementFixtures()).map((setId) => ({
          uri: `measurements://fixtures/${setId}`,
          name: `${setId} measurements fixture`,
          mimeType: 'application/json',
        })),
      }),
      complete: {
        setId: async () => listMeasurementFixtures(),
      },
    }),
    {
      title: 'Measurement fixtures',
      mimeType: 'application/json',
    },
    async (uri, variables) =>
      jsonResource(uri.href, await loadMeasurementFixture(String(variables.setId))),
  )
}

function jsonResource(uri: string, data: unknown) {
  return textResource(uri, `${JSON.stringify(data, null, 2)}\n`, 'application/json')
}

function textResource(uri: string, text: string, mimeType: string) {
  return {
    contents: [
      {
        uri,
        mimeType,
        text,
      },
    ],
  }
}
