import { hydrateRoot } from "react-dom/client"
import type { PageContextClient } from "./types"

export const render = async (pageContext: PageContextClient) => {
  const { Page, pageProps } = pageContext
  if (!Page) throw new Error("Client-side render() hook expects pageContext.Page to be defined")
  hydrateRoot(
    document.getElementById("page-view")!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
    <Page {...pageProps} />
  )
}
