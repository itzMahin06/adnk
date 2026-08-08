"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, AlertTriangle, Clock, BookOpen, Zap } from "lucide-react"
import { StudentHeader } from "@/components/student-header"

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
  startTime: string
  endTime: string
  customLink?: string
  instructions?: string
  courseId?: string
}

export default function LiveExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [participatedExams, setParticipatedExams] = useState<string[]>([])

  useEffect(() => {
    const fetchLiveExams = async () => {
      try {
        if (!auth.currentUser) {
          setLoading(false)
          return
        }

        // Get all exams first
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        if (examsSnapshot.empty) {
          setLoading(false)
          return
        }

        const allExams = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Exam[]

        // Get student data
        const studentRef = doc(db, "students", auth.currentUser.uid)
        const studentSnap = await getDoc(studentRef)

        if (!studentSnap.exists()) {
          setLoading(false)
          return
        }

        const studentData = studentSnap.data()
        const assignedCourses = studentData.courses || []

        // Get current time
        const now = new Date()

        // Filter for live exams with more permissive logic
        const liveExams = allExams.filter((exam) => {
          // Parse dates safely
          let startTime: Date, endTime: Date

          try {
            startTime = new Date(exam.startTime)
            endTime = new Date(exam.endTime)
          } catch (e) {
            console.error("Invalid date format:", e)
            return false
          }

          // Check if exam is currently active
          const isActive = now >= startTime && now <= endTime

          // Check course access - very permissive approach
          const hasCourseAccess =
            !exam.courseId ||
            exam.courseId === "" ||
            exam.courseId === null ||
            assignedCourses.includes(exam.courseId) ||
            assignedCourses.length === 0 || // If student has no courses assigned, show all exams
            // Also check if exam has no course restriction
            exam.courseId === undefined

          return isActive && hasCourseAccess
        })

        // Sort by start time (newest first)
        liveExams.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

        // Check which exams the student has already participated in
        const resultsRef = collection(db, "results")
        const resultsQuery = query(resultsRef, where("studentId", "==", auth.currentUser.uid))
        const resultsSnapshot = await getDocs(resultsQuery)

        const participatedExamIds = resultsSnapshot.docs.map((doc) => doc.data().examId)
        setParticipatedExams(participatedExamIds)

        setExams(liveExams)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching exams:", error)
        setLoading(false)
      }
    }

    fetchLiveExams()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100 dark:from-slate-900 dark:via-red-950/20 dark:to-orange-950/20">
      <StudentHeader title="লাইভ পরীক্ষাসমূহ" />

      <div className="p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-orange-600 to-red-700 p-6 md:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>

            <div className="relative flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">লাইভ পরীক্ষাসমূহ</h1>
                <p className="text-white/80">এখনই অংশগ্রহণ করুন এবং আপনার দক্ষতা পরীক্ষা করুন</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent shadow-lg"></div>
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-red-300 opacity-20"></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exams.length > 0 ? (
              exams.map((exam, index) => (
                <Card
                  key={exam.id}
                  className="group relative overflow-hidden border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                >
                  {/* Gradient Border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  <div className="absolute inset-[1px] bg-white dark:bg-slate-800 rounded-xl"></div>

                  {/* Content */}
                  <div className="relative">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{index + 1}</span>
                          </div>
                          <Badge className="bg-red-500 text-white animate-pulse">
                            <div className="h-2 w-2 rounded-full bg-white mr-1 animate-ping"></div>
                            লাইভ
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-xl group-hover:text-red-600 transition-colors">{exam.title}</CardTitle>
                      <CardDescription className="text-base">{exam.subject}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400">মোট প্রশ্ন</p>
                            <p className="font-bold text-blue-800 dark:text-blue-300">{exam.totalQuestions}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30">
                          <Clock className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs text-green-600 dark:text-green-400">সময়</p>
                            <p className="font-bold text-green-800 dark:text-green-300">{exam.time} মিনিট</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span className="text-xs text-purple-600 dark:text-purple-400">শেষ হবে</span>
                        </div>
                        <p className="font-medium text-purple-800 dark:text-purple-300">
                          {new Date(exam.endTime).toLocaleTimeString("bn-BD", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-4">
                      {participatedExams.includes(exam.id) ? (
                        <div className="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 text-green-800 dark:text-green-200 rounded-xl flex items-center justify-center border border-green-200 dark:border-green-800">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          <span className="font-medium">আপনি ইতিমধ্যে এই পরীক্ষায় অংশগ্রহণ করেছেন</span>
                        </div>
                      ) : (
                        <Button
                          asChild
                          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                        >
                          <Link href={`/student/live-exams/${exam.id}`}>
                            <ClipboardList className="mr-2 h-4 w-4" />
                            পরীক্ষায় অংশগ্রহণ করুন
                          </Link>
                        </Button>
                      )}
                    </CardFooter>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-950/30 dark:to-orange-950/30 flex items-center justify-center">
                    <ClipboardList className="h-12 w-12 text-red-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 animate-ping opacity-20"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">কোন লাইভ পরীক্ষা নেই</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  বর্তমানে কোন লাইভ পরীক্ষা চলছে না। নতুন পরীক্ষার জন্য অপেক্ষা করুন বা অনুশীলন পরীক্ষা দিন।
                </p>
                <Link href="/student/past-exams" className="mt-6">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                    অনুশীলন পরীক্ষা দেখুন
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
