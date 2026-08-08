"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, Trophy, Crown, Medal, Award, Star } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Exam {
  id: string
  title: string
  subject: string
}

interface Result {
  id: string
  examId: string
  examTitle: string
  studentId: string
  studentName?: string
  studentCollege?: string
  studentHscBatch?: string
  studentPhoto?: string
  studentRollNumber?: string
  correctAnswers: number
  wrongAnswers: number
  totalScore: number
  leaderboardPublished: boolean
}

interface Student {
  id: string
  fullName: string
  college: string
  hscBatch: string
  rollNumber: string
  photoURL?: string
}

export default function LeaderboardPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExam, setSelectedExam] = useState<string | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [students, setStudents] = useState<Record<string, Student>>({})
  const [loading, setLoading] = useState(true)
  const [leaderboardPublished, setLeaderboardPublished] = useState(false)

  const fetchExamsWithLeaderboards = async () => {
    try {
      setLoading(true)

      // First, find all results with published leaderboards
      const resultsRef = collection(db, "results")
      const resultsQuery = query(resultsRef, where("leaderboardPublished", "==", true))
      const resultsSnapshot = await getDocs(resultsQuery)

      if (resultsSnapshot.empty) {
        setExams([])
        setLoading(false)
        return
      }

      // Extract unique exam IDs
      const examIds = [...new Set(resultsSnapshot.docs.map((doc) => doc.data().examId))]
      console.log("Found published leaderboards for exams:", examIds)

      // Fetch exam details for each exam ID
      const examsData: Exam[] = []

      for (const examId of examIds) {
        const examRef = doc(db, "exams", examId)
        const examSnap = await getDoc(examRef)

        if (examSnap.exists()) {
          examsData.push({
            id: examId,
            ...examSnap.data(),
          } as Exam)
        }
      }

      setExams(examsData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching exams with leaderboards:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExamsWithLeaderboards()
  }, [])

  useEffect(() => {
    if (selectedExam) {
      fetchLeaderboard(selectedExam)
    }
  }, [selectedExam])

  const fetchLeaderboard = async (examId: string) => {
    setLoading(true)

    try {
      console.log("Fetching leaderboard for exam:", examId)

      // Fetch results for the selected exam
      const resultsRef = collection(db, "results")
      const resultsQuery = query(resultsRef, where("examId", "==", examId), where("leaderboardPublished", "==", true))
      const resultsSnapshot = await getDocs(resultsQuery)

      console.log("Found published results:", resultsSnapshot.size)

      const resultsData = resultsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Result[]

      if (resultsData.length > 0) {
        setLeaderboardPublished(true)

        // Fetch student details for each result
        const studentIds = resultsData.map((result) => result.studentId)
        const uniqueStudentIds = [...new Set(studentIds)]

        const studentsData: Record<string, Student> = {}

        for (const studentId of uniqueStudentIds) {
          try {
            const studentRef = doc(db, "students", studentId)
            const studentSnap = await getDoc(studentRef)

            if (studentSnap.exists()) {
              const studentData = studentSnap.data()
              studentsData[studentId] = {
                id: studentId,
                fullName: studentData.fullName || "Unknown",
                college: studentData.college || "Unknown",
                hscBatch: studentData.hscBatch || "Unknown",
                rollNumber: studentData.rollNumber || "000000",
                photoURL: studentData.photoURL || "",
                ...studentData,
              } as Student
            }
          } catch (error) {
            console.error(`Error fetching student ${studentId}:`, error)
            // Add fallback student data
            studentsData[studentId] = {
              id: studentId,
              fullName: "Unknown Student",
              college: "Unknown",
              hscBatch: "Unknown",
              rollNumber: "000000",
              photoURL: "",
            }
          }
        }

        setStudents(studentsData)

        // Combine results with student data
        const resultsWithStudentData = resultsData.map((result) => ({
          ...result,
          studentName: studentsData[result.studentId]?.fullName || "Unknown",
          studentCollege: studentsData[result.studentId]?.college || "Unknown",
          studentHscBatch: studentsData[result.studentId]?.hscBatch || "Unknown",
          studentPhoto: studentsData[result.studentId]?.photoURL || "",
          studentRollNumber: studentsData[result.studentId]?.rollNumber || "000000",
        }))

        // Sort by score (highest first)
        resultsWithStudentData.sort((a, b) => b.totalScore - a.totalScore)

        setResults(resultsWithStudentData)
      } else {
        setLeaderboardPublished(false)
        setResults([])
      }

      setLoading(false)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
      setLeaderboardPublished(false)
      setResults([])
      setLoading(false)
    }
  }

  const handleExamSelect = (examId: string) => {
    setSelectedExam(examId)
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <Star className="h-4 w-4 text-blue-500" />
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white"
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-orange-100 dark:from-slate-900 dark:via-yellow-950/20 dark:to-orange-950/20">
      <StudentHeader title="লিডারবোর্ড" />

      <div className="p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 p-6 md:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>

            <div className="relative flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">লিডারবোর্ড</h1>
                <p className="text-white/80">সেরা পারফরমারদের তালিকা দেখুন এবং আপনার অবস্থান জানুন</p>
              </div>
            </div>
          </div>
        </div>

        {loading && !selectedExam ? (
          <div className="flex h-64 items-center justify-center">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent shadow-lg"></div>
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-yellow-300 opacity-20"></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
            {exams.length > 0 ? (
              exams.map((exam, index) => (
                <Card
                  key={exam.id}
                  className={`group cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ${
                    selectedExam === exam.id
                      ? "ring-2 ring-yellow-500 shadow-xl scale-105"
                      : "hover:ring-2 hover:ring-yellow-300"
                  }`}
                  onClick={() => handleExamSelect(exam.id)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  <div className="absolute inset-[1px] bg-white dark:bg-slate-800 rounded-xl"></div>

                  <div className="relative">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          প্রকাশিত
                        </Badge>
                      </div>
                      <CardTitle className="text-lg group-hover:text-yellow-600 transition-colors">
                        {exam.title}
                      </CardTitle>
                      <CardDescription>{exam.subject}</CardDescription>
                    </CardHeader>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-950/30 dark:to-orange-950/30 flex items-center justify-center">
                    <Trophy className="h-12 w-12 text-yellow-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-yellow-500 animate-ping opacity-20"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">কোন লিডারবোর্ড পাওয়া যায়নি</h3>
                <p className="text-gray-600 dark:text-gray-400">এখনো কোন লিডারবোর্ড প্রকাশিত হয়নি</p>
              </div>
            )}
          </div>
        )}

        {selectedExam && (
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8" />
                <div>
                  <CardTitle className="text-2xl">লিডারবোর্ড</CardTitle>
                  <CardDescription className="text-yellow-100">
                    {exams.find((e) => e.id === selectedExam)?.title}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="relative">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent shadow-lg"></div>
                    <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-yellow-300 opacity-20"></div>
                  </div>
                </div>
              ) : leaderboardPublished && results.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                        <TableHead className="w-16 text-center font-bold">র‍্যাংক</TableHead>
                        <TableHead className="font-bold">রোল</TableHead>
                        <TableHead className="font-bold">নাম</TableHead>
                        <TableHead className="hidden md:table-cell font-bold">কলেজ</TableHead>
                        <TableHead className="hidden md:table-cell font-bold">এইচএসসি ব্যাচ</TableHead>
                        <TableHead className="text-center font-bold">সঠিক</TableHead>
                        <TableHead className="text-center font-bold">ভুল</TableHead>
                        <TableHead className="text-center font-bold">মোট স্কোর</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result, index) => (
                        <TableRow
                          key={result.id}
                          className={`hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-950/20 dark:hover:to-orange-950/20 transition-all duration-200 ${
                            index < 3
                              ? "bg-gradient-to-r from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/10 dark:to-orange-950/10"
                              : ""
                          }`}
                        >
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Badge className={`${getRankBadge(index + 1)} px-3 py-1`}>{index + 1}</Badge>
                              {getRankIcon(index + 1)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-sm">
                              {result.studentRollNumber}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-yellow-200 dark:ring-yellow-800">
                                <AvatarImage src={result.studentPhoto || ""} alt={result.studentName || "Student"} />
                                <AvatarFallback className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold">
                                  {(result.studentName || "Unknown")
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{result.studentName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{result.studentCollege}</TableCell>
                          <TableCell className="hidden md:table-cell">{result.studentHscBatch}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              {result.correctAnswers}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              {result.wrongAnswers}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold text-lg px-3 py-1">
                              {result.totalScore}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-6">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                      <BarChart3 className="h-12 w-12 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">রেজাল্ট এখনো প্রকাশিত হয়নি</h3>
                  <p className="text-gray-600 dark:text-gray-400">এই পরীক্ষার লিডারবোর্ড এখনো প্রকাশিত হয়নি</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
