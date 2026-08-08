"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3, ClipboardList, FileText, LayoutDashboard, LogOut, User, BookOpen } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function StudentSidebar() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  const handleLogout = async () => {
    await signOut(auth)
    window.location.href = "/"
  }

  const handleLinkClick = () => {
    // Close mobile sidebar when a link is clicked
    setOpenMobile(false)
  }

  return (
    <Sidebar className="bg-sidebar-background border-r border-border">
      <SidebarHeader className="flex flex-row items-center justify-between p-4 bg-sidebar-background">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={32} height={32} className="rounded-full" />
          <span className="font-bold">শিক্ষার্থী প্যানেল</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="bg-sidebar-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/student/dashboard"} onClick={handleLinkClick}>
              <Link href="/student/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>ড্যাশবোর্ড</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/student/live-exams"} onClick={handleLinkClick}>
              <Link href="/student/live-exams">
                <ClipboardList className="h-4 w-4" />
                <span>লাইভ পরীক্ষাসমূহ</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/student/past-exams"} onClick={handleLinkClick}>
              <Link href="/student/past-exams">
                <FileText className="h-4 w-4" />
                <span>পূর্বের পরীক্ষাসমূহ</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/student/practice-exams"} onClick={handleLinkClick}>
              <Link href="/student/practice-exams">
                <BookOpen className="h-4 w-4" />
                <span>অনুশীলন পরীক্ষা</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/student/leaderboard"} onClick={handleLinkClick}>
              <Link href="/student/leaderboard">
                <BarChart3 className="h-4 w-4" />
                <span>লিডারবোর্ড</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/student/profile"} onClick={handleLinkClick}>
              <Link href="/student/profile">
                <User className="h-4 w-4" />
                <span>প্রোফাইল</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-4 bg-sidebar-background">
        <Button variant="outline" className="w-full flex items-center gap-2 justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span>লগআউট</span>
        </Button>
      </SidebarFooter>
      <SidebarRail className="bg-sidebar-background border-r border-border" />
    </Sidebar>
  )
}
