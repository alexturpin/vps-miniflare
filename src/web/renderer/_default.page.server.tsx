import ReactDOMServer from "react-dom/server"
import { escapeInject, dangerouslySkipEscape } from "vite-plugin-ssr/server"
import type { PageContextServer } from "./types"

export const passToClient = ["pageProps", "urlPathname"]

export const render = async (pageContext: PageContextServer) => {
  const { Page, pageProps } = pageContext
  if (!Page) throw new Error("Server-side render() hook expects pageContext.Page to be defined")
  const pageHtml = ReactDOMServer.renderToString(<Page {...pageProps} />)

  // See https://vite-plugin-ssr.com/head
  const { documentProps } = pageContext.exports
  const title = (documentProps && documentProps.title) || "Better Tax"
  const desc = (documentProps && documentProps.description) || "Better tax software"

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="${desc}" />
        <title>${title}</title>
      </head>
      <body>
        <div id="page-view">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vite-plugin-ssr.com/page-redirection
    },
  }
}
