import { json } from "@hattip/response"
import { createRouter } from "@hattip/router"
import { renderPage } from "vite-plugin-ssr/server"

const server = createRouter()

server.get("/health", () => json({ status: "ok" }))

server.get("*", async ({ request }) => {
  const pageContextInit = { urlOriginal: request.url }

  const pageContext = await renderPage(pageContextInit)
  const { httpResponse } = pageContext
  if (!httpResponse) return new Response("", { status: 500 })

  const { body, statusCode, contentType } = httpResponse
  return new Response(body, {
    headers: { "content-type": contentType },
    status: statusCode,
  })
})

// Old Vite route
// server.use("*", async () => new Response("", { headers: { "x-skip-request": "" } }))

export const handler = server.buildHandler()
