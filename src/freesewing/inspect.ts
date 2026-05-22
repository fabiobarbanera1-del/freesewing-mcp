import {
  DesignConfig,
  getDesignConfig,
  getDesignEntry,
  instantiateDesign,
  listDesigns,
} from './registry.js'

export { listDesigns }

export async function inspectDesign(designId: string) {
  const entry = await getDesignEntry(designId)
  const config = await getDesignConfig(designId)

  return {
    designId: entry.id,
    package: entry.pkg,
    exportName: entry.exportName,
    metadata: sanitizeForJson(entry.about),
    measurements: getMeasurementRequirementsFromConfig(config),
    options: getDesignOptionsFromConfig(config),
    parts: Object.keys(config.parts ?? {}),
    plugins: Object.keys(config.plugins ?? {}),
    draftOrder: config.draftOrder ?? [],
    directDependencies: config.directDependencies ?? {},
    resolvedDependencies: config.resolvedDependencies ?? {},
    partHide: config.partHide ?? {},
  }
}

export async function getDesignOptions(designId: string) {
  return getDesignOptionsFromConfig(await getDesignConfig(designId))
}

export async function getMeasurementRequirements(designId: string) {
  return getMeasurementRequirementsFromConfig(await getDesignConfig(designId))
}

export function getDesignOptionsFromConfig(config: DesignConfig) {
  const options = config.options ?? {}

  return Object.fromEntries(
    Object.entries(options).map(([name, definition]) => [
      name,
      describeOption(definition),
    ]),
  )
}

export function getMeasurementRequirementsFromConfig(config: DesignConfig) {
  const required = config.measurements ?? []
  const optional = config.optionalMeasurements ?? []

  return {
    required,
    optional,
    all: [...required, ...optional],
  }
}

export async function validateInputAgainstDesign(
  designId: string,
  measurements: Record<string, number>,
  options: Record<string, unknown>,
) {
  const config = await getDesignConfig(designId)
  const requiredMeasurements = config.measurements ?? []
  const optionNames = new Set(Object.keys(config.options ?? {}))

  return {
    missingMeasurements: requiredMeasurements.filter(
      (measurement) => typeof measurements[measurement] !== 'number',
    ),
    invalidOptions: Object.keys(options).filter((option) => !optionNames.has(option)),
  }
}

export async function normalizeOptionsForDesign(
  designId: string,
  options: Record<string, unknown>,
) {
  const config = await getDesignConfig(designId)
  const definitions = config.options ?? {}
  const normalized: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(options)) {
    const definition = definitions[name]
    normalized[name] = isPercentOption(definition) && typeof value === 'number' ? value / 100 : value
  }

  return normalized
}

export async function getDesignMetadata(designId: string) {
  const entry = await getDesignEntry(designId)
  const about = sanitizeForJson(entry.about) as Record<string, unknown>
  return {
    id: entry.id,
    package: entry.pkg,
    exportName: entry.exportName,
    ...about,
  }
}

export async function createEmptyPatternForInspection(designId: string) {
  return instantiateDesign(designId)
}

function isPercentOption(definition: unknown) {
  return definition !== null && typeof definition === 'object' && 'pct' in definition
}

function describeOption(definition: unknown) {
  const serialized = sanitizeForJson(definition)

  if (typeof definition === 'boolean') {
    return {
      type: 'boolean',
      default: definition,
    }
  }

  if (typeof definition === 'number') {
    return {
      type: 'number',
      default: definition,
    }
  }

  if (definition && typeof definition === 'object') {
    const record = serialized as Record<string, unknown>
    if ('pct' in record) {
      return {
        type: 'percent',
        inputUnit: 'percent',
        internalUnit: 'fraction',
        default: record.pct,
        ...record,
      }
    }

    if ('bool' in record) {
      return {
        type: 'boolean',
        default: record.bool,
        ...record,
      }
    }

    if ('list' in record) {
      return {
        type: 'enum',
        ...record,
      }
    }

    return {
      type: 'object',
      ...record,
    }
  }

  return {
    type: typeof definition,
    default: serialized,
  }
}

export function sanitizeForJson(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'function') {
    return `[Function ${(value as Function).name || 'anonymous'}]`
  }

  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return String(value)
    return value
  }

  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForJson(item, seen))
  }

  const output: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value)) {
    output[key] = sanitizeForJson(nested, seen)
  }

  return output
}
