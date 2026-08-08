"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, XCircle, Printer } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { addWatermark, getCommonPrintStyles, getMathJaxConfig } from "@/utils/print-utils"
import { initMathJax } from "@/utils/math-utils"
import { parseShortcodes } from "@/utils/shortcode-utils"

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
}

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
}

interface Result {
  id: string
  examId: string
  examTitle: string
  studentId: string
  correctAnswers: number
  wrongAnswers: number
  totalScore: number
  answers: Record<string, number>
  submittedAt: string
}

interface Student {
  id: string
  fullName: string
  email: string
  college: string
  hscBatch: string
  paidBatch: string
}

export default function AdminStudentResultPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResultDetails = async () => {
      try {
        // Fetch result details
        const resultRef = doc(db, "results", params.id)
        const resultSnap = await getDoc(resultRef)

        if (!resultSnap.exists()) {
          router.push("/admin/results")
          return
        }

        const resultData = { id: resultSnap.id, ...resultSnap.data() } as Result
        setResult(resultData)

        // Fetch exam details
        const examRef = doc(db, "exams", resultData.examId)
        const examSnap = await getDoc(examRef)

        if (examSnap.exists()) {
          const examData = { id: examSnap.id, ...examSnap.data() } as Exam
          setExam(examData)
        }

        // Fetch student details
        const studentRef = doc(db, "students", resultData.studentId)
        const studentSnap = await getDoc(studentRef)

        if (studentSnap.exists()) {
          const studentData = { id: studentSnap.id, ...studentSnap.data() } as Student
          setStudent(studentData)
        }

        // Fetch questions
        const questionsRef = collection(db, "questions")
        const questionsQuery = query(questionsRef, where("examId", "==", resultData.examId))
        const questionsSnapshot = await getDocs(questionsQuery)

        const questionsData = questionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Question[]

        setQuestions(questionsData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching result details:", error)
        setLoading(false)
      }
    }

    fetchResultDetails()
  }, [params.id, router])

  // Add this to the useEffect after fetching questions
  useEffect(() => {
    if (questions.length > 0 && !loading) {
      initMathJax()
    }
  }, [questions, loading])

  // Add a print function
  const printResults = () => {
    if (!exam || !result || !student || !questions) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${exam.title} - ${student.fullName} ফলাফল | এডমিশন নিয়ে খেলছি</title>
        <meta charset="UTF-8">
        ${getCommonPrintStyles()}
        ${getMathJaxConfig()}
      </head>
      <body>
        ${addWatermark()}
        <div class="no-print">
          <button onclick="window.print()">প্রিন্ট করুন</button>
        </div>
        <h1>${exam.title} - ফলাফল</h1>
        <div class="exam-info">
          <p><strong>শিক্ষার্থীর নাম:</strong> ${student.fullName}</p>
          <p><strong>ইমেইল:</strong> ${student.email}</p>
          <p><strong>কলেজ:</strong> ${student.college}</p>
          <p><strong>সঠিক উত্তর:</strong> ${result.correctAnswers}</p>
          <p><strong>ভুল উত্তর:</strong> ${result.wrongAnswers}</p>
          <p><strong>মোট স্কোর:</strong> ${result.totalScore}</p>
        </div>
        ${questions
          .map((question, qIndex) => {
            const selectedAnswer = result.answers[question.id]
            const isCorrect = selectedAnswer === question.correctOption

            return `
          <div class="question">
            <p><strong>${qIndex + 1}.</strong> ${question.text}</p>
            <div class="options">
              ${question.options
                .map(
                  (option, optIndex) => `
                <div class="option ${selectedAnswer === optIndex ? (isCorrect ? "correct" : "incorrect") : optIndex === question.correctOption ? "correct" : ""}">
                  <span class="option-marker">${String.fromCharCode(0x0995 + optIndex)}</span>
                  ${option}
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `
          })
          .join("")}
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(content)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!exam || !result || !student) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>ত্রুটি</AlertTitle>
          <AlertDescription>ফলাফল খুঁজে পাওয়া যায়নি</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/results")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          ফলাফলে ফিরে যান
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="শিক্ষার্থীর ফলাফল" />

      <div className="p-6">
        <div className="flex flex-col gap-4">
          <Button variant="outline" className="w-fit" onClick={() => router.push("/admin/results")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            ফলাফলে ফিরে যান
          </Button>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{exam.title}</CardTitle>
                  <CardDescription>{exam.subject}</CardDescription>
                </div>
                <Badge>ফলাফল</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">শিক্ষার্থীর তথ্য</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">নাম:</span>
                      <span className="font-medium">{student.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ইমেইল:</span>
                      <span className="font-medium">{student.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">কলেজ:</span>
                      <span className="font-medium">{student.college}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">এইচএসসি ব্যাচ:</span>
                      <span className="font-medium">{student.hscBatch}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">ফলাফল</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">সঠিক উত্তর:</span>
                      <span className="font-medium text-green-600">{result.correctAnswers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ভুল উত্তর:</span>
                      <span className="font-medium text-red-600">{result.wrongAnswers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">মোট স্কোর:</span>
                      <span className="font-medium">{result.totalScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">জমা দেওয়ার তারিখ:</span>
                      <span className="font-medium">{new Date(result.submittedAt).toLocaleString("bn-BD")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-medium mb-4">শিক্ষার্থীর উত্তরসমূহ</h3>
              <div className="space-y-6">
                {questions.map((question, qIndex) => {
                  const selectedAnswer = result.answers[question.id]
                  const isCorrect = selectedAnswer === question.correctOption

                  return (
                    <Card key={question.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <span className="font-medium">{qIndex + 1}.</span>
                            <div
                              className="whitespace-pre-line"
                              dangerouslySetInnerHTML={{ __html: parseShortcodes(question.text) }}
                            ></div>
                          </div>

                          <div className="space-y-3 pl-6">
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 p-2 rounded-md ${
                                  selectedAnswer === optIndex
                                    ? isCorrect
                                      ? "bg-green-50 dark:bg-green-900/20"
                                      : "bg-red-50 dark:bg-red-900/20"
                                    : optIndex === question.correctOption
                                      ? "bg-green-50 dark:bg-green-900/20"
                                      : ""
                                }`}
                              >
                                {selectedAnswer === optIndex ? (
                                  isCorrect ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                  )
                                ) : optIndex === question.correctOption ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <span className="w-5 h-5 flex-shrink-0"></span>
                                )}
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: `${String.fromCharCode(0x0995 + optIndex)}. ${option}`,
                                  }}
                                ></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          <Button variant="outline" onClick={printResults} className="mt-4">
            <Printer className="mr-2 h-4 w-4" />
            প্রিন্ট করুন
          </Button>
        </div>
      </div>
    </div>
  )
}
