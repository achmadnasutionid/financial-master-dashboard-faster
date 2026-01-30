import { RefObject } from "react"

/**
 * Scrolls to the first error field in a form
 * @param errorObj - Object containing error messages (e.g., { company: "Required", billTo: "Required" })
 * @param errorRefMap - Map of error keys to React refs (e.g., { company: companyRef, billTo: billToRef })
 */
export function scrollToFirstError(
  errorObj: Record<string, string>,
  errorRefMap: Record<string, RefObject<HTMLDivElement | null>>
) {
  // Find the first error field and scroll to it
  for (const [key, ref] of Object.entries(errorRefMap)) {
    if (errorObj[key] && ref.current) {
      ref.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
      
      // Focus the element if possible
      const input = ref.current.querySelector('input, button, select, textarea')
      if (input instanceof HTMLElement) {
        setTimeout(() => input.focus(), 300)
      }
      
      break
    }
  }
}
