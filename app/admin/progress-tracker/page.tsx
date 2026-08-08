"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Clock, Trophy, Users, Calendar, Target } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Add this function at the top of the component:
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

const formatDate = (timestamp: any): string => {
  if (!timestamp) return "N/A"

  try {
    let date: Date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === "string") {
      date = new Date(timestamp)
    } else {
      return "N/A"
    }

    return date.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch (error) {
    return "N/A"
  }
}

const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return "N/A"

  try {
    let date: Date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === "string") {
      date = new Date(timestamp)
    } else {
      return "N/A"
    }

    return date.toLocaleString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (error) {
    return "N/A"
  }
}

interface Student {
  id: string
  fullName: string
  email: string
  phone: string
  college: string
  hscBatch: string
  photoURL?: string
}

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
}

interface Result {
  id: string
  studentId: string
  examId: string
  correctAnswers: number
  wrongAnswers: number
  totalScore: number
  totalQuestions: number
  completionTimeSeconds: number
  submittedAt: any
  studentName?: string
  examTitle?: string
  studentCollege?: string
  studentHscBatch?: string
  studentPhoto?: string
  percentage?: number
}

interface ProgressStats {
  totalExams: number
  averageScore: number
  averageTime: number
  bestScore: number
  worstScore: number
  totalStudents: number
  averagePercentage: number
}

export default function ProgressTrackerPage() {
  const [results, setResults] = useState<Result[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedExam, setSelectedExam] = useState<string>("all")
  const [stats, setStats] = useState<ProgressStats>({
    totalExams: 0,
    averageScore: 0,
    averageTime: 0,
    bestScore: 0,
    worstScore: 0,
    totalStudents: 0,
    averagePercentage: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [results, selectedExam])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch students
      const studentsSnapshot = await getDocs(collection(db, "students"))
      const studentsData = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        fullName: doc.data().fullName || doc.data().name || "Unknown",
        email: doc.data().email || "",
        phone: doc.data().phone || "",
        college: doc.data().college || "",
        hscBatch: doc.data().hscBatch || "",
        photoURL: doc.data().photoURL || "",
        ...doc.data(),
      })) as Student[]
      setStudents(studentsData)

      // Fetch exams
      const examsSnapshot = await getDocs(collection(db, "exams"))
      const examsData = examsSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Unknown Exam",
        subject: doc.data().subject || "",
        totalQuestions: doc.data().totalQuestions || 0,
        time: doc.data().time || 0,
        ...doc.data(),
      })) as Exam[]
      setExams(examsData)

      // Fetch results
      const resultsSnapshot = await getDocs(query(collection(db, "results"), orderBy("submittedAt", "desc")))
      const resultsData = resultsSnapshot.docs.map((doc) => {
        const data = doc.data()
        const student = studentsData.find((s) => s.id === data.studentId)
        const exam = examsData.find((e) => e.id === data.examId)

        const totalQuestions = data.totalQuestions || exam?.totalQuestions || 1
        const percentage = ((data.correctAnswers || 0) / totalQuestions) * 100

        return {
          id: doc.id,
          studentId: data.studentId || "",
          examId: data.examId || "",
          correctAnswers: data.correctAnswers || 0,
          wrongAnswers: data.wrongAnswers || 0,
          totalScore: data.totalScore || 0,
          totalQuestions: totalQuestions,
          completionTimeSeconds: data.completionTimeSeconds || 0,
          submittedAt: data.submittedAt,
          studentName: student?.fullName || "Unknown Student",
          examTitle: exam?.title || data.examTitle || "Unknown Exam",
          studentCollege: student?.college || "Unknown",
          studentHscBatch: student?.hscBatch || "Unknown",
          studentPhoto: student?.photoURL || "",
          percentage: percentage,
          ...data,
        }
      }) as Result[]

      setResults(resultsData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const filteredResults = selectedExam === "all" ? results : results.filter((r) => r.examId === selectedExam)

    if (filteredResults.length === 0) {
      setStats({
        totalExams: 0,
        averageScore: 0,
        averageTime: 0,
        bestScore: 0,
        worstScore: 0,
        totalStudents: 0,
        averagePercentage: 0,
      })
      return
    }

    const scores = filteredResults.map((r) => r.totalScore)
    const percentages = filteredResults.map((r) => r.percentage || 0)
    const times = filteredResults.map((r) => r.completionTimeSeconds)
    const uniqueStudents = new Set(filteredResults.map((r) => r.studentId)).size

    setStats({
      totalExams: filteredResults.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      averagePercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      totalStudents: uniqueStudents,
    })
  }

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 80) return { level: "চমৎকার", color: "bg-green-500" }
    if (percentage >= 60) return { level: "ভালো", color: "bg-blue-500" }
    if (percentage >= 40) return { level: "গড়", color: "bg-yellow-500" }
    return { level: "উন্নতি প্রয়োজন", color: "bg-red-500" }
  }

  const getTimePerformance = (timeSeconds: number) => {
    const minutes = Math.floor(timeSeconds / 60)
    if (minutes <= 30) return { level: "দ্রুত", color: "bg-green-500" }
    if (minutes <= 60) return { level: "স্বাভাবিক", color: "bg-blue-500" }
    return { level: "ধীর", color: "bg-orange-500" }
  }

  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.examTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesExam = selectedExam === "all" || result.examId === selectedExam
    return matchesSearch && matchesExam
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>ডেটা লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">অগ্রগতি ট্র্যাকার</h1>
        <p className="text-muted-foreground">শিক্ষার্থীদের পরীক্ষার পারফরম্যান্স এবং অগ্রগতি ট্র্যাক করুন</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">মোট পরীক্ষা</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">গড় স্কোর</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">({stats.averagePercentage.toFixed(1)}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">গড় সময়</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.averageTime)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">মোট শিক্ষার্থী</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ফিল্টার</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="শিক্ষার্থী বা পরীক্ষার নাম খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="পরীক্ষা নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব পরীক্ষা</SelectItem>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>পরীক্ষার ফলাফল</CardTitle>
          <CardDescription>{filteredResults.length} টি ফলাফল পাওয়া গেছে</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">কোনো ফলাফল পাওয়া যায়নি</div>
            ) : (
              filteredResults.map((result) => {
                const performance = getPerformanceLevel(result.percentage || 0)
                const timePerf = getTimePerformance(result.completionTimeSeconds)

                return (
                  <div key={result.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={result.studentPhoto || ""} alt={result.studentName} />
                          <AvatarFallback className="text-sm">
                            {result.studentName
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <h3 className="font-semibold">{result.studentName}</h3>
                          <p className="text-sm text-muted-foreground">{result.examTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.studentCollege} • {result.studentHscBatch}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`${performance.color} text-white`}>{performance.level}</Badge>
                        <Badge className={`${timePerf.color} text-white`}>{timePerf.level}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          স্কোর:
                        </span>
                        <p className="font-medium">
                          {result.correctAnswers}/{result.totalQuestions}
                        </p>
                        <p className="text-xs text-green-600 font-medium">{(result.percentage || 0).toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          সময়:
                        </span>
                        <p className="font-medium">{formatTime(result.completionTimeSeconds)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          তারিখ:
                        </span>
                        <p className="font-medium">{formatDate(result.submittedAt)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">সময়:</span>
                        <p className="font-medium text-xs">
                          {formatDateTime(result.submittedAt).split(" ")[1] || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">মোট নম্বর:</span>
                        <p className="font-medium">{result.totalScore}</p>
                      </div>
                    </div>

                    {/* Additional Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-muted/50 p-3 rounded">
                      <div>
                        <span className="text-muted-foreground">সঠিক উত্তর:</span>
                        <p className="font-medium text-green-600">{result.correctAnswers}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ভুল উত্তর:</span>
                        <p className="font-medium text-red-600">{result.wrongAnswers}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">অনুত্তরিত:</span>
                        <p className="font-medium text-orange-600">
                          {result.totalQuestions - result.correctAnswers - result.wrongAnswers}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">নির্ভুলতা:</span>
                        <p className="font-medium">
                          {result.correctAnswers > 0
                            ? ((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
