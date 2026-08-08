"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Info, AlertTriangle } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { parseShortcodes } from "@/utils/shortcode-utils"

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

export default function ExamDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(true)
  const [examStarted, setExamStarted] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [hasParticipated, setHasParticipated] = useState(false)
  const [examStartTime, setExamStartTime] = useState<number | null>(null)

  useEffect(() => {
    // Prevent copying
    const handleCopy = (e: ClipboardEvent) => {
      if (examStarted && !examSubmitted) {
        e.preventDefault()
        alert("নকল করার চেষ্টা করবে না। সৎ ভাবে পরীক্ষা দাও")
      }
    }

    document.addEventListener("copy", handleCopy)
    document.addEventListener("cut", handleCopy)

    return () => {
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("cut", handleCopy)
    }
  }, [examStarted, examSubmitted])

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        if (!auth.currentUser) {
          router.push("/login")
          return
        }

        const examRef = doc(db, "exams", params.id)
        const examSnap = await getDoc(examRef)

        if (examSnap.exists()) {
          const examData = { id: examSnap.id, ...examSnap.data() } as Exam

          // Check course access if exam has courseId
          if (examData.courseId) {
            const studentRef = doc(db, "students", auth.currentUser.uid)
            const studentSnap = await getDoc(studentRef)

            let hasAccess = false

            if (studentSnap.exists()) {
              const studentData = studentSnap.data()
              const assignedCourses = studentData.courses || []

              // Check if assigned to course
              if (assignedCourses.includes(examData.courseId)) {
                hasAccess = true
              } else {
                // Check if purchased course
                const purchasesRef = collection(db, "purchases")
                const purchasesQuery = query(
                  purchasesRef,
                  where("studentId", "==", auth.currentUser.uid),
                  where("courseId", "==", examData.courseId),
                  where("status", "==", "approved"),
                )
                const purchasesSnapshot = await getDocs(purchasesQuery)
                hasAccess = !purchasesSnapshot.empty
              }
            }

            if (!hasAccess) {
              router.push("/student/live-exams")
              return
            }
          }

          setExam(examData)
          setTimeLeft(examData.time * 60) // Convert minutes to seconds

          // Check if student has already participated
          const resultsRef = collection(db, "results")
          const resultsQuery = query(
            resultsRef,
            where("examId", "==", params.id),
            where("studentId", "==", auth.currentUser.uid),
          )
          const resultsSnapshot = await getDocs(resultsQuery)

          if (!resultsSnapshot.empty) {
            setHasParticipated(true)
          }
        } else {
          router.push("/student/live-exams")
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching exam details:", error)
        setLoading(false)
      }
    }

    fetchExamDetails()
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
    if (hasParticipated) {
      alert("আপনি ইতিমধ্যে এই পরীক্ষায় অংশগ্রহণ করেছেন")
      router.push("/student/live-exams")
      return
    }

    await fetchQuestions()
    setShowInstructions(false)
    setExamStarted(true)
    setExamStartTime(Date.now()) // Record start time
  }

  // Update the handleSelectAnswer function to silently prevent changing answers
  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    // Only allow selecting if not already selected
    if (selectedAnswers[questionId] === undefined) {
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: optionIndex,
      })
    }
    // No alert message when trying to change answer
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`
  }

  const handleSubmitExam = async () => {
    if (examSubmitted) return

    setExamSubmitted(true)

    try {
      if (!auth.currentUser) {
        router.push("/login")
        return
      }

      // Calculate completion time
      const completionTimeSeconds = examStartTime
        ? Math.floor((Date.now() - examStartTime) / 1000)
        : exam?.time
          ? exam.time * 60
          : 0

      // Calculate score with negative marking
      let correctAnswers = 0
      let wrongAnswers = 0

      questions.forEach((question) => {
        const selectedAnswer = selectedAnswers[question.id]

        if (selectedAnswer === undefined) {
          // No answer selected
        } else if (selectedAnswer === question.correctOption) {
          correctAnswers++
        } else {
          wrongAnswers++
        }
      })

      // Use exam's negative marking if enabled, otherwise no negative marking
      const negativeMark = exam?.negativeMarkingEnabled ? exam?.negativeMark || 0.25 : 0
      const totalScore = correctAnswers - wrongAnswers * negativeMark

      // Save result to Firestore with completion time
      await addDoc(collection(db, "results"), {
        examId: params.id,
        examTitle: exam?.title,
        studentId: auth.currentUser.uid,
        correctAnswers,
        wrongAnswers,
        totalScore,
        answers: selectedAnswers,
        submittedAt: new Date().toISOString(),
        completionTimeSeconds, // Add completion time
        negativeMark, // Store the negative marking used
      })

      // Redirect to results page
      router.push("/student/dashboard")
    } catch (error) {
      console.error("Error submitting exam:", error)
      setExamSubmitted(false)
    }
  }

  useEffect(() => {
    if (questions.length > 0) {
      // Use a small timeout to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        if (window.MathJax) {
          window.MathJax.typesetClear()
          window.MathJax.typeset()
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [questions])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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
        <Button variant="outline" className="mt-4" onClick={() => router.push("/student/live-exams")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          ফিরে যান
        </Button>
      </div>
    )
  }

  if (hasParticipated) {
    return (
      <div className="flex min-h-screen flex-col">
        <StudentHeader title={exam.title} />

        <div className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>অংশগ্রহণ করা হয়েছে</AlertTitle>
            <AlertDescription>
              আপনি ইতিমধ্যে এই পরীক্ষায় অংশগ্রহণ করেছেন। একজন শিক্ষার্থী একটি পরীক্ষায় শুধুমাত্র একবার অংশগ্রহণ করতে পারেন।
            </AlertDescription>
          </Alert>

          <Button variant="outline" className="mt-4" onClick={() => router.push("/student/live-exams")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            লাইভ পরীক্ষায় ফিরে যান
          </Button>
        </div>
      </div>
    )
  }

  if (showInstructions) {
    return (
      <div className="flex min-h-screen flex-col">
        <StudentHeader title={exam.title} />

        <div className="p-6">
          <div className="flex flex-col gap-4">
            <Button variant="outline" className="w-fit" onClick={() => router.push("/student/live-exams")}>
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
                  <Badge>লাইভ</Badge>
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
                        <p>৪. পরীক্ষা শেষ হওয়ার পর ফলাফল প্রকাশিত হবে।</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={startExam} className="w-full">
                  পরীক্ষা শুরু করুন
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
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
              <Button onClick={handleSubmitExam} disabled={examSubmitted}>
                {examSubmitted ? "জমা হচ্ছে..." : "পরীক্ষা জমা দিন"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
