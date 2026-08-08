"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, getDoc, getDocs, query, updateDoc, where, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Save, Trash2 } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
  explanation?: string
}

export default function EditExamPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("details")
  const [examData, setExamData] = useState({
    title: "",
    subject: "",
    courseId: "",
    totalQuestions: 0,
    time: 0,
    startTime: "",
    endTime: "",
    customLink: "",
    instructions: "",
    negativeMark: 0.25, // Default negative marking
    negativeMarkingEnabled: true, // Add this new field
  })
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courses, setCourses] = useState<any[]>([])

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        // Fetch exam data
        const examRef = doc(db, "exams", params.id)
        const examSnap = await getDoc(examRef)

        if (!examSnap.exists()) {
          router.push("/admin/exams")
          return
        }

        const examData = examSnap.data()
        setExamData({
          title: examData.title || "",
          subject: examData.subject || "",
          courseId: examData.courseId || "",
          totalQuestions: examData.totalQuestions || 0,
          time: examData.time || 0,
          startTime: examData.startTime || "",
          endTime: examData.endTime || "",
          customLink: examData.customLink || "",
          instructions: examData.instructions || "",
          negativeMark: examData.negativeMark || 0.25,
          negativeMarkingEnabled:
            examData.negativeMarkingEnabled !== undefined ? examData.negativeMarkingEnabled : true,
        })

        // Fetch courses
        const coursesRef = collection(db, "courses")
        const coursesSnapshot = await getDocs(coursesRef)
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setCourses(coursesData)

        // Fetch questions
        const questionsRef = collection(db, "questions")
        const q = query(questionsRef, where("examId", "==", params.id))
        const questionsSnap = await getDocs(q)

        const questionsData = questionsSnap.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text || "",
          options: doc.data().options || ["", "", "", ""],
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

  const handleExamDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setExamData((prev) => ({ ...prev, [name]: value }))
  }

  const handleQuestionChange = (questionId: string, field: string, value: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)))
  }

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, idx) => (idx === optionIndex ? value : opt)),
            }
          : q,
      ),
    )
  }

  const handleCorrectOptionChange = (questionId: string, optionIndex: number) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, correctOption: optionIndex } : q)))
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `new-${questions.length + 1}`,
      text: "",
      options: ["", "", "", ""],
      correctOption: 0,
      explanation: "",
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (questionId: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== questionId))
    }
  }

  const handleSubmit = async () => {
    setSaving(true)

    try {
      // Validate form
      if (!examData.title || !examData.subject || !examData.time || !examData.startTime || !examData.endTime) {
        alert("সব প্রয়োজনীয় ক্ষেত্র পূরণ করুন")
        setSaving(false)
        return
      }

      // Validate questions
      const invalidQuestions = questions.some((q) => !q.text || q.options.some((opt) => !opt))

      if (invalidQuestions) {
        alert("সব প্রশ্ন এবং অপশন পূরণ করুন")
        setSaving(false)
        return
      }

      // Update exam in Firestore
      const examRef = doc(db, "exams", params.id)
      await updateDoc(examRef, {
        ...examData,
        totalQuestions: questions.length,
        negativeMark: examData.negativeMarkingEnabled ? Number(examData.negativeMark) : 0,
        negativeMarkingEnabled: examData.negativeMarkingEnabled,
        updatedAt: new Date().toISOString(),
      })

      // Update questions in Firestore
      for (const question of questions) {
        if (question.id.startsWith("new-")) {
          // Add new question - fixed by using addDoc instead of updateDoc
          await addDoc(collection(db, "questions"), {
            examId: params.id,
            text: question.text,
            options: question.options,
            correctOption: question.correctOption,
            explanation: question.explanation || "",
          })
        } else {
          // Update existing question
          const questionRef = doc(db, "questions", question.id)
          await updateDoc(questionRef, {
            text: question.text,
            options: question.options,
            correctOption: question.correctOption,
            explanation: question.explanation || "",
          })
        }
      }

      router.push("/admin/exams")
    } catch (error) {
      console.error("Error updating exam:", error)
      alert("পরীক্ষা আপডেট করতে সমস্যা হয়েছে")
    } finally {
      setSaving(false)
    }
  }

  // Function to download questions as JSON (only questions, options, and answers)
  const downloadQuestionsAsJson = () => {
    const questionsData = questions.map((q) => ({
      text: q.text,
      options: q.options,
      correctOption: (q.correctOption >>> 0).toString(2),
      explanation: q.explanation || "",
    }))

    const jsonData = JSON.stringify(questionsData, null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${examData.title.replace(/\s+/g, "-")}-questions.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Function to handle file upload (only questions, options, and answers)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string)
        if (Array.isArray(jsonData)) {
          const newQuestions = jsonData.map((q, index) => {
            // Check if correctOption is a binary string and convert it
            const correctOption =
              typeof q.correctOption === "string" && /^[01]+$/.test(q.correctOption)
                ? Number.parseInt(q.correctOption, 2)
                : q.correctOption || 0

            return {
              id: `new-${index}`,
              text: q.text || "",
              options: q.options || ["", "", "", ""],
              correctOption: correctOption,
              explanation: q.explanation || "",
            }
          })
          setQuestions(newQuestions)
        }
      } catch (error) {
        console.error("Error parsing JSON:", error)
        alert("ফাইল পার্স করতে সমস্যা হয়েছে")
      }
    }
    reader.readAsText(file)
  }

  // Function to print questions with answers
  const printQuestionsWithAnswers = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${examData.title} - প্রশ্নপত্র | এডমিশন নিয়ে খেলছি</title>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700&display=swap" />
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <script>
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\\$$', '\\\$$']],
              displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
              processEscapes: true,
              processEnvironments: true
            },
            options: {
              ignoreHtmlClass: 'tex2jax_ignore',
              processHtmlClass: 'tex2jax_process'
            }
          };
        </script>
        <style>
          body {
            font-family: 'Noto Serif Bengali', Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
          }
          h1 {
            text-align: center;
            margin-bottom: 20px;
          }
          .exam-info {
            margin-bottom: 30px;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
          }
          .questions-container {
            column-count: 2;
            column-gap: 20px;
          }
          .question {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 25px;
          }
          .options {
            margin-left: 20px;
          }
          .option {
            margin: 5px 0;
          }
          .correct {
            font-weight: bold;
            color: green;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()">প্রিন্ট করুন</button>
        </div>
        <h1>${examData.title}</h1>
        <div class="exam-info">
          <p><strong>বিষয়:</strong> ${examData.subject}</p>
          <p><strong>সময়:</strong> ${examData.time} মিনিট</p>
          <p><strong>মোট প্রশ্ন:</strong> ${questions.length}</p>
          <p><strong>নেগেটিভ মার্ক:</strong> ${examData.negativeMarkingEnabled ? examData.negativeMark : "বন্ধ"}</p>
          ${examData.instructions ? `<p><strong>নির্দেশাবলী:</strong> ${examData.instructions}</p>` : ""}
        </div>
        <div class="questions-container">
          ${questions
            .map(
              (q, index) => `
            <div class="question">
              <p><strong>${index + 1}.</strong> ${q.text}</p>
              <div class="options">
                ${q.options
                  .map(
                    (option, optIndex) => `
                  <div class="option ${optIndex === q.correctOption ? "correct" : ""}">
                    ${String.fromCharCode(0x0995 + optIndex)}. ${option}
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(content)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AdminHeader title="পরীক্ষা সম্পাদনা" />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="পরীক্ষা সম্পাদনা" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button onClick={handleSubmit} disabled={saving} className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              <span>{saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}</span>
            </Button>
            <Button variant="outline" onClick={downloadQuestionsAsJson} className="flex items-center gap-1">
              <span>প্রশ্ন ডাউনলোড করুন</span>
            </Button>
            <Button variant="outline" onClick={printQuestionsWithAnswers} className="flex items-center gap-1">
              <span>প্রিন্ট করুন</span>
            </Button>
          </div>
          <div>
            <Input type="file" accept=".json" onChange={handleFileUpload} className="hidden" id="question-upload" />
            <label htmlFor="question-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>প্রশ্ন আপলোড করুন</span>
              </Button>
            </label>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">মূল তথ্য</TabsTrigger>
            <TabsTrigger value="instructions">নির্দেশাবলী</TabsTrigger>
            <TabsTrigger value="questions">প্রশ্নসমূহ</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">পরীক্ষার শিরোনাম</Label>
                <Input
                  id="title"
                  name="title"
                  value={examData.title}
                  onChange={handleExamDataChange}
                  placeholder="পরীক্ষার শিরোনাম লিখুন"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">বিষয়</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={examData.subject}
                  onChange={handleExamDataChange}
                  placeholder="বিষয় লিখুন"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseId">কোর্স</Label>
                <Select
                  value={examData.courseId}
                  onValueChange={(value) => setExamData((prev) => ({ ...prev, courseId: value }))}
                >
                  <SelectTrigger id="courseId">
                    <SelectValue placeholder="কোর্স নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">সময় (মিনিট)</Label>
                <Input
                  id="time"
                  name="time"
                  type="number"
                  value={examData.time}
                  onChange={handleExamDataChange}
                  placeholder="পরীক্ষার সময় (মিনিট)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="negativeMarkingEnabled">নেগেটিভ মার্কিং</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="negativeMarkingEnabled"
                    checked={examData.negativeMarkingEnabled}
                    onChange={(e) =>
                      setExamData((prev) => ({
                        ...prev,
                        negativeMarkingEnabled: e.target.checked,
                        negativeMark: e.target.checked ? prev.negativeMark : 0,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="negativeMarkingEnabled" className="text-sm font-normal">
                    নেগেটিভ মার্কিং চালু করুন
                  </Label>
                </div>
                {examData.negativeMarkingEnabled && (
                  <div className="mt-2">
                    <Label htmlFor="negativeMark">নেগেটিভ মার্ক</Label>
                    <Input
                      id="negativeMark"
                      name="negativeMark"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={examData.negativeMark}
                      onChange={handleExamDataChange}
                      placeholder="নেগেটিভ মার্ক (যেমন: 0.25)"
                    />
                    <p className="text-xs text-muted-foreground">
                      প্রতিটি ভুল উত্তরের জন্য কত নম্বর কাটা হবে (যেমন: 0.25 মানে ১/৪ নম্বর কাটা)
                    </p>
                  </div>
                )}
                {!examData.negativeMarkingEnabled && (
                  <p className="text-xs text-muted-foreground text-green-600">
                    নেগেটিভ মার্কিং বন্ধ - ভুল উত্তরের জন্য কোন নম্বর কাটা হবে না
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customLink">কাস্টম লিংক (ঐচ্ছিক)</Label>
                <Input
                  id="customLink"
                  name="customLink"
                  value={examData.customLink}
                  onChange={handleExamDataChange}
                  placeholder="কাস্টম লিংক (ঐচ্ছিক)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">শুরুর সময়</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  value={examData.startTime}
                  onChange={handleExamDataChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">শেষের সময়</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  value={examData.endTime}
                  onChange={handleExamDataChange}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="instructions">পরীক্ষার নির্দেশাবলী</Label>
              <Textarea
                id="instructions"
                name="instructions"
                value={examData.instructions}
                onChange={handleExamDataChange}
                placeholder="পরীক্ষার নির্দেশাবলী লিখুন"
                className="min-h-[200px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6 pt-4">
            {questions.map((question, qIndex) => (
              <Card key={question.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">প্রশ্ন {qIndex + 1}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(question.id)}
                      disabled={questions.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove Question</span>
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}`}>প্রশ্ন</Label>
                      <Textarea
                        id={`question-${question.id}`}
                        value={question.text}
                        onChange={(e) => handleQuestionChange(question.id, "text", e.target.value)}
                        placeholder="প্রশ্ন লিখুন"
                      />
                      <p className="text-xs text-muted-foreground">
                        ছবি যোগ করতে: [img: https://example.com/image.jpg] ফরম্যাট ব্যবহার করুন
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label>অপশনসমূহ</Label>
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className={`w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer ${
                                question.correctOption === optIndex
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-input"
                              }`}
                              onClick={() => handleCorrectOptionChange(question.id, optIndex)}
                            >
                              {String.fromCharCode(0x0995 + optIndex)}
                            </div>
                            <Input
                              value={option}
                              onChange={(e) => handleOptionChange(question.id, optIndex, e.target.value)}
                              placeholder={`অপশন ${String.fromCharCode(0x0995 + optIndex)}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                      <Label htmlFor={`explanation-${question.id}`}>ব্যাখ্যা</Label>
                      <Textarea
                        id={`explanation-${question.id}`}
                        value={question.explanation || ""}
                        onChange={(e) => handleQuestionChange(question.id, "explanation", e.target.value)}
                        placeholder="প্রশ্নের ব্যাখ্যা লিখুন (ঐচ্ছিক)"
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        ছবি যোগ করতে: [img: https://example.com/image.jpg] ফরম্যাট ব্যবহার করুন
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addQuestion} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>নতুন প্রশ্ন যোগ করুন</span>
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
