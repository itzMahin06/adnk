"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { LayoutDashboard, ClipboardList, BookOpen, LogOut, UserIcon, Crown, Trophy, Target, Hash } from "lucide-react"
import { formatRollNumber } from "@/utils/roll-number-utils"

interface UserData {
  name: string
  email: string
  phone?: string
  institution?: string
  role?: string
  approved?: boolean
  rollNumber?: string
  totalExams?: number
  averageScore?: number
  rank?: number
}

interface UserProfileCardProps {
  user: User
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "students", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData({
            name: data.fullName,
            email: data.email,
            institution: data.college,
            rollNumber: data.rollNumber,
            approved: data.approved,
            ...data,
          } as UserData)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user.uid])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={user.photoURL || ""} alt={userData?.name || "User"} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-600 text-white text-lg font-bold">
                {userData?.name ? getInitials(userData.name) : <UserIcon className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                স্বাগতম, {userData?.name || "শিক্ষার্থী"}!
              </CardTitle>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
              {userData?.institution && <p className="text-sm text-muted-foreground">{userData.institution}</p>}
              {userData?.rollNumber && (
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm font-mono text-muted-foreground">{formatRollNumber(userData.rollNumber)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:ml-auto">
            {userData?.rollNumber && (
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                <Hash className="h-3 w-3 mr-1" />
                {formatRollNumber(userData.rollNumber)}
              </Badge>
            )}
            {userData?.role === "admin" && (
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                <Crown className="h-3 w-3 mr-1" />
                অ্যাডমিন
              </Badge>
            )}
            {userData?.approved && (
              <Badge variant="secondary" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <Target className="h-3 w-3 mr-1" />
                অনুমোদিত
              </Badge>
            )}
            {userData?.rank && userData.rank <= 10 && (
              <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <Trophy className="h-3 w-3 mr-1" />
                টপ {userData.rank}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Stats */}
        {(userData?.totalExams || userData?.averageScore || userData?.rank) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userData?.totalExams && (
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200/50 dark:border-blue-800/50">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userData.totalExams}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">মোট পরীক্ষা</div>
              </div>
            )}
            {userData?.averageScore && (
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {userData.averageScore}%
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">গড় স্কোর</div>
              </div>
            )}
            {userData?.rank && (
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">#{userData.rank}</div>
                <div className="text-sm text-amber-700 dark:text-amber-300">র‍্যাঙ্ক</div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">দ্রুত অ্যাক্সেস</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/student/dashboard">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 group bg-transparent"
              >
                <LayoutDashboard className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">ড্যাশবোর্ড</span>
              </Button>
            </Link>

            <Link href="/student/live-exams">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-300 group bg-transparent"
              >
                <ClipboardList className="h-6 w-6 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">লাইভ পরীক্ষা</span>
              </Button>
            </Link>

            <Link href="/student/practice-exams">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 hover:bg-violet-500/5 hover:border-violet-500/30 transition-all duration-300 group bg-transparent"
              >
                <BookOpen className="h-6 w-6 text-violet-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">অনুশীলন</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              className="w-full h-20 flex flex-col gap-2 hover:bg-red-500/5 hover:border-red-500/30 transition-all duration-300 group bg-transparent"
              onClick={handleLogout}
            >
              <LogOut className="h-6 w-6 text-red-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">লগআউট</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
