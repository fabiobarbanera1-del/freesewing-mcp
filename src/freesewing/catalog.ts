import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { packageNameToDesignId, verifyDesignPackage } from './design-loader.js'
import {
  SupportedDesignRecord,
  readSupportedDesignRecords,
  upsertSupportedDesignRecord,
} from './registry.js'
import { fileExists, projectRoot } from './storage.js'

const execFileAsync = promisify(execFile)
const SUPPORTED_FREESEWING_VERSION = '4.8.0'

export type DiscoverDesignsInput = {
  online?: boolean
}

export type DesignCatalogItem = {
  id: string
  packageName: string
  version?: string
  description?: string
  installed: boolean
  supported: boolean
  source: 'npm' | 'local'
}

export type CheckDesignPackageInput = {
  designId?: string
  packageName?: string
  online?: boolean
}

export type InstallDesignPackageInput = {
  designId?: string
  packageName?: string
  version?: string
  dryRun?: boolean
  saveToPackageJson?: boolean
  confirm?: string
}

export type RegisterSupportedDesignInput = {
  designId?: string
  packageName?: string
  defaultMeasurementFixture?: string
  verify?: boolean
}

type NpmSearchItem = {
  name: string
  version?: string
  description?: string
  keywords?: string[]
  links?: {
    npm?: string
  }
}

export async function discoverFreeSewingDesigns(input: DiscoverDesignsInput = {}) {
  const supported = await readSupportedDesignRecords()
  const supportedIds = new Set(supported.map((record) => record.id))
  const installed = await listInstalledFreeSewingPackages()
  const installedPackages = new Set(installed.map((item) => item.packageName))

  if (input.online === false) {
    return {
      source: 'local' as const,
      designs: installed.map((item) => ({
        ...item,
        installed: true,
        supported: supportedIds.has(item.id),
        source: 'local' as const,
      })),
    }
  }

  const items = await npmJson<NpmSearchItem[]>(['search', 'freesewing', '--json', '--searchlimit=200'])
  const designs = items
    .filter(isOfficialV4DesignSearchResult)
    .map((item) => {
      const id = packageNameToDesignId(item.name)
      return {
        id,
        packageName: item.name,
        version: item.version,
        description: item.description,
        installed: installedPackages.has(item.name),
        supported: supportedIds.has(id),
        source: 'npm' as const,
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id))

  return {
    source: 'npm' as const,
    designs,
  }
}

export async function compareDesignCatalog(input: DiscoverDesignsInput = {}) {
  const discovered = await discoverFreeSewingDesigns(input)
  const supported = await readSupportedDesignRecords()
  const supportedIds = new Set(supported.map((record) => record.id))

  const designs = discovered.designs.map((design) => ({
    ...design,
    state: design.supported
      ? 'supported'
      : design.installed
        ? 'installed-unregistered'
        : 'available',
  }))

  return {
    source: discovered.source,
    totals: {
      discovered: designs.length,
      installed: designs.filter((design) => design.installed).length,
      supported: designs.filter((design) => design.supported).length,
      availableToInstall: designs.filter((design) => !design.installed).length,
      installedUnregistered: designs.filter(
        (design) => design.installed && !supportedIds.has(design.id),
      ).length,
    },
    designs,
  }
}

export async function checkDesignPackage(input: CheckDesignPackageInput) {
  const packageName = normalizePackageName(input)
  assertSafeFreeSewingPackage(packageName)
  const installedInfo = await getInstalledPackageInfo(packageName)
  let npmInfo: Record<string, unknown> | undefined
  let npmError: string | undefined

  if (input.online !== false) {
    try {
      npmInfo = await npmJson<Record<string, unknown>>([
        'view',
        packageName,
        'name',
        'version',
        'description',
        'keywords',
        'license',
        'repository',
        '--json',
      ])
    } catch (error) {
      npmError = errorToString(error)
    }
  }

  return {
    designId: packageNameToDesignId(packageName),
    packageName,
    safePackageName: true,
    installed: Boolean(installedInfo),
    installedVersion: installedInfo?.version,
    npmAvailable: Boolean(npmInfo),
    npmInfo,
    npmError,
    supported: (await readSupportedDesignRecords()).some(
      (record) => record.packageName === packageName,
    ),
  }
}

export async function verifyInstalledDesign(input: CheckDesignPackageInput) {
  const packageName = normalizePackageName(input)
  assertSafeFreeSewingPackage(packageName)
  return verifyDesignPackage(packageName)
}

export async function installDesignPackage(input: InstallDesignPackageInput) {
  const packageName = normalizePackageName(input)
  assertSafeFreeSewingPackage(packageName)

  const version = normalizeFreeSewingVersion(input.version)
  const spec = `${packageName}@${version}`
  const args = ['install', spec]
  if (input.saveToPackageJson === false) {
    args.push('--no-save', '--package-lock=false')
  } else {
    args.push('--save-exact')
  }

  if (input.dryRun !== false) {
    return {
      dryRun: true,
      packageName,
      command: `${npmCommand()} ${args.join(' ')}`,
      confirmationRequired: 'Set dryRun=false and confirm="INSTALL_FREESEWING_DESIGN" to install.',
      saveToPackageJson: input.saveToPackageJson !== false,
    }
  }

  if (input.confirm !== 'INSTALL_FREESEWING_DESIGN') {
    throw new Error(
      'Installation requires explicit confirm="INSTALL_FREESEWING_DESIGN". Run dryRun first to inspect the command.',
    )
  }

  const npmInfo = await npmJson<NpmSearchItem>([
    'view',
    spec,
    'name',
    'version',
    'description',
    'keywords',
    '--json',
  ])
  if (!isOfficialV4DesignPackageJson(packageName, npmInfo)) {
    throw new Error(
      `${spec} does not look like an official FreeSewing v4 design package and was not installed.`,
    )
  }

  const result = await execNpm(args)
  const verification = await verifyDesignPackage(packageName)

  return {
    dryRun: false,
    packageName,
    saveToPackageJson: input.saveToPackageJson !== false,
    stdout: result.stdout,
    stderr: result.stderr,
    verification,
  }
}

export async function registerSupportedDesign(input: RegisterSupportedDesignInput) {
  const packageName = normalizePackageName(input)
  assertSafeFreeSewingPackage(packageName)
  const designId = packageNameToDesignId(packageName)
  const shouldVerify = input.verify !== false
  const verification = shouldVerify ? await verifyDesignPackage(packageName) : undefined

  if (verification && !(verification.importOk && verification.configOk && verification.draftOk && verification.renderOk)) {
    throw new Error(
      `Design ${packageName} did not pass verification and was not registered: ${verification.error ?? 'verification failed'}`,
    )
  }

  const record: SupportedDesignRecord = {
    id: designId,
    packageName,
    defaultMeasurementFixture: input.defaultMeasurementFixture ?? 'standard',
    status: 'supported',
    exportName: verification?.exportName,
    verifiedAt: verification ? new Date().toISOString() : undefined,
    verification: verification
      ? {
          requiredMeasurements: verification.requiredMeasurements,
          optionalMeasurements: verification.optionalMeasurements,
          optionCount: verification.optionCount,
          partCount: verification.partCount,
          pathCount: verification.pathCount,
          svgLength: verification.svgLength,
        }
      : undefined,
  }

  await upsertSupportedDesignRecord(record)

  return {
    registered: true,
    record,
    verification,
  }
}

async function listInstalledFreeSewingPackages(): Promise<DesignCatalogItem[]> {
  const scopeDir = join(projectRoot(), 'node_modules', '@freesewing')
  if (!(await fileExists(scopeDir))) return []

  const names = await readdir(scopeDir)
  const items: DesignCatalogItem[] = []

  for (const name of names) {
    const packageName = `@freesewing/${name}`
    const packageJsonPath = join(scopeDir, name, 'package.json')
    if (!(await fileExists(packageJsonPath))) continue

    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
        version?: string
        description?: string
        keywords?: string[]
      }
      if (!isOfficialV4DesignPackageJson(packageName, packageJson)) continue

      items.push({
        id: name,
        packageName,
        version: packageJson.version,
        description: packageJson.description,
        installed: true,
        supported: false,
        source: 'local',
      })
    } catch {
      // Ignore malformed package metadata in node_modules.
    }
  }

  return items.sort((a, b) => a.id.localeCompare(b.id))
}

async function getInstalledPackageInfo(packageName: string) {
  const packageJsonPath = join(
    projectRoot(),
    'node_modules',
    '@freesewing',
    packageNameToDesignId(packageName),
    'package.json',
  )
  if (!(await fileExists(packageJsonPath))) return undefined

  return JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    version?: string
    description?: string
    keywords?: string[]
  }
}

function normalizePackageName(input: CheckDesignPackageInput) {
  if (input.packageName) return input.packageName
  if (input.designId) return `@freesewing/${input.designId}`
  throw new Error('Provide either packageName or designId')
}

function normalizeFreeSewingVersion(version?: string) {
  if (version && version !== SUPPORTED_FREESEWING_VERSION) {
    throw new Error(
      `Unsupported FreeSewing version "${version}". Experimental v0 is pinned to ${SUPPORTED_FREESEWING_VERSION}.`,
    )
  }

  return SUPPORTED_FREESEWING_VERSION
}

function assertSafeFreeSewingPackage(packageName: string) {
  if (!/^@freesewing\/[a-z0-9-]+$/.test(packageName)) {
    throw new Error(`Unsafe or unsupported FreeSewing package name: ${packageName}`)
  }
}

function isOfficialV4DesignSearchResult(item: NpmSearchItem) {
  return isOfficialV4DesignPackageJson(item.name, item)
}

function isOfficialV4DesignPackageJson(
  packageName: string,
  packageJson: { version?: string; description?: string; keywords?: string[] },
) {
  return (
    /^@freesewing\/[a-z0-9-]+$/.test(packageName) &&
    packageJson.version === SUPPORTED_FREESEWING_VERSION &&
    Array.isArray(packageJson.keywords) &&
    packageJson.keywords.includes('pattern') &&
    typeof packageJson.description === 'string' &&
    packageJson.description.startsWith('A FreeSewing pattern')
  )
}

async function npmJson<T>(args: string[]) {
  const result = await execNpm(args)
  return JSON.parse(result.stdout) as T
}

async function execNpm(args: string[]) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm'
  const commandArgs =
    process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', ...args] : args

  const result = await execFileAsync(command, commandArgs, {
    cwd: projectRoot(),
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 20,
  })

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function errorToString(error: unknown) {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}
