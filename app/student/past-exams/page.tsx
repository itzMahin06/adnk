"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, BookOpen, Play, Clock, Target } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { auth } from "@/lib/firebase"

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
  startTime: string
  endTime: string
  customLink?: string
  instructions: string
  courseId: string
}

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
}

export default function PastExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPastExams = async () => {
      try {
        if (!auth.currentUser) return

        const now = new Date()

        // First get the student's assigned courses
        const studentRef = doc(db, "students", auth.currentUser.uid)
        const studentSnap = await getDoc(studentRef)

        if (!studentSnap.exists()) {
          setLoading(false)
          return
        }

        const studentData = studentSnap.data()
        const assignedCourses = studentData.courses || []

        if (assignedCourses.length === 0) {
          setExams([])
          setLoading(false)
          return
        }

        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        const examsData = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Exam[]

        // Filter for past exams (end time is before current time)
        // AND the exam is for one of the student's assigned courses OR has no course restriction
        const pastExams = examsData.filter((exam) => {
          const endTime = new Date(exam.endTime)
          const isPast = now > endTime

          // More permissive course access check
          const hasCourseAccess =
            !exam.courseId ||
            exam.courseId === "" ||
            exam.courseId === null ||
            assignedCourses.includes(exam.courseId) ||
            assignedCourses.length === 0 // Show all if no courses assigned

          return isPast && hasCourseAccess
        })

        // Sort by end time (newest first)
        pastExams.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setExams(pastExams)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching past exams:", error)
        setLoading(false)
      }
    }

    fetchPastExams()
  }, [])

  const downloadExamJson = async (exam: Exam) => {
    try {
      // Fetch questions for this exam
      const questionsRef = collection(db, "questions")
      const q = query(questionsRef, where("examId", "==", exam.id))
      const questionsSnapshot = await getDocs(q)

      const questions = questionsSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          text: data.text,
          options: data.options,
          // Convert correct answer to binary string for more efficient storage
          correctOption: (data.correctOption >>> 0).toString(2),
        }
      })

      const examData = {
        title: exam.title,
        subject: exam.subject,
        time: exam.time,
        totalQuestions: questions.length,
        questions: questions,
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(examData, null, 2))
      const downloadAnchorNode = document.createElement("a")
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", `${exam.title.replace(/\s+/g, "-")}.json`)
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    } catch (error) {
      console.error("Error downloading exam:", error)
      alert("পরীক্ষা ডাউনলোড করতে সমস্যা হয়েছে")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 dark:from-slate-900 dark:via-blue-950/20 dark:to-purple-950/20">
      <StudentHeader title="পূর্বের পরীক্ষাসমূহ" />

      <div className="p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 p-6 md:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>

            <div className="relative flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">অনুশীলন পরীক্ষা</h1>
                <p className="text-white/80">পূর্বের পরীক্ষাগুলো অনুশীলন করে আপনার দক্ষতা বৃদ্ধি করুন</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-lg"></div>
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-blue-300 opacity-20"></div>
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
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  <div className="absolute inset-[1px] bg-white dark:bg-slate-800 rounded-xl"></div>

                  {/* Content */}
                  <div className="relative">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{index + 1}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            অনুশীলন
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                        {exam.title}
                      </CardTitle>
                      <CardDescription className="text-base">{exam.subject}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
                          <Target className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">মোট প্রশ্ন</p>
                            <p className="font-bold text-emerald-800 dark:text-emerald-300">{exam.totalQuestions}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <div>
                            <p className="text-xs text-orange-600 dark:text-orange-400">সময়</p>
                            <p className="font-bold text-orange-800 dark:text-orange-300">{exam.time} মিনিট</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/30">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">শেষ হয়েছে</span>
                        </div>
                        <p className="font-medium text-gray-800 dark:text-gray-300">
                          {new Date(exam.endTime).toLocaleDateString("bn-BD")}
                        </p>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-4 space-y-3">
                      <Button
                        asChild
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                      >
                        <Link href={`/student/past-exams/practice/${exam.id}`}>
                          <Play className="mr-2 h-4 w-4" />
                          অনুশীলন করুন
                        </Link>
                      </Button>

                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                          variant="outline"
                          asChild
                          className="border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
                        >
                          <Link href={`/student/past-exams/solution/${exam.id}`}>
                            <BookOpen className="mr-1 h-4 w-4" />
                            সমাধান
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => downloadExamJson(exam)}
                          className="border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/30"
                        >
                          <Download className="mr-1 h-4 w-4" />
                          ডাউনলোড
                        </Button>
                      </div>
                    </CardFooter>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/30 dark:to-purple-950/30 flex items-center justify-center">
                    <FileText className="h-12 w-12 text-blue-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-blue-500 animate-ping opacity-20"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">কোন অনুশীলন পরীক্ষা নেই</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  বর্তমানে কোন অনুশীলন পরীক্ষা উপলব্ধ নেই। নতুন পরীক্ষার জন্য অপেক্ষা করুন।
                </p>
                <Link href="/student/live-exams" className="mt-6">
                  <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white">
                    লাইভ পরীক্ষা দেখুন
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
