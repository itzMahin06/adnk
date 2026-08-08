export interface Course {
  id: string
  name: string
  description?: string
  examBatchDetails?: string
  totalExams: number
  price: number
  discount: number // percentage
  discountDeadline?: string
  promoCode?: string
  imageUrl?: string // Course image URL
  enrolledStudents?: number // Total enrolled students count
  createdAt: string
}

export interface Student {
  id: string
  fullName: string
  email: string
  college: string
  hscBatch: string
  paidBatch: string
  rollNumber: string // New field for 6-digit roll number
  approved: boolean
  courses?: string[] // Array of course IDs
  purchasedCourses?: string[] // Array of purchased course IDs
  photoURL?: string // Google account photo URL
  createdAt: string
}

export interface Purchase {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  courseId: string
  courseName: string
  originalPrice: number
  discountAmount: number
  finalPrice: number
  promoCode?: string
  couponCode?: string // New field for coupon codes
  couponDiscount?: number // Discount amount from coupon
  paymentMethod: "bkash" | "nagad"
  studentPhone: string
  transactionId: string
  status: "pending" | "approved" | "rejected"
  purchaseDate: string
  approvedDate?: string
}

export interface Question {
  id: string
  examId: string
  text: string
  options: string[]
  correctOption: number
  explanation?: string
}

export interface Exam {
  id: string
  title: string
  subject: string
  courseId?: string
  totalQuestions: number
  time: number
  startTime: string
  endTime: string
  customLink?: string
  instructions?: string
  negativeMark?: number // Negative marking value
  negativeMarkingEnabled?: boolean // Whether negative marking is enabled
  createdAt: string
}

export interface ExamResult {
  id: string
  examId: string
  examTitle: string
  studentId: string
  studentName?: string
  studentRollNumber?: string // New field for roll number in results
  correctAnswers: number
  wrongAnswers: number
  totalScore: number
  submittedAt: string
  completionTimeSeconds?: number // Time taken to complete the exam
  leaderboardPublished?: boolean
  negativeMark?: number // Store the negative marking used for this result
  negativeMarkingEnabled?: boolean // Whether negative marking was enabled for this result
}

export interface ProgressMetrics {
  studentTime: number
  averageTime: number
  topRankedTime: number
  performanceLevel: "excellent" | "good" | "needs-improvement"
  percentile?: number
}

// New Coupon interface
export interface Coupon {
  id: string
  code: string
  discountType: "percentage" | "fixed" // percentage or fixed amount
  discountValue: number // percentage (0-100) or fixed amount
  minPurchaseAmount?: number // minimum purchase amount to use coupon
  maxDiscountAmount?: number // maximum discount amount (for percentage coupons)
  usageLimit?: number // total usage limit
  usedCount: number // current usage count
  userLimit?: number // per user usage limit
  validFrom: string // start date
  validUntil: string // end date
  isActive: boolean
  applicableCourses?: string[] // specific course IDs, empty means all courses
  createdAt: string
  createdBy: string // admin user ID
}

// New CouponUsage interface to track individual usage
export interface CouponUsage {
  id: string
  couponId: string
  couponCode: string
  userId: string
  courseId: string
  discountAmount: number
  usedAt: string
}
