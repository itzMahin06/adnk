"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { StudentSidebar } from "@/components/student-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }

      if (user.email === "info.itzmahin@gmail.com") {
        router.push("/admin/dashboard")
        return
      }

      // Check if student is approved
      const studentRef = doc(db, "students", user.uid)
      const studentSnap = await getDoc(studentRef)

      if (studentSnap.exists()) {
        const studentData = studentSnap.data()
        if (!studentData.approved) {
          router.push("/waiting-approval")
          return
        }
      } else {
        router.push("/login")
        return
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <StudentSidebar className="hidden md:flex" />
        <div className="flex-1 md:ml-64">
          <div className="pb-20 md:pb-0">{children}</div>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  )
}
