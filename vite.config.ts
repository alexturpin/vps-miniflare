import react from "@vitejs/plugin-react"
import { existsSync } from "fs"
import { resolve } from "path"
import { defineConfig } from "vite"
import cloudflare from "./src/vite-plugin-cloudflare/vite"
import vps from "vite-plugin-ssr/plugin"

export default defineConfig(({ mode }) => ({
  // https://vitejs.dev/config/
  server: { port: 3000, strictPort: true },
  plugins: [
    react(),
    vps(),
    cloudflare({
      scriptPath: "./src/server/worker.ts",
      miniflare: {
        envPath: !existsSync(".env.local") ? false : ".env.local",
        sitePath: "./src/static",
      },
      workerFilesPattern: ["src/server/**/*"],
    }),
  ],
  resolve: { alias: [{ find: "~", replacement: resolve(__dirname, "src") }] },
}))
