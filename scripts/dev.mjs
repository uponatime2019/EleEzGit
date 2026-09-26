import { createServer } from 'vite';
import * as esbuild from 'esbuild';
import { spawn } from 'child_process';
import electronPath from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildElectron() {
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'electron/main.ts')],
    bundle: true,
    platform: 'node',
    external: ['electron'],
    outfile: path.join(rootDir, 'dist-electron/main.cjs'),
    sourcemap: true,
  });

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'electron/preload.ts')],
    bundle: true,
    platform: 'node',
    external: ['electron'],
    outfile: path.join(rootDir, 'dist-electron/preload.cjs'),
    sourcemap: true,
  });
}

async function startDev() {
  console.log('[EleEzGit] Building Electron main & preload...');
  await buildElectron();

  console.log('[EleEzGit] Starting Vite Dev Server...');
  const server = await createServer({
    configFile: path.join(rootDir, 'vite.config.ts'),
    server: { port: 5173 }
  });
  await server.listen();
  console.log('[EleEzGit] Vite server running at http://localhost:5173');

  console.log('[EleEzGit] Launching Electron...');
  let electronProcess = null;

  function runElectron() {
    if (electronProcess) {
      electronProcess.kill();
    }
    electronProcess = spawn(electronPath, [path.join(rootDir, 'dist-electron/main.cjs')], {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
        NODE_ENV: 'development'
      }
    });

    electronProcess.on('exit', (code) => {
      if (code !== null) {
        process.exit(code);
      }
    });
  }

  runElectron();
}

startDev().catch(err => {
  console.error('[EleEzGit] Error launching dev environment:', err);
  process.exit(1);
});
