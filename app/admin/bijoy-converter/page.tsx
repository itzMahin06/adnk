"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Copy, Wand2, Trash2 } from "lucide-react"
import { bijoyToUnicode } from "@/lib/bijoy-to-unicode"
import { useToast } from "@/hooks/use-toast"

export default function BijoyConverterPage() {
  const [bijoyText, setBijoyText] = useState("")
  const [unicodeText, setUnicodeText] = useState("")
  const { toast } = useToast()

  const handleConvert = () => {
    setUnicodeText(bijoyToUnicode(bijoyText))
  }

  const handleClear = () => {
    setBijoyText("")
    setUnicodeText("")
  }

  const handleCopy = async () => {
    if (!unicodeText) return
    await navigator.clipboard.writeText(unicodeText)
    toast({ title: "কপি হয়েছে", description: "ইউনিকোড টেক্সট ক্লিপবোর্ডে কপি করা হয়েছে।" })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="বিজয় → ইউনিকোড কনভার্টার" />

      <div className="p-3 sm:p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">SutonnyMJ / বিজয় টেক্সট কনভার্ট করুন</CardTitle>
            <CardDescription>
              পুরনো প্রশ্নব্যাংক থেকে কপি করা বিজয় (SutonnyMJ) ফরম্যাটের টেক্সট নিচে পেস্ট করুন, তারপর "কনভার্ট করুন" চাপুন।
              ফলাফল ইউনিকোড বাংলায় পাবেন, যা সরাসরি প্রশ্নের JSON ফাইলে ব্যবহার করা যাবে।
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">বিজয় টেক্সট (SutonnyMJ)</label>
                <Textarea
                  value={bijoyText}
                  onChange={(e) => setBijoyText(e.target.value)}
                  placeholder="এখানে বিজয় ফরম্যাটের টেক্সট পেস্ট করুন..."
                  className="min-h-[220px] font-sutonnymj text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ইউনিকোড ফলাফল</label>
                <Textarea
                  value={unicodeText}
                  readOnly
                  placeholder="কনভার্ট করা টেক্সট এখানে দেখাবে..."
                  className="min-h-[220px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleConvert} disabled={!bijoyText} className="flex items-center gap-1">
                <Wand2 className="h-4 w-4" />
                কনভার্ট করুন
              </Button>
              <Button
                variant="outline"
                onClick={handleCopy}
                disabled={!unicodeText}
                className="flex items-center gap-1 bg-transparent"
              >
                <Copy className="h-4 w-4" />
                কপি করুন
              </Button>
              <Button
                variant="ghost"
                onClick={handleClear}
                disabled={!bijoyText && !unicodeText}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                মুছে ফেলুন
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              দ্রষ্টব্য: বিজয়/SutonnyMJ ফন্টের কিছু বিরল যুক্তাক্ষর সঠিকভাবে নাও আসতে পারে। এমন হলে ভুল অংশটি ইউনিকোড
              ফলাফল থেকে ম্যানুয়ালি ঠিক করে নিন।
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
