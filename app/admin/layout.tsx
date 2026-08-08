"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== "info.itzmahin@gmail.com") {
        router.push("/admin-login")
      } else {
        // Fetch pending approvals count
        const studentsRef = collection(db, "students")
        const pendingQuery = query(studentsRef, where("approved", "==", false))
        const pendingSnapshot = await getDocs(pendingQuery)
        setPendingApprovals(pendingSnapshot.size)

        setLoading(false)
      }
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
        <AdminSidebar pendingApprovals={pendingApprovals} />
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  )
}
