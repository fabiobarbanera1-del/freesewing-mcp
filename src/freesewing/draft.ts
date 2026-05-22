import { pluginTheme } from '@freesewing/plugin-theme'
import { createBasicValidationReport } from '../validation/basic.js'
import { ValidationReport } from '../schemas/validation-report.js'
import { resolveMeasurements } from './fixtures.js'
import {
  getMeasurementRequirements,
  normalizeOptionsForDesign,
  sanitizeForJson,
  validateInputAgainstDesign,
} from './inspect.js'
import { CoreSettings, Measurements, Options, instantiateDesign } from './registry.js'
import {
  PatternMetadata,
  createPatternId,
  ensureOutputDirs,
  getPatternFilePaths,
  readJson,
  readPatternMetadata,
  readText,
  savePatternMetadata,
  writeJson,
  writeText,
} from './storage.js'

export type DraftDesignInput = {
  designId: string
  measurements?: Measurements
  measurementFixture?: string
  options?: Options
  settings?: CoreSettings
}

export type DraftDesignResult = {
  patternId: string
  designId: string
  files: PatternMetadata['files']
  metadata: PatternMetadata
  validationReport: ValidationReport
  svgLength: number
}

export async function draftDesign(input: DraftDesignInput): Promise<DraftDesignResult> {
  await ensureOutputDirs()

  const patternId = createPatternId(input.designId)
  const files = getPatternFilePaths(patternId)
  const rawOptions = input.options ?? {}
  const options = await normalizeOptionsForDesign(input.designId, rawOptions)
  const { measurements, measurementFixture } = await resolveMeasurements(
    input.designId,
    input.measurements,
    input.measurementFixture,
  )
  const requirements = await getMeasurementRequirements(input.designId)
  const inputValidation = await validateInputAgainstDesign(input.designId, measurements, options)
  const settings = normalizeSettings(measurements, options, input.settings)

  let svg = ''
  let renderProps: Record<string, unknown> | undefined
  let draftSuccess = false
  let renderSuccess = false
  const errors: string[] = []

  try {
    const pattern = await instantiateDesign(input.designId, settings)
    pattern.use(pluginTheme).draft()
    draftSuccess = true

    renderProps = sanitizeForJson(pattern.getRenderProps()) as Record<string, unknown>
    svg = pattern.render()
    renderSuccess = true
  } catch (error) {
    errors.push(errorToString(error))
  }

  const validationReport = createBasicValidationReport({
    patternId,
    designId: input.designId,
    draftSuccess,
    renderSuccess,
    svg,
    renderProps,
    missingMeasurements: inputValidation.missingMeasurements,
    invalidOptions: inputValidation.invalidOptions,
    draftErrors: errors,
  })

  const metadata: PatternMetadata = {
    patternId,
    designId: input.designId,
    createdAt: new Date().toISOString(),
    input: {
      measurements,
      options: sanitizeForJson(rawOptions) as Record<string, unknown>,
      normalizedOptions: sanitizeForJson(options) as Record<string, unknown>,
      settings: sanitizeForJson(input.settings ?? {}) as Record<string, unknown>,
      measurementFixture,
    },
    requiredMeasurements: requirements.required,
    optionalMeasurements: requirements.optional,
    missingMeasurements: inputValidation.missingMeasurements,
    invalidOptions: inputValidation.invalidOptions,
    draftSuccess,
    renderSuccess,
    errors,
    files,
  }

  await savePatternMetadata(metadata)
  if (svg) await writeText(files.svg, svg)
  if (renderProps) await writeJson(files.renderProps, renderProps)
  await writeJson(files.validationReport, validationReport)

  return {
    patternId,
    designId: input.designId,
    files,
    metadata,
    validationReport,
    svgLength: svg.length,
  }
}

export async function renderSvg(patternId: string) {
  const metadata = await readPatternMetadata(patternId)
  const svg = await readText(metadata.files.svg)

  return {
    patternId,
    designId: metadata.designId,
    svg,
    svgLength: svg.length,
    file: metadata.files.svg,
  }
}

export async function getRenderProps(patternId: string) {
  const metadata = await readPatternMetadata(patternId)
  return {
    patternId,
    designId: metadata.designId,
    renderProps: await readJson<Record<string, unknown>>(metadata.files.renderProps),
    file: metadata.files.renderProps,
  }
}

export async function validatePattern(patternId: string) {
  const metadata = await readPatternMetadata(patternId)
  let svg = ''
  let renderProps: Record<string, unknown> | undefined

  try {
    svg = await readText(metadata.files.svg)
  } catch {
    // Missing SVG is reported by the validation report below.
  }

  try {
    renderProps = await readJson<Record<string, unknown>>(metadata.files.renderProps)
  } catch {
    // Missing render props are reported by the validation report below.
  }

  const report = createBasicValidationReport({
    patternId,
    designId: metadata.designId,
    draftSuccess: metadata.draftSuccess,
    renderSuccess: metadata.renderSuccess,
    svg,
    renderProps,
    missingMeasurements: metadata.missingMeasurements,
    invalidOptions: metadata.invalidOptions,
    draftErrors: metadata.errors,
  })

  await writeJson(metadata.files.validationReport, report)
  return report
}

export async function explainFailure(patternId: string) {
  const report = await validatePattern(patternId)
  const metadata = await readPatternMetadata(patternId)

  if (report.errors.length === 0 && report.warnings.length === 0) {
    return {
      patternId,
      status: 'valid',
      summary: 'Pattern drafted and rendered successfully with no validation errors.',
      nextActions: [],
    }
  }

  const nextActions: string[] = []
  if (report.missingMeasurements.length > 0) {
    nextActions.push(`Provide numeric values for: ${report.missingMeasurements.join(', ')}`)
  }
  if (report.invalidOptions.length > 0) {
    nextActions.push(`Remove or rename unsupported options: ${report.invalidOptions.join(', ')}`)
  }
  if (!report.draftSuccess) {
    nextActions.push('Inspect the draft error and retry with known-good measurement fixtures.')
  }
  if (!report.renderSuccess || !report.svgNotEmpty) {
    nextActions.push('Draft again and inspect renderProps before requesting SVG output.')
  }

  return {
    patternId,
    status: 'invalid',
    designId: metadata.designId,
    summary: report.errors[0] ?? report.warnings[0] ?? 'Pattern validation found issues.',
    errors: report.errors,
    warnings: report.warnings,
    nextActions,
  }
}

function normalizeSettings(
  measurements: Measurements,
  options: Options,
  settings?: CoreSettings,
): CoreSettings {
  return {
    complete: true,
    sa: 10,
    units: 'metric',
    ...settings,
    measurements,
    options,
  }
}

function errorToString(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? error.message
  }

  return String(error)
}
