import { draftDesign, validatePattern } from '../freesewing/draft.js'
import { inspectDesign, listDesigns } from '../freesewing/inspect.js'
import { runSizeMatrix } from '../validation/size-matrix.js'

const designs = await listDesigns()
console.log(JSON.stringify({ designs }, null, 2))

for (const design of designs) {
  const inspection = await inspectDesign(design.id)
  console.log(
    JSON.stringify(
      {
        designId: design.id,
        measurements: inspection.measurements,
        optionCount: Object.keys(inspection.options).length,
        parts: inspection.parts,
      },
      null,
      2,
    ),
  )

  const drafted = await draftDesign({
    designId: design.id,
    measurementFixture: 'standard',
  })
  const report = await validatePattern(drafted.patternId)
  console.log(
    JSON.stringify(
      {
        designId: design.id,
        patternId: drafted.patternId,
        svgLength: drafted.svgLength,
        report,
      },
      null,
      2,
    ),
  )
}

const matrix = await runSizeMatrix({
  designId: 'florent',
})
console.log(JSON.stringify({ florentSizeMatrix: matrix }, null, 2))
