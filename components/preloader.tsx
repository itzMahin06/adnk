"use client"

import { useEffect, useState } from "react"

interface PreloaderProps {
  timeout?: number
}

export function Preloader({ timeout = 2000 }: PreloaderProps) {
  const [loading, setLoading] = useState(true)
  const [dots, setDots] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, timeout)

    // Animation for the loading dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return ""
        return prev + "."
      })
    }, 500)

    return () => {
      clearTimeout(timer)
      clearInterval(dotsInterval)
    }
  }, [timeout])

  if (!loading) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">এডমিশন নিয়ে খেলছি</h1>
        <p className="text-lg text-muted-foreground min-w-[60px] text-center">লোড হচ্ছে{dots}</p>
      </div>
    </div>
  )
}
