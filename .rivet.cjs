// Rivet project source v1: 9ed9f761fc83037a17e3f32203db020c0aab9fe4e36b618d19be8d5497e04595
'use strict';
const path = require('node:path');
const cache = path.join(require('node:fs').realpathSync(require('node:os').homedir()), '.cache', 'rivet', 'project-runtimes');
try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 or newer is required.');
  const fs = require('node:fs');
  if (fs.realpathSync(cache) !== cache) throw new Error('Private runtime cache path is unsafe.');
  const index = path.join(cache, 'source-9ed9f761fc83037a17e3f32203db020c0aab9fe4e36b618d19be8d5497e04595-' + process.platform + '-' + process.arch + '.json');
  const stat = fs.lstatSync(index);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024) throw new Error('Private runtime index is unsafe.');
  const fd = fs.openSync(index, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  let record;
  try {
    const opened = fs.fstatSync(fd), buffer = Buffer.alloc(1025), size = fs.readSync(fd, buffer, 0, buffer.length, 0), after = fs.fstatSync(fd);
    if (opened.dev !== stat.dev || opened.ino !== stat.ino || size !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs) throw new Error('Private runtime index changed.');
    record = JSON.parse(buffer.subarray(0, size).toString('utf8'));
  } finally { fs.closeSync(fd); }
  if (Object.keys(record).length !== 1 || !/^[a-f0-9]{64}$/.test(record.runtimeId)) throw new Error('Private runtime index is invalid.');
  const runtime = (function runtimeIntegrity(root, expectedId, expectedSource) {
  const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), os = require('node:os');
  const fail = () => { throw new Error('Pinned Rivet runtime is missing or changed. Reinstall the approved project runtime.'); };
  const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const inside = value => value === root || (value.startsWith(root + path.sep));
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || fs.realpathSync(root) !== root) fail();
  const manifestPath = path.join(root, '.rivet-runtime.json');
  const regular = (file, maximum) => {
    const before = fs.lstatSync(file);
    if (!before.isFile() || before.isSymbolicLink() || before.size > maximum) fail();
    const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      const opened = fs.fstatSync(fd);
      if (opened.dev !== before.dev || opened.ino !== before.ino) fail();
      const bytes = Buffer.alloc(before.size + 1), length = fs.readSync(fd, bytes, 0, bytes.length, 0);
      const after = fs.fstatSync(fd);
      if (length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) fail();
      return bytes.subarray(0, length);
    } finally { fs.closeSync(fd); }
  };
  const metadata = JSON.parse(regular(manifestPath, 16384).toString('utf8'));
  if (metadata.schemaVersion !== 1 || metadata.platform !== process.platform || metadata.architecture !== process.arch
    || !/^[a-f0-9]{64}$/.test(metadata.sourceDigest) || !/^[a-f0-9]{64}$/.test(metadata.artifactDigest)
    || metadata.package?.name !== '@agilno/rivet') fail();
  const entries = []; let total = 0;
  const visit = (directory, relative = '') => {
    for (const name of fs.readdirSync(directory).sort()) {
      if (name === '.rivet-runtime.json' && !relative) continue;
      if (!name || /[\u0000-\u001f\u007f\\]/.test(name)) fail();
      const ref = relative ? relative + '/' + name : name, file = path.join(directory, name), stat = fs.lstatSync(file);
      if (entries.length >= 20000) fail();
      if (stat.isSymbolicLink()) {
        if (!ref.startsWith('node_modules/') || !inside(fs.realpathSync(file))) fail();
        entries.push({ path: ref, kind: 'link', target: fs.readlinkSync(file) });
      } else if (stat.isDirectory()) { entries.push({ path: ref, kind: 'directory' }); visit(file, ref); }
      else {
        const bytes = regular(file, 16 * 1024 * 1024); total += bytes.length;
        if (total > 128 * 1024 * 1024) fail();
        entries.push({ path: ref, kind: 'file', executable: Boolean(stat.mode & 0o111), sha256: digest(bytes) });
      }
    }
  };
  visit(root);
  const id = digest(JSON.stringify({ metadata, entries }));
  if (expectedId !== undefined && id !== expectedId) fail();
  const entry = path.join(root, 'node_modules', '@agilno', 'rivet', 'bin', 'cli.js');
  if (!inside(fs.realpathSync(entry))) fail();
  const pkg = JSON.parse(regular(path.join(root, 'node_modules', '@agilno', 'rivet', 'package.json'), 65536));
  if (pkg.name !== metadata.package.name || pkg.version !== metadata.package.version || !Array.isArray(pkg.files)) fail();
  // Bind the installed Rivet code to the portable project source pin. Runtime
  // dependencies and platform remain independently pinned in the private cache.
  const packageRoot = path.join(root, 'node_modules', '@agilno', 'rivet');
  const sourceFiles = new Map();
  const sourceVisit = ref => {
    if (typeof ref !== 'string' || !ref || path.isAbsolute(ref) || /[\u0000-\u001f\u007f\\*?]/.test(ref)
      || ref.split('/').some(part => !part || part === '.' || part === '..' || part === '.git' || part === 'node_modules')) fail();
    const file = path.join(packageRoot, ref), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) fail();
    if (stat.isDirectory()) { for (const name of fs.readdirSync(file).sort()) sourceVisit(ref + '/' + name); return; }
    sourceFiles.set(ref, { path: ref, mode: stat.mode & 0o111 ? 0o755 : 0o644, sha256: digest(regular(file,16*1024*1024)) });
  };
  sourceVisit('package.json');
  for (const ref of pkg.files) sourceVisit(ref.replace(/\/$/, ''));
  const sourceDigest = digest(JSON.stringify([...sourceFiles.values()].sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)))));
  if (sourceDigest !== metadata.sourceDigest || (expectedSource !== undefined && sourceDigest !== expectedSource)) fail();
  return { id, entry, metadata };
})(path.join(cache, record.runtimeId), record.runtimeId, '9ed9f761fc83037a17e3f32203db020c0aab9fe4e36b618d19be8d5497e04595');
  import(require('node:url').pathToFileURL(runtime.entry).href).catch(error => { console.error(error.safeMessage || 'Pinned Rivet failed.'); process.exitCode = 1; });
} catch (error) { console.error(error.message); process.exitCode = 1; }
