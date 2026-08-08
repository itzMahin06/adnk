"use client"

import { useEffect, useState } from "react"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bell, Clock, Users, BookOpen, TrendingUp, Award, Zap, Target, Star, Hash } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ExamCalendar } from "@/components/exam-calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { formatRollNumber } from "@/utils/roll-number-utils"

interface Notice {
  id: string
  title: string
  content: string
  date: string
}

interface LiveExam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
  startTime: string
  endTime: string
  courseId?: string
}

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("")
  const [notices, setNotices] = useState<Notice[]>([])
  const [liveExams, setLiveExams] = useState<LiveExam[]>([])
  const [participatedExams, setParticipatedExams] = useState<string[]>([])
  const [stats, setStats] = useState({
    totalExams: 0,
    completedExams: 0,
    lastExamTitle: "",
    lastExamDate: "",
  })
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [assignedCourses, setAssignedCourses] = useState<any[]>([])
  const [allCourses, setAllCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingLiveExams, setLoadingLiveExams] = useState(true)
  const [pastExams, setPastExams] = useState<any[]>([])
  const [loadingPastExams, setLoadingPastExams] = useState(true)
  const [studentData, setStudentData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!auth.currentUser) return

        // Get student data
        const studentRef = doc(db, "students", auth.currentUser.uid)
        const studentSnap = await getDoc(studentRef)

        if (studentSnap.exists()) {
          const studentData = studentSnap.data()
          console.log("Student data from Firestore:", studentData) // Debug log
          setStudentName(studentData.fullName)
          setStudentData(studentData)

          // Get assigned courses and purchased courses
          const studentCourses = studentData.courses || []

          // Get approved purchases
          const purchasesRef = collection(db, "purchases")
          const purchasesQuery = query(
            purchasesRef,
            where("studentId", "==", auth.currentUser.uid),
            where("status", "==", "approved"),
          )
          const purchasesSnapshot = await getDocs(purchasesQuery)
          const purchasedCourseIds = purchasesSnapshot.docs.map((doc) => doc.data().courseId)

          // Combine assigned and purchased courses
          const allEnrolledCourseIds = [...new Set([...studentCourses, ...purchasedCourseIds])]

          if (allEnrolledCourseIds.length > 0) {
            const coursesData = []
            for (const courseId of allEnrolledCourseIds) {
              const courseRef = doc(db, "courses", courseId)
              const courseSnap = await getDoc(courseRef)
              if (courseSnap.exists()) {
                coursesData.push({
                  id: courseId,
                  ...courseSnap.data(),
                  enrolled: true,
                })
              }
            }
            setAssignedCourses(coursesData)
          }
        }

        // Get notices
        const noticesRef = collection(db, "notices")
        const noticesSnapshot = await getDocs(noticesRef)
        const noticesData = noticesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notice[]

        setNotices(noticesData)

        // Get maintenance mode
        const settingsRef = doc(db, "settings", "maintenance")
        const settingsSnap = await getDoc(settingsRef)

        if (settingsSnap.exists()) {
          setMaintenanceMode(settingsSnap.data().enabled || false)
          setMaintenanceMessage(settingsSnap.data().message || "")
        }

        // Get exam stats
        const resultsRef = collection(db, "results")
        const resultsQuery = query(resultsRef, where("studentId", "==", auth.currentUser.uid))
        const resultsSnapshot = await getDocs(resultsQuery)

        const completedExams = resultsSnapshot.size
        let lastExamTitle = ""
        let lastExamDate = ""

        // Get participated exam IDs
        const participatedExamIds = resultsSnapshot.docs.map((doc) => doc.data().examId)
        setParticipatedExams(participatedExamIds)

        if (completedExams > 0) {
          // Sort by date
          const sortedResults = resultsSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

          if (sortedResults.length > 0) {
            const lastExam = sortedResults[0]
            lastExamTitle = lastExam.examTitle || ""
            lastExamDate = lastExam.date || ""
          }
        }

        // Get total exams
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        setStats({
          totalExams: examsSnapshot.size,
          completedExams,
          lastExamTitle,
          lastExamDate,
        })
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const fetchLiveExams = async () => {
      try {
        if (!auth.currentUser) {
          setLoadingLiveExams(false)
          return
        }

        // Get all exams
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        if (examsSnapshot.empty) {
          setLoadingLiveExams(false)
          return
        }

        const allExams = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LiveExam[]

        // Get student data for course access
        const studentRef = doc(db, "students", auth.currentUser.uid)
        const studentSnap = await getDoc(studentRef)

        let assignedCourses: string[] = []
        let purchasedCourses: string[] = []

        if (studentSnap.exists()) {
          const studentData = studentSnap.data()
          assignedCourses = studentData.courses || []
          purchasedCourses = studentData.purchasedCourses || []
        }

        // Get approved purchases
        const purchasesRef = collection(db, "purchases")
        const purchasesQuery = query(
          purchasesRef,
          where("studentId", "==", auth.currentUser.uid),
          where("status", "==", "approved"),
        )
        const purchasesSnapshot = await getDocs(purchasesQuery)
        const approvedCourseIds = purchasesSnapshot.docs.map((doc) => doc.data().courseId)

        // Get current time
        const now = new Date()

        // Filter for live exams
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

          // Check course access - more permissive approach
          const hasCourseAccess =
            !exam.courseId ||
            exam.courseId === "" ||
            exam.courseId === null ||
            assignedCourses.includes(exam.courseId) ||
            purchasedCourses.includes(exam.courseId) ||
            approvedCourseIds.includes(exam.courseId) ||
            assignedCourses.length === 0 // Show all exams if no courses assigned

          return isActive && hasCourseAccess
        })

        // Sort by start time (newest first)
        liveExams.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

        setLiveExams(liveExams.slice(0, 3)) // Show only first 3 live exams
        setLoadingLiveExams(false)
      } catch (error) {
        console.error("Error fetching live exams:", error)
        setLoadingLiveExams(false)
      }
    }

    fetchLiveExams()
  }, [])

  useEffect(() => {
    const fetchAllCourses = async () => {
      try {
        if (!auth.currentUser) {
          setLoadingCourses(false)
          return
        }

        // Get student's enrolled courses
        const studentRef = doc(db, "students", auth.currentUser.uid)
        const studentSnap = await getDoc(studentRef)

        let enrolledCourseIds: string[] = []

        if (studentSnap.exists()) {
          const studentData = studentSnap.data()
          const assignedCourses = studentData.courses || []

          // Get purchased courses
          const purchasesRef = collection(db, "purchases")
          const purchasesQuery = query(
            purchasesRef,
            where("studentId", "==", auth.currentUser.uid),
            where("status", "==", "approved"),
          )
          const purchasesSnapshot = await getDocs(purchasesQuery)
          const purchasedCourseIds = purchasesSnapshot.docs.map((doc) => doc.data().courseId)

          enrolledCourseIds = [...new Set([...assignedCourses, ...purchasedCourseIds])]
        }

        const coursesRef = collection(db, "courses")
        const coursesSnapshot = await getDocs(coursesRef)
        const coursesData = coursesSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((course) => !enrolledCourseIds.includes(course.id)) // Exclude enrolled courses

        setAllCourses(coursesData)
        setLoadingCourses(false)
      } catch (error) {
        console.error("Error fetching courses:", error)
        setLoadingCourses(false)
      }
    }

    fetchAllCourses()
  }, [])

  useEffect(() => {
    const fetchPastExams = async () => {
      try {
        if (!auth.currentUser) {
          setLoadingPastExams(false)
          return
        }

        // Get all exams
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        if (examsSnapshot.empty) {
          setLoadingPastExams(false)
          return
        }

        const allExams = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Get student data for course access
        const studentRef = doc(db, "students", auth.currentUser.uid)
        const studentSnap = await getDoc(studentRef)

        let assignedCourses: string[] = []

        if (studentSnap.exists()) {
          const studentData = studentSnap.data()
          assignedCourses = studentData.courses || []
        }

        // Get approved purchases
        const purchasesRef = collection(db, "purchases")
        const purchasesQuery = query(
          purchasesRef,
          where("studentId", "==", auth.currentUser.uid),
          where("status", "==", "approved"),
        )
        const purchasesSnapshot = await getDocs(purchasesQuery)
        const approvedCourseIds = purchasesSnapshot.docs.map((doc) => doc.data().courseId)

        // Get current time
        const now = new Date()

        // Filter for past exams
        const pastExams = allExams.filter((exam) => {
          try {
            const endTime = new Date(exam.endTime)
            const isPast = now > endTime

            // Check course access
            const hasCourseAccess =
              !exam.courseId ||
              exam.courseId === "" ||
              exam.courseId === null ||
              assignedCourses.includes(exam.courseId) ||
              approvedCourseIds.includes(exam.courseId) ||
              assignedCourses.length === 0

            return isPast && hasCourseAccess
          } catch (e) {
            return false
          }
        })

        // Sort by end time (newest first)
        pastExams.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setPastExams(pastExams.slice(0, 3)) // Show only first 3 past exams
        setLoadingPastExams(false)
      } catch (error) {
        console.error("Error fetching past exams:", error)
        setLoadingPastExams(false)
      }
    }

    fetchPastExams()
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  const completionPercentage = stats.totalExams > 0 ? (stats.completedExams / stats.totalExams) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <StudentHeader title={`স্বাগতম, ${studentName}`} />

      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Welcome Hero Section */}
        {studentData && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 p-6 md:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-white/30 shadow-xl">
                  <AvatarImage src={studentData.photoURL || ""} alt={studentData.fullName} className="object-cover" />
                  <AvatarFallback className="text-xl md:text-2xl bg-white/20 text-white font-bold">
                    {getInitials(studentData.fullName || "User")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-400 border-2 border-white"></div>
              </div>

              <div className="flex-1 space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold">{studentData.fullName}</h1>
                <p className="text-white/80 text-sm md:text-base">{studentData.email}</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {studentData.rollNumber && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      <Hash className="h-3 w-3 mr-1" />
                      {formatRollNumber(studentData.rollNumber)}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {studentData.college}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {studentData.hscBatch}
                  </Badge>
                </div>

                {assignedCourses.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-white/80 mb-2">ভর্তিকৃত কোর্স:</p>
                    <div className="flex flex-wrap gap-2">
                      {assignedCourses.slice(0, 3).map((course) => (
                        <Badge key={course.id} className="bg-white/20 text-white border-white/30">
                          {course.name}
                        </Badge>
                      ))}
                      {assignedCourses.length > 3 && (
                        <Badge className="bg-white/20 text-white border-white/30">
                          +{assignedCourses.length - 3} আরো
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Alert */}
        {maintenanceMode && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/50">
            <Bell className="h-4 w-4" />
            <AlertTitle>সতর্কতা</AlertTitle>
            <AlertDescription>{maintenanceMessage || "ওয়েবসাইট বর্তমানে রক্ষণাবেক্ষণের জন্য বন্ধ আছে।"}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Exams */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">মোট পরীক্ষা</p>
                  <p className="text-3xl font-bold">{stats.totalExams}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <BookOpen className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Exams */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">সম্পন্ন পরীক্ষা</p>
                  <p className="text-3xl font-bold">{stats.completedExams}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Award className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={completionPercentage} className="h-2 bg-white/20" />
                <p className="text-emerald-100 text-xs mt-1">{completionPercentage.toFixed(1)}% সম্পন্ন</p>
              </div>
            </CardContent>
          </Card>

          {/* Live Exams */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">লাইভ পরীক্ষা</p>
                  <p className="text-3xl font-bold">{liveExams.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Zap className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Courses */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">ভর্তিকৃত কোর্স</p>
                  <p className="text-3xl font-bold">{assignedCourses.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Exams Section */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">লাইভ পরীক্ষাসমূহ</CardTitle>
                    <CardDescription>এখনই অংশগ্রহণ করুন</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLiveExams ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : liveExams.length > 0 ? (
                  <div className="space-y-4">
                    {liveExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4 border border-red-100 dark:border-red-800/30 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500 text-white animate-pulse">
                            <div className="h-2 w-2 rounded-full bg-white mr-1"></div>
                            লাইভ
                          </Badge>
                        </div>

                        <div className="pr-16">
                          <h4 className="font-semibold text-lg mb-2">{exam.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{exam.subject}</p>

                          <div className="flex items-center gap-4 text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4 text-blue-500" />
                              <span>{exam.totalQuestions} প্রশ্ন</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-green-500" />
                              <span>{exam.time} মিনিট</span>
                            </div>
                          </div>

                          {participatedExams.includes(exam.id) ? (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            >
                              ✓ সম্পন্ন
                            </Badge>
                          ) : (
                            <Link href={`/student/live-exams/${exam.id}`}>
                              <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg">
                                অংশগ্রহণ করুন
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}

                    <Link href="/student/live-exams">
                      <Button variant="outline" className="w-full bg-transparent">
                        সব লাইভ পরীক্ষা দেখুন
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">কোন লাইভ পরীক্ষা নেই</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Exams Section */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">অনুশীলন পরীক্ষা</CardTitle>
                    <CardDescription>পূর্বের পরীক্ষাগুলো অনুশীলন করুন</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPastExams ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : pastExams.length > 0 ? (
                  <div className="space-y-4">
                    {pastExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 border border-blue-100 dark:border-blue-800/30 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            অনুশীলন
                          </Badge>
                        </div>

                        <div className="pr-20">
                          <h4 className="font-semibold text-lg mb-2">{exam.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{exam.subject}</p>

                          <div className="flex items-center gap-4 text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4 text-blue-500" />
                              <span>{exam.totalQuestions} প্রশ্ন</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-green-500" />
                              <span>{exam.time} মিনিট</span>
                            </div>
                          </div>

                          <Link href={`/student/past-exams/practice/${exam.id}`}>
                            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg">
                              অনুশীলন করুন
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}

                    <Link href="/student/past-exams">
                      <Button variant="outline" className="w-full bg-transparent">
                        সব অনুশীলন পরীক্ষা দেখুন
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">কোন অনুশীলন পরীক্ষা নেই</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Notices */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">নোটিশ</CardTitle>
                    <CardDescription>গুরুত্বপূর্ণ ঘোষণা</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {notices.length > 0 ? (
                  <div className="space-y-4">
                    {notices.slice(0, 3).map((notice) => (
                      <div
                        key={notice.id}
                        className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100 dark:border-amber-800/30"
                      >
                        <h4 className="font-semibold mb-2">{notice.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{notice.content}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{notice.date}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">কোন নোটিশ নেই</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">দ্রুত অ্যাকশন</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/student/live-exams">
                  <Button className="w-full justify-start bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white">
                    <Zap className="mr-2 h-4 w-4" />
                    লাইভ পরীক্ষা
                  </Button>
                </Link>
                <Link href="/student/past-exams">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <BookOpen className="mr-2 h-4 w-4" />
                    অনুশীলন পরীক্ষা
                  </Button>
                </Link>
                <Link href="/student/leaderboard">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    লিডারবোর্ড
                  </Button>
                </Link>
                <Link href="/student/profile">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Users className="mr-2 h-4 w-4" />
                    প্রোফাইল
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enrolled Courses */}
        {assignedCourses.length > 0 && (
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">আপনার কোর্সসমূহ</CardTitle>
                  <CardDescription>ভর্তিকৃত কোর্সের তালিকা</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 border border-emerald-100 dark:border-emerald-800/30 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-500 text-white">ভর্তি হয়েছেন</Badge>
                    </div>

                    <div className="pr-20">
                      <h3 className="font-semibold text-lg mb-2">{course.name}</h3>
                      {course.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Courses */}
        {allCourses.length > 0 && (
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">উপলব্ধ কোর্সসমূহ</CardTitle>
                  <CardDescription>নতুন কোর্সে ভর্তি হন</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCourses ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCourses.slice(0, 6).map((course) => {
                    const discountActive = course.discountDeadline && new Date(course.discountDeadline) > new Date()
                    const finalPrice = discountActive
                      ? course.price - (course.price * course.discount) / 100
                      : course.price

                    return (
                      <div
                        key={course.id}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 p-4 border border-violet-100 dark:border-violet-800/30 hover:shadow-lg transition-all duration-300"
                      >
                        <h3 className="font-semibold mb-2">{course.name}</h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                        )}

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span>মোট পরীক্ষা:</span>
                            <span className="font-medium">{course.totalExams || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">মূল্য:</span>
                            <div className="flex items-center gap-2">
                              {discountActive && course.discount > 0 ? (
                                <>
                                  <span className="text-sm line-through text-muted-foreground">৳{course.price}</span>
                                  <span className="font-bold text-emerald-600">৳{finalPrice}</span>
                                </>
                              ) : (
                                <span className="font-bold">৳{course.price}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Link href={`/course/${course.id}`}>
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                          >
                            বিস্তারিত দেখুন
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}

              {allCourses.length > 6 && (
                <div className="mt-6 text-center">
                  <Link href="/#courses">
                    <Button variant="outline" size="lg">
                      সব কোর্স দেখুন
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exam Calendar */}
        <div className="mt-8">
          <ExamCalendar />
        </div>
      </div>
    </div>
  )
}
