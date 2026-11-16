import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleApi } from './server/api.js'

// The pages read data from the local API, which owns the four-hour JSON store in
// data/. In dev and preview that API runs as middleware on the Vite server; in
// production `npm start` runs server/index.js.
const localApi = () => {
  const middleware = (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    handleApi(req, res, url).then((handled) => {
      if (!handled) next()
    }, next)
  }

  // These hooks must not return anything: a returned value is treated as a
  // post-middleware hook, and connect's app would then be called as one.
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The provider clients read process.env, so hand the .env files over to it.
  const loaded = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    plugins: [react(), localApi()],
  }
})
