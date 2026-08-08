"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"

interface StudentHeaderProps {
  title: string
}

export function StudentHeader({ title }: StudentHeaderProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="flex items-center justify-between border-b bg-background p-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
      </div>
    </div>
  )
}
