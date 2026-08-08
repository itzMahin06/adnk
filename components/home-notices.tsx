"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell } from "lucide-react"

interface Notice {
  id: string
  title: string
  content: string
  date: string
}

export function HomeNotices() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        // Only attempt to fetch notices for authenticated users
        // This component will be empty for unauthenticated users
        const noticesRef = collection(db, "notices")
        const noticesQuery = query(noticesRef, orderBy("date", "desc"), limit(3))
        const noticesSnapshot = await getDocs(noticesQuery)

        const noticesData = noticesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notice[]

        setNotices(noticesData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching notices:", error)
        setError(true)
        setLoading(false)
      }
    }

    fetchNotices()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // If there's an error or no notices, don't render anything
  if (error || notices.length === 0) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>নোটিশ</CardTitle>
        </div>
        <CardDescription>সর্বশেষ নোটিশসমূহ</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notices.map((notice) => (
            <div key={notice.id} className="border-b pb-3 last:border-0 last:pb-0">
              <h3 className="font-medium">{notice.title}</h3>
              <p className="mt-1 text-sm whitespace-pre-line">{notice.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(notice.date).toLocaleDateString("bn-BD")}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
