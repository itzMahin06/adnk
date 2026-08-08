"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Plus, Trash2, Users } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import type { Course } from "@/lib/models"

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    examBatchDetails: "",
    totalExams: 0,
    price: 0,
    discount: 0,
    discountDeadline: "",
    promoCode: "",
    imageUrl: "",
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const coursesRef = collection(db, "courses")
      const coursesSnapshot = await getDocs(coursesRef)

      const coursesData = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[]

      // Fetch enrollment counts for each course
      const coursesWithEnrollment = await Promise.all(
        coursesData.map(async (course) => {
          try {
            const purchasesQuery = query(
              collection(db, "purchases"),
              where("courseId", "==", course.id),
              where("status", "==", "approved"),
            )
            const purchasesSnapshot = await getDocs(purchasesQuery)
            return {
              ...course,
              enrolledStudents: purchasesSnapshot.size,
            }
          } catch (error) {
            console.error(`Error fetching enrollment for course ${course.id}:`, error)
            return {
              ...course,
              enrolledStudents: 0,
            }
          }
        }),
      )

      setCourses(coursesWithEnrollment)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching courses:", error)
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "totalExams" || name === "price" || name === "discount" ? Number(value) : value,
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      examBatchDetails: "",
      totalExams: 0,
      price: 0,
      discount: 0,
      discountDeadline: "",
      promoCode: "",
      imageUrl: "",
    })
  }

  const handleAddCourse = async () => {
    try {
      if (!formData.name) {
        alert("কোর্সের নাম প্রয়োজন")
        return
      }

      await addDoc(collection(db, "courses"), {
        name: formData.name,
        description: formData.description,
        examBatchDetails: formData.examBatchDetails,
        totalExams: formData.totalExams,
        price: formData.price,
        discount: formData.discount,
        discountDeadline: formData.discountDeadline,
        promoCode: formData.promoCode,
        imageUrl: formData.imageUrl,
        createdAt: new Date().toISOString(),
      })

      resetForm()
      setShowAddDialog(false)
      fetchCourses()
    } catch (error) {
      console.error("Error adding course:", error)
      alert("কোর্স যোগ করতে সমস্যা হয়েছে")
    }
  }

  const handleEditClick = (course: Course) => {
    setCurrentCourse(course)
    setFormData({
      name: course.name,
      description: course.description || "",
      examBatchDetails: course.examBatchDetails || "",
      totalExams: course.totalExams || 0,
      price: course.price || 0,
      discount: course.discount || 0,
      discountDeadline: course.discountDeadline || "",
      promoCode: course.promoCode || "",
      imageUrl: course.imageUrl || "",
    })
    setShowEditDialog(true)
  }

  const handleUpdateCourse = async () => {
    try {
      if (!currentCourse || !formData.name) {
        return
      }

      await updateDoc(doc(db, "courses", currentCourse.id), {
        name: formData.name,
        description: formData.description,
        examBatchDetails: formData.examBatchDetails,
        totalExams: formData.totalExams,
        price: formData.price,
        discount: formData.discount,
        discountDeadline: formData.discountDeadline,
        promoCode: formData.promoCode,
        imageUrl: formData.imageUrl,
      })

      resetForm()
      setShowEditDialog(false)
      setCurrentCourse(null)
      fetchCourses()
    } catch (error) {
      console.error("Error updating course:", error)
      alert("কোর্স আপডেট করতে সমস্যা হয়েছে")
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই কোর্স মুছতে চান?")) {
      try {
        await deleteDoc(doc(db, "courses", courseId))
        setCourses(courses.filter((course) => course.id !== courseId))
      } catch (error) {
        console.error("Error deleting course:", error)
        alert("কোর্স মুছতে সমস্যা হয়েছে")
      }
    }
  }

  const calculateFinalPrice = (price: number, discount: number) => {
    return price - (price * discount) / 100
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="কোর্সসমূহ" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            <span>নতুন কোর্স</span>
          </Button>
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
                  <TableHead>কোর্সের নাম</TableHead>
                  <TableHead className="hidden md:table-cell">মোট পরীক্ষা</TableHead>
                  <TableHead className="hidden md:table-cell">ভর্তি শিক্ষার্থী</TableHead>
                  <TableHead className="hidden md:table-cell">মূল্য</TableHead>
                  <TableHead className="hidden md:table-cell">ছাড়</TableHead>
                  <TableHead className="hidden md:table-cell">চূড়ান্ত মূল্য</TableHead>
                  <TableHead className="hidden md:table-cell">প্রোমো কোড</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{course.totalExams || 0}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-emerald-600">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">{course.enrolledStudents || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">৳{course.price || 0}</TableCell>
                      <TableCell className="hidden md:table-cell">{course.discount || 0}%</TableCell>
                      <TableCell className="hidden md:table-cell">
                        ৳{calculateFinalPrice(course.price || 0, course.discount || 0)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{course.promoCode || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(course)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      কোন কোর্স পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Course Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>নতুন কোর্স যোগ করুন</DialogTitle>
            <DialogDescription>
              কোর্সের বিবরণ দিন। কোর্সের ছবির জন্য ১৬:৯ অনুপাত (যেমন: ১৯২০x১০৮০ বা ১২৮০x৭২০) ব্যবহার করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">কোর্সের নাম *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="কোর্সের নাম লিখুন"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalExams">মোট পরীক্ষা</Label>
                <Input
                  id="totalExams"
                  name="totalExams"
                  type="number"
                  value={formData.totalExams}
                  onChange={handleInputChange}
                  placeholder="মোট পরীক্ষার সংখ্যা"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">বিবরণ</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="কোর্সের বিবরণ লিখুন"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examBatchDetails">পরীক্ষা ব্যাচের বিবরণ</Label>
              <Textarea
                id="examBatchDetails"
                name="examBatchDetails"
                value={formData.examBatchDetails}
                onChange={handleInputChange}
                placeholder="পরীক্ষা ব্যাচের বিবরণ লিখুন"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">মূল্য (৳)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="কোর্সের মূল্য"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">ছাড় (%)</Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={handleInputChange}
                  placeholder="ছাড়ের পরিমাণ"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountDeadline">ছাড়ের শেষ তারিখ</Label>
                <Input
                  id="discountDeadline"
                  name="discountDeadline"
                  type="datetime-local"
                  value={formData.discountDeadline}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promoCode">প্রোমো কোড</Label>
                <Input
                  id="promoCode"
                  name="promoCode"
                  value={formData.promoCode}
                  onChange={handleInputChange}
                  placeholder="প্রোমো কোড"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">কোর্সের ছবি URL (১৬:৯ অনুপাত সুপারিশকৃত)</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/course-image.jpg"
              />
              {formData.imageUrl && (
                <div className="mt-2">
                  <img
                    src={formData.imageUrl || "/placeholder.svg"}
                    alt="Course preview"
                    className="w-full h-32 object-cover rounded-md"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
            </div>
            {formData.price > 0 && formData.discount > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>চূড়ান্ত মূল্য: ৳{calculateFinalPrice(formData.price, formData.discount)}</strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              বাতিল
            </Button>
            <Button onClick={handleAddCourse}>যোগ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>কোর্স সম্পাদনা করুন</DialogTitle>
            <DialogDescription>
              কোর্সের তথ্য আপডেট করুন। কোর্সের ছবির জন্য ১৬:৯ অনুপাত (যেমন: ১৯২০x১০৮০ বা ১২৮০x৭২০) ব্যবহার করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">কোর্সের নাম *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="কোর্সের নাম লিখুন"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-totalExams">মোট পরীক্ষা</Label>
                <Input
                  id="edit-totalExams"
                  name="totalExams"
                  type="number"
                  value={formData.totalExams}
                  onChange={handleInputChange}
                  placeholder="মোট পরীক্ষার সংখ্যা"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">বিবরণ</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="কোর্সের বিবরণ লিখুন"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-examBatchDetails">পরীক্ষা ব্যাচের বিবরণ</Label>
              <Textarea
                id="edit-examBatchDetails"
                name="examBatchDetails"
                value={formData.examBatchDetails}
                onChange={handleInputChange}
                placeholder="পরীক্ষা ব্যাচের বিবরণ লিখুন"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">মূল্য (৳)</Label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="কোর্সের মূল্য"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discount">ছাড় (%)</Label>
                <Input
                  id="edit-discount"
                  name="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={handleInputChange}
                  placeholder="ছাড়ের পরিমাণ"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-discountDeadline">ছাড়ের শেষ তারিখ</Label>
                <Input
                  id="edit-discountDeadline"
                  name="discountDeadline"
                  type="datetime-local"
                  value={formData.discountDeadline}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-promoCode">প্রোমো কোড</Label>
                <Input
                  id="edit-promoCode"
                  name="promoCode"
                  value={formData.promoCode}
                  onChange={handleInputChange}
                  placeholder="প্রোমো কোড"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-imageUrl">কোর্সের ছবি URL (১৬:৯ অনুপাত সুপারিশকৃত)</Label>
              <Input
                id="edit-imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/course-image.jpg"
              />
              {formData.imageUrl && (
                <div className="mt-2">
                  <img
                    src={formData.imageUrl || "/placeholder.svg"}
                    alt="Course preview"
                    className="w-full h-32 object-cover rounded-md"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
            </div>
            {formData.price > 0 && formData.discount > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>চূড়ান্ত মূল্য: ৳{calculateFinalPrice(formData.price, formData.discount)}</strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              বাতিল
            </Button>
            <Button onClick={handleUpdateCourse}>আপডেট করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
