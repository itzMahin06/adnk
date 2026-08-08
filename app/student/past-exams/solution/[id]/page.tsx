"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { parseShortcodes } from "@/utils/shortcode-utils"

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
  explanation?: string
}

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
  instructions?: string
}

export default function ExamSolutionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        // Fetch exam data
        const examRef = doc(db, "exams", params.id)
        const examSnap = await getDoc(examRef)

        if (!examSnap.exists()) {
          router.push("/student/past-exams")
          return
        }

        const examData = examSnap.data()
        setExam({
          id: examSnap.id,
          title: examData.title,
          subject: examData.subject,
          totalQuestions: examData.totalQuestions,
          time: examData.time,
          instructions: examData.instructions,
        })

        // Fetch questions
        const questionsRef = collection(db, "questions")
        const q = query(questionsRef, where("examId", "==", params.id))
        const questionsSnap = await getDocs(q)

        const questionsData = questionsSnap.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text || "",
          options: doc.data().options || [],
          correctOption: doc.data().correctOption || 0,
          explanation: doc.data().explanation || "",
        }))

        setQuestions(questionsData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching exam data:", error)
        setLoading(false)
      }
    }

    fetchExamData()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <StudentHeader title="পরীক্ষার সমাধান" />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex min-h-screen flex-col">
        <StudentHeader title="পরীক্ষার সমাধান" />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">পরীক্ষা পাওয়া যায়নি</h2>
            <p className="text-muted-foreground mb-4">এই পরীক্ষাটি খুঁজে পাওয়া যায়নি বা অ্যাক্সেস করার অনুমতি নেই।</p>
            <Button onClick={() => router.push("/student/past-exams")}>ফিরে যান</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StudentHeader title={`${exam.title} - সমাধান`} />

      <div className="p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push("/student/past-exams")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ফিরে যান
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{exam.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">বিষয়:</span>
                  <span>{exam.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">মোট প্রশ্ন:</span>
                  <span>{exam.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">সময়:</span>
                  <span>{exam.time} মিনিট</span>
                </div>
                {exam.instructions && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">নির্দেশাবলী:</h3>
                    <p className="text-sm">{exam.instructions}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        প্রশ্ন {index + 1}: <span dangerouslySetInnerHTML={{ __html: parseShortcodes(question.text) }} />
                      </h3>
                      <div className="space-y-2 ml-4">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded ${
                              optIndex === question.correctOption
                                ? "bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                : "bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className={`w-6 h-6 rounded-full border flex items-center justify-center mt-0.5 ${
                                  optIndex === question.correctOption
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {String.fromCharCode(0x0995 + optIndex)}
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: parseShortcodes(option) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {question.explanation && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">ব্যাখ্যা:</h4>
                        <div
                          className="text-sm"
                          dangerouslySetInnerHTML={{ __html: parseShortcodes(question.explanation) }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
