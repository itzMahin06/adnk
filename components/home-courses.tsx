"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import Image from "next/image"
import { BookOpen, Users, Star, ArrowRight, Clock, Tag, Flame } from "lucide-react"
import type { Course } from "@/lib/models"

export function HomeCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<
    Record<string, { days: number; hours: number; minutes: number; seconds: number } | null>
  >({})

  useEffect(() => {
    const fetchCoursesWithEnrollment = async () => {
      try {
        // Fetch courses
        const coursesSnapshot = await getDocs(collection(db, "courses"))
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Course[]

        // Fetch enrollment counts for each course
        const coursesWithEnrollment = await Promise.all(
          coursesData.map(async (course) => {
            try {
              // Count approved purchases for this course
              const purchasesQuery = query(
                collection(db, "purchases"),
                where("courseId", "==", course.id),
                where("status", "==", "approved"),
              )
              const purchasesSnapshot = await getDocs(purchasesQuery)
              const enrolledStudents = purchasesSnapshot.size

              return {
                ...course,
                enrolledStudents,
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
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCoursesWithEnrollment()
  }, [])

  // Initialize and update countdown timers
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date().getTime()
      const newTimeRemaining: Record<string, { days: number; hours: number; minutes: number; seconds: number } | null> =
        {}

      courses.forEach((course) => {
        if (course.discountDeadline) {
          const target = new Date(course.discountDeadline).getTime()
          const difference = target - now

          if (difference <= 0) {
            newTimeRemaining[course.id] = null
          } else {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((difference % (1000 * 60)) / 1000)

            newTimeRemaining[course.id] = { days, hours, minutes, seconds }
          }
        }
      })

      setTimeRemaining(newTimeRemaining)
    }

    // Initial update
    updateCountdowns()

    // Set interval for countdown
    const interval = setInterval(updateCountdowns, 1000)

    // Cleanup
    return () => clearInterval(interval)
  }, [courses])

  const calculateDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount) / 100
  }

  const isDiscountActive = (deadline?: string) => {
    if (!deadline) return false
    return new Date(deadline) > new Date()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-xl text-muted-foreground mb-2">কোন কোর্স পাওয়া যায়নি</p>
        <p className="text-sm text-muted-foreground">শীঘ্রই নতুন কোর্স যোগ করা হবে</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {courses.map((course, index) => {
        const discountActive = isDiscountActive(course.discountDeadline)
        const finalPrice = discountActive ? calculateDiscountedPrice(course.price, course.discount) : course.price
        const countdown = timeRemaining[course.id]

        return (
          <Card
            key={course.id}
            className="group modern-card hover:scale-105 transition-all duration-300 overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Course Image - 16:9 Aspect Ratio */}
            <div className="relative h-48 overflow-hidden">
              {course.imageUrl ? (
                <Image
                  src={course.imageUrl || "/placeholder.svg"}
                  alt={course.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    e.currentTarget.nextElementSibling?.classList.remove("hidden")
                  }}
                />
              ) : null}
              <div
                className={`${course.imageUrl ? "hidden" : ""} absolute inset-0 bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center`}
              >
                <div className="text-center">
                  <BookOpen className="h-16 w-16 text-primary/60 mx-auto mb-2" />
                  <p className="text-sm font-medium text-primary/80">{course.name}</p>
                </div>
              </div>

              {/* Discount Badge with Glow */}
              {discountActive && course.discount > 0 && (
                <div className="absolute top-4 right-4">
                  <Badge
                    variant="destructive"
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg border-0 animate-pulse"
                    style={{
                      boxShadow: "0 0 15px rgba(239, 68, 68, 0.6)",
                    }}
                  >
                    <Flame className="h-3 w-3 mr-1" />
                    {course.discount}% ছাড়
                  </Badge>
                </div>
              )}

              {/* Popular Badge with Glow */}
              {index === 0 && (
                <div className="absolute top-4 left-4">
                  <Badge
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg border-0"
                    style={{
                      boxShadow: "0 0 15px rgba(16, 185, 129, 0.6)",
                    }}
                  >
                    <Star className="h-3 w-3 mr-1 fill-white" />
                    জনপ্রিয়
                  </Badge>
                </div>
              )}
            </div>

            <CardHeader className="pb-3">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">{course.name}</CardTitle>
              {course.description && (
                <CardDescription className="line-clamp-2 text-sm">{course.description}</CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pb-4">
              {/* Course Stats with Colorful Backgrounds */}
              <div className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700/50">
                  <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">
                    <span className="font-semibold">{course.totalExams}</span> টি পরীক্ষা
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-violet-100 to-violet-200 dark:from-violet-900/30 dark:to-violet-800/30 px-3 py-2 rounded-lg border border-violet-200 dark:border-violet-700/50">
                  <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-violet-700 dark:text-violet-300 font-semibold">
                    {course.enrolledStudents || 0} জন ভর্তি
                  </span>
                </div>
              </div>

              {course.examBatchDetails && (
                <div className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-800/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700/50">
                  <div className="flex items-start gap-2 text-sm">
                    <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="line-clamp-2 text-blue-700 dark:text-blue-300">{course.examBatchDetails}</span>
                  </div>
                </div>
              )}

              {course.promoCode && (
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-800/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-700/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-700 dark:text-amber-300">প্রোমো কোড:</span>
                    <code className="bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 px-2 py-1 rounded text-xs font-mono font-bold">
                      {course.promoCode}
                    </code>
                  </div>
                </div>
              )}

              {/* Pricing Section with Glow */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  {discountActive && course.discount > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent"
                          style={{
                            textShadow: "0 0 5px rgba(16, 185, 129, 0.3)",
                          }}
                        >
                          ৳{finalPrice}
                        </span>
                        <span className="text-lg text-muted-foreground line-through">৳{course.price}</span>
                      </div>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        ৳{course.price - finalPrice} সাশ্রয়!
                      </p>
                    </div>
                  ) : (
                    <span
                      className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent"
                      style={{
                        textShadow: "0 0 5px rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      ৳{course.price}
                    </span>
                  )}
                </div>

                {/* Live Countdown Timer with Improved Design */}
                {discountActive && countdown && (
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-200/30 dark:border-orange-800/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium text-sm">ছাড় শেষ হবে:</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div className="bg-white/80 dark:bg-black/30 rounded p-1">
                          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">{countdown.days}</div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">দিন</div>
                        </div>
                        <div className="bg-white/80 dark:bg-black/30 rounded p-1">
                          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
                            {countdown.hours}
                          </div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">ঘন্টা</div>
                        </div>
                        <div className="bg-white/80 dark:bg-black/30 rounded p-1">
                          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
                            {countdown.minutes}
                          </div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">মিনিট</div>
                        </div>
                        <div className="bg-white/80 dark:bg-black/30 rounded p-1">
                          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
                            {countdown.seconds}
                          </div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">সেকেন্ড</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardContent className="pt-0">
              <Link href={`/course/${course.id}`} className="w-full">
                <Button
                  className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  style={{
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  বিস্তারিত দেখুন
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
