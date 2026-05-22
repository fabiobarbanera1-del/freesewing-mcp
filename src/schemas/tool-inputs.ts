import { z } from 'zod'

export const DesignIdSchema = z.object({
  designId: z.string().min(1),
})

export const PatternIdSchema = z.object({
  patternId: z.string().min(1),
})

export const MeasurementsSchema = z.record(z.string(), z.number())
export const OptionsSchema = z.record(z.string(), z.unknown())
export const SettingsSchema = z.record(z.string(), z.unknown())

export const DraftDesignInputSchema = z.object({
  designId: z.string().min(1),
  measurements: MeasurementsSchema.optional(),
  measurementFixture: z.string().min(1).optional(),
  options: OptionsSchema.optional(),
  settings: SettingsSchema.optional(),
})

export const RunSizeMatrixInputSchema = z.object({
  designId: z.string().min(1),
  options: OptionsSchema.optional(),
  measurementSets: z.array(z.union([z.string().min(1), MeasurementsSchema])).optional(),
  settings: SettingsSchema.optional(),
})

export const DiscoverFreeSewingDesignsInputSchema = z.object({
  online: z.boolean().optional(),
})

export const CheckDesignPackageInputSchema = z.object({
  designId: z.string().min(1).optional(),
  packageName: z.string().min(1).optional(),
  online: z.boolean().optional(),
})

export const InstallDesignPackageInputSchema = z.object({
  designId: z.string().min(1).optional(),
  packageName: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
  saveToPackageJson: z.boolean().optional(),
  confirm: z.string().optional(),
})

export const RegisterSupportedDesignInputSchema = z.object({
  designId: z.string().min(1).optional(),
  packageName: z.string().min(1).optional(),
  defaultMeasurementFixture: z.string().min(1).optional(),
  verify: z.boolean().optional(),
})
