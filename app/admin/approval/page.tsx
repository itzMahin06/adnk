"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, query, where, arrayUnion } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Check, Eye, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AdminHeader } from "@/components/admin-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Purchase } from "@/lib/models"

interface Student {
  id: string
  fullName: string
  email: string
  college: string
  hscBatch: string
  paidBatch: string
  approved: boolean
  createdAt: string
  purchasedCourses: string[]
  courses: string[]
}

export default function ApprovalPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [pendingStudents, setPendingStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [courses, setCourses] = useState<string[]>([])

  useEffect(() => {
    const fetchPendingStudents = async () => {
      try {
        const studentsRef = collection(db, "students")
        const pendingQuery = query(studentsRef, where("approved", "==", false))
        const pendingSnapshot = await getDocs(pendingQuery)

        const pendingData = pendingSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Student[]

        setPendingStudents(pendingData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching pending students:", error)
        setLoading(false)
      }
    }

    const fetchPurchases = async () => {
      try {
        const purchasesRef = collection(db, "purchases")
        const pendingQuery = query(purchasesRef, where("status", "==", "pending"))
        const pendingSnapshot = await getDocs(pendingQuery)

        const purchasesData = pendingSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Purchase[]

        // Sort by purchase date (newest first)
        purchasesData.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())

        setPurchases(purchasesData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching purchases:", error)
        setLoading(false)
      }
    }

    fetchPendingStudents()
    fetchPurchases()
  }, [])

  const handleApprovePurchase = async (purchase: Purchase) => {
    try {
      // Update purchase status
      const purchaseRef = doc(db, "purchases", purchase.id)
      await updateDoc(purchaseRef, {
        status: "approved",
        approvedDate: new Date().toISOString(),
      })

      // Add course to student's purchased courses
      const studentRef = doc(db, "students", purchase.studentId)
      await updateDoc(studentRef, {
        purchasedCourses: arrayUnion(purchase.courseId),
        courses: arrayUnion(purchase.courseId), // Also add to regular courses for access
      })

      // Update local state
      setPurchases(purchases.filter((p) => p.id !== purchase.id))
      setShowDetails(false)
    } catch (error) {
      console.error("Error approving purchase:", error)
    }
  }

  const handleRejectPurchase = async (purchaseId: string) => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই ক্রয়ের অনুরোধ প্রত্যাখ্যান করতে চান?")) {
      try {
        const purchaseRef = doc(db, "purchases", purchaseId)
        await updateDoc(purchaseRef, {
          status: "rejected",
        })

        // Update local state
        setPurchases(purchases.filter((p) => p.id !== purchaseId))
      } catch (error) {
        console.error("Error rejecting purchase:", error)
      }
    }
  }

  const handleApprove = async (studentId: string) => {
    try {
      const studentRef = doc(db, "students", studentId)
      await updateDoc(studentRef, {
        approved: true,
        courses: arrayUnion(...courses),
      })

      // Update local state
      setPendingStudents(pendingStudents.filter((student) => student.id !== studentId))
      setShowDetails(false)
    } catch (error) {
      console.error("Error approving student:", error)
    }
  }

  const handleReject = async (studentId: string) => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই শিক্ষার্থীর অনুরোধ প্রত্যাখ্যান করতে চান?")) {
      try {
        // In a real app, you might want to move this to a "rejected" collection
        // instead of just updating the status
        const studentRef = doc(db, "students", studentId)
        await updateDoc(studentRef, {
          approved: false,
          rejected: true,
        })

        // Update local state
        setPendingStudents(pendingStudents.filter((student) => student.id !== studentId))
      } catch (error) {
        console.error("Error rejecting student:", error)
      }
    }
  }

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setShowDetails(true)
  }

  const handleStudentViewDetails = (student: Student) => {
    setSelectedStudent(student)
    setShowDetails(true)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="অনুমোদন" />

      <div className="p-6">
        <Tabs defaultValue="purchases" className="w-full">
          <TabsList>
            <TabsTrigger value="purchases">কোর্স ক্রয়ের অনুরোধ</TabsTrigger>
            <TabsTrigger value="students">শিক্ষার্থী অনুমোদন</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold">কোর্স ক্রয়ের অনুরোধসমূহ</h2>
                {purchases.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {purchases.length}
                  </Badge>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শিক্ষার্থী</TableHead>
                      <TableHead>কোর্স</TableHead>
                      <TableHead className="hidden md:table-cell">মূল্য</TableHead>
                      <TableHead className="hidden md:table-cell">পেমেন্ট পদ্ধতি</TableHead>
                      <TableHead className="hidden md:table-cell">ট্রানজেকশন আইডি</TableHead>
                      <TableHead className="hidden md:table-cell">তারিখ</TableHead>
                      <TableHead>অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.length > 0 ? (
                      purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{purchase.studentName}</div>
                              <div className="text-sm text-muted-foreground">{purchase.studentEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{purchase.courseName}</TableCell>
                          <TableCell className="hidden md:table-cell">৳{purchase.finalPrice}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">{purchase.paymentMethod === "bkash" ? "bKash" : "Nagad"}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{purchase.transactionId}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(purchase.purchaseDate).toLocaleDateString("bn-BD")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => handleViewDetails(purchase)}
                              >
                                <Eye className="h-4 w-4" />
                                <span>বিস্তারিত</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => handleApprovePurchase(purchase)}
                              >
                                <Check className="h-4 w-4" />
                                <span>অনুমোদন</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-destructive"
                                onClick={() => handleRejectPurchase(purchase.id)}
                              >
                                <X className="h-4 w-4" />
                                <span>বাতিল</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          কোন অপেক্ষমান ক্রয়ের অনুরোধ নেই
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold">শিক্ষার্থী অনুমোদন</h2>
                {pendingStudents.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingStudents.length}
                  </Badge>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>নাম</TableHead>
                      <TableHead>ইমেইল</TableHead>
                      <TableHead className="hidden md:table-cell">কলেজ</TableHead>
                      <TableHead className="hidden md:table-cell">এইচএসসি ব্যাচ</TableHead>
                      <TableHead className="hidden md:table-cell">পেইড ব্যাচ</TableHead>
                      <TableHead className="hidden md:table-cell">রেজিস্ট্রেশন তারিখ</TableHead>
                      <TableHead>অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingStudents.length > 0 ? (
                      pendingStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.fullName}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell className="hidden md:table-cell">{student.college}</TableCell>
                          <TableCell className="hidden md:table-cell">{student.hscBatch}</TableCell>
                          <TableCell className="hidden md:table-cell">{student.paidBatch}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(student.createdAt).toLocaleDateString("bn-BD")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => handleStudentViewDetails(student)}
                              >
                                <Eye className="h-4 w-4" />
                                <span>বিস্তারিত</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => handleApprove(student.id)}
                              >
                                <Check className="h-4 w-4" />
                                <span>অনুমোদন</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-destructive"
                                onClick={() => handleReject(student.id)}
                              >
                                <X className="h-4 w-4" />
                                <span>বাতিল</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          কোন অপেক্ষমান অনুমোদন নেই
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Details Dialog */}
      {selectedPurchase && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ক্রয়ের বিস্তারিত তথ্য</DialogTitle>
              <DialogDescription>ক্রয়ের সম্পূর্ণ তথ্য দেখুন</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium">শিক্ষার্থীর নাম</h3>
                  <p className="text-sm">{selectedPurchase.studentName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">ইমেইল</h3>
                  <p className="text-sm">{selectedPurchase.studentEmail}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">কোর্সের নাম</h3>
                  <p className="text-sm">{selectedPurchase.courseName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">মূল মূল্য</h3>
                  <p className="text-sm">৳{selectedPurchase.originalPrice}</p>
                </div>
                {selectedPurchase.discountAmount > 0 && (
                  <div>
                    <h3 className="text-sm font-medium">ছাড়</h3>
                    <p className="text-sm">৳{selectedPurchase.discountAmount}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium">চূড়ান্ত মূল্য</h3>
                  <p className="text-sm font-bold">৳{selectedPurchase.finalPrice}</p>
                </div>
                {selectedPurchase.promoCode && (
                  <div>
                    <h3 className="text-sm font-medium">প্রোমো কোড</h3>
                    <p className="text-sm">{selectedPurchase.promoCode}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium">পেমেন্ট পদ্ধতি</h3>
                  <p className="text-sm">{selectedPurchase.paymentMethod === "bkash" ? "bKash" : "Nagad"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">শিক্ষার্থীর মোবাইল</h3>
                  <p className="text-sm">{selectedPurchase.studentPhone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">ট্রানজেকশন আইডি</h3>
                  <p className="text-sm">{selectedPurchase.transactionId}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">ক্রয়ের তারিখ</h3>
                  <p className="text-sm">{new Date(selectedPurchase.purchaseDate).toLocaleDateString("bn-BD")}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                বন্ধ করুন
              </Button>
              <Button onClick={() => handleApprovePurchase(selectedPurchase)}>অনুমোদন করুন</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Student Details Dialog */}
      {selectedStudent && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>শিক্ষার্থীর বিস্তারিত তথ্য</DialogTitle>
              <DialogDescription>রেজিস্ট্রেশন তথ্য দেখুন এবং কোর্স বরাদ্দ করুন</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium">পূর্ণ নাম</h3>
                  <p className="text-sm">{selectedStudent.fullName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">ইমেইল</h3>
                  <p className="text-sm">{selectedStudent.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">কলেজ</h3>
                  <p className="text-sm">{selectedStudent.college}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">এইচএসসি ব্যাচ</h3>
                  <p className="text-sm">{selectedStudent.hscBatch}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">পেইড ব্যাচ</h3>
                  <p className="text-sm">{selectedStudent.paidBatch}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">রেজিস্ট্রেশন তারিখ</h3>
                  <p className="text-sm">{new Date(selectedStudent.createdAt).toLocaleDateString("bn-BD")}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                বন্ধ করুন
              </Button>
              <Button onClick={() => handleApprove(selectedStudent.id)}>অনুমোদন করুন</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
