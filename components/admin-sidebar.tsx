"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  FileText,
  GraduationCap,
  Menu,
  Settings,
  Users,
  Tag,
  TrendingUp,
} from "lucide-react"

const sidebarItems = [
  {
    title: "ড্যাশবোর্ড",
    href: "/admin/dashboard",
    icon: BarChart3,
  },
  {
    title: "পরীক্ষা",
    href: "/admin/exams",
    icon: FileText,
  },
  {
    title: "কোর্সসমূহ",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    title: "কুপন কোড",
    href: "/admin/coupons",
    icon: Tag,
  },
  {
    title: "শিক্ষার্থী",
    href: "/admin/students",
    icon: GraduationCap,
  },
  {
    title: "অনুমোদন",
    href: "/admin/approval",
    icon: CheckSquare,
  },
  {
    title: "ফলাফল",
    href: "/admin/results",
    icon: TrendingUp,
  },
  {
    title: "পূর্ববর্তী পরীক্ষা",
    href: "/admin/past-exams",
    icon: Users,
  },
  {
    title: "প্রগ্রেস ট্র্যাকার",
    href: "/admin/progress-tracker",
    icon: BarChart3,
  },
  {
    title: "সেটিংস",
    href: "/admin/settings",
    icon: Settings,
  },
]

interface AdminSidebarProps {
  className?: string
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">অ্যাডমিন প্যানেল</h2>
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant={pathname === item.href ? "secondary" : "ghost"} className="w-full justify-start">
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileAdminSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden bg-transparent">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="grid gap-2 text-lg font-medium">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>অ্যাডমিন প্যানেল</span>
          </div>
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                pathname === item.href && "bg-muted text-foreground",
              )}
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
