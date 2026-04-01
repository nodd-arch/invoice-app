"use client";
import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { FormData, LineItem, PaymentMethod, defaultFormData } from "./types";
import DocumentPreview from "./DocumentPreview";

const SignaturePad = dynamic(() => import("./SignaturePad"), { ssr: false });

let _itemCounter = 1;

// Read next invoice number from localStorage (increments each session/download)
function getNextInvNum(): string {
  if (typeof window === "undefined") return "0000001";
  const stored = parseInt(localStorage.getItem("charis_inv_num") || "0", 10);
  const next = stored + 1;
  return String(next).padStart(7, "0");
}

function saveInvNum(num: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("charis_inv_num", String(parseInt(num, 10)));
}

export default function InvoiceGenerator() {
  const [data, setData] = useState<FormData>(defaultFormData);

  // Set auto-incremented number on mount (client only)
  useEffect(() => {
    setData((prev) => ({ ...prev, invNum: getNextInvNum() }));
  }, []);

  const set = useCallback((key: keyof FormData, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setItem = (id: number, key: keyof LineItem, value: string | number) => {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((i) =>
        i.id === id ? { ...i, [key]: value } : i,
      ),
    }));
  };

  const addItem = () => {
    const id = ++_itemCounter;
    setData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id, name: "", qty: 1, amount: "", extra: "" },
      ],
    }));
  };

  const removeItem = (id: number) => {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((i) => i.id !== id),
    }));
  };

  const togglePayment = (method: PaymentMethod) => {
    setData((prev) => {
      const active = prev.activePayments;
      if (active.includes(method)) {
        if (active.length === 1) return prev;
        return { ...prev, activePayments: active.filter((m) => m !== method) };
      }
      return { ...prev, activePayments: [...active, method] };
    });
  };

  const downloadPDF = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");

    const el = document.getElementById("doc-preview");
    if (!el) return;

    const btn = document.getElementById("dl-btn") as HTMLButtonElement;
    btn.textContent = "Generating PDF…";
    btn.disabled = true;

    await new Promise((r) => setTimeout(r, 150));

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      const A4_W = 210;
      const A4_H = 297;
      const imgW = A4_W;
      const imgH = (canvas.height / canvas.width) * imgW;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      if (imgH <= A4_H + 2) {
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.97),
          "JPEG",
          0,
          0,
          imgW,
          imgH,
        );
      } else {
        const pxPerPage = Math.floor((A4_H / imgH) * canvas.height);
        let srcY = 0;
        let page = 0;
        while (srcY < canvas.height) {
          const srcH = Math.min(pxPerPage, canvas.height - srcY);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = pxPerPage;
          const ctx = slice.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(
            canvas,
            0,
            srcY,
            canvas.width,
            srcH,
            0,
            0,
            canvas.width,
            srcH,
          );
          if (page > 0) pdf.addPage();
          pdf.addImage(
            slice.toDataURL("image/jpeg", 0.97),
            "JPEG",
            0,
            0,
            imgW,
            (srcH / canvas.width) * imgW,
          );
          srcY += pxPerPage;
          page++;
        }
      }

      pdf.save(`${data.docType.toLowerCase()}-${data.invNum || "doc"}.pdf`);
      saveInvNum(data.invNum); // advance counter after successful save
    } catch (err) {
      alert("PDF generation failed: " + (err as Error).message);
    }

    btn.textContent = `↓ PDF`;
    btn.disabled = false;
  };

  const downloadPNG = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const el = document.getElementById("doc-preview");
    if (!el) return;

    const btn = document.getElementById("png-btn") as HTMLButtonElement;
    btn.textContent = "Generating…";
    btn.disabled = true;

    await new Promise((r) => setTimeout(r, 150));

    try {
      const canvas = await html2canvas(el, {
        scale: 3, // higher scale = crisper PNG
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      const link = document.createElement("a");
      link.download = `${data.docType.toLowerCase()}-${data.invNum || "doc"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      saveInvNum(data.invNum); // advance counter after successful save
    } catch (err) {
      alert("Image generation failed: " + (err as Error).message);
    }

    btn.textContent = `↓ PNG`;
    btn.disabled = false;
  };

  const F = (
    label: string,
    key: keyof FormData,
    placeholder = "",
    type = "text",
  ) => (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      <input
        type={type}
        value={data[key] as string}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
        style={S.input}
      />
    </div>
  );

  const payMethods: { id: PaymentMethod; label: string }[] = [
    { id: "cheque", label: "Cheque" },
    { id: "paypal", label: "PayPal" },
    { id: "bank", label: "Bank Transfer" },
    { id: "mpesa", label: "M-Pesa" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "420px 1fr",
        minHeight: "100vh",
      }}
    >
      {/* ── FORM PANEL ── */}
      <aside
        style={{
          background: "var(--paper)",
          height: "100vh",
          overflowY: "auto",
          position: "sticky",
          top: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "28px 28px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--cream)",
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Doc Generator
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 3,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Invoice & Receipt Builder
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              background: "var(--border)",
              borderRadius: 8,
              padding: 3,
              gap: 3,
            }}
          >
            {(["INVOICE", "RECEIPT"] as const).map((t) => (
              <button
                key={t}
                onClick={() => set("docType", t)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  border: "none",
                  borderRadius: 6,
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: data.docType === t ? "var(--ink)" : "transparent",
                  color: data.docType === t ? "#fff" : "var(--muted)",
                  transition: "all 0.2s",
                }}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
          {/* Doc Details */}
          <Section label="Document Details">
            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>
                  {data.docType === "RECEIPT" ? "Receipt" : "Invoice"} Number
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 9,
                      color: "var(--gold)",
                      fontWeight: 600,
                    }}
                  >
                    AUTO
                  </span>
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={data.invNum}
                    onChange={(e) => set("invNum", e.target.value)}
                    style={{
                      ...S.input,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: 1,
                    }}
                  />
                  <button
                    title="Advance to next number"
                    onClick={() => {
                      const next = String(
                        parseInt(data.invNum || "0", 10) + 1,
                      ).padStart(7, "0");
                      set("invNum", next);
                    }}
                    style={{
                      padding: "0 10px",
                      background: "var(--ink)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    +1
                  </button>
                </div>
              </div>
              {F(
                data.docType === "RECEIPT" ? "Date Settled" : "Issue Date",
                "date",
                "",
                "date",
              )}
            </div>

            {/* Receipt-only: transaction code at the top for visibility */}
            {data.docType === "RECEIPT" && (
              <div style={S.field}>
                <label
                  style={{ ...S.label, color: "var(--gold)", fontWeight: 600 }}
                >
                  M-Pesa Transaction Code{" "}
                  <span style={{ color: "var(--red)", fontSize: 11 }}>*</span>
                </label>
                <input
                  value={data.mpTx}
                  placeholder="e.g. QHX4K2MNOP"
                  onChange={(e) => set("mpTx", e.target.value)}
                  style={{
                    ...S.input,
                    fontFamily: "monospace",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                />
              </div>
            )}

            <div style={S.field}>
              <label style={S.label}>Project / Items Description</label>
              <textarea
                value={data.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A brief overview of the project…"
                style={{
                  ...S.input,
                  resize: "vertical",
                  minHeight: 70,
                  lineHeight: 1.5,
                }}
              />
            </div>
          </Section>

          {/* Client */}
          <Section label="Client (Billed To)">
            <div style={S.row}>
              {F("First Name", "clientFirst", "First")}
              {F("Last Name", "clientLast", "Last")}
            </div>
            {F("Entity / Company", "clientEntity", "Entity Name")}
            {F("Website", "clientWeb", "website.com")}
            {F("Address", "clientAddress", "No.00, Street, City, Country")}
            {F("Email", "clientEmail", "client@email.com", "email")}
          </Section>

          {/* Provider */}
          <Section label="Your Details (Service Provider)">
            <div style={S.row}>
              {F("First Name", "provFirst", "First")}
              {F("Last Name", "provLast", "Last")}
            </div>
            {F("Entity / Company", "provEntity", "Entity Name")}
            {F("Website", "provWeb", "yoursite.com")}
            {F("Address", "provAddress", "No.00, Street, City, Country")}
            {F("Email", "provEmail", "you@email.com", "email")}
          </Section>

          {/* Payment */}
          <Section label="Payment Method">
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
                flexWrap: "wrap" as const,
              }}
            >
              {payMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => togglePayment(m.id)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: data.activePayments.includes(m.id)
                      ? "var(--ink)"
                      : "var(--cream)",
                    color: data.activePayments.includes(m.id)
                      ? "#fff"
                      : "var(--muted)",
                    transition: "all 0.15s",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {data.activePayments.includes("cheque") && (
              <>
                <div style={S.row}>
                  {F("Bank Name", "bankName", "BANK NAME")}
                  {F("Account #", "bankAcc", "0123456789")}
                </div>
                <div style={S.row}>
                  {F("Cheque No.", "chequeNo", "012233344444")}
                  {F("Amount", "chequeAmt", "KES 00,000")}
                </div>
              </>
            )}
            {data.activePayments.includes("paypal") && (
              <>
                {F("PayPal Username", "paypalUser", "@username")}
                <div style={S.row}>
                  {F("Transaction ID", "paypalTx", "TXID-000000")}
                  {F("Amount", "paypalAmt", "KES 00,000")}
                </div>
              </>
            )}
            {data.activePayments.includes("bank") && (
              <>
                {F("Bank Name", "bkName", "Bank Name")}
                <div style={S.row}>
                  {F("PAYBILL", "bkAcc", "0000000000")}
                  {F("ACCOUNT NO.", "bkSwift", "CODE")}
                </div>
                {F("Amount", "bkAmt", "KES 00,000")}
              </>
            )}
            {data.activePayments.includes("mpesa") && (
              <>
                <div style={S.row}>
                  {F("M-Pesa Number", "mpNum", "0703119107")}
                  {F("Amount (KES)", "mpAmt", "KES 10,000")}
                </div>
                {data.docType === "RECEIPT" &&
                  F("Transaction Code", "mpTx", "e.g. QHX4K2...")}
              </>
            )}
          </Section>

          {/* Line Items */}
          <Section label="Line Items">
            {data.lineItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 65px 85px 28px",
                    gap: 8,
                    alignItems: "start",
                  }}
                >
                  <div style={S.field}>
                    <label style={S.label}>Description</label>
                    <input
                      value={item.name}
                      placeholder="Item name"
                      onChange={(e) => setItem(item.id, "name", e.target.value)}
                      style={S.input}
                    />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      min={1}
                      onChange={(e) =>
                        setItem(item.id, "qty", parseInt(e.target.value) || 1)
                      }
                      style={S.input}
                    />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Amount</label>
                    <input
                      value={item.amount}
                      placeholder="0,000"
                      onChange={(e) =>
                        setItem(item.id, "amount", e.target.value)
                      }
                      style={S.input}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      fontSize: 18,
                      lineHeight: 1,
                      padding: "6px 4px",
                      alignSelf: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px dashed var(--border)",
                  }}
                >
                  <div style={S.field}>
                    <label style={S.label}>Extra Details (one per line)</label>
                    <textarea
                      value={item.extra}
                      placeholder="extra detail&#10;another detail"
                      rows={2}
                      onChange={(e) =>
                        setItem(item.id, "extra", e.target.value)
                      }
                      style={{ ...S.input, resize: "vertical" }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addItem}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "1.5px dashed var(--border)",
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--muted)",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Line
              Item
            </button>
          </Section>

          {/* Totals */}
          <Section label="Totals">
            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>Currency</label>
                <input
                  value={data.currency}
                  placeholder="KES"
                  onChange={(e) => set("currency", e.target.value)}
                  style={{ ...S.input, maxWidth: 80 }}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>VAT Rate (%)</label>
                <input
                  type="number"
                  value={data.taxRate}
                  min={0}
                  max={100}
                  step={0.5}
                  onChange={(e) =>
                    set("taxRate", parseFloat(e.target.value) || 0)
                  }
                  style={S.input}
                />
              </div>
            </div>
            {F("VAT Label", "taxLabel", "VAT (Included in price)")}
          </Section>

          {/* Contact */}
          <Section label="Contact / Footer">
            <div style={S.row}>
              {F("Contact Name", "conName", "RAPHAEL GATHONDU")}
              {F("Call / WhatsApp", "conPhone", "0703119107")}
            </div>
            <div style={S.row}>
              {F("Website", "conWeb", "website.com")}
              {F("Email", "conEmail", "you@mail.com", "email")}
            </div>
          </Section>

          {/* Signature */}
          <Section label="Signature">
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
              Draw your signature — it will appear bottom-right on the document.
            </p>
            <SignaturePad
              onApply={(url) => set("sigDataUrl", url)}
              onRemove={() => set("sigDataUrl", null)}
            />
          </Section>
        </div>

        {/* Footer / Download */}
        <div
          style={{
            padding: "14px 28px",
            borderTop: "1px solid var(--border)",
            background: "var(--cream)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--muted)",
              marginBottom: 8,
              textAlign: "center",
              letterSpacing: 0.3,
            }}
          >
            {data.docType} · {data.invNum || "0000001"}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <button
              id="dl-btn"
              onClick={downloadPDF}
              style={{
                padding: "12px 0",
                background: "var(--ink)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: 0.3,
              }}
            >
              ↓ PDF
            </button>
            <button
              id="png-btn"
              onClick={downloadPNG}
              style={{
                padding: "12px 0",
                background: "var(--gold)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: 0.3,
              }}
            >
              ↓ PNG
            </button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 9.5, color: "var(--muted)" }}>
              PDF — for printing &amp; email
            </span>
            <span style={{ fontSize: 9.5, color: "var(--muted)" }}>
              PNG — for WhatsApp &amp; sharing
            </span>
          </div>
        </div>
      </aside>

      {/* ── PREVIEW PANEL ── */}
      <main
        style={{
          background: "#2a2720",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 40px 80px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6b6560",
            marginBottom: 24,
            alignSelf: "flex-start",
          }}
        >
          Live Preview
        </div>
        <div style={{ boxShadow: "0 20px 80px rgba(0,0,0,0.6)" }}>
          <DocumentPreview data={data} />
        </div>
      </main>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "20px 28px 16px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: 1.5,
          color: "var(--gold)",
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const S = {
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--muted)",
    letterSpacing: 0.3,
  },
  input: {
    fontFamily: "inherit",
    fontSize: 13,
    padding: "8px 10px",
    border: "1px solid var(--border)",
    borderRadius: 6,
    background: "var(--cream)",
    color: "var(--ink)",
    outline: "none",
    width: "100%",
  },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
};
