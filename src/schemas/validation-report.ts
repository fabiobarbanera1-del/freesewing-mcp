export type ValidationReport = {
  patternId: string
  designId: string
  draftSuccess: boolean
  renderSuccess: boolean
  svgNotEmpty: boolean
  renderPropsAvailable: boolean
  partsCount: number
  pathsCount: number
  missingMeasurements: string[]
  invalidOptions: string[]
  warnings: string[]
  errors: string[]
  checkedAt: string
}
