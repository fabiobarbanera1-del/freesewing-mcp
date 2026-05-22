import { randomUUID } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

export type PatternMetadata = {
  patternId: string
  designId: string
  createdAt: string
  input: {
    measurements: Record<string, number>
    options: Record<string, unknown>
    normalizedOptions?: Record<string, unknown>
    settings: Record<string, unknown>
    measurementFixture?: string
  }
  requiredMeasurements: string[]
  optionalMeasurements: string[]
  missingMeasurements: string[]
  invalidOptions: string[]
  draftSuccess: boolean
  renderSuccess: boolean
  errors: string[]
  files: {
    metadata: string
    svg: string
    renderProps: string
    validationReport: string
  }
}

const srcDir = dirname(fileURLToPath(import.meta.url))
const defaultRoot = resolve(srcDir, '..', '..')

export function projectRoot() {
  return resolve(process.env.FREESEWING_MCP_ROOT ?? defaultRoot)
}

export function fixturePath(...segments: string[]) {
  return join(projectRoot(), 'fixtures', ...segments)
}

export function outputPath(...segments: string[]) {
  return join(projectRoot(), 'outputs', ...segments)
}

export function createPatternId(designId: string) {
  assertSafeSlug(designId, 'designId')
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${designId}-${timestamp}-${randomUUID().slice(0, 8)}`
}

export function getPatternFilePaths(patternId: string) {
  assertSafePatternId(patternId)
  return {
    metadata: outputPath('patterns', `${patternId}.json`),
    svg: outputPath('svg', `${patternId}.svg`),
    renderProps: outputPath('render-props', `${patternId}.json`),
    validationReport: outputPath('reports', `${patternId}.json`),
  }
}

export function getPatternFileReferences(patternId: string) {
  assertSafePatternId(patternId)
  return {
    metadata: relativeProjectPath('outputs', 'patterns', `${patternId}.json`),
    svg: relativeProjectPath('outputs', 'svg', `${patternId}.svg`),
    renderProps: relativeProjectPath('outputs', 'render-props', `${patternId}.json`),
    validationReport: relativeProjectPath('outputs', 'reports', `${patternId}.json`),
  }
}

export async function ensureOutputDirs() {
  await Promise.all([
    mkdir(outputPath('patterns'), { recursive: true }),
    mkdir(outputPath('svg'), { recursive: true }),
    mkdir(outputPath('render-props'), { recursive: true }),
    mkdir(outputPath('reports'), { recursive: true }),
  ])
}

export async function writeJson(path: string, data: unknown) {
  const safePath = resolveProjectFile(path)
  await mkdir(dirname(safePath), { recursive: true })
  await writeFile(safePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolveProjectFile(path), 'utf8')) as T
}

export async function writeText(path: string, text: string) {
  const safePath = resolveProjectFile(path)
  await mkdir(dirname(safePath), { recursive: true })
  await writeFile(safePath, text, 'utf8')
}

export async function readText(path: string) {
  return readFile(resolveProjectFile(path), 'utf8')
}

export async function fileExists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function savePatternMetadata(metadata: PatternMetadata) {
  await writeJson(metadata.files.metadata, metadata)
}

export async function readPatternMetadata(patternId: string) {
  return readJson<PatternMetadata>(getPatternFilePaths(patternId).metadata)
}

export async function listPatternMetadata() {
  const dir = outputPath('patterns')
  if (!(await fileExists(dir))) return []

  const files = (await readdir(dir)).filter((file) => file.endsWith('.json'))
  const records = await Promise.all(
    files.map((file) => readJson<PatternMetadata>(join(dir, file))),
  )

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function assertSafeSlug(value: string, label: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`)
  }
}

export function assertSafePatternId(patternId: string) {
  if (!/^[a-z0-9][a-z0-9-]*-\d{14}-[a-f0-9]{8}$/.test(patternId)) {
    throw new Error(`Unsafe patternId: ${patternId}`)
  }
}

function relativeProjectPath(...segments: string[]) {
  return segments.join('/')
}

function resolveProjectFile(path: string) {
  const root = projectRoot()
  const resolved = isAbsolute(path) ? resolve(path) : resolve(root, path)
  const pathFromRoot = relative(root, resolved)

  if (
    pathFromRoot === '' ||
    pathFromRoot.startsWith('..') ||
    isAbsolute(pathFromRoot) ||
    resolved === root
  ) {
    throw new Error(`Refusing to access path outside project root: ${path}`)
  }

  if (pathFromRoot.split(sep).includes('..')) {
    throw new Error(`Refusing unsafe project path: ${path}`)
  }

  return resolved
}
