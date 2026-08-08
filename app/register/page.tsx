"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { onAuthStateChanged, signInWithPopup } from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db, googleProvider } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModeToggle } from "@/components/mode-toggle"
import { generateRollNumber } from "@/utils/roll-number-utils"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: "",
    paidBatch: "",
    college: "",
    hscBatch: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email === "info.itzmahin@gmail.com") {
          router.push("/admin/dashboard")
          return
        }

        // Check if user already has a student record
        const studentRef = doc(db, "students", user.uid)
        const studentSnap = await getDoc(studentRef)

        if (studentSnap.exists()) {
          // User already registered, update photoURL if it's missing
          const studentData = studentSnap.data()
          if (!studentData.photoURL && user.photoURL) {
            await updateDoc(studentRef, {
              photoURL: user.photoURL,
            })
          }
          router.push("/student/dashboard")
        } else {
          // New user, show registration form
          setShowForm(true)
          setFormData((prev) => ({
            ...prev,
            fullName: user.displayName || "",
          }))
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!auth.currentUser) {
      setError("আপনি লগইন করা নেই")
      setLoading(false)
      return
    }

    try {
      // Generate roll number
      const rollNumber = await generateRollNumber()

      // Save user data to Firestore with automatic approval, photoURL, and roll number
      await setDoc(doc(db, "students", auth.currentUser.uid), {
        fullName: formData.fullName,
        paidBatch: formData.paidBatch,
        college: formData.college,
        hscBatch: formData.hscBatch,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL || "", // Save Google profile photo
        rollNumber: rollNumber, // Save the generated roll number
        approved: true, // Automatically approve new users
        courses: [],
        purchasedCourses: [],
        createdAt: new Date().toISOString(),
      })

      console.log("User registered with roll number:", rollNumber, "and photoURL:", auth.currentUser.photoURL)

      // Redirect to dashboard instead of waiting approval
      router.push("/student/dashboard")
    } catch (error: any) {
      console.error("Registration error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      const result = await signInWithPopup(auth, googleProvider)
      console.log("Google signup successful, photoURL:", result.user.photoURL)
      // The redirect will be handled by the onAuthStateChanged listener
    } catch (error: any) {
      console.error("Google signup error:", error)

      switch (error.code) {
        case "auth/popup-closed-by-user":
          setError("সাইনআপ পপআপ বন্ধ করা হয়েছে")
          break
        case "auth/popup-blocked":
          setError("পপআপ ব্লক করা আছে। অনুগ্রহ করে পপআপ অনুমতি দিন")
          break
        case "auth/cancelled-popup-request":
          // This is normal when multiple popups are attempted, no need to show error
          break
        case "auth/operation-not-allowed":
          setError("গুগল সাইনআপ বর্তমানে নিষ্ক্রিয় করা আছে")
          break
        default:
          setError("গুগল সাইনআপ করতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

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
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">রেজিস্ট্রেশন</CardTitle>
            <CardDescription>নতুন অ্যাকাউন্ট তৈরি করুন</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!showForm ? (
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleGoogleSignup}
                disabled={googleLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {googleLoading ? "সাইনআপ হচ্ছে..." : "গুগল দিয়ে সাইনআপ করুন"}
              </Button>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">পূর্ণ নাম</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="আপনার পূর্ণ নাম"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidBatch">পেইড ব্যাচের নাম</Label>
                  <Input
                    id="paidBatch"
                    name="paidBatch"
                    placeholder="পেইড ব্যাচের নাম"
                    value={formData.paidBatch}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="college">কলেজের নাম</Label>
                  <Input
                    id="college"
                    name="college"
                    placeholder="আপনার কলেজের নাম"
                    value={formData.college}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hscBatch">এইচএসসি ব্যাচ</Label>
                  <Input
                    id="hscBatch"
                    name="hscBatch"
                    placeholder="আপনার এইচএসসি ব্যাচ"
                    value={formData.hscBatch}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "রেজিস্ট্রেশন হচ্ছে..." : "রেজিস্ট্রেশন করুন"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground text-center w-full">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
              <Link href="/login" className="underline">
                লগইন করুন
              </Link>
            </div>
          </CardFooter>
        </Card>
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
