import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fixturePath, fileExists, readJson } from './storage.js'
import { Measurements, getDesignEntry } from './registry.js'

export async function listMeasurementFixtures() {
  const dir = fixturePath('measurements')
  if (!(await fileExists(dir))) return []

  return (await readdir(dir))
    .filter((file) => file.endsWith('.json'))
    .map((file) => basename(file, '.json'))
    .sort()
}

export async function loadMeasurementFixture(setId: string) {
  const path = fixturePath('measurements', `${setId}.json`)
  return readJson<Measurements>(path)
}

export async function loadOptionFixture(designId: string) {
  const path = fixturePath('options', `${designId}.json`)
  if (!(await fileExists(path))) return {}
  return readJson<Record<string, unknown>>(path)
}

export async function resolveMeasurements(
  designId: string,
  measurements?: Measurements,
  measurementFixture?: string,
) {
  if (measurements) {
    return {
      measurements,
      measurementFixture,
    }
  }

  const fixture = measurementFixture ?? (await getDesignEntry(designId)).defaultMeasurementFixture
  return {
    measurements: await loadMeasurementFixture(fixture),
    measurementFixture: fixture,
  }
}

export async function resolveMeasurementSets(
  designId: string,
  measurementSets?: Array<string | Measurements>,
) {
  const sets =
    measurementSets && measurementSets.length > 0
      ? measurementSets
      : ['small', 'standard', 'large']

  return Promise.all(
    sets.map(async (set, index) => {
      if (typeof set === 'string') {
        return {
          setId: set,
          measurements: await loadMeasurementFixture(set),
        }
      }

      return {
        setId: `inline-${index + 1}`,
        measurements: set,
      }
    }),
  )
}
