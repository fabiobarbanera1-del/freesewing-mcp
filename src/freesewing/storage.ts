import { randomUUID } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
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
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${designId}-${timestamp}-${randomUUID().slice(0, 8)}`
}

export function getPatternFilePaths(patternId: string) {
  return {
    metadata: outputPath('patterns', `${patternId}.json`),
    svg: outputPath('svg', `${patternId}.svg`),
    renderProps: outputPath('render-props', `${patternId}.json`),
    validationReport: outputPath('reports', `${patternId}.json`),
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
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

export async function writeText(path: string, text: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text, 'utf8')
}

export async function readText(path: string) {
  return readFile(path, 'utf8')
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
