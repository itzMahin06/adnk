"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AlertTriangle } from "lucide-react"

interface MaintenanceProps {
  children: React.ReactNode
}

export function MaintenanceMode({ children }: MaintenanceProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        // Try to get maintenance settings
        const settingsRef = doc(db, "settings", "maintenance")
        const settingsSnap = await getDoc(settingsRef)

        if (settingsSnap.exists()) {
          setMaintenanceMode(settingsSnap.data().enabled || false)
          setMaintenanceMessage(settingsSnap.data().message || "")
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking maintenance mode:", error)
        // If there's an error, assume the site is not in maintenance mode
        setMaintenanceMode(false)
        setLoading(false)
      }
    }

    checkMaintenanceMode()
  }, [])

  if (loading) {
    return <>{children}</>
  }

  if (maintenanceMode) {
    return (
      <div className="relative">
        <div className="absolute inset-0 backdrop-blur-sm z-10"></div>
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-background border rounded-lg shadow-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold">রক্ষণাবেক্ষণ চলছে</h2>
            </div>
            <p className="text-lg whitespace-pre-line">
              {maintenanceMessage || "ওয়েবসাইট বর্তমানে রক্ষণাবেক্ষণের জন্য বন্ধ আছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।"}
            </p>
          </div>
        </div>
        <div className="blur-sm">{children}</div>
      </div>
    )
  }

  return <>{children}</>
}
