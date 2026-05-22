#!/usr/bin/env node
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerPrompts } from './prompts.js'
import { registerResources } from './resources.js'
import { registerTools } from './tools.js'

export function createServer() {
  const server = new McpServer(
    {
      name: 'freesewing-mcp',
      version: '0.1.0',
    },
    {
      instructions:
        'MVP FreeSewing MCP server for listing official installed designs, inspecting design options/measurements, drafting patterns from measurements/options, rendering SVG, exposing renderProps, and producing validation reports. It does not author new designs or accept SVG as source input.',
    },
  )

  registerTools(server)
  registerResources(server)
  registerPrompts(server)

  return server
}

async function main() {
  const server = createServer()
  await server.connect(new StdioServerTransport())
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
