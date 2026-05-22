import { ValidationReport } from '../schemas/validation-report.js'

export type BasicValidationInput = {
  patternId: string
  designId: string
  draftSuccess: boolean
  renderSuccess: boolean
  svg?: string
  renderProps?: Record<string, unknown>
  missingMeasurements: string[]
  invalidOptions: string[]
  draftErrors?: string[]
}

export function createBasicValidationReport(input: BasicValidationInput): ValidationReport {
  const svgNotEmpty = Boolean(input.svg && input.svg.trim().length > 0 && input.svg.includes('<svg'))
  const renderPropsAvailable = Boolean(input.renderProps && Object.keys(input.renderProps).length > 0)
  const partsCount = countParts(input.renderProps)
  const pathsCount = countPaths(input.renderProps)
  const warnings: string[] = []
  const errors = [...(input.draftErrors ?? [])]

  if (!input.draftSuccess) errors.push('Draft failed')
  if (!input.renderSuccess) errors.push('SVG render failed')
  if (!svgNotEmpty) errors.push('SVG output is empty or missing an <svg> root')
  if (!renderPropsAvailable) errors.push('renderProps are unavailable')
  if (input.missingMeasurements.length > 0) {
    errors.push(`Missing measurements: ${input.missingMeasurements.join(', ')}`)
  }
  if (input.invalidOptions.length > 0) {
    errors.push(`Unsupported options: ${input.invalidOptions.join(', ')}`)
  }
  if (partsCount === 0 && input.renderSuccess) {
    warnings.push('Pattern rendered, but no renderProps stacks were found')
  }
  if (pathsCount === 0 && input.renderSuccess) {
    warnings.push('Pattern rendered, but no paths were found in renderProps')
  }

  return {
    patternId: input.patternId,
    designId: input.designId,
    draftSuccess: input.draftSuccess,
    renderSuccess: input.renderSuccess,
    svgNotEmpty,
    renderPropsAvailable,
    partsCount,
    pathsCount,
    missingMeasurements: input.missingMeasurements,
    invalidOptions: input.invalidOptions,
    warnings,
    errors: dedupe(errors),
    checkedAt: new Date().toISOString(),
  }
}

function countParts(renderProps?: Record<string, unknown>): number {
  const stacks = getStacks(renderProps)
  if (!stacks) return 0

  return Object.values(stacks).reduce<number>((sum, stack) => {
    if (!stack || typeof stack !== 'object') return sum
    const parts = (stack as { parts?: unknown }).parts
    return sum + (Array.isArray(parts) ? parts.length : 0)
  }, 0)
}

function countPaths(renderProps?: Record<string, unknown>): number {
  const stacks = getStacks(renderProps)
  if (!stacks) return 0

  let count = 0
  for (const stack of Object.values(stacks)) {
    if (!stack || typeof stack !== 'object') continue
    const parts = (stack as { parts?: unknown }).parts
    if (!Array.isArray(parts)) continue

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue
      const paths = (part as { paths?: unknown }).paths
      if (paths && typeof paths === 'object') {
        count += Object.keys(paths).length
      }
    }
  }

  return count
}

function getStacks(renderProps?: Record<string, unknown>) {
  const stacks = renderProps?.stacks
  if (!stacks || typeof stacks !== 'object' || Array.isArray(stacks)) return undefined
  return stacks as Record<string, unknown>
}

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}
