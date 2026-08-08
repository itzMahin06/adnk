"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs, doc, deleteDoc, query, where, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Edit, Plus, Printer, Trash2, Upload } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { addWatermark, getCommonPrintStyles, getMathJaxConfig } from "@/utils/print-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Exam {
  id: string
  title: string
  subject: string
  totalQuestions: number
  time: number
  startTime: string
  endTime: string
  customLink?: string
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState(false)

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        const examsData = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Exam[]

        // Sort by start time (newest first)
        examsData.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

        setExams(examsData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching exams:", error)
        setLoading(false)
      }
    }

    fetchExams()
  }, [])

  const handleDelete = async (examId: string) => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই পরীক্ষা মুছতে চান?")) {
      try {
        await deleteDoc(doc(db, "exams", examId))
        setExams(exams.filter((exam) => exam.id !== examId))
      } catch (error) {
        console.error("Error deleting exam:", error)
      }
    }
  }

  const getExamStatus = (exam: Exam) => {
    const now = new Date()
    const startTime = new Date(exam.startTime)
    const endTime = new Date(exam.endTime)

    if (now < startTime) {
      return <Badge variant="outline">আসন্ন</Badge>
    } else if (now >= startTime && now <= endTime) {
      return <Badge variant="default">চলমান</Badge>
    } else {
      return <Badge variant="secondary">সম্পন্ন</Badge>
    }
  }

  const downloadQuestionsAsJson = async (exam: Exam) => {
    try {
      // Fetch questions for this exam
      const questionsRef = collection(db, "questions")
      const q = query(questionsRef, where("examId", "==", exam.id))
      const questionsSnapshot = await getDocs(q)

      const questions = questionsSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          text: data.text,
          options: data.options,
          // Convert correct answer to binary string for more efficient storage
          correctOption: (data.correctOption >>> 0).toString(2),
          explanation: data.explanation || "",
        }
      })

      // Include full exam details in the main exam section
      const examData = {
        title: exam.title,
        subject: exam.subject,
        time: exam.time,
        totalQuestions: questions.length,
        questions: questions,
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(examData, null, 2))
      const downloadAnchorNode = document.createElement("a")
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", `${exam.title.replace(/\s+/g, "-")}.json`)
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    } catch (error) {
      console.error("Error downloading questions:", error)
      alert("প্রশ্ন ডাউনলোড করতে সমস্যা হয়েছে")
    }
  }

  const printQuestions = async (exam: Exam) => {
    try {
      // Fetch questions for this exam
      const questionsRef = collection(db, "questions")
      const q = query(questionsRef, where("examId", "==", exam.id))
      const questionsSnapshot = await getDocs(q)

      const questions = questionsSnapshot.docs.map((doc) => {
        return {
          text: doc.data().text,
          options: doc.data().options,
          correctOption: doc.data().correctOption,
          explanation: doc.data().explanation || "",
        }
      })

      const printWindow = window.open("", "_blank")
      if (!printWindow) return

      const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${exam.title} - প্রশ্নপত্র | এডমিশন নিয়ে খেলছি</title>
        <meta charset="UTF-8">
        ${getCommonPrintStyles()}
        ${getMathJaxConfig()}
      </head>
      <body>
        ${addWatermark()}
        <div class="no-print">
          <button onclick="window.print()">প্রিন্ট করুন</button>
        </div>
        <h1>${exam.title}</h1>
        <div class="exam-info">
          <p><strong>বিষয়:</strong> ${exam.subject}</p>
          <p><strong>সময়:</strong> ${exam.time} মিনিট</p>
          <p><strong>মোট প্রশ্ন:</strong> ${questions.length}</p>
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
                    <span class="option-marker">${String.fromCharCode(0x0995 + optIndex)}</span>
                    ${option}
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
    } catch (error) {
      console.error("Error printing questions:", error)
      alert("প্রশ্ন প্রিন্ট করতে সমস্যা হয়েছে")
    }
  }

  const handleFullExamUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadLoading(true)

    try {
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string)

          // Validate the JSON structure
          if (!jsonData.title || !jsonData.subject || !jsonData.time || !Array.isArray(jsonData.questions)) {
            alert("অবৈধ JSON ফাইল। অনুগ্রহ করে সঠিক ফরম্যাট ব্যবহার করুন।")
            setUploadLoading(false)
            return
          }

          // Create exam in Firestore
          const examData = {
            title: jsonData.title,
            subject: jsonData.subject,
            time: jsonData.time,
            totalQuestions: jsonData.questions.length,
            startTime: jsonData.startTime || new Date().toISOString(),
            endTime: jsonData.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            customLink: jsonData.customLink || "",
            instructions: jsonData.instructions || "",
            createdAt: new Date().toISOString(),
          }

          const examRef = await addDoc(collection(db, "exams"), examData)

          // Add questions to Firestore
          const questionsRef = collection(db, "questions")

          for (const question of jsonData.questions) {
            // Convert correctOption from binary string if needed
            const correctOption =
              typeof question.correctOption === "string" && /^[01]+$/.test(question.correctOption)
                ? Number.parseInt(question.correctOption, 2)
                : question.correctOption || 0

            await addDoc(questionsRef, {
              examId: examRef.id,
              text: question.text || "",
              options: question.options || ["", "", "", ""],
              correctOption: correctOption,
              explanation: question.explanation || "",
            })
          }

          // Refresh the exams list
          const examsRef = collection(db, "exams")
          const examsSnapshot = await getDocs(examsRef)
          const examsData = examsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Exam[]
          examsData.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          setExams(examsData)

          alert("পরীক্ষা সফলভাবে আপলোড করা হয়েছে!")
        } catch (error) {
          console.error("Error parsing or uploading JSON:", error)
          alert("JSON পার্স করতে বা আপলোড করতে সমস্যা হয়েছে")
        } finally {
          setUploadLoading(false)
        }
      }

      reader.readAsText(file)
    } catch (error) {
      console.error("Error reading file:", error)
      alert("ফাইল পড়তে সমস্যা হয়েছে")
      setUploadLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="পরীক্ষাসমূহ" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href="/admin/exams/create">
              <Button className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>নতুন পরীক্ষা</span>
              </Button>
            </Link>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-1">
                  <Upload className="h-4 w-4" />
                  <span>সম্পূর্ণ পরীক্ষা আপলোড</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>সম্পূর্ণ পরীক্ষা আপলোড করুন</DialogTitle>
                  <DialogDescription>একটি JSON ফাইল আপলোড করুন যাতে পরীক্ষার সমস্ত তথ্য এবং প্রশ্ন রয়েছে।</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullExamUpload">JSON ফাইল নির্বাচন করুন</Label>
                    <Input
                      id="fullExamUpload"
                      type="file"
                      accept=".json"
                      onChange={handleFullExamUpload}
                      disabled={uploadLoading}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>JSON ফাইলের ফরম্যাট:</p>
                    <pre className="mt-2 rounded bg-slate-100 p-2 text-xs">
                      {`{
  "title": "পরীক্ষার শিরোনাম",
  "subject": "বিষয়",
  "time": 60,
  "startTime": "2023-01-01T00:00:00.000Z",
  "endTime": "2023-01-02T00:00:00.000Z",
  "customLink": "custom-link",
  "instructions": "নির্দেশাবলী",
  "questions": [
    {
      "text": "প্রশ্ন টেক্সট",
      "options": ["অপশন ১", "অপশন ২", "অপশন ৩", "অপশন ৪"],
      "correctOption": 0,
      "explanation": "ব্যাখ্যা (ঐচ্ছিক)"
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">বাতিল</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>শিরোনাম</TableHead>
                  <TableHead className="hidden md:table-cell">বিষয়</TableHead>
                  <TableHead className="hidden md:table-cell">প্রশ্ন সংখ্যা</TableHead>
                  <TableHead className="hidden md:table-cell">সময়</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.length > 0 ? (
                  exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell className="hidden md:table-cell">{exam.subject}</TableCell>
                      <TableCell className="hidden md:table-cell">{exam.totalQuestions}</TableCell>
                      <TableCell className="hidden md:table-cell">{exam.time} মিনিট</TableCell>
                      <TableCell>{getExamStatus(exam)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/exams/${exam.id}`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => downloadQuestionsAsJson(exam)}>
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => printQuestions(exam)}>
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">Print</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      কোন পরীক্ষা পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
