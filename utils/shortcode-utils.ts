export function parseShortcodes(text: string): string {
  if (!text) return ""

  // Replace [img: url] with <img> tags
  return text.replace(/\[img:\s*([^\]]+)\]/g, (match, url) => {
    return `<img src="${url.trim()}" alt="Question Image" class="my-2 max-w-full h-auto rounded-md" />`
  })
}
