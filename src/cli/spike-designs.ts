import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pluginTheme } from '@freesewing/plugin-theme'
import { projectRoot } from '../freesewing/storage.js'

type Candidate = {
  id: string
  packageName: string
  description: string
}

type SpikeResult = {
  id: string
  packageName: string
  description: string
  importOk: boolean
  constructorOk: boolean
  configOk: boolean
  draftOk: boolean
  renderOk: boolean
  renderPropsOk: boolean
  requiredMeasurements: string[]
  optionalMeasurements: string[]
  unknownMeasurementDefaults: string[]
  optionCount: number
  partCount: number
  pathCount: number
  svgLength: number
  exportName?: string
  error?: string
}

const candidates: Candidate[] = [
  ['aaron', 'A FreeSewing pattern for a A-shirt or tank top'],
  ['albert', 'A FreeSewing pattern for an apron'],
  ['ashley', 'A FreeSewing pattern for A-line shorts'],
  ['bee', 'A FreeSewing pattern for a bikini top'],
  ['bella', 'A FreeSewing pattern for a womenswear bodice block'],
  ['benjamin', 'A FreeSewing pattern for a bow tie'],
  ['bent', 'A FreeSewing pattern for a menswear body block with a two-part sleeve'],
  ['bibi', 'A FreeSewing pattern for a knit top body block'],
  ['bob', 'A FreeSewing pattern for a bib'],
  ['bonny', 'A FreeSewing pattern that turns measurements into a body outline'],
  ['breanna', 'A FreeSewing pattern for a basic body block for womenswear'],
  ['brian', 'A FreeSewing pattern for a basic body block for menswear'],
  ['bruce', 'A FreeSewing pattern for boxer briefs'],
  ['carlita', 'A FreeSewing pattern for Sherlock Holmes cosplay; Or just a nice long coat'],
  ['carlton', 'A FreeSewing pattern for Sherlock Holmes cosplay; Or just a nice long coat'],
  ['cathrin', 'A FreeSewing pattern for a underbust corset / waist trainer'],
  ['charlie', 'A FreeSewing pattern for chino trousers'],
  ['cornelius', 'A FreeSewing pattern for cycling breeches, based on the Keystone drafting system'],
  ['crux', 'A FreeSewing pattern for climbing or hiking pants'],
  ['devon', 'A FreeSewing pattern for a denim jacket, based on the Bent block'],
  ['diana', 'A FreeSewing pattern for a top with a draped neck'],
  ['florence', 'A FreeSewing pattern for a face mask'],
  ['florent', 'A FreeSewing pattern for a flat cap'],
  ['gozer', 'A FreeSewing pattern for a ghost costume'],
  ['hi', 'A FreeSewing pattern for a shark plush toy'],
  ['holmes', 'A FreeSewing pattern for a Sherlock Holmes hat'],
  ['hortensia', 'A FreeSewing pattern for a handbag'],
  ['huey', 'A FreeSewing pattern for a zip-up hoodie'],
  ['hugo', 'A FreeSewing pattern for a hooded jumper with raglan sleeves'],
  ['jaeger', 'A FreeSewing pattern for a sport coat style jacket'],
  ['jane', 'A FreeSewing pattern for a 1790s shift'],
  ['jett', 'A FreeSewing pattern for a bomber or letterman jacket'],
  ['legend', 'A FreeSewing pattern to document pattern notation'],
  ['lily', 'A FreeSewing pattern for basic leggings'],
  ['lucy', 'A FreeSewing pattern for a historical tie-on pocket'],
  ['lumina', 'A FreeSewing pattern for leggings'],
  ['lumira', 'A FreeSewing pattern for leggings'],
  ['lunetius', 'A FreeSewing pattern for a lacerna, a historical Roman cloak'],
  ['magde', 'A FreeSewing pattern for a bike messenger bag'],
  ['noble', 'A FreeSewing pattern for a princess seam bodice block'],
  ['octoplushy', 'A FreeSewing pattern for an octopus plushy toy'],
  ['onyx', 'A FreeSewing pattern for one-piece garments'],
  ['opal', 'A FreeSewing pattern for overalls'],
  ['otis', 'A FreeSewing pattern for a baby romper'],
  ['paco', 'A FreeSewing pattern for summer pants'],
  ['penelope', 'A FreeSewing pattern for a pencil skirt'],
  ['percy', 'A FreeSewing pattern for fall-front puffy shorts'],
  ['plugintest', 'A FreeSewing pattern to test (y)our plugins'],
  ['rendertest', 'A FreeSewing pattern to test (y)our render engine our CSS'],
  ['sabrina', 'A FreeSewing pattern for sports tops'],
  ['sandy', 'A FreeSewing pattern for a circle skirt'],
  ['sarah', 'A FreeSewing pattern for a basic skirt block pattern based on Aldrich'],
  ['shale', 'A FreeSewing pattern for shorts'],
  ['shelly', 'A FreeSewing pattern for a raglan shirt, perfect for swim shirts'],
  ['shin', 'A FreeSewing pattern for swim trunks'],
  ['simon', 'A FreeSewing pattern for a button down shirt'],
  ['simone', 'A FreeSewing pattern for a button down shirt for people with breasts'],
  ['skully', 'A FreeSewing pattern for skully, the FreeSewing logo, as a plushy toy'],
  ['sophie', 'A FreeSewing pattern for a slip dress with a gathered bust'],
  ['sunny', 'A FreeSewing pattern for an 18th century split side skirt'],
  ['sven', 'A FreeSewing pattern for a straightforward sweater'],
  ['tamiko', 'A FreeSewing pattern for a zero-waste top'],
  ['teagan', 'A FreeSewing pattern for a T-shirt'],
  ['tiberius', 'A FreeSewing pattern for a tunica, a historical Roman tunic'],
  ['titan', 'A FreeSewing pattern for a unisex trouser block'],
  ['trayvon', 'A FreeSewing pattern for a tie'],
  ['tristan', 'A FreeSewing pattern for a fitted top with prince(ss) seams'],
  ['uma', 'A FreeSewing pattern for a basic, highly-customizable underwear pattern'],
  ['umbra', 'A FreeSewing pattern for a basic, highly-customizable underwear pattern'],
  ['wahid', 'A FreeSewing pattern for a classic fitted waistcoat'],
  ['walburga', 'A FreeSewing pattern for a historical European/medieval tabard or surcoat'],
  ['waralee', 'A FreeSewing pattern for wrap pants'],
  ['yuri', 'A FreeSewing pattern for a fancy zipless sweater based on the Huey hoodie'],
].map(([id, description]) => ({
  id,
  packageName: `@freesewing/${id}`,
  description,
}))

const measurementDefaults: Record<string, number> = {
  ankle: 240,
  biceps: 320,
  bustSpan: 190,
  bustFront: 500,
  bustPointToUnderbust: 90,
  chest: 1000,
  crossSeam: 740,
  crossSeamFront: 370,
  crotchDepth: 260,
  crotchToAnkle: 780,
  foot: 260,
  head: 580,
  heel: 360,
  highBust: 920,
  highBustFront: 470,
  hips: 1040,
  hpsToBust: 260,
  hpsToWaistBack: 430,
  hpsToWaistFront: 450,
  inseam: 800,
  knee: 420,
  naturalWaist: 820,
  neck: 380,
  seat: 1040,
  seatBack: 520,
  shoulderSlope: 13,
  shoulderToElbow: 350,
  shoulderToShoulder: 440,
  shoulderToWrist: 620,
  underbust: 850,
  upperLeg: 620,
  waist: 820,
  waistBack: 380,
  waistToArmpit: 260,
  waistToFloor: 1060,
  waistToHips: 120,
  waistToKnee: 600,
  waistToSeat: 210,
  waistToUnderbust: 170,
  waistToUpperLeg: 300,
  wrist: 180,
}

async function main() {
  const selected = process.argv.slice(2)
  const activeCandidates =
    selected.length > 0
      ? candidates.filter((candidate) => selected.includes(candidate.id))
      : candidates
  const results: SpikeResult[] = []

  for (const candidate of activeCandidates) {
    results.push(await testCandidate(candidate))
  }

  const summary = summarize(results)
  const report = {
    createdAt: new Date().toISOString(),
    summary,
    results,
  }
  const outDir = join(projectRoot(), 'outputs', 'spikes')
  const outFile = join(outDir, `design-compatibility-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}.json`)

  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({ ...summary, report: outFile }, null, 2))
  console.table(
    results.map((result) => ({
      id: result.id,
      import: result.importOk,
      config: result.configOk,
      draft: result.draftOk,
      render: result.renderOk,
      parts: result.partCount,
      paths: result.pathCount,
      missingHeuristics: result.unknownMeasurementDefaults.length,
      error: result.error ? result.error.slice(0, 80) : '',
    })),
  )
}

async function testCandidate(candidate: Candidate): Promise<SpikeResult> {
  const base: SpikeResult = {
    ...candidate,
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
    const moduleExports = await import(candidate.packageName)
    base.importOk = true

    const found = findDesignConstructor(moduleExports)
    if (!found) {
      return { ...base, error: 'No exported constructor matched the FreeSewing Pattern shape' }
    }

    base.constructorOk = true
    base.exportName = found.exportName

    const inspectionPattern = new found.Pattern({})
    const config = inspectionPattern.getConfig()
    base.configOk = true
    base.requiredMeasurements = config.measurements ?? []
    base.optionalMeasurements = config.optionalMeasurements ?? []
    base.optionCount = Object.keys(config.options ?? {}).length

    const { measurements, unknownMeasurementDefaults } = buildMeasurements(base.requiredMeasurements)
    base.unknownMeasurementDefaults = unknownMeasurementDefaults

    const pattern = new found.Pattern({
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
    return { ...base, error: errorToString(error) }
  }
}

function findDesignConstructor(moduleExports: Record<string, unknown>) {
  for (const [exportName, value] of Object.entries(moduleExports)) {
    if (typeof value !== 'function') continue

    try {
      const instance = new (value as new (settings: unknown) => unknown)({})
      if (
        instance &&
        typeof instance === 'object' &&
        'getConfig' in instance &&
        typeof (instance as { getConfig: unknown }).getConfig === 'function' &&
        'draft' in instance &&
        typeof (instance as { draft: unknown }).draft === 'function'
      ) {
        return {
          exportName,
          Pattern: value as new (settings: unknown) => {
            getConfig: () => {
              measurements?: string[]
              optionalMeasurements?: string[]
              options?: Record<string, unknown>
            }
            use: (plugin: unknown) => void
            draft: () => unknown
            getRenderProps: () => Record<string, unknown>
            render: () => string
          },
        }
      }
    } catch {
      // Part draft functions and helpers are expected to fail this constructor probe.
    }
  }

  return undefined
}

function buildMeasurements(requiredMeasurements: string[]) {
  const measurements: Record<string, number> = {}
  const unknownMeasurementDefaults: string[] = []

  for (const measurement of requiredMeasurements) {
    if (measurement in measurementDefaults) {
      measurements[measurement] = measurementDefaults[measurement]
    } else {
      measurements[measurement] = 500
      unknownMeasurementDefaults.push(measurement)
    }
  }

  return {
    measurements,
    unknownMeasurementDefaults,
  }
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

function summarize(results: SpikeResult[]) {
  return {
    total: results.length,
    importOk: results.filter((result) => result.importOk).length,
    configOk: results.filter((result) => result.configOk).length,
    draftOk: results.filter((result) => result.draftOk).length,
    renderOk: results.filter((result) => result.renderOk).length,
    renderPropsOk: results.filter((result) => result.renderPropsOk).length,
    unknownMeasurementHeuristicNeeded: results.filter(
      (result) => result.unknownMeasurementDefaults.length > 0,
    ).length,
  }
}

function errorToString(error: unknown) {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
