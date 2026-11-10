// Installs the sibling ../game-hub checkout (built and packed) over the
// GitHub dependency, for testing shell changes before they are pushed.
import { execSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const hub = path.resolve('../game-hub');
const run = (cmd, cwd = process.cwd()) => execSync(cmd, { cwd, stdio: 'inherit' });

run('npm run build:lib', hub);
const tgz = execSync('npm pack --silent --pack-destination ' + JSON.stringify(process.cwd()), { cwd: hub })
  .toString().trim().split('\n').pop();
try {
  run(`npm install --no-save ./${tgz}`);
} finally {
  for (const f of readdirSync('.')) if (/^altterisk-game-hub-.*\.tgz$/.test(f)) rmSync(f);
}
