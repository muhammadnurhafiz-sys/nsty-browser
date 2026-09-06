/* electron-builder afterPack hook.
   Cross-building the Windows installer on Linux leaves the Linux better-sqlite3
   binary inside app.asar.unpacked, which crashes the app on launch. Fetch the
   matching Windows prebuilt and swap it in before NSIS packs the directory. */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const ARCH = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64' }

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return
  const target = path.join(context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')
  if (!fs.existsSync(target)) { console.log('[after-pack] no better-sqlite3 binary in package; nothing to do'); return }
  const electron = context.packager.config.electronVersion || require('electron/package.json').version
  const arch = ARCH[context.arch] || 'x64'
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'bs3-win-'))
  fs.copyFileSync(require.resolve('better-sqlite3/package.json'), path.join(work, 'package.json'))
  console.log(`[after-pack] fetching better-sqlite3 prebuilt for electron ${electron} win32 ${arch}`)
  execFileSync(process.execPath, [require.resolve('prebuild-install/bin.js'), '--runtime', 'electron', '--target', electron, '--platform', 'win32', '--arch', arch], { cwd: work, stdio: 'inherit' })
  const built = path.join(work, 'build', 'Release', 'better_sqlite3.node')
  const header = fs.readFileSync(built).subarray(0, 2).toString('latin1')
  if (header !== 'MZ') throw new Error(`[after-pack] downloaded binary is not a Windows PE file (header ${JSON.stringify(header)})`)
  fs.copyFileSync(built, target)
  fs.rmSync(work, { recursive: true, force: true })
  console.log('[after-pack] replaced better_sqlite3.node with the Windows prebuilt')
}
