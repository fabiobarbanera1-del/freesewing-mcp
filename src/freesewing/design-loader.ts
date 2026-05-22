import { pluginTheme } from '@freesewing/plugin-theme'
import { buildSyntheticMeasurements } from './measurement-defaults.js'
import type { FreeSewingConstructor } from './registry.js'

export type LoadedDesign = {
  packageName: string
  exportName: string
  constructor: FreeSewingConstructor
  about: Record<string, unknown>
}

export type DesignVerificationResult = {
  packageName: string
  designId: string
  importOk: boolean
  constructorOk: boolean
  configOk: boolean
  draftOk: boolean
  renderOk: boolean
  renderPropsOk: boolean
  exportName?: string
  metadata?: Record<string, unknown>
  requiredMeasurements: string[]
  optionalMeasurements: string[]
  unknownMeasurementDefaults: string[]
  optionCount: number
  partCount: number
  pathCount: number
  svgLength: number
  error?: string
}

export async function loadDesignPackage(packageName: string): Promise<LoadedDesign> {
  const moduleExports = await import(packageName)
  const found = findDesignConstructor(moduleExports as Record<string, unknown>)
  if (!found) {
    throw new Error(`No FreeSewing design constructor found in ${packageName}`)
  }

  const about = (moduleExports as { about?: unknown }).about
  return {
    packageName,
    exportName: found.exportName,
    constructor: found.constructor,
    about: isRecord(about) ? about : {},
  }
}

export async function verifyDesignPackage(packageName: string): Promise<DesignVerificationResult> {
  const designId = packageNameToDesignId(packageName)
  const base: DesignVerificationResult = {
    packageName,
    designId,
    importOk: false,
    constructorOk: false,
    configOk: false,
    draftOk: false,
    renderOk: false,
    renderPropsOk: false,
    requiredMeasurements: [],
    optionalMeasurements: [],
    unknownMeasurementDefaults: [],
    optionCount: 0,
    partCount: 0,
    pathCount: 0,
    svgLength: 0,
  }

  try {
    const loaded = await loadDesignPackage(packageName)
    base.importOk = true
    base.constructorOk = true
    base.exportName = loaded.exportName
    base.metadata = loaded.about

    const inspectionPattern = new loaded.constructor({})
    const config = inspectionPattern.getConfig()
    base.configOk = true
    base.requiredMeasurements = config.measurements ?? []
    base.optionalMeasurements = config.optionalMeasurements ?? []
    base.optionCount = Object.keys(config.options ?? {}).length

    const { measurements, unknownMeasurementDefaults } = buildSyntheticMeasurements(
      base.requiredMeasurements,
    )
    base.unknownMeasurementDefaults = unknownMeasurementDefaults

    const pattern = new loaded.constructor({
      complete: true,
      sa: 10,
      units: 'metric',
      measurements,
    })
    pattern.use(pluginTheme)
    pattern.draft()
    base.draftOk = true

    const renderProps = pattern.getRenderProps()
    base.renderPropsOk = Boolean(renderProps && Object.keys(renderProps).length > 0)
    base.partCount = countParts(renderProps)
    base.pathCount = countPaths(renderProps)

    const svg = pattern.render()
    base.svgLength = svg.length
    base.renderOk = svg.includes('<svg') && svg.length > 0

    return base
  } catch (error) {
    return {
      ...base,
      error: errorToString(error),
    }
  }
}

export function packageNameToDesignId(packageName: string) {
  return packageName.replace(/^@freesewing\//, '')
}

function findDesignConstructor(moduleExports: Record<string, unknown>) {
  for (const [exportName, value] of Object.entries(moduleExports)) {
    if (typeof value !== 'function') continue

    try {
      const instance = new (value as FreeSewingConstructor)({})
      if (
        instance &&
        typeof instance === 'object' &&
        typeof instance.getConfig === 'function' &&
        typeof instance.draft === 'function'
      ) {
        return {
          exportName,
          constructor: value as FreeSewingConstructor,
        }
      }
    } catch {
      // Part draft functions and helpers are expected to fail this constructor probe.
    }
  }

  return undefined
}

function countParts(renderProps: Record<string, unknown>) {
  const stacks = renderProps.stacks
  if (!stacks || typeof stacks !== 'object' || Array.isArray(stacks)) return 0

  return Object.values(stacks).reduce<number>((sum, stack) => {
    if (!stack || typeof stack !== 'object') return sum
    const parts = (stack as { parts?: unknown }).parts
    return sum + (Array.isArray(parts) ? parts.length : 0)
  }, 0)
}

function countPaths(renderProps: Record<string, unknown>) {
  const stacks = renderProps.stacks
  if (!stacks || typeof stacks !== 'object' || Array.isArray(stacks)) return 0

  let pathsCount = 0
  for (const stack of Object.values(stacks)) {
    if (!stack || typeof stack !== 'object') continue
    const parts = (stack as { parts?: unknown }).parts
    if (!Array.isArray(parts)) continue

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue
      const paths = (part as { paths?: unknown }).paths
      if (paths && typeof paths === 'object') pathsCount += Object.keys(paths).length
    }
  }

  return pathsCount
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function errorToString(error: unknown) {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}
