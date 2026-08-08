"use client"

import { forwardRef } from "react"
import type { Purchase } from "@/lib/models"

interface InvoiceProps {
  purchase: Purchase
}

export const Invoice = forwardRef<HTMLDivElement, InvoiceProps>(({ purchase }, ref) => {
  const invoiceNumber = `INV-${purchase.id.slice(-8).toUpperCase()}`
  const purchaseDate = new Date(purchase.purchaseDate)

  return (
    <div ref={ref} className="invoice-container">
      <div
        className="invoice-container"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "40px",
          background: "white",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <div
          className="invoice-header"
          style={{
            borderBottom: "2px solid #000",
            paddingBottom: "20px",
            marginBottom: "30px",
            pageBreakInside: "avoid",
          }}
        >
          <div
            className="invoice-title"
            style={{
              fontSize: "clamp(20px, 5vw, 28px)",
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            ইনভয়েস
          </div>
          <div className="company-info" style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "clamp(18px, 4vw, 24px)",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              এডমিশন নিয়ে খেলছি
            </h2>
            <p style={{ fontSize: "clamp(12px, 3vw, 16px)" }}>অনলাইন শিক্ষা প্ল্যাটফর্ম</p>
            <p style={{ fontSize: "clamp(12px, 3vw, 16px)" }}>ইমেইল: info@admissionkhelchi.com | ফোন: 01778504001</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div
          className="invoice-details"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "30px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div style={{ flex: "1", minWidth: "250px" }}>
            <h3 style={{ fontWeight: "bold", marginBottom: "10px", fontSize: "clamp(14px, 3vw, 18px)" }}>বিল প্রাপক:</h3>
            <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
              <strong>নাম:</strong> {purchase.studentName}
            </p>
            <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
              <strong>ইমেইল:</strong> {purchase.studentEmail}
            </p>
            <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
              <strong>ফোন:</strong> {purchase.studentPhone}
            </p>
          </div>
          <div style={{ textAlign: "right", flex: "1", minWidth: "250px" }}>
            <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
              <strong>ইনভয়েস নম্বর:</strong> {invoiceNumber}
            </p>
            <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
              <strong>তারিখ:</strong> {purchaseDate.toLocaleDateString("bn-BD")}
            </p>
            <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
              <strong>স্ট্যাটাস:</strong>
              <span
                style={{
                  marginLeft: "8px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "clamp(10px, 2vw, 14px)",
                  backgroundColor:
                    purchase.status === "approved" ? "#dcfce7" : purchase.status === "rejected" ? "#fee2e2" : "#fef3c7",
                  color:
                    purchase.status === "approved" ? "#166534" : purchase.status === "rejected" ? "#991b1b" : "#92400e",
                }}
              >
                {purchase.status === "approved" ? "অনুমোদিত" : purchase.status === "rejected" ? "প্রত্যাখ্যাত" : "অপেক্ষমান"}
              </span>
            </p>
          </div>
        </div>

        {/* Course Details Table */}
        <div style={{ overflowX: "auto", marginBottom: "30px" }}>
          <table
            className="invoice-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "500px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    backgroundColor: "#f5f5f5",
                    fontWeight: "bold",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  কোর্সের নাম
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    backgroundColor: "#f5f5f5",
                    fontWeight: "bold",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  মূল মূল্য
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    backgroundColor: "#f5f5f5",
                    fontWeight: "bold",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  ছাড়
                </th>
                {purchase.couponDiscount && purchase.couponDiscount > 0 && (
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "12px",
                      backgroundColor: "#f5f5f5",
                      fontWeight: "bold",
                      fontSize: "clamp(12px, 2.5vw, 16px)",
                    }}
                  >
                    কুপন ছাড়
                  </th>
                )}
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    backgroundColor: "#f5f5f5",
                    fontWeight: "bold",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  চূড়ান্ত মূল্য
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  {purchase.courseName}
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  ৳{purchase.originalPrice}
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  ৳{purchase.discountAmount || 0}
                </td>
                {purchase.couponDiscount && purchase.couponDiscount > 0 && (
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "12px",
                      fontSize: "clamp(12px, 2.5vw, 16px)",
                    }}
                  >
                    ৳{purchase.couponDiscount}
                  </td>
                )}
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontSize: "clamp(12px, 2.5vw, 16px)",
                  }}
                >
                  ৳{purchase.finalPrice}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Details */}
        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              fontSize: "clamp(14px, 3vw, 18px)",
            }}
          >
            পেমেন্ট বিবরণ:
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
                <strong>পেমেন্ট পদ্ধতি:</strong> {purchase.paymentMethod === "bkash" ? "bKash" : "Nagad"}
              </p>
              <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
                <strong>ট্রানজেকশন আইডি:</strong> {purchase.transactionId}
              </p>
            </div>
            <div>
              {purchase.promoCode && (
                <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
                  <strong>প্রোমো কোড:</strong> {purchase.promoCode}
                </p>
              )}
              {purchase.couponCode && (
                <p style={{ marginBottom: "5px", fontSize: "clamp(12px, 2.5vw, 16px)" }}>
                  <strong>কুপন কোড:</strong> {purchase.couponCode}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Total Section */}
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <div
            style={{
              width: "100%",
              maxWidth: "300px",
              marginLeft: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #ddd",
                fontSize: "clamp(12px, 2.5vw, 16px)",
              }}
            >
              <span>সাবটোটাল:</span>
              <span>৳{purchase.originalPrice}</span>
            </div>
            {purchase.discountAmount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #ddd",
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                }}
              >
                <span>সময়ভিত্তিক ছাড়:</span>
                <span>-৳{purchase.discountAmount}</span>
              </div>
            )}
            {purchase.couponDiscount && purchase.couponDiscount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #ddd",
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                }}
              >
                <span>কুপন ছাড় ({purchase.couponCode}):</span>
                <span>-৳{purchase.couponDiscount}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderTop: "2px solid #000",
                marginTop: "10px",
                fontWeight: "bold",
                fontSize: "clamp(14px, 3vw, 18px)",
              }}
            >
              <span>মোট পরিমাণ:</span>
              <span>৳{purchase.finalPrice}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "50px",
            textAlign: "center",
            fontSize: "clamp(10px, 2vw, 12px)",
            color: "#666",
            borderTop: "1px solid #ddd",
            paddingTop: "20px",
            pageBreakInside: "avoid",
          }}
        >
          <p>ধন্যবাদ আমাদের সাথে থাকার জন্য!</p>
          <p>এই ইনভয়েসটি কম্পিউটার দ্বারা তৈরি এবং কোন স্বাক্ষরের প্রয়োজন নেই।</p>
        </div>
      </div>
    </div>
  )
})

Invoice.displayName = "Invoice"
