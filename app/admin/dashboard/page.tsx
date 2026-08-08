"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, ClipboardList, FileText, Users } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingApprovals: 0,
    totalExams: 0,
    pastExams: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total students
        const studentsRef = collection(db, "students")
        const studentsSnapshot = await getDocs(studentsRef)
        const totalStudents = studentsSnapshot.size

        // Get pending approvals
        const pendingQuery = query(studentsRef, where("approved", "==", false))
        const pendingSnapshot = await getDocs(pendingQuery)
        const pendingApprovals = pendingSnapshot.size

        // Get total exams
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)
        const totalExams = examsSnapshot.size

        // Get past exams
        const now = new Date()
        const pastExamsQuery = query(examsRef, where("endTime", "<", now))
        const pastExamsSnapshot = await getDocs(pastExamsQuery)
        const pastExams = pastExamsSnapshot.size

        setStats({
          totalStudents,
          pendingApprovals,
          totalExams,
          pastExams,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader title="অ্যাডমিন ড্যাশবোর্ড" />

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট শিক্ষার্থী</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                অনুমোদিত শিক্ষার্থী: {stats.totalStudents - stats.pendingApprovals}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">অপেক্ষমান অনুমোদন</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">অনুমোদনের জন্য অপেক্ষমান শিক্ষার্থী</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">মোট পরীক্ষা</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExams}</div>
              <p className="text-xs text-muted-foreground">লাইভ পরীক্ষা: {stats.totalExams - stats.pastExams}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">পূর্বের পরীক্ষা</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pastExams}</div>
              <p className="text-xs text-muted-foreground">সম্পন্ন পরীক্ষার সংখ্যা</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>সাম্প্রতিক কার্যক্রম</CardTitle>
              <CardDescription>সাইটের সাম্প্রতিক কার্যক্রম এবং পরিসংখ্যান</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground ml-4">এখানে অ্যানালিটিক্স চার্ট দেখানো হবে</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
