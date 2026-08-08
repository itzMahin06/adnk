"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signInWithPopup, onAuthStateChanged } from "firebase/auth"
import { auth, googleProvider, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModeToggle } from "@/components/mode-toggle"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [googleLoading, setGoogleLoading] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is already signed in
        if (user.email === "info.itzmahin@gmail.com") {
          router.push("/admin/dashboard")
        } else {
          // Check if student is approved
          const studentRef = doc(db, "students", user.uid)
          const studentSnap = await getDoc(studentRef)

          if (studentSnap.exists()) {
            const studentData = studentSnap.data()

            // Update photoURL if it's missing or different
            if (user.photoURL && (!studentData.photoURL || studentData.photoURL !== user.photoURL)) {
              try {
                await updateDoc(studentRef, {
                  photoURL: user.photoURL,
                })
                console.log("Updated photoURL for existing user:", user.photoURL)
              } catch (error) {
                console.error("Error updating photoURL:", error)
              }
            }

            if (studentData.approved) {
              router.push("/student/dashboard")
            } else {
              router.push("/waiting-approval")
            }
          } else {
            // New Google sign-in user, redirect to registration
            router.push("/register")
          }
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      const result = await signInWithPopup(auth, googleProvider)
      console.log("Google login successful, photoURL:", result.user.photoURL)
      // The redirect will be handled by the onAuthStateChanged listener
    } catch (error: any) {
      console.error("Google login error:", error)

      switch (error.code) {
        case "auth/popup-closed-by-user":
          setError("লগইন পপআপ বন্ধ করা হয়েছে")
          break
        case "auth/popup-blocked":
          setError("পপআপ ব্লক করা আছে। অনুগ্রহ করে পপআপ অনুমতি দিন")
          break
        case "auth/cancelled-popup-request":
          // This is normal when multiple popups are attempted, no need to show error
          break
        case "auth/operation-not-allowed":
          setError("গুগল লগইন বর্তমানে নিষ্ক্রিয় করা আছে")
          break
        default:
          setError("গুগল লগইন করতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন")
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
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">লগইন</CardTitle>
            <CardDescription>আপনার অ্যাকাউন্টে লগইন করুন</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
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
              {googleLoading ? "লগইন হচ্ছে..." : "গুগল দিয়ে লগইন করুন"}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              অ্যাকাউন্ট নেই?{" "}
              <Link href="/register" className="underline">
                রেজিস্ট্রেশন করুন
              </Link>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              <Link href="/admin-login" className="underline">
                অ্যাডমিন লগইন
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
