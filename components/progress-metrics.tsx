"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, Award, Users, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProgressMetricsProps {
  studentTime: number // in seconds
  averageTime: number // in seconds
  topRankedTime: number // in seconds
  totalExamTime: number // in seconds (max allowed time)
  performanceLevel: "excellent" | "good" | "needs-improvement"
  percentile?: number
}

export function ProgressMetrics({
  studentTime,
  averageTime,
  topRankedTime,
  totalExamTime,
  performanceLevel,
  percentile,
}: ProgressMetricsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`
  }

  const getPerformanceBadge = () => {
    switch (performanceLevel) {
      case "excellent":
        return <Badge className="bg-green-500">উৎকৃষ্ট</Badge>
      case "good":
        return <Badge className="bg-yellow-500">ভালো</Badge>
      case "needs-improvement":
        return <Badge className="bg-red-500">উন্নতি প্রয়োজন</Badge>
      default:
        return null
    }
  }

  const getProgressColor = (time: number) => {
    // Lower time is better
    const ratio = time / totalExamTime
    if (ratio < 0.5) return "bg-green-500"
    if (ratio < 0.75) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getProgressValue = (time: number) => {
    // Convert to percentage of total time (inverted so less time = more progress)
    return Math.max(0, Math.min(100, 100 - (time / totalExamTime) * 100))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          পারফরম্যান্স ট্র্যাকার
          {getPerformanceBadge()}
        </CardTitle>
        <CardDescription>আপনার পরীক্ষার সময় ও পারফরম্যান্স তুলনা</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">আপনার সময়</span>
            </div>
            <span className="font-medium">{formatTime(studentTime)}</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Progress value={getProgressValue(studentTime)} className={getProgressColor(studentTime)} />
              </TooltipTrigger>
              <TooltipContent>
                <p>মোট সময়ের {Math.round((studentTime / totalExamTime) * 100)}% ব্যবহার করেছেন</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">গড় সময়</span>
            </div>
            <span className="font-medium">{formatTime(averageTime)}</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Progress value={getProgressValue(averageTime)} className={getProgressColor(averageTime)} />
              </TooltipTrigger>
              <TooltipContent>
                <p>মোট সময়ের {Math.round((averageTime / totalExamTime) * 100)}% ব্যবহার করেছে</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">সেরা সময়</span>
            </div>
            <span className="font-medium">{formatTime(topRankedTime)}</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Progress value={getProgressValue(topRankedTime)} className={getProgressColor(topRankedTime)} />
              </TooltipTrigger>
              <TooltipContent>
                <p>মোট সময়ের {Math.round((topRankedTime / totalExamTime) * 100)}% ব্যবহার করেছে</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-4 rounded-md bg-muted p-3 text-center">
          <p className="text-sm">
            আপনি পরীক্ষা সম্পন্ন করতে <span className="font-bold text-primary">{formatTime(studentTime)}</span> সময় নিয়েছেন।
            {studentTime < averageTime ? (
              <span className="text-green-600"> এটি গড় সময়ের চেয়ে কম!</span>
            ) : studentTime > averageTime ? (
              <span className="text-red-600"> এটি গড় সময়ের চেয়ে বেশি।</span>
            ) : (
              <span className="text-yellow-600"> এটি গড় সময়ের সমান।</span>
            )}
          </p>
          {percentile !== undefined && (
            <p className="text-sm mt-2">
              আপনি সময়ের দিক থেকে সকল পরীক্ষার্থীর মধ্যে উপরের <span className="font-bold text-primary">{percentile}%</span>{" "}
              এর মধ্যে আছেন
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
