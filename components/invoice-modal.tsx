"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Invoice } from "./invoice"
import { Printer, Smartphone } from "lucide-react"
import type { Purchase } from "@/lib/models"
import { toast } from "@/components/ui/use-toast"

interface InvoiceModalProps {
  purchase: Purchase
  children: React.ReactNode
}

export function InvoiceModal({ purchase, children }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const isMobile = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768
    )
  }

  const handleMobilePrint = () => {
    if (invoiceRef.current) {
      setIsPrinting(true)

      try {
        // For mobile devices, use a simpler approach
        const invoiceContent = invoiceRef.current.innerHTML

        // Create a temporary div with mobile-optimized content
        const tempDiv = document.createElement("div")
        tempDiv.innerHTML = invoiceContent
        tempDiv.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: white;
          z-index: 9999;
          overflow: auto;
          padding: 10px;
        `

        // Hide the current page content
        document.body.style.overflow = "hidden"
        const originalContent = document.body.innerHTML

        // Replace with invoice content
        document.body.innerHTML = ""
        document.body.appendChild(tempDiv)

        // Add mobile print styles
        const style = document.createElement("style")
        style.textContent = `
          @media print {
            * {
              visibility: hidden;
            }
            ${tempDiv.className}, ${tempDiv.className} * {
              visibility: visible;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `
        document.head.appendChild(style)

        // Trigger print
        setTimeout(() => {
          window.print()

          // Restore original content after print
          setTimeout(() => {
            document.body.innerHTML = originalContent
            document.body.style.overflow = ""
            document.head.removeChild(style)
            setIsPrinting(false)

            toast({
              title: "প্রিন্ট সম্পন্ন",
              description: "ইনভয়েস প্রিন্ট করা হয়েছে",
            })
          }, 1000)
        }, 500)
      } catch (error) {
        console.error("Mobile print error:", error)
        setIsPrinting(false)
        toast({
          title: "প্রিন্ট ত্রুটি",
          description: "মোবাইল ডিভাইসে প্রিন্ট করতে সমস্যা হয়েছে। ডেস্কটপ ব্রাউজার ব্যবহার করুন।",
          variant: "destructive",
        })
      }
    }
  }

  const handleDesktopPrint = () => {
    if (invoiceRef.current) {
      setIsPrinting(true)

      try {
        // Create a new window for printing
        const printWindow = window.open("", "_blank", "width=800,height=600,scrollbars=yes,resizable=yes")

        if (printWindow) {
          // Get the invoice HTML content
          const invoiceContent = invoiceRef.current.innerHTML

          // Write the complete HTML document
          printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="bn">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Invoice - ${purchase.courseName}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Arial', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background: white;
                }
                
                .invoice-container {
                  max-width: 800px;
                  margin: 20px auto;
                  padding: 40px;
                  background: white;
                }
                
                .invoice-header {
                  border-bottom: 2px solid #000;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                  text-align: center;
                }
                
                .invoice-title {
                  font-size: 28px;
                  font-weight: bold;
                  margin-bottom: 10px;
                }
                
                .company-info h2 {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                
                .company-info p {
                  margin-bottom: 3px;
                }
                
                .invoice-details {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 30px;
                }
                
                .invoice-details h3 {
                  font-weight: bold;
                  margin-bottom: 10px;
                }
                
                .invoice-details p {
                  margin-bottom: 5px;
                }
                
                .invoice-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 30px;
                }
                
                .invoice-table th,
                .invoice-table td {
                  border: 1px solid #000;
                  padding: 12px;
                  text-align: left;
                }
                
                .invoice-table th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                }
                
                .total-section {
                  margin-top: 20px;
                  text-align: right;
                }
                
                .total-section > div {
                  width: 300px;
                  margin-left: auto;
                }
                
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 0;
                  border-bottom: 1px solid #ddd;
                }
                
                .final-total {
                  font-weight: bold;
                  font-size: 18px;
                  border-top: 2px solid #000;
                  padding-top: 10px;
                  margin-top: 10px;
                }
                
                .footer {
                  margin-top: 50px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                  border-top: 1px solid #ddd;
                  padding-top: 20px;
                }
                
                @media print {
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  
                  .invoice-container {
                    margin: 0;
                    padding: 20px;
                    box-shadow: none;
                  }
                  
                  .no-print {
                    display: none !important;
                  }
                }
                
                @media screen and (max-width: 768px) {
                  .invoice-container {
                    padding: 20px;
                    margin: 10px;
                  }
                  
                  .invoice-details {
                    flex-direction: column;
                    gap: 20px;
                  }
                  
                  .invoice-table {
                    font-size: 14px;
                  }
                  
                  .invoice-table th,
                  .invoice-table td {
                    padding: 8px;
                  }
                }
              </style>
            </head>
            <body>
              ${invoiceContent}
            </body>
          </html>
        `)

          // Close the document writing
          printWindow.document.close()

          // Wait for content to load then print
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.focus()
              printWindow.print()
              printWindow.close()
              setIsPrinting(false)

              toast({
                title: "প্রিন্ট সম্পন্ন",
                description: "ইনভয়েস প্রিন্ট করা হয়েছে",
              })
            }, 250)
          }
        } else {
          // Fallback: use browser's print function
          window.print()
          setIsPrinting(false)
        }
      } catch (error) {
        console.error("Desktop print error:", error)
        setIsPrinting(false)
        toast({
          title: "প্রিন্ট ত্রুটি",
          description: "প্রিন্ট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
          variant: "destructive",
        })
      }
    }
  }

  const handlePrint = () => {
    if (isMobile()) {
      handleMobilePrint()
    } else {
      handleDesktopPrint()
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>ইনভয়েস - {purchase.courseName}</span>
            <div className="flex gap-2">
              {isMobile() && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Smartphone className="h-4 w-4 mr-1" />
                  মোবাইল
                </div>
              )}
              <Button onClick={handlePrint} size="sm" className="no-print" disabled={isPrinting}>
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? "প্রিন্ট হচ্ছে..." : "প্রিন্ট করুন"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <Invoice ref={invoiceRef} purchase={purchase} />
      </DialogContent>
    </Dialog>
  )
}
