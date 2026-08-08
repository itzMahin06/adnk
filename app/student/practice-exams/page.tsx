"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer } from "lucide-react"
import { StudentHeader } from "@/components/student-header"
import { addWatermark, getCommonPrintStyles, getMathJaxConfig } from "@/utils/print-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, Eye, XCircle } from "lucide-react"
import { parseShortcodes } from "@/utils/shortcode-utils"

interface Question {
  text: string
  options: string[]
  correctOption: string // Binary encoded
}

interface ExamData {
  title: string
  subject: string
  time: number
  totalQuestions: number
  questions: Question[]
}

export default function PracticeExamsPage() {
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [showExam, setShowExam] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [examCompleted, setExamCompleted] = useState(false)
  const [score, setScore] = useState({
    correct: 0,
    wrong: 0,
    total: 0,
  })
  const [timeLeft, setTimeLeft] = useState(0)
  const [showAnswers, setShowAnswers] = useState(false)

  useEffect(() => {
    // Prevent copying
    const handleCopy = (e: ClipboardEvent) => {
      if (showExam && !examCompleted) {
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
  }, [showExam, examCompleted])

  useEffect(() => {
    if (examData && showExam) {
      // Use a small timeout to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        if (window.MathJax) {
          window.MathJax.typesetClear()
          window.MathJax.typeset()
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [examData, showExam, selectedAnswers]) // Added selectedAnswers as a dependency

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string)
        setExamData(jsonData)
      } catch (error) {
        console.error("Error parsing JSON:", error)
        alert("ফাইল পার্স করতে সমস্যা হয়েছে")
      }
    }
    reader.readAsText(file)
  }

  const startExam = () => {
    if (!examData) return
    setShowExam(true)
    setTimeLeft(examData.time * 60) // Convert minutes to seconds
    setSelectedAnswers({})
    setExamCompleted(false)
  }

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    // Only allow selecting if not already selected
    if (selectedAnswers[questionIndex] === undefined) {
      setSelectedAnswers({
        ...selectedAnswers,
        [questionIndex]: optionIndex,
      })

      // Re-render MathJax after state update
      setTimeout(() => {
        if (window.MathJax) {
          window.MathJax.typesetClear()
          window.MathJax.typeset()
        }
      }, 10)
    }
    // No alert message when trying to change answer
  }

  const calculateScore = () => {
    if (!examData) return

    let correct = 0
    let wrong = 0

    examData.questions.forEach((question, index) => {
      const selectedAnswer = selectedAnswers[index]
      // Convert binary string back to number
      const correctOption = Number.parseInt(question.correctOption, 2)

      if (selectedAnswer === correctOption) {
        correct++
      } else if (selectedAnswer !== undefined) {
        wrong++
      }
    })

    setScore({
      correct,
      wrong,
      total: correct - wrong * 0.25,
    })
    setExamCompleted(true)
  }

  const printQuestionsWithAnswers = () => {
    if (!examData) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${examData.title} - প্রশ্নপত্র | এডমিশন নিয়ে খেলছি</title>
      <meta charset="UTF-8">
      ${getCommonPrintStyles()}
      ${getMathJaxConfig()}
      <style>
        /* Additional styles to fix line breaks in math equations */
        .question {
          page-break-inside: avoid;
          margin-bottom: 25px;
          clear: both;
        }
        .question p {
          margin-bottom: 10px;
          white-space: normal;
          word-wrap: break-word;
        }
        .options {
          margin-left: 20px;
          clear: both;
        }
        .option {
          margin: 8px 0;
          display: flex;
          align-items: flex-start;
          clear: both;
        }
        .option-marker {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid #ddd;
          margin-right: 8px;
          flex-shrink: 0;
          position: relative;
          top: 2px;
        }
        .correct .option-marker {
          background-color: #10b981;
          color: white;
          border-color: #10b981;
          font-weight: bold;
        }
        .mjx-chtml {
          display: inline-block !important;
        }
      </style>
    </head>
    <body>
      ${addWatermark()}
      <div class="no-print">
        <button onclick="window.print()">প্রিন্ট করুন</button>
      </div>
      <h1>${examData.title}</h1>
      <div class="exam-info">
        <p><strong>বিষয়:</strong> ${examData.subject}</p>
        <p><strong>সময়:</strong> ${examData.time} মিনিট</p>
        <p><strong>মোট প্রশ্ন:</strong> ${examData.questions.length}</p>
      </div>
      ${examData.questions
        .map((q, index) => {
          // Convert binary string to number
          const correctOption = Number.parseInt(q.correctOption, 2)
          return `
        <div class="question">
          <p><strong>${index + 1}.</strong> ${parseShortcodes(q.text)}</p>
          <div class="options">
            ${q.options
              .map(
                (option, optIndex) => `
              <div class="option ${optIndex === correctOption ? "correct" : ""}">
                <span class="option-marker">${String.fromCharCode(0x0995 + optIndex)}</span>
                <span>${option}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
        })
        .join("")}
      <script>
        // Wait for MathJax to load and then typeset the document
        window.addEventListener('load', function() {
          if (window.MathJax) {
            window.MathJax.typesetPromise().then(() => {
              console.log('MathJax typesetting complete');
            });
          }
        });
      </script>
    </body>
    </html>
  `

    printWindow.document.open()
    printWindow.document.write(content)
    printWindow.document.close()
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StudentHeader title="অনুশীলন পরীক্ষা" />

      <div className="p-6">
        {!examData ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>অনুশীলন পরীক্ষা</CardTitle>
              <CardDescription>পরীক্ষার ফাইল আপলোড করুন</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-file">পরীক্ষার ফাইল</Label>
                  <Input id="exam-file" type="file" accept=".json" onChange={handleFileUpload} />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !showExam ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>{examData.title}</CardTitle>
              <CardDescription>{examData.subject}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">মোট প্রশ্ন:</span>
                  <span className="font-medium">{examData.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">সময়:</span>
                  <span className="font-medium">{examData.time} মিনিট</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={printQuestionsWithAnswers}>
                <Printer className="mr-2 h-4 w-4" />
                প্রিন্ট করুন
              </Button>
              <Button onClick={startExam}>পরীক্ষা শুরু করুন</Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            {!examCompleted ? (
              <>
                <div className="sticky top-16 z-10 bg-background p-4 border rounded-md shadow-sm">
                  <div className="flex justify-between items-center">
                    <h1 className="text-lg font-bold">{examData.title}</h1>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatTime(timeLeft)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {examData.questions.map((question, qIndex) => (
                    <Card key={qIndex} className="no-copy">
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
                                className={`option-circle ${selectedAnswers[qIndex] === optIndex ? "selected" : ""}`}
                                data-option={String.fromCharCode(0x0995 + optIndex)}
                                onClick={() => handleSelectAnswer(qIndex, optIndex)}
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
                        {Object.keys(selectedAnswers).length} / {examData.questions.length}
                      </span>
                    </div>
                    <Button onClick={calculateScore}>পরীক্ষা শেষ করুন</Button>
                  </div>
                </div>
              </>
            ) : (
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>পরীক্ষার ফলাফল</CardTitle>
                  <CardDescription>{examData.title}</CardDescription>
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
                      <span className="text-sm">মোট স্কোর:</span>
                      <span className="font-medium">{score.total}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={printQuestionsWithAnswers}>
                    <Printer className="mr-2 h-4 w-4" />
                    প্রিন্ট করুন
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowAnswers(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      উত্তর দেখুন
                    </Button>
                    <Button
                      onClick={() => {
                        setExamData(null)
                        setShowExam(false)
                        setExamCompleted(false)
                        setSelectedAnswers({})
                      }}
                    >
                      নতুন পরীক্ষা
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </div>
        )}
      </div>
      {showAnswers && examData && (
        <Dialog open={showAnswers} onOpenChange={setShowAnswers}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>পরীক্ষার উত্তরসমূহ</DialogTitle>
              <DialogDescription>{examData.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {examData.questions.map((question, qIndex) => {
                // Convert binary string to number
                const correctOption = Number.parseInt(question.correctOption, 2)
                const selectedAnswer = selectedAnswers[qIndex]
                const isCorrect = selectedAnswer === correctOption

                return (
                  <Card
                    key={qIndex}
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
                                  : optIndex === correctOption
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
                              ) : optIndex === correctOption ? (
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
