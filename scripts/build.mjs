import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(projectRoot, '04_APP_FRONT');
const output = path.join(projectRoot, 'dist');

// The output is a fixed child directory, never a caller-supplied path.
if (path.dirname(output) !== path.resolve(projectRoot) || path.basename(output) !== 'dist') {
  throw new Error('Diretorio de build fora do projeto.');
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ['index.html', 'src', 'assets']) {
  await cp(path.join(source, entry), path.join(output, entry), { recursive: true });
}
console.log('BDB: interface, scripts e ativos copiados para dist/.');
