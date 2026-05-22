import assert from 'node:assert/strict'
import { isAbsolute } from 'node:path'
import { test } from 'node:test'
import {
  checkDesignPackage,
  compareDesignCatalog,
  installDesignPackage,
  verifyInstalledDesign,
} from '../src/freesewing/catalog.js'
import { getDesignOptions, normalizeOptionsForDesign } from '../src/freesewing/inspect.js'
import { draftDesign, renderSvg } from '../src/freesewing/draft.js'

test('compares local design catalog against supported registry', async () => {
  const catalog = await compareDesignCatalog({ online: false })

  assert.ok(catalog.totals.installed >= 5)
  assert.equal(catalog.totals.supported, 5)
  assert.ok(catalog.designs.some((design) => design.id === 'florent' && design.supported))
  assert.ok(catalog.designs.some((design) => design.id === 'carlton' && design.supported))
})

test('checks and verifies an installed design package', async () => {
  const check = await checkDesignPackage({ designId: 'florent', online: false })
  assert.equal(check.packageName, '@freesewing/florent')
  assert.equal(check.installed, true)
  assert.equal(check.supported, true)

  const verification = await verifyInstalledDesign({ designId: 'florent' })
  assert.equal(verification.importOk, true)
  assert.equal(verification.configOk, true)
  assert.equal(verification.draftOk, true)
  assert.equal(verification.renderOk, true)
  assert.equal(verification.renderPropsOk, true)
})

test('install design package defaults to dry run', async () => {
  const dryRun = await installDesignPackage({ designId: 'trayvon' })

  assert.equal(dryRun.dryRun, true)
  assert.equal(dryRun.packageName, '@freesewing/trayvon')
  assert.match(dryRun.command, /npm(\.cmd)? install @freesewing\/trayvon@4\.8\.0/)
  assert.match(dryRun.command, /--save-exact/)
})

test('install design package rejects unpinned FreeSewing versions', async () => {
  await assert.rejects(
    () => installDesignPackage({ designId: 'trayvon', version: 'latest' }),
    /pinned to 4\.8\.0/,
  )
})

test('normalizes percent options from displayed percentages to FreeSewing fractions', async () => {
  const options = await getDesignOptions('carlton')
  const collarHeight = options.collarHeight as Record<string, unknown>

  assert.equal(collarHeight.type, 'percent')
  assert.equal(collarHeight.inputUnit, 'percent')
  assert.equal(collarHeight.internalUnit, 'fraction')

  const normalized = await normalizeOptionsForDesign('carlton', {
    collarHeight: 10.5,
    chestEase: 15,
  })

  assert.equal(normalized.collarHeight, 0.105)
  assert.equal(normalized.chestEase, 0.15)
})

test('rejects path traversal in fixture and pattern identifiers', async () => {
  await assert.rejects(
    () => draftDesign({ designId: 'florent', measurementFixture: '../package-lock' }),
    /Unsafe measurementFixture/,
  )

  await assert.rejects(() => renderSvg('../package-lock'), /Unsafe patternId/)
})

test('stores generated artifact references without absolute local paths', async () => {
  const drafted = await draftDesign({
    designId: 'florent',
    measurementFixture: 'standard',
  })

  assert.equal(isAbsolute(drafted.files.metadata), false)
  assert.equal(isAbsolute(drafted.files.svg), false)
  assert.equal(isAbsolute(drafted.files.renderProps), false)
  assert.equal(isAbsolute(drafted.files.validationReport), false)
  assert.match(drafted.files.svg, /^outputs\/svg\/florent-\d{14}-[a-f0-9]{8}\.svg$/)
})
