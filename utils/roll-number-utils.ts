import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function generateRollNumber(): Promise<string> {
  try {
    // Get the latest student to find the highest roll number
    const studentsRef = collection(db, "students")
    const studentsQuery = query(studentsRef, orderBy("rollNumber", "desc"), limit(1))
    const studentsSnapshot = await getDocs(studentsQuery)

    let nextRollNumber = 1

    if (!studentsSnapshot.empty) {
      const latestStudent = studentsSnapshot.docs[0].data()
      if (latestStudent.rollNumber) {
        // Extract the numeric part from the roll number
        const currentRollNumber = Number.parseInt(latestStudent.rollNumber)
        if (!isNaN(currentRollNumber)) {
          nextRollNumber = currentRollNumber + 1
        }
      }
    }

    // Format as 6-digit number with leading zeros
    return nextRollNumber.toString().padStart(6, "0")
  } catch (error) {
    console.error("Error generating roll number:", error)
    // Fallback to random 6-digit number if there's an error
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
}

export function formatRollNumber(rollNumber: string): string {
  return `ADNK-${rollNumber}`
}

export function extractRollNumber(formattedRoll: string): string {
  return formattedRoll.replace("ADNK-", "")
}
