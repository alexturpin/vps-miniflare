import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers/no-static"
import { handler } from "./server"

export default { fetch: cloudflareWorkersAdapter(handler) }
