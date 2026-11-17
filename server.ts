import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.ts';
import { getDbEngineName, initDatabase } from './server/config/db.ts';
import { env } from './server/config/env.ts';
import { ensureSeeded } from './server/services/seedService.ts';

async function startServer() {
  await initDatabase();
  await ensureSeeded(false);

  const app = createApp();

  if (env.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(
      `Comfort Stay PG Server running at http://0.0.0.0:${env.port} (${env.nodeEnv}, DB: ${getDbEngineName()})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
