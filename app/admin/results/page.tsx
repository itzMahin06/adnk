"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Download, Trophy, Eye } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import Link from "next/link"

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
}

interface Result {
  id: string
  examId: string
  examTitle: string
  studentId: string
  studentName?: string
  studentCollege?: string
  studentHscBatch?: string
  correctAnswers: number
  wrongAnswers: number
  totalScore: number
  submittedAt: string
  leaderboardPublished?: boolean
}

interface Student {
  id: string
  fullName: string
  college: string
  hscBatch: string
  paidBatch: string
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const examId = searchParams.get("examId")

  const [exams, setExams] = useState<Exam[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [students, setStudents] = useState<Record<string, Student>>({})
  const [selectedExam, setSelectedExam] = useState<string | null>(examId)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [leaderboardPublished, setLeaderboardPublished] = useState(false)

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        const examsData = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Exam[]

        setExams(examsData)

        if (selectedExam) {
          await fetchResults(selectedExam)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching exams:", error)
        setLoading(false)
      }
    }

    fetchExams()
  }, [selectedExam])

  const fetchResults = async (examId: string) => {
    setLoading(true)

    try {
      // Fetch results for the selected exam
      const resultsRef = collection(db, "results")
      const resultsQuery = query(resultsRef, where("examId", "==", examId))
      const resultsSnapshot = await getDocs(resultsQuery)

      const resultsData = resultsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Result[]

      // Check if leaderboard is published
      if (resultsData.length > 0) {
        setLeaderboardPublished(resultsData[0].leaderboardPublished || false)
      }

      // Fetch student details for each result
      const studentIds = resultsData.map((result) => result.studentId)
      const uniqueStudentIds = [...new Set(studentIds)]

      const studentsData: Record<string, Student> = {}

      for (const studentId of uniqueStudentIds) {
        const studentRef = doc(db, "students", studentId)
        const studentSnap = await getDoc(studentRef)

        if (studentSnap.exists()) {
          studentsData[studentId] = {
            id: studentId,
            ...studentSnap.data(),
          } as Student
        }
      }

      setStudents(studentsData)

      // Combine results with student data
      const resultsWithStudentData = resultsData.map((result) => ({
        ...result,
        studentName: studentsData[result.studentId]?.fullName || "Unknown",
        studentCollege: studentsData[result.studentId]?.college || "Unknown",
        studentHscBatch: studentsData[result.studentId]?.hscBatch || "Unknown",
      }))

      // Sort by score (highest first)
      resultsWithStudentData.sort((a, b) => b.totalScore - a.totalScore)

      setResults(resultsWithStudentData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching results:", error)
      setLoading(false)
    }
  }

  const handleExamSelect = (examId: string) => {
    setSelectedExam(examId)
  }

  const handlePublishLeaderboard = async () => {
    if (!selectedExam) return

    setPublishing(true)

    try {
      console.log("Publishing leaderboard for exam:", selectedExam)
      console.log("Number of results to update:", results.length)

      // Update all results for this exam to mark leaderboard as published
      for (const result of results) {
        const resultRef = doc(db, "results", result.id)
        await updateDoc(resultRef, {
          leaderboardPublished: true,
        })
        console.log("Updated result:", result.id)
      }

      setLeaderboardPublished(true)
      setPublishing(false)
    } catch (error) {
      console.error("Error publishing leaderboard:", error)
      setPublishing(false)
    }
  }

  const downloadResultsAsCSV = () => {
    if (results.length === 0) return

    const headers = ["Rank", "Name", "College", "HSC Batch", "Correct", "Wrong", "Total Score"]

    const csvRows = [
      headers.join(","),
      ...results.map((result, index) =>
        [
          index + 1,
          `"${result.studentName}"`,
          `"${result.studentCollege}"`,
          `"${result.studentHscBatch}"`,
          result.correctAnswers,
          result.wrongAnswers,
          result.totalScore,
        ].join(","),
      ),
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)

    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${selectedExam}-results.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="ফলাফলসমূহ" />

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className={`cursor-pointer hover:border-primary transition-colors ${selectedExam === exam.id ? "border-primary" : ""}`}
              onClick={() => handleExamSelect(exam.id)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-base">{exam.title}</CardTitle>
                <CardDescription>{exam.subject}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {selectedExam && (
          <div className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>পরীক্ষার ফলাফল</CardTitle>
                  <CardDescription>{exams.find((e) => e.id === selectedExam)?.title}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!leaderboardPublished && (
                    <Button
                      onClick={handlePublishLeaderboard}
                      disabled={publishing || results.length === 0}
                      className="flex items-center gap-1"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>{publishing ? "প্রকাশ করা হচ্ছে..." : "লিডারবোর্ড প্রকাশ করুন"}</span>
                    </Button>
                  )}
                  {leaderboardPublished && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      <span>লিডারবোর্ড প্রকাশিত</span>
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    onClick={downloadResultsAsCSV}
                    disabled={results.length === 0}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>CSV ডাউনলোড</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">র‍্যাংক</TableHead>
                          <TableHead>নাম</TableHead>
                          <TableHead className="hidden md:table-cell">কলেজ</TableHead>
                          <TableHead className="hidden md:table-cell">এইচএসসি ব্যাচ</TableHead>
                          <TableHead className="text-center">সঠিক</TableHead>
                          <TableHead className="text-center">ভুল</TableHead>
                          <TableHead className="text-center">মোট স্কোর</TableHead>
                          <TableHead className="text-center">বিস্তারিত</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result, index) => (
                          <TableRow key={result.id}>
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell>{result.studentName}</TableCell>
                            <TableCell className="hidden md:table-cell">{result.studentCollege}</TableCell>
                            <TableCell className="hidden md:table-cell">{result.studentHscBatch}</TableCell>
                            <TableCell className="text-center">{result.correctAnswers}</TableCell>
                            <TableCell className="text-center">{result.wrongAnswers}</TableCell>
                            <TableCell className="text-center font-medium">{result.totalScore}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/admin/student-result/${result.id}`}>
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">View Details</span>
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">কোন ফলাফল পাওয়া যায়নি</h3>
                    <p className="text-muted-foreground mt-1">এই পরীক্ষার জন্য কোন ফলাফল নেই</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
