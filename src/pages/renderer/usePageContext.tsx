import React, { Context, useContext } from "react"
import type { PageContext } from "./types"

const Context = React.createContext<PageContext>(undefined as any) // eslint-disable-line @typescript-eslint/no-explicit-any

export const PageContextProvider = ({
  pageContext,
  children,
}: {
  pageContext: PageContext
  children: React.ReactNode
}) => {
  return <Context.Provider value={pageContext}>{children}</Context.Provider>
}

export const usePageContext = () => {
  const pageContext = useContext(Context)
  return pageContext
}
