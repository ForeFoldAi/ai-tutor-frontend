import * as React from "react"

/** Matches Tailwind `lg` — tablet + phone use the bottom menu bar. */
const COMPACT_NAV_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_NAV_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < COMPACT_NAV_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < COMPACT_NAV_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
