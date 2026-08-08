"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModeToggle } from "@/components/mode-toggle"
import { PasswordInput } from "@/components/password-input"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Check if admin is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "info.itzmahin@gmail.com") {
        router.push("/admin/dashboard")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (email !== "info.itzmahin@gmail.com") {
        throw new Error("অবৈধ অ্যাডমিন ইমেইল")
      }

      await signInWithEmailAndPassword(auth, email, password)
      router.push("/admin/dashboard")
    } catch (error: any) {
      console.error("Admin login error:", error)

      if (error.message === "অবৈধ অ্যাডমিন ইমেইল") {
        setError("অবৈধ অ্যাডমিন ইমেইল")
      } else {
        // Handle specific Firebase auth errors
        switch (error.code) {
          case "auth/invalid-email":
            setError("ইমেইল ফরম্যাট সঠিক নয়")
            break
          case "auth/user-not-found":
            setError("এই ইমেইল দিয়ে কোন অ্যাকাউন্ট নেই")
            break
          case "auth/wrong-password":
            setError("পাসওয়ার্ড ভুল")
            break
          case "auth/too-many-requests":
            setError("অনেকবার ভুল পাসওয়ার্ড দেওয়ার কারণে অ্যাকাউন্ট সাময়িকভাবে ব্লক করা হয়েছে। পরে আবার চেষ্টা করুন")
            break
          case "auth/user-disabled":
            setError("এই অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে")
            break
          case "auth/network-request-failed":
            setError("নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ চেক করুন")
            break
          case "auth/operation-not-allowed":
            setError("ইমেইল/পাসওয়ার্ড লগইন বর্তমানে নিষ্ক্রিয় করা আছে")
            break
          default:
            setError("অবৈধ ইমেইল বা পাসওয়ার্ড")
        }
      }
    } finally {
      setLoading(false)
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
            <CardTitle className="text-2xl font-bold">অ্যাডমিন লগইন</CardTitle>
            <CardDescription>অ্যাডমিন প্যানেলে প্রবেশ করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">ইমেইল</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="অ্যাডমিন ইমেইল"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">পাসওয়ার্ড</Label>
                <PasswordInput
                  id="password"
                  placeholder="অ্যাডমিন পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground text-center w-full">
              <Link href="/" className="underline">
                হোম পেজে ফিরে যান
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
