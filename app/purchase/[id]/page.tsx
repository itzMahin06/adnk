"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Clock, CheckCircle, Tag } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "@/components/mode-toggle"
import type { Course, Coupon } from "@/lib/models"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function PurchasePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Course info, 2: Payment method, 3: Payment details
  const [selectedPayment, setSelectedPayment] = useState<"bkash" | "nagad" | null>(null)
  const [formData, setFormData] = useState({
    studentPhone: "",
    transactionId: "",
    promoCode: "",
    couponCode: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        if (!auth.currentUser) {
          router.push("/login")
          return
        }

        const courseRef = doc(db, "courses", params.id as string)
        const courseSnap = await getDoc(courseRef)

        if (courseSnap.exists()) {
          setCourse({
            id: courseSnap.id,
            ...courseSnap.data(),
          } as Course)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching course:", error)
        setLoading(false)
      }
    }

    if (params.id) {
      fetchCourse()
    }
  }, [params.id, router])

  const calculateDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount) / 100
  }

  const isDiscountActive = (deadline?: string) => {
    if (!deadline) return false
    return new Date(deadline) > new Date()
  }

  const getTimeRemaining = (deadline: string) => {
    const now = new Date().getTime()
    const target = new Date(deadline).getTime()
    const difference = target - now

    if (difference <= 0) return null

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

    return { days, hours, minutes }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateCoupon = async (couponCode: string) => {
    if (!couponCode.trim() || !course || !auth.currentUser) return null

    try {
      // Find coupon by code
      const couponQuery = query(
        collection(db, "coupons"),
        where("code", "==", couponCode.toUpperCase()),
        where("isActive", "==", true),
      )
      const couponSnapshot = await getDocs(couponQuery)

      if (couponSnapshot.empty) {
        throw new Error("কুপন কোড পাওয়া যায়নি বা নিষ্ক্রিয়")
      }

      const couponDoc = couponSnapshot.docs[0]
      const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon

      // Check if coupon is valid for current time
      const now = new Date()
      const validFrom = new Date(coupon.validFrom)
      const validUntil = new Date(coupon.validUntil)

      if (now < validFrom) {
        throw new Error("কুপনের মেয়াদ এখনো শুরু হয়নি")
      }

      if (now > validUntil) {
        throw new Error("কুপনের মেয়াদ শেষ হয়ে গেছে")
      }

      // Check if coupon is applicable to this course
      if (coupon.applicableCourses && coupon.applicableCourses.length > 0) {
        if (!coupon.applicableCourses.includes(course.id)) {
          throw new Error("এই কুপন এই কোর্সের জন্য প্রযোজ্য নয়")
        }
      }

      // Check usage limits
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new Error("কুপনের ব্যবহারের সীমা শেষ হয়ে গেছে")
      }

      // Check user usage limit
      if (coupon.userLimit) {
        const userUsageQuery = query(
          collection(db, "couponUsages"),
          where("couponId", "==", coupon.id),
          where("userId", "==", auth.currentUser.uid),
        )
        const userUsageSnapshot = await getDocs(userUsageQuery)

        if (userUsageSnapshot.size >= coupon.userLimit) {
          throw new Error("আপনি এই কুপন ইতিমধ্যে সর্বোচ্চ সংখ্যকবার ব্যবহার করেছেন")
        }
      }

      // Calculate current price (after time-based discount)
      const discountActive = isDiscountActive(course.discountDeadline)
      const currentPrice = discountActive ? calculateDiscountedPrice(course.price, course.discount) : course.price

      // Check minimum purchase amount
      if (coupon.minPurchaseAmount && currentPrice < coupon.minPurchaseAmount) {
        throw new Error(`এই কুপন ব্যবহারের জন্য সর্বনিম্ন ৳${coupon.minPurchaseAmount} ক্রয় করতে হবে`)
      }

      return coupon
    } catch (error) {
      throw error
    }
  }

  const applyCoupon = async () => {
    if (!formData.couponCode.trim()) {
      toast({
        title: "ত্রুটি",
        description: "কুপন কোড লিখুন",
        variant: "destructive",
      })
      return
    }

    setCouponLoading(true)

    try {
      const coupon = await validateCoupon(formData.couponCode)
      if (coupon) {
        setAppliedCoupon(coupon)
        toast({
          title: "সফল",
          description: "কুপন সফলভাবে প্রয়োগ করা হয়েছে",
        })
      }
    } catch (error: any) {
      toast({
        title: "কুপন ত্রুটি",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setFormData((prev) => ({ ...prev, couponCode: "" }))
    toast({
      title: "কুপন সরানো হয়েছে",
      description: "কুপন কোড সরিয়ে দেওয়া হয়েছে",
    })
  }

  const calculateCouponDiscount = (price: number, coupon: Coupon) => {
    if (coupon.discountType === "percentage") {
      const discount = (price * coupon.discountValue) / 100
      return coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount ? coupon.maxDiscountAmount : discount
    } else {
      return Math.min(coupon.discountValue, price)
    }
  }

  const calculateFinalPrice = () => {
    if (!course) return 0

    // Start with original price
    let price = course.price

    // Apply time-based discount
    const discountActive = isDiscountActive(course.discountDeadline)
    if (discountActive) {
      price = calculateDiscountedPrice(price, course.discount)
    }

    // Apply coupon discount
    if (appliedCoupon) {
      const couponDiscount = calculateCouponDiscount(price, appliedCoupon)
      price = Math.max(0, price - couponDiscount)
    }

    return price
  }

  const getCouponDiscount = () => {
    if (!course || !appliedCoupon) return 0

    const discountActive = isDiscountActive(course.discountDeadline)
    const priceAfterTimeDiscount = discountActive
      ? calculateDiscountedPrice(course.price, course.discount)
      : course.price

    return calculateCouponDiscount(priceAfterTimeDiscount, appliedCoupon)
  }

  const handleSubmitPurchase = async () => {
    if (!course || !auth.currentUser || !selectedPayment) return

    if (!formData.studentPhone || !formData.transactionId) {
      toast({
        title: "ত্রুটি",
        description: "সব তথ্য পূরণ করুন",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // Validate coupon again before purchase
      if (appliedCoupon && formData.couponCode) {
        await validateCoupon(formData.couponCode)
      }

      const discountActive = isDiscountActive(course.discountDeadline)
      const timeBasedDiscount = discountActive
        ? course.price - calculateDiscountedPrice(course.price, course.discount)
        : 0
      const couponDiscount = getCouponDiscount()
      const finalPrice = calculateFinalPrice()

      // Get student data
      const studentRef = doc(db, "students", auth.currentUser.uid)
      const studentSnap = await getDoc(studentRef)
      const studentData = studentSnap.data()

      // Create purchase record
      const purchaseData = {
        studentId: auth.currentUser.uid,
        studentName: studentData?.fullName || "",
        studentEmail: auth.currentUser.email,
        courseId: course.id,
        courseName: course.name,
        originalPrice: course.price,
        discountAmount: timeBasedDiscount,
        finalPrice,
        promoCode: formData.promoCode,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        couponDiscount: couponDiscount,
        paymentMethod: selectedPayment,
        studentPhone: formData.studentPhone,
        transactionId: formData.transactionId,
        status: "pending",
        purchaseDate: new Date().toISOString(),
      }

      await addDoc(collection(db, "purchases"), purchaseData)

      // Record coupon usage if coupon was applied
      if (appliedCoupon) {
        await addDoc(collection(db, "couponUsages"), {
          couponId: appliedCoupon.id,
          couponCode: appliedCoupon.code,
          userId: auth.currentUser.uid,
          courseId: course.id,
          discountAmount: couponDiscount,
          usedAt: new Date().toISOString(),
        })
      }

      toast({
        title: "সফল",
        description: "আপনার ক্রয়ের অনুরোধ জমা দেওয়া হয়েছে। অনুমোদনের জন্য অপেক্ষা করুন।",
      })

      setTimeout(() => {
        router.push("/student/profile")
      }, 2000)
    } catch (error: any) {
      console.error("Error submitting purchase:", error)
      toast({
        title: "ত্রুটি",
        description: error.message || "ক্রয়ের অনুরোধ জমা দিতে সমস্যা হয়েছে",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={40} height={40} className="rounded-full" />
              <span className="text-xl font-bold">এডমিশন নিয়ে খেলছি</span>
            </Link>
            <ModeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card>
            <CardHeader>
              <CardTitle>কোর্স পাওয়া যায়নি</CardTitle>
            </CardHeader>
            <CardFooter>
              <Link href="/">
                <Button>হোমে ফিরে যান</Button>
              </Link>
            </CardFooter>
          </Card>
        </main>
      </div>
    )
  }

  const discountActive = isDiscountActive(course.discountDeadline)
  const timeRemaining = course.discountDeadline ? getTimeRemaining(course.discountDeadline) : null
  const finalPrice = calculateFinalPrice()
  const couponDiscount = getCouponDiscount()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={40} height={40} className="rounded-full" />
            <span className="text-xl font-bold">এডমিশন নিয়ে খেলছি</span>
          </Link>
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="container max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href={`/course/${course.id}`}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>কোর্সে ফিরে যান</span>
            </Link>
          </div>

          <div className="space-y-6">
            {/* Course Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{course.name}</span>
                  {discountActive && course.discount > 0 && <Badge variant="destructive">{course.discount}% ছাড়</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>মূল মূল্য:</span>
                  <span
                    className={
                      discountActive && course.discount > 0 ? "line-through text-muted-foreground" : "font-bold"
                    }
                  >
                    ৳{course.price}
                  </span>
                </div>
                {discountActive && course.discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span>সময়ভিত্তিক ছাড়:</span>
                    <span className="text-green-600">
                      -৳{course.price - calculateDiscountedPrice(course.price, course.discount)}
                    </span>
                  </div>
                )}
                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span>কুপন ছাড় ({appliedCoupon.code}):</span>
                    <span className="text-green-600">-৳{couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                  <span>চূড়ান্ত মূল্য:</span>
                  <span>৳{finalPrice}</span>
                </div>
                {discountActive && timeRemaining && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      সময়ভিত্তিক ছাড় শেষ হবে: {timeRemaining.days}দিন {timeRemaining.hours}ঘন্টা {timeRemaining.minutes}
                      মিনিট
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Coupon Code Section */}
            {step >= 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    কুপন কোড
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="কুপন কোড লিখুন"
                        value={formData.couponCode}
                        onChange={(e) => setFormData((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                        className="uppercase"
                      />
                      <Button
                        onClick={applyCoupon}
                        disabled={couponLoading || !formData.couponCode.trim()}
                        variant="outline"
                      >
                        {couponLoading ? "যাচাই করা হচ্ছে..." : "প্রয়োগ করুন"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-md">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">
                            কুপন প্রয়োগ করা হয়েছে: {appliedCoupon.code}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-300">
                            ছাড়:{" "}
                            {appliedCoupon.discountType === "percentage"
                              ? `${appliedCoupon.discountValue}%`
                              : `৳${appliedCoupon.discountValue}`}{" "}
                            (৳{couponDiscount} সাশ্রয়)
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={removeCoupon}>
                        সরান
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Method Selection */}
            {step >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>পেমেন্ট পদ্ধতি নির্বাচন করুন</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card
                      className={`cursor-pointer transition-colors ${selectedPayment === "bkash" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelectedPayment("bkash")}
                    >
                      <CardContent className="flex items-center justify-center p-6">
                        <Image src="/bkash-logo.png" alt="bKash" width={120} height={60} />
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-colors ${selectedPayment === "nagad" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelectedPayment("nagad")}
                    >
                      <CardContent className="flex items-center justify-center p-6">
                        <Image src="/nagad-logo.png" alt="Nagad" width={120} height={60} />
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Instructions */}
            {step >= 3 && selectedPayment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image
                      src={selectedPayment === "bkash" ? "/bkash-logo.png" : "/nagad-logo.png"}
                      alt={selectedPayment}
                      width={80}
                      height={40}
                    />
                    পেমেন্ট নির্দেশনা
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p>
                            <strong>পেমেন্ট নম্বর:</strong> 01778504001
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText("01778504001")
                              toast({
                                title: "কপি হয়েছে",
                                description: "নম্বরটি ক্লিপবোর্ডে কপি হয়েছে",
                              })
                            }}
                          >
                            কপি করুন
                          </Button>
                        </div>
                        <p>
                          <strong>পেমেন্ট পরিমাণ:</strong> ৳{finalPrice}
                        </p>
                        <p>
                          <strong>নির্দেশনা:</strong>
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>উপরের নম্বরে ৳{finalPrice} টাকা পাঠান</li>
                          <li>পেমেন্ট সম্পন্ন হওয়ার পর নিচের ফর্ম পূরণ করুন</li>
                          <li>আপনার মোবাইল নম্বর এবং ট্রানজেকশন আইডি দিন</li>
                        </ol>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentPhone">আপনার মোবাইল নম্বর</Label>
                      <Input
                        id="studentPhone"
                        name="studentPhone"
                        type="tel"
                        value={formData.studentPhone}
                        onChange={handleInputChange}
                        placeholder="01XXXXXXXXX"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">ট্রানজেকশন আইডি</Label>
                      <Input
                        id="transactionId"
                        name="transactionId"
                        value={formData.transactionId}
                        onChange={handleInputChange}
                        placeholder="ট্রানজেকশন আইডি লিখুন"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promoCode">প্রোমো কোড (ঐচ্ছিক)</Label>
                      <Input
                        id="promoCode"
                        name="promoCode"
                        value={formData.promoCode}
                        onChange={handleInputChange}
                        placeholder="প্রোমো কোড থাকলে লিখুন"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleSubmitPurchase}
                    className="w-full"
                    disabled={submitting || !formData.studentPhone || !formData.transactionId}
                  >
                    {submitting ? "জমা দেওয়া হচ্ছে..." : "ক্রয়ের অনুরোধ জমা দিন"}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  পূর্ববর্তী
                </Button>
              )}
              {step < 3 && (
                <Button onClick={() => setStep(step + 1)} className="ml-auto" disabled={step === 2 && !selectedPayment}>
                  পরবর্তী
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  )
}
