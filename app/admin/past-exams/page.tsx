"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileDown, Printer } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"

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

export default function PastExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPastExams = async () => {
      try {
        const now = new Date()
        const examsRef = collection(db, "exams")
        const examsSnapshot = await getDocs(examsRef)

        const examsData = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Exam[]

        // Filter for past exams (end time is before current time)
        const pastExams = examsData.filter((exam) => {
          const endTime = new Date(exam.endTime)
          return now > endTime
        })

        // Sort by end time (newest first)
        pastExams.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())

        setExams(pastExams)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching past exams:", error)
        setLoading(false)
      }
    }

    fetchPastExams()
  }, [])

  const downloadQuestionsAsJson = (exam: Exam) => {
    // In a real app, you would fetch the questions from Firestore
    // and then download them as JSON
    const dummyQuestions = {
      examId: exam.id,
      title: exam.title,
      questions: [{ id: 1, text: "প্রশ্ন ১", options: ["ক", "খ", "গ", "ঘ"], correctAnswer: "ক" }],
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dummyQuestions, null, 2))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `${exam.title}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const printQuestions = (exam: Exam) => {
    // In a real app, you would open a new window with the questions formatted for printing
    alert("Print functionality would open a new window with formatted questions")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="পূর্বের পরীক্ষাসমূহ" />

      <div className="p-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>শিরোনাম</TableHead>
                  <TableHead className="hidden md:table-cell">বিষয়</TableHead>
                  <TableHead className="hidden md:table-cell">প্রশ্ন সংখ্যা</TableHead>
                  <TableHead className="hidden md:table-cell">সময়</TableHead>
                  <TableHead className="hidden md:table-cell">শেষ হয়েছে</TableHead>
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
                      <TableCell className="hidden md:table-cell">
                        {new Date(exam.endTime).toLocaleDateString("bn-BD")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => downloadQuestionsAsJson(exam)}>
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => printQuestions(exam)}>
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">Print</span>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/results?examId=${exam.id}`}>
                              <FileDown className="h-4 w-4" />
                              <span className="sr-only">Results</span>
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      কোন পূর্বের পরীক্ষা পাওয়া যায়নি
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
