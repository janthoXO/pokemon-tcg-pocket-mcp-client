import { useSyncExternalStore } from "react"

const query = window.matchMedia("(max-width: 767px)")

export function useIsMobile() {
  return useSyncExternalStore(
    (onChange) => {
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    },
    () => query.matches
  )
}
