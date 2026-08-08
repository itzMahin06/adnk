"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Clock, BookOpen, Award, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  // Only show on student routes
  if (!pathname.startsWith("/student")) {
    return null
  }

  const navItems = [
    {
      name: "হোম",
      href: "/student/dashboard",
      icon: Home,
      active: pathname === "/student/dashboard",
    },
    {
      name: "লাইভ পরীক্ষা",
      href: "/student/live-exams",
      icon: Clock,
      active: pathname.startsWith("/student/live-exams"),
    },
    {
      name: "অনুশীলন",
      href: "/student/practice-exams",
      icon: BookOpen,
      active: pathname.startsWith("/student/practice-exams"),
    },
    {
      name: "লিডারবোর্ড",
      href: "/student/leaderboard",
      icon: Award,
      active: pathname === "/student/leaderboard",
    },
    {
      name: "প্রোফাইল",
      href: "/student/profile",
      icon: User,
      active: pathname === "/student/profile",
    },
  ]

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border md:hidden transition-transform duration-300 shadow-lg",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center py-2 px-2 text-xs font-medium transition-all duration-200 relative min-w-0 flex-1 rounded-lg",
              item.active
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95",
            )}
          >
            <div className="relative mb-1">
              <item.icon className={cn("h-5 w-5", item.active && "text-primary")} />
              {item.active && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-[10px] leading-tight text-center truncate w-full max-w-[60px]">{item.name}</span>
            {item.active && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
