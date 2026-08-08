"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, BookOpen, Tag, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "@/components/mode-toggle"
import type { Course } from "@/lib/models"
import { onAuthStateChanged } from "firebase/auth"

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const fetchCourse = async () => {
      try {
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
  }, [params.id])

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

  const handlePurchase = () => {
    if (!user) {
      router.push("/login")
      return
    }
    router.push(`/purchase/${course?.id}`)
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
              <CardDescription>এই কোর্সটি বিদ্যমান নেই বা মুছে ফেলা হয়েছে</CardDescription>
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
  const finalPrice = discountActive ? calculateDiscountedPrice(course.price, course.discount) : course.price
  const timeRemaining = course.discountDeadline ? getTimeRemaining(course.discountDeadline) : null

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={40} height={40} className="rounded-full" />
            <span className="text-xl font-bold">এডমিশন নিয়ে খেলছি</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/student/dashboard">
                <Button variant="outline" size="sm">
                  ড্যাশবোর্ড
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    লগইন
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">রেজিস্ট্রেশন</Button>
                </Link>
              </>
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="container max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>সব কোর্স</span>
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-2xl">{course.name}</CardTitle>
                    {discountActive && course.discount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {course.discount}% ছাড়
                      </Badge>
                    )}
                  </div>
                  {course.description && <CardDescription className="text-base">{course.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.examBatchDetails && (
                    <div>
                      <h3 className="font-semibold mb-2">পরীক্ষা ব্যাচের বিবরণ</h3>
                      <p className="text-muted-foreground whitespace-pre-line">{course.examBatchDetails}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <span>মোট পরীক্ষা: {course.totalExams}</span>
                  </div>
                  {course.promoCode && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                      <span>
                        প্রোমো কোড: <code className="bg-muted px-2 py-1 rounded">{course.promoCode}</code>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>মূল্য তথ্য</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {discountActive && course.discount > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">৳{finalPrice}</span>
                          <span className="text-lg text-muted-foreground line-through">৳{course.price}</span>
                        </div>
                        <p className="text-sm text-green-600">আপনি সাশ্রয় করছেন ৳{course.price - finalPrice}</p>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold">৳{course.price}</span>
                    )}
                  </div>
                  {discountActive && timeRemaining && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md">
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">ছাড় শেষ হবে:</span>
                      </div>
                      <p className="text-lg font-bold text-orange-600">
                        {timeRemaining.days}দিন {timeRemaining.hours}ঘন্টা {timeRemaining.minutes}মিনিট
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={handlePurchase} className="w-full" size="lg">
                    {user ? "এখনই কিনুন" : "লগইন করে কিনুন"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left">
          <p className="text-sm text-muted-foreground">এডমিশন নিয়ে খেলছি ©২০২৫ | ডিজাইন & ডেভেলপঃ মাহিন</p>
          <p className="text-sm text-muted-foreground">যেকোনো প্রয়োজনে পেজে ইনবক্স করো</p>
        </div>
      </footer>
    </div>
  )
}
