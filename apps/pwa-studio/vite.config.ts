import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function termuxFactoryBridge(): Plugin {
  const home = os.homedir();
  const factoryDir = path.join(home, 'pwa-factory');
  const appsDir = path.join(factoryDir, 'apps');
  const scriptsDir = path.join(factoryDir, 'scripts');

  const attachMiddleware = (middlewares: any) => {
    middlewares.use('/api/factory', (req: any, res: any, next: any) => {
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'GET' && (req.url === '/status' || req.url === '/')) {
        const installedApps = fs.existsSync(appsDir)
          ? fs.readdirSync(appsDir).filter((name) => {
              try {
                return fs.statSync(path.join(appsDir, name)).isDirectory();
              } catch {
                return false;
              }
            })
          : [];

        execFile('tmux', ['list-windows', '-a', '-F', '#S:#W'], (err, stdout) => {
          const tmuxWindows = err
            ? []
            : stdout
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
          res.end(
            JSON.stringify({
              ok: true,
              factoryDir,
              installedApps,
              tmuxWindows
            })
          );
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/action') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const action = String(payload.action || '');
            const slug = String(payload.slug || '').replace(/[^a-z0-9-]/g, '');
            const tmuxSession = String(payload.tmuxSession || 'rho').replace(/[^a-zA-Z0-9_-]/g, '');
            const prompt = String(payload.prompt || '');

            if (!slug) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Missing valid app slug' }));
              return;
            }

            if (action === 'scaffold') {
              execFile(
                'bash',
                [path.join(scriptsDir, 'new-app.sh'), slug],
                { timeout: 180_000 },
                (err, stdout, stderr) => {
                  res.end(
                    JSON.stringify({
                      ok: !err,
                      output: `${stdout}\n${stderr}`.trim()
                    })
                  );
                }
              );
              return;
            }

            if (action === 'verify') {
              execFile(
                'bash',
                [path.join(scriptsDir, 'verify-app.sh'), path.join(appsDir, slug)],
                { timeout: 180_000 },
                (err, stdout, stderr) => {
                  res.end(
                    JSON.stringify({
                      ok: !err,
                      output: `${stdout}\n${stderr}`.trim()
                    })
                  );
                }
              );
              return;
            }

            if (action === 'export') {
              execFile(
                'bash',
                [path.join(scriptsDir, 'export-app.sh'), slug],
                { timeout: 180_000 },
                (err, stdout, stderr) => {
                  res.end(
                    JSON.stringify({
                      ok: !err,
                      output: `${stdout}\n${stderr}`.trim()
                    })
                  );
                }
              );
              return;
            }

            if (action === 'tmux-pi') {
              const appPath = path.join(appsDir, slug);
              const specPath = path.join(appPath, 'SPEC.md');
              if (fs.existsSync(appPath) && prompt) {
                fs.writeFileSync(specPath, prompt, 'utf8');
              }
              const runnerCmd = [
                `if [ ! -d "${appPath}" ]; then "${path.join(scriptsDir, 'new-app.sh')}" "${slug}"; fi`,
                `cd "${appPath}"`,
                `cat << 'EOF_SPEC' > SPEC.md\n${prompt}\nEOF_SPEC`,
                `pi "Read SPEC.md and implement this mobile-first PWA completely. Run ~/pwa-factory/scripts/verify-app.sh ${appPath} until all checks pass."`
              ].join(' && ');

              const child = spawn(
                'tmux',
                ['new-session', '-d', '-A', '-s', tmuxSession, '-n', slug, `bash -lc '${runnerCmd.replace(/'/g, "'\\''")}; exec bash'`],
                { detached: true, stdio: 'ignore' }
              );
              child.unref();

              res.end(
                JSON.stringify({
                  ok: true,
                  output: `Launched Pi agent in tmux target ${tmuxSession}:${slug}`
                })
              );
              return;
            }

            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: `Unknown action: ${action}` }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e?.message || 'Bridge error' }));
          }
        });
        return;
      }

      next();
    });
  };

  return {
    name: 'termux-factory-bridge',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    termuxFactoryBridge(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        mode: 'development'
      },
      manifest: {
        name: 'Pocket PWA Studio',
        short_name: 'PWA Studio',
        description: 'Mobile-first PWA Builder for Termux, tmux, and Pi Agent',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
