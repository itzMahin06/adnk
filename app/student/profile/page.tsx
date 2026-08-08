"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasswordInput } from "@/components/password-input"
import { updatePassword } from "firebase/auth"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { StudentHeader } from "@/components/student-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { User, Shield, FileText, ShoppingCart, Star, Award, Hash } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Purchase } from "@/lib/models"
import { InvoiceModal } from "@/components/invoice-modal"
import { Printer } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatRollNumber } from "@/utils/roll-number-utils"

interface Student {
  fullName: string
  email: string
  college: string
  hscBatch: string
  paidBatch: string
  rollNumber: string
}

interface ExamResult {
  id: string
  examId: string
  examTitle: string
  correctAnswers: number
  wrongAnswers: number
  totalScore: number
  submittedAt: string
  leaderboardPublished?: boolean
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("personal")
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paidBatch, setPaidBatch] = useState("")
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [examResults, setExamResults] = useState<ExamResult[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([])
  const [loadingPurchases, setLoadingPurchases] = useState(true)

  const router = useRouter()

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        if (!auth.currentUser) return

        const studentRef = doc(db, "students", auth.currentUser.uid)
        const studentSnap = await getDoc(studentRef)

        if (studentSnap.exists()) {
          const studentData = studentSnap.data() as Student
          setStudent(studentData)
          setPaidBatch(studentData.paidBatch)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching student data:", error)
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [])

  useEffect(() => {
    const fetchExamResults = async () => {
      try {
        if (!auth.currentUser) return

        setLoadingExams(true)

        // Fetch results for this student
        const resultsRef = collection(db, "results")
        const resultsQuery = query(resultsRef, where("studentId", "==", auth.currentUser.uid))
        const resultsSnapshot = await getDocs(resultsQuery)

        const resultsData = resultsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ExamResult[]

        // Sort by submission date (newest first)
        resultsData.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

        setExamResults(resultsData)
        setLoadingExams(false)
      } catch (error) {
        console.error("Error fetching exam results:", error)
        setLoadingExams(false)
      }
    }

    if (activeTab === "exams") {
      fetchExamResults()
    }
  }, [activeTab])

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        if (!auth.currentUser) return

        setLoadingPurchases(true)

        const purchasesRef = collection(db, "purchases")
        const purchasesQuery = query(purchasesRef, where("studentId", "==", auth.currentUser.uid))
        const purchasesSnapshot = await getDocs(purchasesQuery)

        const purchasesData = purchasesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Purchase[]

        // Sort by purchase date (newest first)
        purchasesData.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())

        setPurchaseHistory(purchasesData)
        setLoadingPurchases(false)
      } catch (error) {
        console.error("Error fetching purchase history:", error)
        setLoadingPurchases(false)
      }
    }

    if (activeTab === "purchases") {
      fetchPurchaseHistory()
    }
  }, [activeTab])

  const handleUpdatePaidBatch = async () => {
    if (!auth.currentUser || !student) return

    setSaving(true)

    try {
      const studentRef = doc(db, "students", auth.currentUser.uid)
      await updateDoc(studentRef, {
        paidBatch,
      })

      // Update local state
      setStudent({
        ...student,
        paidBatch,
      })

      toast({
        title: "সফল",
        description: "পেইড ব্যাচের নাম সফলভাবে আপডেট করা হয়েছে",
      })
    } catch (error) {
      console.error("Error updating paid batch:", error)
      toast({
        title: "ত্রুটি",
        description: "পেইড ব্যাচের নাম আপডেট করতে সমস্যা হয়েছে",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!auth.currentUser) return

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "ত্রুটি",
        description: "নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না",
        variant: "destructive",
      })
      return
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "ত্রুটি",
        description: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      await updatePassword(auth.currentUser, passwords.newPassword)

      // Reset form
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "সফল",
        description: "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে",
      })
    } catch (error) {
      console.error("Error updating password:", error)
      toast({
        title: "ত্রুটি",
        description: "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে। আবার লগইন করে চেষ্টা করুন।",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 dark:from-slate-900 dark:via-blue-950/20 dark:to-purple-950/20 flex items-center justify-center">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-lg"></div>
          <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-blue-300 opacity-20"></div>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 dark:from-slate-900 dark:via-blue-950/20 dark:to-purple-950/20">
        <StudentHeader title="প্রোফাইল" />
        <div className="p-6">
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>ত্রুটি</CardTitle>
              <CardDescription>শিক্ষার্থীর তথ্য পাওয়া যায়নি</CardDescription>
            </CardHeader>
            <CardContent>
              <p>আপনার অ্যাকাউন্টে সমস্যা আছে। অনুগ্রহ করে আবার লগইন করুন।</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "personal":
        return <User className="h-4 w-4" />
      case "security":
        return <Shield className="h-4 w-4" />
      case "exams":
        return <FileText className="h-4 w-4" />
      case "purchases":
        return <ShoppingCart className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 dark:from-slate-900 dark:via-blue-950/20 dark:to-purple-950/20">
      <StudentHeader title="প্রোফাইল" />

      <div className="p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 p-6 md:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-white/30 shadow-xl">
                  <AvatarImage src={auth.currentUser?.photoURL || ""} alt={student.fullName} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-white/20 text-white font-bold">
                    {student.fullName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-400 border-4 border-white flex items-center justify-center">
                  <Star className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold">{student.fullName}</h1>
                <p className="text-white/80 text-sm md:text-base">{student.email}</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {student.rollNumber && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      <Hash className="h-3 w-3 mr-1" />
                      {formatRollNumber(student.rollNumber)}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {student.college}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {student.hscBatch}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger
              value="personal"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              {getTabIcon("personal")}
              <span className="hidden sm:inline">ব্যক্তিগত তথ্য</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              {getTabIcon("security")}
              <span className="hidden sm:inline">নিরাপত্তা</span>
            </TabsTrigger>
            <TabsTrigger
              value="exams"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              {getTabIcon("exams")}
              <span className="hidden sm:inline">পরীক্ষাসমূহ</span>
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              {getTabIcon("purchases")}
              <span className="hidden sm:inline">ক্রয়ের ইতিহাস</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                  <User className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-xl">ব্যক্তিগত তথ্য</CardTitle>
                    <CardDescription className="text-blue-100">আপনার ব্যক্তিগত তথ্য দেখুন এবং আপডেট করুন</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-6 p-4 border rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <Avatar className="h-20 w-20 ring-4 ring-blue-200 dark:ring-blue-800">
                    <AvatarImage src={auth.currentUser?.photoURL || ""} alt={student.fullName} />
                    <AvatarFallback className="text-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                      {student.fullName
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{student.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    {student.rollNumber && (
                      <div className="flex items-center gap-1 mt-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <p className="text-sm font-mono text-muted-foreground">
                          {formatRollNumber(student.rollNumber)}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">প্রোফাইল ছবি Google অ্যাকাউন্ট থেকে আসে</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">পূর্ণ নাম</Label>
                    <Input
                      id="fullName"
                      value={student.fullName}
                      readOnly
                      disabled
                      className="bg-gray-50 dark:bg-gray-900"
                    />
                    <p className="text-xs text-muted-foreground">নাম পরিবর্তন করতে অ্যাডমিনের সাথে যোগাযোগ করুন</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input id="email" value={student.email} readOnly disabled className="bg-gray-50 dark:bg-gray-900" />
                    <p className="text-xs text-muted-foreground">ইমেইল পরিবর্তন করা যাবে না</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rollNumber">রোল নম্বর</Label>
                    <Input
                      id="rollNumber"
                      value={student.rollNumber ? formatRollNumber(student.rollNumber) : ""}
                      readOnly
                      disabled
                      className="bg-gray-50 dark:bg-gray-900 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">রোল নম্বর স্বয়ংক্রিয়ভাবে তৈরি হয়েছে</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="college">কলেজের নাম</Label>
                    <Input
                      id="college"
                      value={student.college}
                      readOnly
                      disabled
                      className="bg-gray-50 dark:bg-gray-900"
                    />
                    <p className="text-xs text-muted-foreground">কলেজের নাম পরিবর্তন করতে অ্যাডমিনের সাথে যোগাযোগ করুন</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hscBatch">এইচএসসি ব্যাচ</Label>
                    <Input
                      id="hscBatch"
                      value={student.hscBatch}
                      readOnly
                      disabled
                      className="bg-gray-50 dark:bg-gray-900"
                    />
                    <p className="text-xs text-muted-foreground">এইচএসসি ব্যাচ পরিবর্তন করতে অ্যাডমিনের সাথে যোগাযোগ করুন</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paidBatch">পেইড ব্যাচের নাম</Label>
                    <Input
                      id="paidBatch"
                      value={paidBatch}
                      onChange={(e) => setPaidBatch(e.target.value)}
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-muted-foreground">আপনি পেইড ব্যাচের নাম আপডেট করতে পারেন</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleUpdatePaidBatch}
                  disabled={saving || paidBatch === student.paidBatch}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                >
                  {saving ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-xl">পাসওয়ার্ড পরিবর্তন</CardTitle>
                    <CardDescription className="text-green-100">আপনার অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন করুন</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">বর্তমান পাসওয়ার্ড</Label>
                    <PasswordInput
                      id="currentPassword"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      placeholder="বর্তমান পাসওয়ার্ড"
                      className="border-green-200 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">নতুন পাসওয়ার্ড</Label>
                    <PasswordInput
                      id="newPassword"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      placeholder="নতুন পাসওয়ার্ড"
                      className="border-green-200 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="নতুন পাসওয়ার্ড আবার লিখুন"
                      className="border-green-200 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handlePasswordChange}
                  disabled={
                    saving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword
                  }
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {saving ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="exams" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-xl">অংশগ্রহণকৃত পরীক্ষাসমূহ</CardTitle>
                    <CardDescription className="text-orange-100">আপনার অংশগ্রহণকৃত পরীক্ষাসমূহ দেখুন</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loadingExams ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="relative">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                      <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full border-4 border-orange-300 opacity-20"></div>
                    </div>
                  </div>
                ) : examResults.length > 0 ? (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
                          <TableHead className="font-bold">পরীক্ষার নাম</TableHead>
                          <TableHead className="text-center font-bold">সঠিক</TableHead>
                          <TableHead className="text-center font-bold">ভুল</TableHead>
                          <TableHead className="text-center font-bold">স্কোর</TableHead>
                          <TableHead className="text-center font-bold">তারিখ</TableHead>
                          <TableHead className="text-center font-bold">স্ট্যাটাস</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {examResults.map((result) => (
                          <TableRow
                            key={result.id}
                            className="hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-red-50/50 dark:hover:from-orange-950/10 dark:hover:to-red-950/10"
                          >
                            <TableCell className="font-medium">
                              {result.leaderboardPublished ? (
                                <Link
                                  href={`/student/result/${result.examId}`}
                                  className="hover:underline text-blue-600 dark:text-blue-400"
                                >
                                  {result.examTitle}
                                </Link>
                              ) : (
                                result.examTitle
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.leaderboardPublished ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  {result.correctAnswers}
                                </Badge>
                              ) : (
                                <span
                                  className="font-medium cursor-help text-muted-foreground"
                                  onClick={() => {
                                    toast({
                                      title: "ফলাফল প্রকাশিত হয়নি",
                                      description: "ফলাফল প্রকাশিত হওয়ার পর তুমি তোমার মার্ক দেখতে পারবে",
                                      variant: "default",
                                    })
                                  }}
                                >
                                  ***
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.leaderboardPublished ? (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                  {result.wrongAnswers}
                                </Badge>
                              ) : (
                                <span
                                  className="font-medium cursor-help text-muted-foreground"
                                  onClick={() => {
                                    toast({
                                      title: "ফলাফল প্রকাশ হয়নি",
                                      description: "ফলাফল প্রকাশিত হওয়ার পর তুমি তোমার মার্ক দেখতে পারবে",
                                      variant: "default",
                                    })
                                  }}
                                >
                                  ***
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.leaderboardPublished ? (
                                <Badge className="bg-gradient-to-r from-orange-400 to-red-400 text-white font-bold">
                                  {result.totalScore}
                                </Badge>
                              ) : (
                                <span
                                  className="font-medium cursor-help text-muted-foreground"
                                  onClick={() => {
                                    toast({
                                      title: "ফলাফল প্রকাশ হয়নি",
                                      description: "ফলাফল প্রকাশিত হওয়ার পর তুমি তোমার মার্ক দেখতে পারবে",
                                      variant: "default",
                                    })
                                  }}
                                >
                                  ***
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {new Date(result.submittedAt).toLocaleDateString("bn-BD")}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.leaderboardPublished ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  প্রকাশিত
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                  অপ্রকাশিত
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950/30 dark:to-red-950/30 flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">কোন পরীক্ষা নেই</h3>
                    <p className="text-gray-600 dark:text-gray-400">আপনি এখনো কোন পরীক্ষায় অংশগ্রহণ করেননি</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-xl">ক্রয়ের ইতিহাস</CardTitle>
                    <CardDescription className="text-purple-100">আপনার সকল ক্রয়ের তথ্য দেখুন</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loadingPurchases ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="relative">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                      <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full border-4 border-purple-300 opacity-20"></div>
                    </div>
                  </div>
                ) : purchaseHistory.length > 0 ? (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                          <TableHead className="font-bold">কোর্স</TableHead>
                          <TableHead className="text-center font-bold">মূল্য</TableHead>
                          <TableHead className="text-center font-bold">পেমেন্ট</TableHead>
                          <TableHead className="text-center font-bold">স্ট্যাটাস</TableHead>
                          <TableHead className="text-center font-bold">তারিখ</TableHead>
                          <TableHead className="text-center font-bold">ইনভয়েস</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseHistory.map((purchase) => (
                          <TableRow
                            key={purchase.id}
                            className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-purple-950/10 dark:hover:to-pink-950/10"
                          >
                            <TableCell className="font-medium">{purchase.courseName}</TableCell>
                            <TableCell className="text-center">
                              <div className="space-y-1">
                                {purchase.discountAmount > 0 && (
                                  <div className="text-xs text-muted-foreground line-through">
                                    ৳{purchase.originalPrice}
                                  </div>
                                )}
                                <div className="font-bold">৳{purchase.finalPrice}</div>
                                {purchase.couponCode && (
                                  <Badge variant="outline" className="text-xs">
                                    {purchase.couponCode}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={
                                  purchase.paymentMethod === "bkash"
                                    ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                                    : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                }
                              >
                                {purchase.paymentMethod === "bkash" ? "বিকাশ" : "নগদ"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={
                                  purchase.status === "approved"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : purchase.status === "rejected"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                }
                              >
                                {purchase.status === "approved"
                                  ? "অনুমোদিত"
                                  : purchase.status === "rejected"
                                    ? "প্রত্যাখ্যাত"
                                    : "অপেক্ষমাণ"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {new Date(purchase.purchaseDate).toLocaleDateString("bn-BD")}
                            </TableCell>
                            <TableCell className="text-center">
                              <InvoiceModal purchase={purchase}>
                                <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                                  <Printer className="h-4 w-4" />
                                  ইনভয়েস
                                </Button>
                              </InvoiceModal>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="h-8 w-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">কোন ক্রয় নেই</h3>
                    <p className="text-gray-600 dark:text-gray-400">আপনি এখনো কোন কোর্স ক্রয় করেননি</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}
