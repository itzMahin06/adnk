"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Save, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AdminHeader } from "@/components/admin-header"

interface Notice {
  id: string
  title: string
  content: string
  date: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("notices")
  const [notices, setNotices] = useState<Notice[]>([])
  const [newNotice, setNewNotice] = useState({
    title: "",
    content: "",
  })
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch maintenance settings
        const maintenanceRef = doc(db, "settings", "maintenance")
        const maintenanceSnap = await getDoc(maintenanceRef)

        if (maintenanceSnap.exists()) {
          setMaintenanceMode(maintenanceSnap.data().enabled || false)
          setMaintenanceMessage(maintenanceSnap.data().message || "")
        }

        // Fetch notices
        const noticesRef = collection(db, "notices")
        const noticesSnapshot = await getDocs(noticesRef)

        const noticesData = noticesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notice[]

        // Sort by date (newest first)
        noticesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setNotices(noticesData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching settings:", error)
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleAddNotice = async () => {
    if (!newNotice.title || !newNotice.content) {
      toast({
        title: "ত্রুটি",
        description: "শিরোনাম এবং বিষয়বস্তু উভয়ই প্রয়োজন",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const noticeData = {
        title: newNotice.title,
        content: newNotice.content,
        date: new Date().toISOString(),
      }

      const docRef = await addDoc(collection(db, "notices"), noticeData)

      // Update local state
      setNotices([
        {
          id: docRef.id,
          ...noticeData,
        },
        ...notices,
      ])

      // Reset form
      setNewNotice({
        title: "",
        content: "",
      })

      toast({
        title: "সফল",
        description: "নোটিশ সফলভাবে যোগ করা হয়েছে",
      })
    } catch (error) {
      console.error("Error adding notice:", error)
      toast({
        title: "ত্রুটি",
        description: "নোটিশ যোগ করতে সমস্যা হয়েছে",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNotice = async (noticeId: string) => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই নোটিশ মুছতে চান?")) {
      try {
        await deleteDoc(doc(db, "notices", noticeId))

        // Update local state
        setNotices(notices.filter((notice) => notice.id !== noticeId))

        toast({
          title: "সফল",
          description: "নোটিশ সফলভাবে মুছে ফেলা হয়েছে",
        })
      } catch (error) {
        console.error("Error deleting notice:", error)
        toast({
          title: "ত্রুটি",
          description: "নোটিশ মুছতে সমস্যা হয়েছে",
          variant: "destructive",
        })
      }
    }
  }

  const handleSaveMaintenanceSettings = async () => {
    setSaving(true)

    try {
      await setDoc(doc(db, "settings", "maintenance"), {
        enabled: maintenanceMode,
        message: maintenanceMessage,
      })

      toast({
        title: "সফল",
        description: "রক্ষণাবেক্ষণ সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে",
      })
    } catch (error) {
      console.error("Error saving maintenance settings:", error)
      toast({
        title: "ত্রুটি",
        description: "রক্ষণাবেক্ষণ সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="সেটিংস" />

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notices">নোটিশ</TabsTrigger>
            <TabsTrigger value="maintenance">রক্ষণাবেক্ষণ</TabsTrigger>
          </TabsList>

          <TabsContent value="notices" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>নতুন নোটিশ যোগ করুন</CardTitle>
                <CardDescription>শিক্ষার্থীদের জন্য নতুন নোটিশ যোগ করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notice-title">শিরোনাম</Label>
                  <Input
                    id="notice-title"
                    value={newNotice.title}
                    onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                    placeholder="নোটিশের শিরোনাম"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notice-content">বিষয়বস্তু</Label>
                  <Textarea
                    id="notice-content"
                    value={newNotice.content}
                    onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                    placeholder="নোটিশের বিষয়বস্তু"
                    rows={4}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleAddNotice} disabled={saving} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  <span>{saving ? "যোগ করা হচ্ছে..." : "নোটিশ যোগ করুন"}</span>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>বর্তমান নোটিশসমূহ</CardTitle>
                <CardDescription>সকল নোটিশ দেখুন এবং পরিচালনা করুন</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>শিরোনাম</TableHead>
                          <TableHead>বিষয়বস্তু</TableHead>
                          <TableHead>তারিখ</TableHead>
                          <TableHead className="w-[80px]">অ্যাকশন</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notices.length > 0 ? (
                          notices.map((notice) => (
                            <TableRow key={notice.id}>
                              <TableCell className="font-medium">{notice.title}</TableCell>
                              <TableCell className="max-w-[300px] truncate">{notice.content}</TableCell>
                              <TableCell>{new Date(notice.date).toLocaleDateString("bn-BD")}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteNotice(notice.id)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                              কোন নোটিশ পাওয়া যায়নি
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>রক্ষণাবেক্ষণ মোড</CardTitle>
                <CardDescription>ওয়েবসাইট রক্ষণাবেক্ষণ মোড সক্রিয় বা নিষ্ক্রিয় করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance-mode">রক্ষণাবেক্ষণ মোড</Label>
                    <p className="text-sm text-muted-foreground">সক্রিয় করলে শিক্ষার্থীরা একটি রক্ষণাবেক্ষণ বার্তা দেখতে পাবে</p>
                  </div>
                  <Switch id="maintenance-mode" checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance-message">রক্ষণাবেক্ষণ বার্তা</Label>
                  <Textarea
                    id="maintenance-message"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="রক্ষণাবেক্ষণ বার্তা লিখুন"
                    rows={4}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveMaintenanceSettings} disabled={saving} className="flex items-center gap-1">
                  <Save className="h-4 w-4" />
                  <span>{saving ? "সংরক্ষণ করা হচ্ছে..." : "সংরক্ষণ করুন"}</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  )
}
