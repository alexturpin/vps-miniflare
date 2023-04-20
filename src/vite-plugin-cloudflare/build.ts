import type { BuildOptions } from "esbuild"
import esbuild from "esbuild"
import { ResolvedConfig } from "vite"
import { plugin } from "./plugin"
import type { Options } from "./vite"

export async function build(workerFile: string, config: ResolvedConfig, options: Options) {
  const outFile = "./dist/server/index.js"
  const esbuildConfig: BuildOptions = {
    banner: {
      js: `
            (() => {
                globalThis.navigator = { userAgent: "Cloudflare-Workers" };
            })();
        `,
    },
    external: ["__STATIC_CONTENT_MANIFEST"],
    ...(config.esbuild as BuildOptions),
    sourcemap: "inline",
    plugins: [plugin(options?.polyfilledModules, options?.polyfilledGlobals)],
    entryPoints: [workerFile],
    write: true,
    bundle: true,
    allowOverwrite: true,
    platform: "node",
    format: "esm",
    target: "es2020",
    outfile: outFile,
  }

  const { rebuild, dispose } = await esbuild.context(esbuildConfig)
  await rebuild()
  return { outFile, rebuild, dispose }
}
