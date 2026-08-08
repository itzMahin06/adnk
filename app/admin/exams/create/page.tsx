"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Save, Trash2, Upload } from "lucide-react"
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

export default function CreateExamPage() {
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
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      text: "",
      options: ["", "", "", ""],
      correctOption: 0,
      explanation: "",
    },
  ])
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<any[]>([])

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesRef = collection(db, "courses")
        const coursesSnapshot = await getDocs(coursesRef)
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setCourses(coursesData)
      } catch (error) {
        console.error("Error fetching courses:", error)
      }
    }

    fetchCourses()
  }, [])

  // Function to handle file upload
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
              id: (index + 1).toString(),
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
      id: (questions.length + 1).toString(),
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
    setLoading(true)

    try {
      // Validate form
      if (!examData.title || !examData.subject || !examData.time || !examData.startTime || !examData.endTime) {
        alert("সব প্রয়োজনীয় ক্ষেত্র পূরণ করুন")
        setLoading(false)
        return
      }

      // Validate questions
      const invalidQuestions = questions.some((q) => !q.text || q.options.some((opt) => !opt))

      if (invalidQuestions) {
        alert("সব প্রশ্ন এবং অপশন পূরণ করুন")
        setLoading(false)
        return
      }

      // Create exam in Firestore
      const examRef = await addDoc(collection(db, "exams"), {
        ...examData,
        totalQuestions: questions.length,
        negativeMark: examData.negativeMarkingEnabled ? Number(examData.negativeMark) : 0,
        negativeMarkingEnabled: examData.negativeMarkingEnabled,
        createdAt: new Date().toISOString(),
      })

      // Add questions to Firestore
      const questionsRef = collection(db, "questions")

      for (const question of questions) {
        await addDoc(questionsRef, {
          examId: examRef.id,
          text: question.text,
          options: question.options,
          correctOption: question.correctOption,
          explanation: question.explanation || "",
        })
      }

      router.push("/admin/exams")
    } catch (error) {
      console.error("Error creating exam:", error)
      alert("পরীক্ষা তৈরি করতে সমস্যা হয়েছে")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="নতুন পরীক্ষা তৈরি করুন" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-1">
            <Save className="h-4 w-4" />
            <span>{loading ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}</span>
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="upload" className="cursor-pointer">
              <div className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                <span>আপলোড</span>
              </div>
            </Label>
            <Input type="file" id="upload" className="hidden" accept=".json" onChange={handleFileUpload} />
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
