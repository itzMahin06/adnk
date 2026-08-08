"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, BookOpen, CalendarIcon } from "lucide-react"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import Link from "next/link"

interface ExamEvent {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
  startTime: string
  endTime: string
  courseId?: string
  courseName?: string
  status: "upcoming" | "live" | "ended"
}

export function ExamCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [exams, setExams] = useState<ExamEvent[]>([])
  const [selectedDateExams, setSelectedDateExams] = useState<ExamEvent[]>([])
  const [showExamDetails, setShowExamDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [participatedExams, setParticipatedExams] = useState<string[]>([])

  useEffect(() => {
    const fetchExams = async () => {
      try {
        if (!auth.currentUser) {
          setLoading(false)
          return
        }

        // Get student's participated exams
        const resultsRef = collection(db, "results")
        const resultsQuery = query(resultsRef, where("studentId", "==", auth.currentUser.uid))
        const resultsSnapshot = await getDocs(resultsQuery)
        const participatedExamIds = resultsSnapshot.docs.map((doc) => doc.data().examId)
        setParticipatedExams(participatedExamIds)

        // Get all exams
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        if (examsSnapshot.empty) {
          setLoading(false)
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

        // Get course names
        const coursesRef = collection(db, "courses")
        const coursesSnapshot = await getDocs(coursesRef)
        const coursesMap = new Map()
        coursesSnapshot.docs.forEach((doc) => {
          coursesMap.set(doc.id, doc.data().name)
        })

        // Process exams
        const processedExams: ExamEvent[] = []
        const now = new Date()

        for (const exam of allExams) {
          // Check course access
          const hasCourseAccess =
            !exam.courseId ||
            exam.courseId === "" ||
            assignedCourses.includes(exam.courseId) ||
            purchasedCourses.includes(exam.courseId) ||
            approvedCourseIds.includes(exam.courseId) ||
            (assignedCourses.length === 0 && purchasedCourses.length === 0)

          if (!hasCourseAccess) continue

          try {
            const startTime = new Date(exam.startTime)
            const endTime = new Date(exam.endTime)

            let status: "upcoming" | "live" | "ended" = "ended"
            if (now < startTime) {
              status = "upcoming"
            } else if (now >= startTime && now <= endTime) {
              status = "live"
            }

            processedExams.push({
              id: exam.id,
              title: exam.title,
              subject: exam.subject,
              totalQuestions: exam.totalQuestions,
              time: exam.time,
              startTime: exam.startTime,
              endTime: exam.endTime,
              courseId: exam.courseId,
              courseName: exam.courseId ? coursesMap.get(exam.courseId) : undefined,
              status,
            })
          } catch (e) {
            console.error("Invalid date format for exam:", exam.id, e)
          }
        }

        setExams(processedExams)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching exams:", error)
        setLoading(false)
      }
    }

    fetchExams()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toDateString()
      const dayExams = exams.filter((exam) => {
        const examDate = new Date(exam.startTime)
        return examDate.toDateString() === dateStr
      })
      setSelectedDateExams(dayExams)
      if (dayExams.length > 0) {
        setShowExamDetails(true)
      }
    }
  }, [selectedDate, exams])

  const getExamDates = () => {
    return exams.map((exam) => new Date(exam.startTime))
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("bn-BD", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("bn-BD", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (exam: ExamEvent) => {
    if (participatedExams.includes(exam.id)) {
      return <Badge variant="secondary">সম্পন্ন</Badge>
    }

    switch (exam.status) {
      case "upcoming":
        return <Badge variant="outline">আসছে</Badge>
      case "live":
        return <Badge variant="destructive">লাইভ</Badge>
      case "ended":
        return <Badge variant="secondary">শেষ</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            পরীক্ষার ক্যালেন্ডার
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            পরীক্ষার ক্যালেন্ডার
          </CardTitle>
          <CardDescription>পরীক্ষার তারিখে ক্লিক করে বিস্তারিত দেখুন</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              examDay: getExamDates(),
            }}
            modifiersStyles={{
              examDay: {
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                fontWeight: "bold",
              },
            }}
          />
          <div className="mt-4 text-sm text-muted-foreground">
            <p>• নীল রঙের তারিখে পরীক্ষা আছে</p>
            <p>• তারিখে ক্লিক করে পরীক্ষার বিস্তারিত দেখুন</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showExamDetails} onOpenChange={setShowExamDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDate && formatDate(selectedDate.toISOString())} - এর পরীক্ষাসমূহ</DialogTitle>
            <DialogDescription>
              {selectedDateExams.length > 0
                ? `এই দিনে ${selectedDateExams.length}টি পরীক্ষা রয়েছে`
                : "এই দিনে কোন পরীক্ষা নেই"}
            </DialogDescription>
          </DialogHeader>

          {selectedDateExams.length > 0 ? (
            <div className="space-y-4">
              {selectedDateExams.map((exam) => (
                <Card key={exam.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{exam.title}</CardTitle>
                        <CardDescription>
                          {exam.subject} {exam.courseName && `• ${exam.courseName}`}
                        </CardDescription>
                      </div>
                      {getStatusBadge(exam)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">প্রশ্ন</p>
                          <p className="font-medium">{exam.totalQuestions}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">সময়</p>
                          <p className="font-medium">{exam.time} মিনিট</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">শুরু</p>
                        <p className="font-medium">{formatTime(exam.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">শেষ</p>
                        <p className="font-medium">{formatTime(exam.endTime)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {exam.status === "live" && !participatedExams.includes(exam.id) && (
                        <Link href={`/student/live-exams/${exam.id}`}>
                          <Button size="sm">এখনই অংশগ্রহণ করুন</Button>
                        </Link>
                      )}
                      {exam.status === "ended" && participatedExams.includes(exam.id) && (
                        <Link href={`/student/result/${exam.id}`}>
                          <Button variant="outline" size="sm">
                            ফলাফল দেখুন
                          </Button>
                        </Link>
                      )}
                      {exam.status === "upcoming" && (
                        <Button variant="outline" size="sm" disabled>
                          {new Date(exam.startTime).toLocaleDateString("bn-BD")} এ শুরু হবে
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">এই দিনে কোন পরীক্ষা নেই</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
