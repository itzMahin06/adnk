"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { HomeNotices } from "@/components/home-notices"
import { MaintenanceMode } from "@/components/maintenance-mode"
import { HomeCourses } from "@/components/home-courses"
import { UserProfileCard } from "@/components/user-profile-card"
import { Skeleton } from "@/components/ui/skeleton"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const AuthenticatedHeader = () => (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={40} height={40} className="rounded-full" />
          <span className="text-lg font-bold md:text-xl bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            এডমিশন নিয়ে খেলছি
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <ModeToggle />
          <Link href="/student/dashboard">
            <Button
              size="sm"
              className="text-xs sm:text-sm sm:px-4 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
            >
              ড্যাশবোর্ড
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )

  const UnauthenticatedHeader = () => (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={40} height={40} className="rounded-full" />
          <span className="text-lg font-bold md:text-xl bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            এডমিশন নিয়ে খেলছি
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <ModeToggle />
          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm sm:px-4 border-primary/20 hover:bg-primary/5 bg-transparent"
            >
              লগইন
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="text-xs sm:text-sm sm:px-4 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
            >
              রেজিস্ট্রেশন
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )

  const AuthenticatedHeroSection = () => (
    <section className="relative py-12 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-emerald-500/5 to-violet-500/5"></div>
      <div className="relative container max-w-6xl mx-auto">
        <UserProfileCard user={user!} />
      </div>
    </section>
  )

  const UnauthenticatedHeroSection = () => (
    <section className="relative py-20 px-6 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-emerald-500/5 to-violet-500/5"></div>
      <div className="relative container max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-emerald-600 to-violet-600 bg-clip-text text-transparent">
            এডমিশন নিয়ে খেলছি
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            স্বপ্নের বিশ্ববিদ্যালয়ে ভর্তির জন্য সেরা প্রস্তুতি নিন এবং আপনার দক্ষতা যাচাই করুন
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              রেজিস্ট্রেশন করুন
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-primary/20 hover:bg-primary/5 shadow-lg hover:shadow-xl transition-all duration-300 bg-transparent"
            >
              লগইন করুন
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )

  if (loading) {
    return (
      <MaintenanceMode>
        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={40} height={40} className="rounded-full" />
                <span className="text-lg font-bold md:text-xl bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                  এডমিশন নিয়ে খেলছি
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2 sm:gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </header>

          <main className="flex-1">
            <section className="relative py-20 px-6 text-center overflow-hidden">
              <div className="relative container max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-16 w-3/4 mx-auto" />
                <Skeleton className="h-8 w-full max-w-2xl mx-auto" />
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Skeleton className="h-12 w-40" />
                  <Skeleton className="h-12 w-32" />
                </div>
              </div>
            </section>
          </main>
        </div>
      </MaintenanceMode>
    )
  }

  return (
    <MaintenanceMode>
      <div className="flex min-h-screen flex-col">
        {user ? <AuthenticatedHeader /> : <UnauthenticatedHeader />}

        <main className="flex-1">
          {user ? <AuthenticatedHeroSection /> : <UnauthenticatedHeroSection />}

          {/* Course Section */}
          <section className="py-16 px-6">
            <div className="container max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent mb-4">
                  আমাদের কোর্সসমূহ
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  বিভিন্ন বিষয়ে আমাদের কোর্স দেখুন এবং ভর্তি হন
                </p>
              </div>
              <HomeCourses />
            </div>
          </section>

          {/* Notice Section */}
          <section className="py-16 px-6 bg-muted/30">
            <div className="container max-w-4xl mx-auto">
              <HomeNotices />
            </div>
          </section>
        </main>

        <footer className="border-t py-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="এডমিশন নিয়ে খেলছি" width={24} height={24} className="rounded-full" />
              <p className="text-sm text-muted-foreground">এডমিশন নিয়ে খেলছি ©২০২৫ | ডিজাইন & ডেভেলপঃ মাহিন</p>
            </div>
            <p className="text-sm text-muted-foreground">যেকোনো প্রয়োজনে পেজে ইনবক্স করো</p>
          </div>
        </footer>
      </div>
    </MaintenanceMode>
  )
}
