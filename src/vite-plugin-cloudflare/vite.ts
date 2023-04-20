/*
  MIT License

  Copyright (c) 2021 M. Bagher Abiat

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

import type { BuildContext } from "esbuild"
import fg from "fast-glob"
import { Log, LogLevel, Miniflare, MiniflareOptions, RequestInit } from "miniflare"
import path from "path"
import colors from "picocolors"
import type { Connect, PluginOption, ResolvedConfig } from "vite"
import { build } from "./build"
import { PolyfilledGlobals, PolyfilledModules } from "./plugin"
import { fromResponse, toRequest } from "./utils"

export type Options = {
  // miniflare specific options for development (optional)
  miniflare?: Omit<MiniflareOptions, "script" | "watch" | "modules">
  // the worker file (required)
  scriptPath: string
  // customize globals that need to polyfilled (process, setTimeout, ...)
  polyfilledGlobals?: PolyfilledGlobals
  // customize mods (node's builtinModules) that need to polyfilled (utils, http, ...)
  polyfilledModules?: PolyfilledModules
  // a fast-glob pattern for files who's changes should reload the worker (optional)
  workerFilesPattern?: string | string[]
}

export default function vitePlugin(options: Options): PluginOption {
  let mf: Miniflare
  let resolvedConfig: ResolvedConfig
  let workerFile: string
  let otherWorkerFiles: string[]
  let esbuildRebuild: BuildContext["rebuild"]
  return {
    enforce: "post",
    name: "cloudflare",
    configResolved(config) {
      resolvedConfig = config
      workerFile = path.resolve(config.root, options.scriptPath)
      otherWorkerFiles = options.workerFilesPattern
        ? fg.sync(options.workerFilesPattern, {
            cwd: resolvedConfig.root,
            absolute: true,
          })
        : []
    },
    async configureServer(server) {
      const { outFile, rebuild, dispose } = await build(workerFile, resolvedConfig, options)
      esbuildRebuild = rebuild

      mf = new Miniflare({
        log: new Log(LogLevel.WARN),
        sourceMap: true,
        wranglerConfigPath: true,
        packagePath: false,
        modules: true,
        ...options.miniflare,
        scriptPath: outFile,
        watch: true,
      })

      process.on("beforeExit", async () => {
        await mf.dispose()
        dispose()
      })

      const mfMiddleware: Connect.NextHandleFunction = async (req, res, next) => {
        try {
          const mfRequest = toRequest(req)

          const mfResponse = await mf.dispatchFetch(mfRequest.url, mfRequest as RequestInit)

          if (mfResponse.headers.has("x-skip-request")) {
            throw undefined // skip miniflare and pass to next middleware
          }

          await fromResponse(mfResponse, res)
        } catch (e) {
          if (e) {
            console.error(e) // eslint-disable-line no-console
          }
          next(e)
        }
      }

      server.middlewares.use(mfMiddleware)

      return async () => {
        // enable HMR analyzing by vite, so we have better track of the worker
        // file (deps, importers, ...)
        try {
          // this may fail in custom server mode
          await server.transformRequest(workerFile)
        } catch {
          // don't care
        }
      }
    },
    async handleHotUpdate({ file, server }) {
      const isOtherWorkerFile = otherWorkerFiles.includes(file)

      if (file === workerFile || isOtherWorkerFile) {
        await esbuildRebuild()
        // await mf.reload() // Doesn't seem to be needed, perhaps because of watch mode?
        server.ws.send({ type: "full-reload" })
        server.config.logger.info(colors.cyan(`🔥 [cloudflare] hot reloaded`))
        // we / MiniFlare already handle the reload, so we skip the Vite's HMR handling here
        return []
      }
    },
    async closeBundle() {
      if (resolvedConfig.env.DEV) {
        return
      }
      const { outFile } = await build(workerFile, resolvedConfig, options)

      resolvedConfig.logger.info(
        colors.cyan(
          `🔥 [cloudflare] bundled worker file in '${path.relative(resolvedConfig.root, outFile)}'`
        )
      )
    },
    // Silence any Vite warnings about __STATIC_CONTENT_MANIFEST not being a real import
    resolveId(source) {
      if (source === "__STATIC_CONTENT_MANIFEST") return source
      return null
    },
    load(id) {
      if (id === "__STATIC_CONTENT_MANIFEST") return "__STATIC_CONTENT_MANIFEST"
      return null
    },
  }
}
