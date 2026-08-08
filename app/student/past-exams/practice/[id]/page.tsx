"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Info, AlertTriangle } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { parseShortcodes } from "@/utils/shortcode-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, Eye, XCircle } from "lucide-react"

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
  startTime: string
  endTime: string
  instructions: string
  courseId?: string
  negativeMark?: number
  negativeMarkingEnabled?: boolean // Add this field
}

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
}

export default function PracticeExamPage() {
  const router = useRouter()
  const params = useParams()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(true)
  const [examStarted, setExamStarted] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [examStartTime, setExamStartTime] = useState<number | null>(null)
  const [score, setScore] = useState({
    correct: 0,
    wrong: 0,
    total: 0,
  })
  const [showAnswers, setShowAnswers] = useState(false)

  useEffect(() => {
    const checkAccessAndFetchExam = async () => {
      try {
        if (!auth.currentUser) {
          router.push("/login")
          return
        }

        // Get exam details
        const examRef = doc(db, "exams", params.id as string)
        const examSnap = await getDoc(examRef)

        if (!examSnap.exists()) {
          router.push("/student/past-exams")
          return
        }

        const examData = { id: examSnap.id, ...examSnap.data() } as Exam
        setExam(examData)
        setTimeLeft(examData.time * 60)

        // Check if user has access to this course
        if (examData.courseId) {
          const studentRef = doc(db, "students", auth.currentUser.uid)
          const studentSnap = await getDoc(studentRef)

          if (studentSnap.exists()) {
            const studentData = studentSnap.data()
            const assignedCourses = studentData.courses || []

            // Check if student has purchased this course
            const purchasesRef = collection(db, "purchases")
            const purchasesQuery = query(
              purchasesRef,
              where("studentId", "==", auth.currentUser.uid),
              where("courseId", "==", examData.courseId),
              where("status", "==", "approved"),
            )
            const purchasesSnapshot = await getDocs(purchasesQuery)
            const hasPurchased = !purchasesSnapshot.empty

            if (assignedCourses.includes(examData.courseId) || hasPurchased) {
              setHasAccess(true)
            } else {
              setHasAccess(false)
            }
          } else {
            setHasAccess(false)
          }
        } else {
          // No course restriction, allow access
          setHasAccess(true)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking access:", error)
        setLoading(false)
      }
    }

    checkAccessAndFetchExam()
  }, [params.id, router])

  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (examStarted && timeLeft === 0) {
      handleSubmitExam()
    }
  }, [examStarted, timeLeft])

  const fetchQuestions = async () => {
    try {
      const questionsRef = collection(db, "questions")
      const q = query(questionsRef, where("examId", "==", params.id))
      const questionsSnapshot = await getDocs(q)

      const questionsData = questionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[]

      setQuestions(questionsData)
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const startExam = async () => {
    await fetchQuestions()
    setShowInstructions(false)
    setExamStarted(true)
    setExamStartTime(Date.now())
  }

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    if (selectedAnswers[questionId] === undefined) {
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: optionIndex,
      })

      setTimeout(() => {
        if (window.MathJax) {
          window.MathJax.typesetClear()
          window.MathJax.typeset()
        }
      }, 10)
    }
  }

  const handleSubmitExam = () => {
    if (examSubmitted) return
    setExamSubmitted(true)

    let correct = 0
    let wrong = 0

    questions.forEach((question) => {
      const selectedAnswer = selectedAnswers[question.id]
      if (selectedAnswer === question.correctOption) {
        correct++
      } else if (selectedAnswer !== undefined) {
        wrong++
      }
    })

    // Use exam's negative marking if enabled, otherwise no negative marking
    const negativeMark = exam?.negativeMarkingEnabled ? exam?.negativeMark || 0.25 : 0
    const total = correct - wrong * negativeMark

    setScore({
      correct,
      wrong,
      total,
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`
  }

  useEffect(() => {
    if (questions.length > 0) {
      const timer = setTimeout(() => {
        if (window.MathJax) {
          window.MathJax.typesetClear()
          window.MathJax.typeset()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [questions, selectedAnswers])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col">
        <StudentHeader title="অ্যাক্সেস নিষেধ" />
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>অ্যাক্সেস নিষেধ</AlertTitle>
            <AlertDescription>এই পরীক্ষায় অংশগ্রহণের জন্য আপনাকে সংশ্লিষ্ট কোর্স কিনতে হবে।</AlertDescription>
          </Alert>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/student/past-exams")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            ফিরে যান
          </Button>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>ত্রুটি</AlertTitle>
          <AlertDescription>পরীক্ষা খুঁজে পাওয়া যায়নি</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/student/past-exams")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          ফিরে যান
        </Button>
      </div>
    )
  }

  if (showInstructions) {
    return (
      <div className="flex min-h-screen flex-col">
        <StudentHeader title={exam.title} />
        <div className="p-6">
          <div className="flex flex-col gap-4">
            <Button variant="outline" className="w-fit" onClick={() => router.push("/student/past-exams")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              ফিরে যান
            </Button>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{exam.title}</CardTitle>
                    <CardDescription>{exam.subject}</CardDescription>
                  </div>
                  <Badge variant="secondary">অনুশীলন</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">মোট প্রশ্ন</p>
                    <p className="font-medium">{exam.totalQuestions}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">সময়</p>
                    <p className="font-medium">{exam.time} মিনিট</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">মোট মার্ক</p>
                    <p className="font-medium">{exam.totalQuestions}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">নেগেটিভ মার্ক</p>
                    <p className="font-medium">{exam.negativeMarkingEnabled ? exam.negativeMark || 0.25 : "বন্ধ"}</p>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4" />
                    <h3 className="font-medium">নির্দেশাবলী</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {exam.instructions ? (
                      <p className="whitespace-pre-line">{exam.instructions}</p>
                    ) : (
                      <>
                        <p>১. প্রতিটি সঠিক উত্তরের জন্য ১ নম্বর পাবেন।</p>
                        <p>
                          ২.{" "}
                          {exam.negativeMarkingEnabled
                            ? `প্রতিটি ভুল উত্তরের জন্য ${exam.negativeMark || 0.25} নম্বর কাটা যাবে।`
                            : "ভুল উত্তরের জন্য কোন নম্বর কাটা যাবে না।"}
                        </p>
                        <p>৩. একবার উত্তর নির্বাচন করলে পরিবর্তন করা যাবে না।</p>
                        <p>৪. এটি একটি অনুশীলন পরীক্ষা।</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={startExam} className="w-full">
                  অনুশীলন শুরু করুন
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (examSubmitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <StudentHeader title="অনুশীলনের ফলাফল" />
        <div className="p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>অনুশীলনের ফলাফল</CardTitle>
              <CardDescription>{exam.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">সঠিক উত্তর:</span>
                  <span className="font-medium">{score.correct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">ভুল উত্তর:</span>
                  <span className="font-medium">{score.wrong}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">নেগেটিভ মার্ক:</span>
                  <span className="font-medium">{exam.negativeMarkingEnabled ? exam.negativeMark || 0.25 : "বন্ধ"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">মোট স্কোর:</span>
                  <span className="font-medium">{score.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowAnswers(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  উত্তর দেখুন
                </Button>
                <Button onClick={() => router.push("/student/past-exams")}>ফিরে যান</Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {showAnswers && (
          <Dialog open={showAnswers} onOpenChange={setShowAnswers}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>পরীক্ষার উত্তরসমূহ</DialogTitle>
                <DialogDescription>{exam.title}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {questions.map((question, qIndex) => {
                  const selectedAnswer = selectedAnswers[question.id]
                  const isCorrect = selectedAnswer === question.correctOption

                  return (
                    <Card
                      key={question.id}
                      className={isCorrect ? "border-green-500" : selectedAnswer !== undefined ? "border-red-500" : ""}
                    >
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
              <DialogFooter>
                <Button onClick={() => setShowAnswers(false)}>বন্ধ করুন</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StudentHeader title={exam.title} />
      <div className="p-6">
        <div className="flex flex-col gap-4">
          <div className="sticky top-16 z-10 bg-background p-4 border rounded-md shadow-sm">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-bold">{exam.title}</h1>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <Card key={question.id} className="no-copy">
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
                          className={`option-circle ${selectedAnswers[question.id] === optIndex ? "selected" : ""}`}
                          data-option={String.fromCharCode(0x0995 + optIndex)}
                          onClick={() => handleSelectAnswer(question.id, optIndex)}
                        >
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
            ))}
          </div>

          <div className="sticky bottom-0 z-10 bg-background p-4 border rounded-md shadow-sm mt-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-muted-foreground">উত্তর দেওয়া হয়েছে:</span>
                <span className="ml-2 font-medium">
                  {Object.keys(selectedAnswers).length} / {questions.length}
                </span>
              </div>
              <Button onClick={handleSubmitExam}>অনুশীলন শেষ করুন</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
