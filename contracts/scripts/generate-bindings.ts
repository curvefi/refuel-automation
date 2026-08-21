#!/usr/bin/env bun
// Regenerates the CRE bindings from evm/src/abi; patches explained in contracts/README.md.
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const contractsDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = join(contractsDir, '..') // repo root, where project.yaml lives
const generatedDir = join(contractsDir, 'evm/ts/generated')

console.log('> cre generate-bindings evm --language typescript')
execSync('cre generate-bindings evm --language typescript', {
  cwd: projectRoot,
  stdio: 'inherit',
})

for (const file of readdirSync(generatedDir)) {
  if (!file.endsWith('.ts') || file.endsWith('_mock.ts') || file === 'index.ts') continue
  const path = join(generatedDir, file)
  fixOverloadFunctionNames(path)
  fixStructFieldNames(path)
  fixFixedArrayParams(path)
  addCallBlockNumberParam(path)

  // Patch 5: the _mock sibling imports the ABI rather than embedding it, so it needs
  // the real file's blob to know what to rename.
  const mock = join(generatedDir, file.replace(/\.ts$/, '_mock.ts'))
  if (existsSync(mock)) {
    fixStructFieldNames(mock, path)
    fixFixedArrayParams(mock, path)
  }
}

// Patch 1: functionName gets the suffixed name (`exchange0`), which viem rejects.
function fixOverloadFunctionNames(path: string): void {
  const src = readFileSync(path, 'utf8')

  const abiMatch = src.match(/export const \w+ABI = (\[[\s\S]*?\]) as const/)
  if (!abiMatch) return
  const abi = JSON.parse(abiMatch[1]) as Array<{ type?: string; name?: string }>
  const realNames = new Set(abi.filter((e) => e.type === 'function').map((e) => e.name))

  const fixed = new Set<string>()
  const patched = src.replace(/functionName: '([^']+)' as const/g, (whole, name: string) => {
    if (realNames.has(name)) return whole
    const stripped = name.replace(/\d+$/, '')
    if (!realNames.has(stripped)) {
      throw new Error(`${path}: functionName '${name}' is not in the ABI and has no un-suffixed match`)
    }
    fixed.add(`${name} -> ${stripped}`)
    return `functionName: '${stripped}' as const`
  })

  if (fixed.size === 0) return
  writeFileSync(path, patched)
  console.log(`Patched overloads in ${path}: ${[...fixed].join(', ')}`)
}

// Patch 3: struct fields are camelCased in the type but viem decodes the ABI names.
function fixStructFieldNames(path: string, abiPath: string = path): void {
  const src = readFileSync(path, 'utf8')

  const abiMatch = readFileSync(abiPath, 'utf8').match(/export const \w+ABI = (\[[\s\S]*?\]) as const/)
  if (!abiMatch) return

  // Every component name anywhere in the ABI, at any nesting depth.
  const names = new Set<string>()
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') {
      const o = node as { name?: string; components?: unknown; inputs?: unknown; outputs?: unknown }
      if (o.components) {
        for (const c of o.components as Array<{ name?: string }>) if (c.name) names.add(c.name)
      }
      for (const key of ['components', 'inputs', 'outputs'] as const) if (o[key]) walk(o[key])
    }
  }
  walk(JSON.parse(abiMatch[1]))

  // Rename throughout: the same name is camelCased as a parameter too.
  const abi = JSON.parse(abiMatch[1]) as Array<{ type?: string; name?: string }>
  const methods = new Set(
    abi
      .filter((e) => e.type === 'function' && e.name)
      .map((e) => (e.name as string).replace(/_(\w)/g, (_, c: string) => c.toUpperCase())),
  )

  const renames = [...names]
    .filter((n) => n.includes('_'))
    .map((n) => [n.replace(/_(\w)/g, (_, c: string) => c.toUpperCase()), n] as const)
    .filter(([camel, snake]) => camel !== snake && !methods.has(camel))
  if (renames.length === 0) return

  // The ABI blob quotes its keys (`"coin_in":`), so it is never hit here.
  let patched = src
  const applied: string[] = []
  for (const [camel, snake] of renames) {
    const re = new RegExp(`\\b${camel}\\b`, 'g')
    if (!re.test(patched)) continue
    patched = patched.replace(re, snake)
    applied.push(`${camel} -> ${snake}`)
  }

  if (applied.length === 0) return
  writeFileSync(path, patched)
  console.log(`Patched struct fields in ${path}: ${applied.join(', ')}`)
}

// Patch 4: a `uint128[2]` param needs an exact-length tuple, not `readonly bigint[]`.
function fixFixedArrayParams(path: string, abiPath: string = path): void {
  const src = readFileSync(path, 'utf8')

  const abiMatch = readFileSync(abiPath, 'utf8').match(/export const \w+ABI = (\[[\s\S]*?\]) as const/)
  if (!abiMatch) return

  const TS: Record<string, string> = { uint: 'bigint', int: 'bigint', address: '`0x${string}`', bool: 'boolean' }
  const tsFor = (t: string): string | null => {
    const m = t.match(/^(u?int)\d*$/)
    if (m) return Number((t.match(/\d+/) || ['256'])[0]) > 48 ? 'bigint' : 'number'
    return TS[t] ?? null
  }

  // param name -> the tuple type its ABI length implies
  const fixed = new Map<string, string>()
  for (const e of JSON.parse(abiMatch[1]) as Array<{ inputs?: Array<{ name: string; type: string }> }>) {
    for (const i of e.inputs ?? []) {
      const m = i.type.match(/^(\w+)\[(\d+)\]$/)
      if (!m) continue
      const base = tsFor(m[1])
      if (base) fixed.set(i.name, `readonly [${Array(Number(m[2])).fill(base).join(', ')}]`)
    }
  }
  if (fixed.size === 0) return

  let patched = src
  const applied: string[] = []
  for (const [name, tuple] of fixed) {
    const re = new RegExp(`(\\n\\s*${name}: )readonly (?:bigint|number|boolean|\`0x\\$\\{string\\}\`)\\[\\],`, 'g')
    if (!re.test(patched)) continue
    patched = patched.replace(re, `$1${tuple},`)
    applied.push(name)
  }

  if (applied.length === 0) return
  writeFileSync(path, patched)
  console.log(`Patched fixed-array params in ${path}: ${applied.join(', ')}`)
}

// Patch 2: reads hardcode LAST_FINALIZED_BLOCK_NUMBER; expose an optional override.
function addCallBlockNumberParam(path: string): void {
  const src = readFileSync(path, 'utf8')

  if (src.includes('callBlockNumber')) {
    console.log(`Already has callBlockNumber, skipping: ${path}`)
    return
  }
  if (!src.includes('blockNumber: LAST_FINALIZED_BLOCK_NUMBER,')) return // no reads

  const abiConst = src.match(/export const (\w+ABI)/)
  if (!abiConst) throw new Error(`${path}: no ...ABI const to anchor the type on`)

  const patched = src
    .replace(
      `\nexport const ${abiConst[1]}`,
      `\ntype BlockNumberOption = typeof LAST_FINALIZED_BLOCK_NUMBER\n\nexport const ${abiConst[1]}`,
    )
    // Matches a read's parameter close. \r?\n because the generator emits CRLF.
    .replace(
      /\r?\n(\s*)\): (.+?) \{\r?\n(\s*)const callData = encodeFunctionData/g,
      '\n$1  callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,\n$1): $2 {\n$3const callData = encodeFunctionData',
    )
    .replace(/blockNumber: LAST_FINALIZED_BLOCK_NUMBER,/g, 'blockNumber: callBlockNumber,')

  // Every use needs a declared param, or the file references an undefined name.
  const declared = (patched.match(/callBlockNumber: BlockNumberOption/g) || []).length
  const used = (patched.match(/blockNumber: callBlockNumber,/g) || []).length
  if (patched === src || used === 0 || declared !== used) {
    throw new Error(
      `Failed to patch ${path}: declared ${declared} callBlockNumber params for ${used} uses — ` +
        "generator output shape may have changed; update generate-bindings.ts.",
    )
  }

  writeFileSync(path, patched)
  console.log(`Added callBlockNumber to reads in ${path}`)
}
