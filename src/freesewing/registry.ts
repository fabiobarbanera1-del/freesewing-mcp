import { readFile, writeFile } from 'node:fs/promises'
import { loadDesignPackage } from './design-loader.js'
import { assertSafeSlug, fileExists, projectRoot } from './storage.js'
import { join } from 'node:path'

export type Measurements = Record<string, number>
export type Options = Record<string, unknown>
export type CoreSettings = Record<string, unknown>

export type FreeSewingPattern = {
  getConfig: () => DesignConfig
  use: (plugin: unknown) => FreeSewingPattern
  draft: () => FreeSewingPattern
  render: () => string
  getRenderProps: () => Record<string, unknown>
}

export type FreeSewingConstructor = new (settings: unknown) => FreeSewingPattern

export type DesignConfig = {
  parts?: Record<string, unknown>
  plugins?: Record<string, unknown>
  measurements?: string[]
  optionalMeasurements?: string[]
  options?: Record<string, unknown>
  resolvedDependencies?: Record<string, string[]>
  directDependencies?: Record<string, string[]>
  draftOrder?: string[]
  partHide?: Record<string, boolean>
}

export type SupportedDesignRecord = {
  id: string
  packageName: string
  defaultMeasurementFixture: string
  status: 'supported'
  exportName?: string
  verifiedAt?: string
  verification?: Record<string, unknown>
}

export type DesignEntry = {
  id: string
  pkg: string
  constructor: FreeSewingConstructor
  about: Record<string, unknown>
  defaultMeasurementFixture: string
  exportName: string
}

const registryCache = new Map<string, DesignEntry>()

export function supportedDesignsPath() {
  return join(projectRoot(), 'catalog', 'supported-designs.json')
}

export async function readSupportedDesignRecords() {
  const path = supportedDesignsPath()
  if (!(await fileExists(path))) return []

  const raw = await readFile(path, 'utf8')
  const records = JSON.parse(raw) as SupportedDesignRecord[]
  return records
    .filter(isSafeSupportedDesignRecord)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function writeSupportedDesignRecords(records: SupportedDesignRecord[]) {
  const path = supportedDesignsPath()
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id))
  await writeFile(path, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  registryCache.clear()
}

export async function listDesigns() {
  const entries = await Promise.all(
    (await readSupportedDesignRecords()).map((record) => getDesignEntry(record.id)),
  )

  return entries.map((entry) => ({
    id: entry.id,
    package: entry.pkg,
    name: String(entry.about.name ?? entry.id),
    description: String(entry.about.description ?? ''),
    version: String(entry.about.version ?? 'unknown'),
    tags: Array.isArray(entry.about.tags) ? entry.about.tags : [],
    difficulty: entry.about.difficulty ?? null,
    exportName: entry.exportName,
  }))
}

export async function getDesignEntry(designId: string): Promise<DesignEntry> {
  assertSafeSlug(designId, 'designId')
  const cached = registryCache.get(designId)
  if (cached) return cached

  const record = (await readSupportedDesignRecords()).find((item) => item.id === designId)
  if (!record) {
    const supported = (await readSupportedDesignRecords()).map((item) => item.id).join(', ')
    throw new Error(
      `Unsupported designId "${designId}". Supported designs: ${supported || '(none)'}`,
    )
  }

  const loaded = await loadDesignPackage(record.packageName)
  const entry: DesignEntry = {
    id: record.id,
    pkg: record.packageName,
    constructor: loaded.constructor,
    about: loaded.about,
    defaultMeasurementFixture: record.defaultMeasurementFixture,
    exportName: loaded.exportName,
  }

  registryCache.set(designId, entry)
  return entry
}

export async function instantiateDesign(designId: string, settings: unknown = {}) {
  const entry = await getDesignEntry(designId)
  return new entry.constructor(settings)
}

export async function getDesignConfig(designId: string) {
  return (await instantiateDesign(designId)).getConfig()
}

export async function upsertSupportedDesignRecord(record: SupportedDesignRecord) {
  if (!isSafeSupportedDesignRecord(record)) {
    throw new Error(`Unsafe supported design record: ${record.id}`)
  }

  const records = await readSupportedDesignRecords()
  const index = records.findIndex((item) => item.id === record.id)
  if (index >= 0) records[index] = record
  else records.push(record)

  await writeSupportedDesignRecords(records)
  return record
}

function isSafeSupportedDesignRecord(record: SupportedDesignRecord) {
  return (
    record.status === 'supported' &&
    /^[a-z0-9][a-z0-9-]*$/.test(record.id) &&
    /^@freesewing\/[a-z0-9][a-z0-9-]*$/.test(record.packageName) &&
    /^[a-z0-9][a-z0-9-]*$/.test(record.defaultMeasurementFixture)
  )
}
