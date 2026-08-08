"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 text-6xl font-bold text-muted-foreground">৪০৪</div>
          <CardTitle className="text-2xl font-bold">পৃষ্ঠা খুঁজে পাওয়া যায়নি</CardTitle>
          <CardDescription>দুঃখিত, আপনি যে পৃষ্ঠাটি খুঁজছেন তা আমাদের কাছে নেই।</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild variant="default">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                হোম পেজে যান
              </Link>
            </Button>
            <Button asChild variant="outline" onClick={() => window.history.back()}>
              <span className="cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                পূর্বের পৃষ্ঠায় ফিরুন
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
