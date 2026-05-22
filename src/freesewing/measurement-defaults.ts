export const syntheticMeasurementDefaults: Record<string, number> = {
  ankle: 240,
  biceps: 320,
  bustFront: 500,
  bustPointToUnderbust: 90,
  bustSpan: 190,
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

export function buildSyntheticMeasurements(requiredMeasurements: string[]) {
  const measurements: Record<string, number> = {}
  const unknownMeasurementDefaults: string[] = []

  for (const measurement of requiredMeasurements) {
    if (measurement in syntheticMeasurementDefaults) {
      measurements[measurement] = syntheticMeasurementDefaults[measurement]
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
