"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Edit, Plus, Trash2, Copy } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import type { Coupon, Course } from "@/lib/models"

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 0,
    minPurchaseAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    userLimit: 1,
    validFrom: "",
    validUntil: "",
    isActive: true,
    applicableCourses: [] as string[],
  })

  useEffect(() => {
    fetchCoupons()
    fetchCourses()
  }, [])

  const fetchCoupons = async () => {
    try {
      const couponsRef = collection(db, "coupons")
      const couponsSnapshot = await getDocs(couponsRef)

      const couponsData = couponsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Coupon[]

      // Sort by creation date (newest first)
      couponsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setCoupons(couponsData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching coupons:", error)
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const coursesRef = collection(db, "courses")
      const coursesSnapshot = await getDocs(coursesRef)

      const coursesData = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[]

      setCourses(coursesData)
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCourseSelection = (courseId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      applicableCourses: checked
        ? [...prev.applicableCourses, courseId]
        : prev.applicableCourses.filter((id) => id !== courseId),
    }))
  }

  const resetForm = () => {
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: 0,
      minPurchaseAmount: 0,
      maxDiscountAmount: 0,
      usageLimit: 0,
      userLimit: 1,
      validFrom: "",
      validUntil: "",
      isActive: true,
      applicableCourses: [],
    })
  }

  const generateCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData((prev) => ({ ...prev, code: result }))
  }

  const handleAddCoupon = async () => {
    try {
      if (!formData.code || !formData.validFrom || !formData.validUntil) {
        toast({
          title: "ত্রুটি",
          description: "সব প্রয়োজনীয় তথ্য পূরণ করুন",
          variant: "destructive",
        })
        return
      }

      if (!auth.currentUser) {
        toast({
          title: "ত্রুটি",
          description: "আপনি লগইন করা নেই",
          variant: "destructive",
        })
        return
      }

      // Check if coupon code already exists
      const existingCouponQuery = query(collection(db, "coupons"), where("code", "==", formData.code.toUpperCase()))
      const existingCouponSnapshot = await getDocs(existingCouponQuery)

      if (!existingCouponSnapshot.empty) {
        toast({
          title: "ত্রুটি",
          description: "এই কুপন কোড ইতিমধ্যে বিদ্যমান",
          variant: "destructive",
        })
        return
      }

      await addDoc(collection(db, "coupons"), {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        minPurchaseAmount: formData.minPurchaseAmount || 0,
        maxDiscountAmount: formData.maxDiscountAmount || 0,
        usageLimit: formData.usageLimit || 0,
        usedCount: 0,
        userLimit: formData.userLimit || 1,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        isActive: formData.isActive,
        applicableCourses: formData.applicableCourses,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid,
      })

      toast({
        title: "সফল",
        description: "কুপন সফলভাবে যোগ করা হয়েছে",
      })

      resetForm()
      setShowAddDialog(false)
      fetchCoupons()
    } catch (error) {
      console.error("Error adding coupon:", error)
      toast({
        title: "ত্রুটি",
        description: "কুপন যোগ করতে সমস্যা হয়েছে",
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (coupon: Coupon) => {
    setCurrentCoupon(coupon)
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minPurchaseAmount: coupon.minPurchaseAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || 0,
      usageLimit: coupon.usageLimit || 0,
      userLimit: coupon.userLimit || 1,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      isActive: coupon.isActive,
      applicableCourses: coupon.applicableCourses || [],
    })
    setShowEditDialog(true)
  }

  const handleUpdateCoupon = async () => {
    try {
      if (!currentCoupon || !formData.code || !formData.validFrom || !formData.validUntil) {
        return
      }

      await updateDoc(doc(db, "coupons", currentCoupon.id), {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        minPurchaseAmount: formData.minPurchaseAmount || 0,
        maxDiscountAmount: formData.maxDiscountAmount || 0,
        usageLimit: formData.usageLimit || 0,
        userLimit: formData.userLimit || 1,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        isActive: formData.isActive,
        applicableCourses: formData.applicableCourses,
      })

      toast({
        title: "সফল",
        description: "কুপন সফলভাবে আপডেট করা হয়েছে",
      })

      resetForm()
      setShowEditDialog(false)
      setCurrentCoupon(null)
      fetchCoupons()
    } catch (error) {
      console.error("Error updating coupon:", error)
      toast({
        title: "ত্রুটি",
        description: "কুপন আপডেট করতে সমস্যা হয়েছে",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCoupon = async (couponId: string) => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই কুপন মুছতে চান?")) {
      try {
        await deleteDoc(doc(db, "coupons", couponId))
        setCoupons(coupons.filter((coupon) => coupon.id !== couponId))
        toast({
          title: "সফল",
          description: "কুপন সফলভাবে মুছে ফেলা হয়েছে",
        })
      } catch (error) {
        console.error("Error deleting coupon:", error)
        toast({
          title: "ত্রুটি",
          description: "কুপন মুছতে সমস্যা হয়েছে",
          variant: "destructive",
        })
      }
    }
  }

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "কপি হয়েছে",
      description: "কুপন কোড ক্লিপবোর্ডে কপি হয়েছে",
    })
  }

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  const isNotStarted = (validFrom: string) => {
    return new Date(validFrom) > new Date()
  }

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.isActive) {
      return <Badge variant="secondary">নিষ্ক্রিয়</Badge>
    }
    if (isExpired(coupon.validUntil)) {
      return <Badge variant="destructive">মেয়াদ শেষ</Badge>
    }
    if (isNotStarted(coupon.validFrom)) {
      return <Badge variant="outline">শীঘ্রই</Badge>
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return <Badge variant="destructive">সীমা শেষ</Badge>
    }
    return <Badge variant="default">সক্রিয়</Badge>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="কুপন কোড" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            <span>নতুন কুপন</span>
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
                  <TableHead>কুপন কোড</TableHead>
                  <TableHead className="hidden md:table-cell">ছাড়</TableHead>
                  <TableHead className="hidden md:table-cell">ব্যবহার</TableHead>
                  <TableHead className="hidden md:table-cell">মেয়াদ</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length > 0 ? (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{coupon.code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCouponCode(coupon.code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `৳${coupon.discountValue}`}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {coupon.usageLimit ? `${coupon.usedCount}/${coupon.usageLimit}` : coupon.usedCount}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          <div>{new Date(coupon.validFrom).toLocaleDateString("bn-BD")}</div>
                          <div className="text-muted-foreground">
                            {new Date(coupon.validUntil).toLocaleDateString("bn-BD")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(coupon)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(coupon)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCoupon(coupon.id)}>
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
                      কোন কুপন পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Coupon Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>নতুন কুপন যোগ করুন</DialogTitle>
            <DialogDescription>কুপন কোডের বিবরণ দিন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">কুপন কোড *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="কুপন কোড লিখুন"
                    className="uppercase"
                  />
                  <Button type="button" variant="outline" onClick={generateCouponCode}>
                    জেনারেট
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountType">ছাড়ের ধরন *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) => handleSelectChange("discountType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">শতাংশ (%)</SelectItem>
                    <SelectItem value="fixed">নির্দিষ্ট পরিমাণ (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  ছাড়ের পরিমাণ * {formData.discountType === "percentage" ? "(%)" : "(৳)"}
                </Label>
                <Input
                  id="discountValue"
                  name="discountValue"
                  type="number"
                  min="0"
                  max={formData.discountType === "percentage" ? "100" : undefined}
                  value={formData.discountValue}
                  onChange={handleInputChange}
                  placeholder={formData.discountType === "percentage" ? "10" : "100"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPurchaseAmount">সর্বনিম্ন ক্রয় পরিমাণ (৳)</Label>
                <Input
                  id="minPurchaseAmount"
                  name="minPurchaseAmount"
                  type="number"
                  min="0"
                  value={formData.minPurchaseAmount}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>

            {formData.discountType === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="maxDiscountAmount">সর্বোচ্চ ছাড় পরিমাণ (৳)</Label>
                <Input
                  id="maxDiscountAmount"
                  name="maxDiscountAmount"
                  type="number"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={handleInputChange}
                  placeholder="0 (সীমাহীন)"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usageLimit">মোট ব্যবহারের সীমা</Label>
                <Input
                  id="usageLimit"
                  name="usageLimit"
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={handleInputChange}
                  placeholder="0 (সীমাহীন)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userLimit">প্রতি ব্যবহারকারীর সীমা</Label>
                <Input
                  id="userLimit"
                  name="userLimit"
                  type="number"
                  min="1"
                  value={formData.userLimit}
                  onChange={handleInputChange}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">শুরুর তারিখ *</Label>
                <Input
                  id="validFrom"
                  name="validFrom"
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">শেষ তারিখ *</Label>
                <Input
                  id="validUntil"
                  name="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>প্রযোজ্য কোর্স (খালি রাখলে সব কোর্সে প্রযোজ্য)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`course-${course.id}`}
                      checked={formData.applicableCourses.includes(course.id)}
                      onCheckedChange={(checked) => handleCourseSelection(course.id, checked as boolean)}
                    />
                    <Label htmlFor={`course-${course.id}`} className="text-sm">
                      {course.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked as boolean }))}
              />
              <Label htmlFor="isActive">কুপন সক্রিয় রাখুন</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              বাতিল
            </Button>
            <Button onClick={handleAddCoupon}>যোগ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>কুপন সম্পাদনা করুন</DialogTitle>
            <DialogDescription>কুপনের তথ্য আপডেট করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">কুপন কোড *</Label>
                <Input
                  id="edit-code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="কুপন কোড লিখুন"
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discountType">ছাড়ের ধরন *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) => handleSelectChange("discountType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">শতাংশ (%)</SelectItem>
                    <SelectItem value="fixed">নির্দিষ্ট পরিমাণ (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-discountValue">
                  ছাড়ের পরিমাণ * {formData.discountType === "percentage" ? "(%)" : "(৳)"}
                </Label>
                <Input
                  id="edit-discountValue"
                  name="discountValue"
                  type="number"
                  min="0"
                  max={formData.discountType === "percentage" ? "100" : undefined}
                  value={formData.discountValue}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minPurchaseAmount">সর্বনিম্ন ক্রয় পরিমাণ (৳)</Label>
                <Input
                  id="edit-minPurchaseAmount"
                  name="minPurchaseAmount"
                  type="number"
                  min="0"
                  value={formData.minPurchaseAmount}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {formData.discountType === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="edit-maxDiscountAmount">সর্বোচ্চ ছাড় পরিমাণ (৳)</Label>
                <Input
                  id="edit-maxDiscountAmount"
                  name="maxDiscountAmount"
                  type="number"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={handleInputChange}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-usageLimit">মোট ব্যবহারের সীমা</Label>
                <Input
                  id="edit-usageLimit"
                  name="usageLimit"
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-userLimit">প্রতি ব্যবহারকারীর সীমা</Label>
                <Input
                  id="edit-userLimit"
                  name="userLimit"
                  type="number"
                  min="1"
                  value={formData.userLimit}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-validFrom">শুরুর তারিখ *</Label>
                <Input
                  id="edit-validFrom"
                  name="validFrom"
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-validUntil">শেষ তারিখ *</Label>
                <Input
                  id="edit-validUntil"
                  name="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>প্রযোজ্য কোর্স (খালি রাখলে সব কোর্সে প্রযোজ্য)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-course-${course.id}`}
                      checked={formData.applicableCourses.includes(course.id)}
                      onCheckedChange={(checked) => handleCourseSelection(course.id, checked as boolean)}
                    />
                    <Label htmlFor={`edit-course-${course.id}`} className="text-sm">
                      {course.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isActive"
                name="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked as boolean }))}
              />
              <Label htmlFor="edit-isActive">কুপন সক্রিয় রাখুন</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              বাতিল
            </Button>
            <Button onClick={handleUpdateCoupon}>আপডেট করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
