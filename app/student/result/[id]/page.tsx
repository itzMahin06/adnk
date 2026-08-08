"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, XCircle, Printer } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { addWatermark, getCommonPrintStyles, getMathJaxConfig } from "@/utils/print-utils"
import { initMathJax } from "@/utils/math-utils"
import { parseShortcodes } from "@/utils/shortcode-utils"
import { ProgressMetrics } from "@/components/progress-metrics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number // in minutes
}

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
  explanation?: string
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
  completionTimeSeconds?: number
  leaderboardPublished: boolean
}

export default function StudentResultPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [progressMetrics, setProgressMetrics] = useState<{
    studentTime: number
    averageTime: number
    topRankedTime: number
    performanceLevel: "excellent" | "good" | "needs-improvement"
    percentile?: number
  } | null>(null)
  const [activeTab, setActiveTab] = useState("answers")

  useEffect(() => {
    const fetchResultDetails = async () => {
      try {
        if (!auth.currentUser) {
          router.push("/login")
          return
        }

        // Fetch exam details
        const examRef = doc(db, "exams", params.id)
        const examSnap = await getDoc(examRef)

        if (!examSnap.exists()) {
          router.push("/student/profile")
          return
        }

        const examData = { id: examSnap.id, ...examSnap.data() } as Exam
        setExam(examData)

        // Fetch student's result for this exam
        const resultsRef = collection(db, "results")
        const resultsQuery = query(
          resultsRef,
          where("examId", "==", params.id),
          where("studentId", "==", auth.currentUser.uid),
          where("leaderboardPublished", "==", true),
        )
        const resultsSnapshot = await getDocs(resultsQuery)

        if (resultsSnapshot.empty) {
          router.push("/student/profile")
          return
        }

        const resultData = {
          id: resultsSnapshot.docs[0].id,
          ...resultsSnapshot.docs[0].data(),
        } as Result
        setResult(resultData)

        // Fetch questions
        const questionsRef = collection(db, "questions")
        const questionsQuery = query(questionsRef, where("examId", "==", params.id))
        const questionsSnapshot = await getDocs(questionsQuery)

        const questionsData = questionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Question[]

        setQuestions(questionsData)

        // Fetch all results for this exam to calculate metrics
        const allResultsQuery = query(
          resultsRef,
          where("examId", "==", params.id),
          where("leaderboardPublished", "==", true),
        )
        const allResultsSnapshot = await getDocs(allResultsQuery)

        if (!allResultsSnapshot.empty) {
          const allResults = allResultsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Result[]

          // Sort by score (highest first)
          allResults.sort((a, b) => b.totalScore - a.totalScore)

          // Calculate metrics
          const studentResult = allResults.find((r) => r.studentId === auth.currentUser?.uid)
          const studentTime = studentResult?.completionTimeSeconds || examData.time * 60 // Default to max time

          // Filter results with completion time
          const resultsWithTime = allResults.filter((r) => r.completionTimeSeconds)

          // Calculate average time
          const totalTime = resultsWithTime.reduce((sum, r) => sum + (r.completionTimeSeconds || 0), 0)
          const averageTime = resultsWithTime.length > 0 ? totalTime / resultsWithTime.length : examData.time * 60

          // Get top ranked time
          const topRankedTime = allResults[0]?.completionTimeSeconds || averageTime

          // Calculate percentile (lower time is better)
          const timesSorted = resultsWithTime
            .map((r) => r.completionTimeSeconds || examData.time * 60)
            .sort((a, b) => a - b)

          const studentIndex = timesSorted.findIndex((time) => time >= studentTime)
          const percentile =
            studentIndex !== -1
              ? Math.round(((timesSorted.length - studentIndex) / timesSorted.length) * 100)
              : undefined

          // Determine performance level
          let performanceLevel: "excellent" | "good" | "needs-improvement" = "good"

          if (studentTime <= averageTime * 0.8) {
            performanceLevel = "excellent"
          } else if (studentTime >= averageTime * 1.2) {
            performanceLevel = "needs-improvement"
          }

          setProgressMetrics({
            studentTime,
            averageTime,
            topRankedTime,
            performanceLevel,
            percentile,
          })
        }

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
    if (!exam || !result || !questions) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${exam.title} - ফলাফল | এডমিশন নিয়ে খেলছি</title>
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
          <p><strong>বিষয়:</strong> ${exam.subject}</p>
          <p><strong>সঠিক উত্তর:</strong> ${result.correctAnswers}</p>
          <p><strong>ভুল উত্তর:</strong> ${result.wrongAnswers}</p>
          <p><strong>মোট স্কোর:</strong> ${result.totalScore}</p>
          ${result.completionTimeSeconds ? `<p><strong>সময় নিয়েছেন:</strong> ${Math.floor(result.completionTimeSeconds / 60)}:${(result.completionTimeSeconds % 60).toString().padStart(2, "0")}</p>` : ""}
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
            ${question.explanation ? `<div class="explanation"><strong>ব্যাখ্যা:</strong> ${question.explanation}</div>` : ""}
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

  if (!exam || !result) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>ত্রুটি</AlertTitle>
          <AlertDescription>ফলাফল খুঁজে পাওয়া যায়নি</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/student/profile")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          প্রোফাইলে ফিরে যান
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StudentHeader title="পরীক্ষার ফলাফল" />

      <div className="p-6">
        <div className="flex flex-col gap-4">
          <Button variant="outline" className="w-fit" onClick={() => router.push("/student/profile")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            প্রোফাইলে ফিরে যান
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">সঠিক উত্তর</p>
                  <p className="font-medium text-green-600">{result.correctAnswers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">ভুল উত্তর</p>
                  <p className="font-medium text-red-600">{result.wrongAnswers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">মোট স্কোর</p>
                  <p className="font-medium">{result.totalScore}</p>
                </div>
              </div>

              {progressMetrics && (
                <div className="mb-6">
                  <ProgressMetrics
                    studentTime={progressMetrics.studentTime}
                    averageTime={progressMetrics.averageTime}
                    topRankedTime={progressMetrics.topRankedTime}
                    totalExamTime={exam.time * 60}
                    performanceLevel={progressMetrics.performanceLevel}
                    percentile={progressMetrics.percentile}
                  />
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="answers">আপনার উত্তরসমূহ</TabsTrigger>
                  <TabsTrigger value="progress">পারফরম্যান্স বিশ্লেষণ</TabsTrigger>
                </TabsList>

                <TabsContent value="answers" className="space-y-4 pt-4">
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

                              {question.explanation && (
                                <div className="mt-3 pl-6 pt-3 border-t">
                                  <div className="text-sm">
                                    <span className="font-medium">ব্যাখ্যা: </span>
                                    <span
                                      dangerouslySetInnerHTML={{ __html: parseShortcodes(question.explanation) }}
                                    ></span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="pt-4">
                  {progressMetrics ? (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>সময় বিশ্লেষণ</CardTitle>
                          <CardDescription>আপনার পরীক্ষা সম্পন্ন করার সময় তুলনা</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-4 border rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">আপনার সময়</p>
                                <p className="text-2xl font-bold">
                                  {Math.floor(progressMetrics.studentTime / 60)}:
                                  {(progressMetrics.studentTime % 60).toString().padStart(2, "0")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  মোট সময়ের {Math.round((progressMetrics.studentTime / (exam.time * 60)) * 100)}%
                                </p>
                              </div>

                              <div className="p-4 border rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">গড় সময়</p>
                                <p className="text-2xl font-bold">
                                  {Math.floor(progressMetrics.averageTime / 60)}:
                                  {(progressMetrics.averageTime % 60).toString().padStart(2, "0")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  মোট সময়ের {Math.round((progressMetrics.averageTime / (exam.time * 60)) * 100)}%
                                </p>
                              </div>

                              <div className="p-4 border rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">সেরা সময়</p>
                                <p className="text-2xl font-bold">
                                  {Math.floor(progressMetrics.topRankedTime / 60)}:
                                  {(progressMetrics.topRankedTime % 60).toString().padStart(2, "0")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  মোট সময়ের {Math.round((progressMetrics.topRankedTime / (exam.time * 60)) * 100)}%
                                </p>
                              </div>
                            </div>

                            <div className="mt-6">
                              <h3 className="text-lg font-medium mb-2">পারফরম্যান্স লেভেল</h3>
                              <div
                                className={`p-4 rounded-lg ${
                                  progressMetrics.performanceLevel === "excellent"
                                    ? "bg-green-50 border-green-200 dark:bg-green-900/20"
                                    : progressMetrics.performanceLevel === "good"
                                      ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20"
                                      : "bg-red-50 border-red-200 dark:bg-red-900/20"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={
                                      progressMetrics.performanceLevel === "excellent"
                                        ? "bg-green-500"
                                        : progressMetrics.performanceLevel === "good"
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                    }
                                  >
                                    {progressMetrics.performanceLevel === "excellent"
                                      ? "উৎকৃষ্ট"
                                      : progressMetrics.performanceLevel === "good"
                                        ? "ভালো"
                                        : "উন্নতি প্রয়োজন"}
                                  </Badge>
                                  <p>
                                    {progressMetrics.performanceLevel === "excellent"
                                      ? "আপনি গড় সময়ের তুলনায় অনেক দ্রুত পরীক্ষা শেষ করেছেন!"
                                      : progressMetrics.performanceLevel === "good"
                                        ? "আপনি গড় সময়ের কাছাকাছি সময়ে পরীক্ষা শেষ করেছেন।"
                                        : "আপনি গড় সময়ের তুলনায় বেশি সময় নিয়েছেন।"}
                                  </p>
                                </div>

                                {progressMetrics.percentile !== undefined && (
                                  <p className="mt-2 text-sm">
                                    আপনি সময়ের দিক থেকে সকল পরীক্ষার্থীর মধ্যে উপরের{" "}
                                    <span className="font-bold">{progressMetrics.percentile}%</span> এর মধ্যে আছেন।
                                  </p>
                                )}

                                <div className="mt-4">
                                  <p className="text-sm">
                                    {progressMetrics.performanceLevel === "excellent"
                                      ? "আপনার গতি অসাধারণ! আপনি দ্রুত সিদ্ধান্ত নিতে পারেন এবং সঠিক উত্তর দিতে পারেন।"
                                      : progressMetrics.performanceLevel === "good"
                                        ? "আপনার গতি ভালো। আপনি সময় ও সঠিকতার মধ্যে ভালো ভারসাম্য বজায় রেখেছেন।"
                                        : "আপনার গতি বাড়ানোর জন্য আরও অনুশীলন করুন। দ্রুত সিদ্ধান্ত নেওয়ার ক্ষমতা বাড়ানো প্রয়োজন।"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>উন্নতির পরামর্শ</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 list-disc pl-5">
                            {progressMetrics.performanceLevel === "excellent" ? (
                              <>
                                <li>আপনার দ্রুত সিদ্ধান্ত নেওয়ার ক্ষমতা বজায় রাখুন</li>
                                <li>আরও জটিল প্রশ্নের উপর ফোকাস করুন</li>
                                <li>আপনার কৌশল অন্যদের সাথে শেয়ার করুন</li>
                              </>
                            ) : progressMetrics.performanceLevel === "good" ? (
                              <>
                                <li>নিয়মিত অনুশীলন চালিয়ে যান</li>
                                <li>সময় ব্যবস্থাপনা আরও উন্নত করুন</li>
                                <li>জটিল প্রশ্নগুলোতে আরও বেশি সময় দিন</li>
                              </>
                            ) : (
                              <>
                                <li>দ্রুত সিদ্ধান্ত নেওয়ার জন্য বেশি অনুশীলন করুন</li>
                                <li>সময় ব্যবস্থাপনা কৌশল শিখুন</li>
                                <li>প্রতিটি প্রশ্নে বেশি সময় না দিয়ে দ্রুত উত্তর দিন</li>
                                <li>মক টেস্ট দিয়ে সময় ব্যবস্থাপনা অনুশীলন করুন</li>
                              </>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">পারফরম্যান্স ডেটা উপলব্ধ নেই</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
