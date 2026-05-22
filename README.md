# FreeSewing MCP

Experimental v0 MCP server for controlled FreeSewing inspection, drafting,
SVG rendering, renderProps extraction, and basic validation.

This is an unofficial MCP server built on top of the open source FreeSewing v4
npm packages. It is not affiliated with or endorsed by the FreeSewing project.

This project does not create new FreeSewing designs from scratch. It runs
installed official FreeSewing design packages and turns measurements/options
into generated pattern artifacts.

## What It Is

FreeSewing separates a parametric design from the pattern drafted from that
design. This MCP server gives an AI agent a bounded interface around that
workflow:

```text
MCP client -> FreeSewing MCP tool -> installed FreeSewing design
  -> draft pattern -> SVG + renderProps + validation report
```

The server uses stdio transport. It does not open an HTTP port.

## Requirements

- Node.js 20 or newer.
- npm for installing dependencies from `package-lock.json`.
- A local MCP client that can launch stdio servers, such as Codex, Claude
  Desktop, Claude Code, or another MCP-compatible host.
- Network access to the npm registry during `npm install` and online catalog
  discovery.

The project can run on Windows, macOS, and Linux anywhere Node.js can install
the dependencies and spawn a stdio process. It is tested locally on Windows
with Node.js v22.14.0 and npm 10.9.2. On Windows, use `npm.cmd` rather than
the PowerShell `npm.ps1` wrapper.

This is not a hosted web service and does not expose an HTTP API. It runs as a
local process started by an MCP client.

## Quick Start

For development, clone the repository, install dependencies, build the server,
and run the checks:

```bash
npm install
npm run check
npm test
npm run build
npm run smoke
```

On Windows PowerShell, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run smoke
```

After the build, MCP clients should launch:

```bash
node dist/mcp/server.js
```

## Install As A Command

For MCP client usage without keeping a development checkout, install the
GitHub repository as a global npm command:

```bash
npm install -g git+https://github.com/<owner>/freesewing-mcp.git
```

On Windows PowerShell:

```powershell
npm.cmd install -g git+https://github.com/<owner>/freesewing-mcp.git
```

The package runs `npm run build` during Git installation and packages the
generated `dist/` directory, so the installed command points at
`dist/mcp/server.js`.

After global install, MCP clients can launch:

```bash
freesewing-mcp
```

If your MCP host cannot see npm global commands on `PATH`, use the full path
to the npm global binary directory or use the development checkout with
`node dist/mcp/server.js`.

## What It Does

- Lists supported FreeSewing designs from `catalog/supported-designs.json`.
- Inspects design metadata, parts, measurements, options, plugins, and
  dependencies.
- Drafts supported designs from explicit measurements or local fixtures.
- Normalizes `type: "percent"` options from displayed percentages to the
  FreeSewing internal fraction format before drafting.
- Saves generated pattern metadata, SVG, renderProps, and validation reports.
- Runs a small/standard/large size matrix.
- Provides a controlled catalog workflow to discover, install, verify, and
  register additional official FreeSewing design packages.

## What It Does Not Do

- It does not author, scaffold, patch, or fork FreeSewing design source.
- It does not infer garments from images.
- It does not treat uploaded SVG files as source patterns.
- It does not promise arbitrary garment-to-pattern generation.
- It does not generate PDF output in v0.
- It does not perform advanced geometry validation such as self-intersection,
  seam-pair matching, grainline checks, notches, or cut-list validation.

## Supported Designs

Supported designs are the curated registry entries that normal drafting tools
can use:

| Design | Package | Notes |
| --- | --- | --- |
| `aaron` | `@freesewing/aaron` | A-shirt/tank top |
| `bella` | `@freesewing/bella` | Womenswear bodice block |
| `carlton` | `@freesewing/carlton` | Long coat |
| `florent` | `@freesewing/florent` | Flat cap |
| `teagan` | `@freesewing/teagan` | T-shirt |

The source of truth is:

```text
catalog/supported-designs.json
```

## Available, Installed, And Supported

The catalog workflow distinguishes three states:

- Available online: an official FreeSewing design package found on npm.
- Installed locally: a package present under local `node_modules`.
- Supported in registry: a package recorded in
  `catalog/supported-designs.json` and available to `inspect_design`,
  `draft_design`, and related tools.

Installed packages are not automatically supported. A design must pass
verification and be registered before the stable MCP tools expose it.

## Recommended Catalog Workflow

Use this sequence when adding a design:

```text
list_designs
-> discover_freesewing_designs
-> check_design_package
-> install_design_package dryRun=true
-> install_design_package dryRun=false confirm=INSTALL_FREESEWING_DESIGN
-> verify_design_package
-> register_supported_design
-> draft_design
```

`install_design_package` defaults to `dryRun=true`. Real installation requires:

- package name matching `@freesewing/[a-z0-9-]+`;
- pinned FreeSewing v4.8.0 package metadata;
- explicit `confirm="INSTALL_FREESEWING_DESIGN"`;
- local project install from this project directory;
- no global npm install.

## MCP Tools

- `list_designs`
- `discover_freesewing_designs`
- `compare_design_catalog`
- `check_design_package`
- `verify_design_package`
- `install_design_package`
- `register_supported_design`
- `inspect_design`
- `get_design_options`
- `get_measurement_requirements`
- `draft_design`
- `render_svg`
- `get_render_props`
- `validate_pattern`
- `run_size_matrix`
- `explain_failure`

## MCP Resources

- `design://{designId}/metadata`
- `design://{designId}/options`
- `design://{designId}/measurements`
- `pattern://{patternId}/svg`
- `pattern://{patternId}/render-props`
- `pattern://{patternId}/validation-report`
- `measurements://fixtures/{setId}`

## Percent Options

FreeSewing exposes many style/fit options as percentages. MCP callers should
pass displayed percentages:

```json
{
  "collarHeight": 10.5,
  "chestEase": 15
}
```

The server drafts with normalized FreeSewing fractions:

```json
{
  "collarHeight": 0.105,
  "chestEase": 0.15
}
```

Generated metadata stores both `options` and `normalizedOptions` so the input
and actual FreeSewing settings can be audited.

## Generated Outputs

Drafting writes local generated artifacts under `outputs/`:

```text
outputs/patterns/{patternId}.json
outputs/svg/{patternId}.svg
outputs/render-props/{patternId}.json
outputs/reports/{patternId}.json
outputs/spikes/*.json
```

`outputs/` is ignored by Git because these files are generated local artifacts.

## Command Reference

Install dependencies after cloning:

```bash
npm install
```

Run validation commands:

```bash
npm run check
npm test
npm run build
npm run smoke
```

Run the stdio server after building:

```bash
node dist/mcp/server.js
```

Optional compatibility spike:

```bash
npm run spike:designs
```

The spike assumes candidate packages are installed locally and writes reports
to `outputs/spikes/`. Passing the spike does not automatically register a
design as supported.

On Windows PowerShell, use `npm.cmd` for the same commands.

## Codex Configuration

Build first, then configure Codex to launch the compiled stdio server. Replace
the path with your local absolute path:

```toml
[mcp_servers.freesewing]
command = "node"
args = ["C:\\path\\to\\freesewing-mcp\\dist\\mcp\\server.js"]
```

This project does not modify Codex configuration automatically.

If installed globally from GitHub, Codex can launch the npm bin directly:

```toml
[mcp_servers.freesewing]
command = "freesewing-mcp"
args = []
```

## Claude Desktop And Claude Code

Claude Desktop supports local MCP stdio servers through
`claude_desktop_config.json`. On Windows, that file is typically under
`%APPDATA%\Claude\claude_desktop_config.json`.

```json
{
  "mcpServers": {
    "freesewing": {
      "command": "node",
      "args": [
        "C:\\path\\to\\freesewing-mcp\\dist\\mcp\\server.js"
      ]
    }
  }
}
```

Claude Code can use a project-scoped `.mcp.json`:

```json
{
  "mcpServers": {
    "freesewing": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\path\\to\\freesewing-mcp\\dist\\mcp\\server.js"
      ]
    }
  }
}
```

Or add it through the Claude Code CLI:

```bash
claude mcp add --scope project --transport stdio freesewing -- node "C:\path\freesewing-mcp\dist\mcp\server.js"
```

This project documents those client configurations but does not create or edit
Claude configuration files.

If installed globally from GitHub, use `"command": "freesewing-mcp"` and omit
the `args` array, as long as Claude can see npm global commands on `PATH`.

References:

- https://modelcontextprotocol.io/docs/develop/connect-local-servers
- https://docs.claude.com/en/docs/claude-code/mcp

## Security Model

- The MCP server is local stdio only.
- Tool inputs are validated with Zod schemas.
- Supported designs are allowlisted in `catalog/supported-designs.json`.
- Design IDs, measurement fixture IDs, and pattern IDs are constrained to safe
  slug formats before filesystem access.
- Additional install requests are restricted to `@freesewing/*` package names.
- Install defaults to dry-run and requires explicit confirmation for execution.
- Actual install verifies npm metadata before running.
- New installs are local to this project and use npm save-exact behavior.
- The server never edits Codex or Claude configuration files.
- Generated artifacts are written only under the local `outputs/` tree, and
  metadata stores project-relative artifact paths rather than local absolute
  paths.
- Official FreeSewing npm packages are executable code; only install packages
  from sources you trust.

Online catalog discovery and `npm audit` contact the npm registry.

## Public v0 Notes

- License: MIT.
- Package is intentionally `private: true` to prevent accidental npm
  publication. Public GitHub publication is still fine.
- Dependencies are pinned to the versions in `package-lock.json`.
- `node_modules/`, `dist/`, `outputs/`, logs, caches, coverage, and local env
  files are ignored.
- This workspace can be pushed publicly as an experimental v0 after final test
  and audit review, but it should not be described as production-ready pattern
  engineering software.
