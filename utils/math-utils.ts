export function initMathJax() {
  if (typeof window !== "undefined" && window.MathJax) {
    try {
      // Clear any previous typesetting
      if (window.MathJax.typesetClear) {
        window.MathJax.typesetClear()
      }

      // Wait for the content to be rendered before typesetting
      setTimeout(() => {
        if (window.MathJax.typeset) {
          window.MathJax.typeset()
        } else if (window.MathJax.Hub && window.MathJax.Hub.Queue) {
          // Fallback for older MathJax versions
          window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub])
        }
      }, 200)
    } catch (error) {
      console.error("Error initializing MathJax:", error)
    }
  }
}
