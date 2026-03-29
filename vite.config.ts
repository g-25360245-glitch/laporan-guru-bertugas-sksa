import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Simple Vite plugin to handle Vercel API routes locally
const apiRoutesPlugin = () => ({
  name: 'api-routes',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/reports')) {
        try {
          // Parse URL and query
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          req.query = Object.fromEntries(urlObj.searchParams);
          
          // Parse body
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const data = Buffer.concat(buffers).toString();
            try {
              req.body = JSON.parse(data);
            } catch (e) {
              req.body = data;
            }
          }

          // Route to the correct handler
          let handler;
          if (req.url === '/api/reports' || req.url.startsWith('/api/reports?')) {
            const module = await server.ssrLoadModule('/api/reports/index.ts');
            handler = module.default;
          } else {
            const match = req.url.match(/^\/api\/reports\/([^/?]+)/);
            if (match) {
              req.query.id = match[1];
              const module = await server.ssrLoadModule('/api/reports/[id].ts');
              handler = module.default;
            }
          }

          if (handler) {
            // Mock VercelResponse methods
            res.status = (code: number) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data: any) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };
            res.send = (data: any) => {
              res.end(data);
            };
            
            await handler(req, res);
            return;
          }
        } catch (error) {
          console.error('API Route Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), apiRoutesPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
