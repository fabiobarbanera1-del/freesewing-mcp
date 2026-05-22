import { DraftDesignInput, draftDesign } from '../freesewing/draft.js'
import { resolveMeasurementSets } from '../freesewing/fixtures.js'
import { Measurements, Options } from '../freesewing/registry.js'

export type RunSizeMatrixInput = {
  designId: string
  options?: Options
  measurementSets?: Array<string | Measurements>
  settings?: Record<string, unknown>
}

export async function runSizeMatrix(input: RunSizeMatrixInput) {
  const sets = await resolveMeasurementSets(input.designId, input.measurementSets)
  const runs = []

  for (const set of sets) {
    const draftInput: DraftDesignInput = {
      designId: input.designId,
      measurements: set.measurements,
      options: input.options ?? {},
      settings: input.settings,
    }
    const result = await draftDesign(draftInput)

    runs.push({
      setId: set.setId,
      patternId: result.patternId,
      draftSuccess: result.validationReport.draftSuccess,
      renderSuccess: result.validationReport.renderSuccess,
      svgNotEmpty: result.validationReport.svgNotEmpty,
      partsCount: result.validationReport.partsCount,
      pathsCount: result.validationReport.pathsCount,
      errors: result.validationReport.errors,
      warnings: result.validationReport.warnings,
      files: result.files,
    })
  }

  return {
    designId: input.designId,
    sizeMatrixStable: runs.every(
      (run) => run.draftSuccess && run.renderSuccess && run.svgNotEmpty && run.errors.length === 0,
    ),
    totalRuns: runs.length,
    successfulRuns: runs.filter(
      (run) => run.draftSuccess && run.renderSuccess && run.svgNotEmpty,
    ).length,
    runs,
  }
}
