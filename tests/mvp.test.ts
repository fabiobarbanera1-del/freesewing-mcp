import assert from 'node:assert/strict'
import { test } from 'node:test'
import { draftDesign, validatePattern } from '../src/freesewing/draft.js'
import { inspectDesign, listDesigns } from '../src/freesewing/inspect.js'
import { runSizeMatrix } from '../src/validation/size-matrix.js'

test('lists and inspects installed FreeSewing designs', async () => {
  const designs = await listDesigns()
  assert.equal(designs.length, 5)
  assert.deepEqual(
    designs.map((design) => design.id).sort(),
    ['aaron', 'bella', 'carlton', 'florent', 'teagan'],
  )

  const florent = await inspectDesign('florent')
  assert.deepEqual(florent.measurements.required, ['head'])
  assert.ok(florent.parts.length >= 3)
})

test('drafts a design, renders SVG, stores renderProps, and validates output', async () => {
  const drafted = await draftDesign({
    designId: 'florent',
    measurementFixture: 'standard',
  })
  const report = await validatePattern(drafted.patternId)

  assert.equal(report.draftSuccess, true)
  assert.equal(report.renderSuccess, true)
  assert.equal(report.svgNotEmpty, true)
  assert.equal(report.renderPropsAvailable, true)
  assert.ok(report.partsCount >= 1)
  assert.ok(report.pathsCount >= 1)
  assert.deepEqual(report.errors, [])
})

test('runs size matrix with three measurement fixtures', async () => {
  const matrix = await runSizeMatrix({ designId: 'florent' })

  assert.equal(matrix.totalRuns, 3)
  assert.equal(matrix.successfulRuns, 3)
  assert.equal(matrix.sizeMatrixStable, true)
})
