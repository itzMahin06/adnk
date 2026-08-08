"use client"

import type React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Edit, Eye, Search, Trash2 } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { Checkbox } from "@/components/ui/checkbox"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useEffect, useState } from "react"

interface Student {
  id: string
  fullName: string
  email: string
  college: string
  hscBatch: string
  paidBatch: string
  approved: boolean
  courses: string[]
  photoURL?: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    paidBatch: "",
    college: "",
    hscBatch: "",
    password: "",
  })
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [currentViewStudent, setCurrentViewStudent] = useState<Student | null>(null)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        console.log("Fetching students...")
        const studentsRef = collection(db, "students")
        const studentsSnapshot = await getDocs(studentsRef)

        const studentsData = studentsSnapshot.docs.map((doc) => {
          const data = doc.data()
          console.log("Student data:", data) // Debug log
          return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || "",
            college: data.college || "",
            hscBatch: data.hscBatch || "",
            paidBatch: data.paidBatch || "",
            approved: data.approved || false,
            courses: data.courses || [],
            photoURL: data.photoURL || "", // Ensure photoURL is included
          }
        }) as Student[]

        console.log("Processed students:", studentsData) // Debug log
        setStudents(studentsData)
        setFilteredStudents(studentsData)

        // Fetch courses
        const coursesRef = collection(db, "courses")
        const coursesSnapshot = await getDocs(coursesRef)
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setCourses(coursesData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching students:", error)
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(
        (student) =>
          student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.college.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchTerm, students])

  const handleView = (student: Student) => {
    setCurrentViewStudent(student)
    setViewDialogOpen(true)
  }

  const handleEdit = (student: Student) => {
    setCurrentStudent(student)
    setEditFormData({
      fullName: student.fullName,
      paidBatch: student.paidBatch,
      college: student.college,
      hscBatch: student.hscBatch,
      password: "",
    })
    setSelectedCourses(student.courses || [])
    setEditDialogOpen(true)
  }

  const handleDelete = async (studentId: string) => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই শিক্ষার্থীকে মুছতে চান?")) {
      try {
        await deleteDoc(doc(db, "students", studentId))
        setStudents(students.filter((student) => student.id !== studentId))
        setFilteredStudents(filteredStudents.filter((student) => student.id !== studentId))
      } catch (error) {
        console.error("Error deleting student:", error)
      }
    }
  }

  const handleEditSubmit = async () => {
    if (!currentStudent) return

    try {
      const studentRef = doc(db, "students", currentStudent.id)

      await updateDoc(studentRef, {
        fullName: editFormData.fullName,
        paidBatch: editFormData.paidBatch,
        college: editFormData.college,
        hscBatch: editFormData.hscBatch,
        courses: selectedCourses,
      })

      if (editFormData.password) {
        console.log("Password would be updated here")
      }

      const updatedStudents = students.map((student) => {
        if (student.id === currentStudent.id) {
          return {
            ...student,
            fullName: editFormData.fullName,
            paidBatch: editFormData.paidBatch,
            college: editFormData.college,
            hscBatch: editFormData.hscBatch,
            courses: selectedCourses,
          }
        }
        return student
      })

      setStudents(updatedStudents)
      setFilteredStudents(updatedStudents)
      setEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating student:", error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId)
      } else {
        return [...prev, courseId]
      }
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader title="শিক্ষার্থীরা" />

      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="শিক্ষার্থী খুঁজুন..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>ইমেইল</TableHead>
                  <TableHead className="hidden md:table-cell">কলেজ</TableHead>
                  <TableHead className="hidden md:table-cell">এইচএসসি ব্যাচ</TableHead>
                  <TableHead className="hidden md:table-cell">পেইড ব্যাচ</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={student.photoURL || ""}
                              alt={student.fullName}
                              onError={(e) => {
                                console.log("Image failed to load for:", student.fullName, student.photoURL)
                              }}
                            />
                            <AvatarFallback className="text-xs bg-primary/10">
                              {getInitials(student.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.fullName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{student.college}</TableCell>
                      <TableCell className="hidden md:table-cell">{student.hscBatch}</TableCell>
                      <TableCell className="hidden md:table-cell">{student.paidBatch}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleView(student)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      কোন শিক্ষার্থী পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>শিক্ষার্থীর বিস্তারিত তথ্য</DialogTitle>
            <DialogDescription>শিক্ষার্থীর সম্পূর্ণ তথ্য দেখুন</DialogDescription>
          </DialogHeader>
          {currentViewStudent && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={currentViewStudent.photoURL || ""} alt={currentViewStudent.fullName} />
                  <AvatarFallback className="text-lg bg-primary/10">
                    {getInitials(currentViewStudent.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{currentViewStudent.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{currentViewStudent.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium">কলেজ</h3>
                  <p className="text-sm">{currentViewStudent.college}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">এইচএসসি ব্যাচ</h3>
                  <p className="text-sm">{currentViewStudent.hscBatch}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">পেইড ব্যাচ</h3>
                  <p className="text-sm">{currentViewStudent.paidBatch}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">অনুমোদিত</h3>
                  <p className="text-sm">{currentViewStudent.approved ? "হ্যাঁ" : "না"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>শিক্ষার্থী তথ্য সম্পাদনা</DialogTitle>
            <DialogDescription>শিক্ষার্থীর তথ্য এবং পাসওয়ার্ড আপডেট করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">পূর্ণ নাম</Label>
              <Input id="fullName" name="fullName" value={editFormData.fullName} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidBatch">পেইড ব্যাচের নাম</Label>
              <Input id="paidBatch" name="paidBatch" value={editFormData.paidBatch} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college">কলেজের নাম</Label>
              <Input id="college" name="college" value={editFormData.college} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hscBatch">এইচএসসি ব্যাচ</Label>
              <Input id="hscBatch" name="hscBatch" value={editFormData.hscBatch} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">নতুন পাসওয়ার্ড (ঐচ্ছিক)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={editFormData.password}
                onChange={handleInputChange}
                placeholder="পাসওয়ার্ড পরিবর্তন করতে এখানে লিখুন"
              />
            </div>
            <div className="space-y-2">
              <Label>কোর্স বরাদ্দ করুন</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`course-${course.id}`}
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => handleCourseToggle(course.id)}
                      />
                      <Label htmlFor={`course-${course.id}`} className="text-sm font-normal">
                        {course.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">কোন কোর্স পাওয়া যায়নি। প্রথমে কোর্স যোগ করুন।</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={handleEditSubmit}>সংরক্ষণ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
