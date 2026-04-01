import { FormData } from './types'

interface Props { data: FormData }

function fmt(date: string) {
  if (!date) return 'DD / MM / YYYY'
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' / ')
}

function calcSubtotal(data: FormData) {
  return data.lineItems.reduce((sum, item) => {
    const raw = item.amount.replace(/[^0-9.]/g, '')
    return sum + (parseFloat(raw) || 0) * (item.qty || 1)
  }, 0)
}

function fmtMoney(val: number, cur: string) {
  if (val === 0) return `${cur} 0.00`
  return `${cur} ${val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DocumentPreview({ data }: Props) {
  const isReceipt = data.docType === 'RECEIPT'
  const subtotal = calcSubtotal(data)
  const taxAmt = subtotal * data.taxRate / 100
  const billTotal = subtotal + taxAmt
  const cur = data.currency || 'KES'
  const clientName = `${data.clientFirst} ${data.clientLast}`.trim() || 'FIRST LAST'
  const provName = `${data.provFirst} ${data.provLast}`.trim() || 'FIRST LAST'
  const conName = data.conName || provName
  const invNum = (data.invNum || '0000001').padStart(7, '0')

  const payBlocks: React.ReactNode[] = []
  if (data.activePayments.includes('cheque') && (data.bankName || data.bankAcc)) {
    payBlocks.push(
      <div key="cheque" style={{ marginBottom: 10 }}>
        <div style={S.payTitle}>Physical Cheque</div>
        <div style={S.detail}>
          Bank: {data.bankName || 'BANK NAME'}<br />
          Account: {data.bankAcc || '0000000000'}<br />
          {data.chequeNo && <>Cheque No: {data.chequeNo}<br /></>}
          {data.chequeAmt && <>Amount: {data.chequeAmt}</>}
        </div>
      </div>
    )
  }
  if (data.activePayments.includes('paypal')) {
    payBlocks.push(
      <div key="paypal" style={{ marginBottom: 10 }}>
        <div style={S.payTitle}>PayPal</div>
        <div style={S.detail}>
          Username: {data.paypalUser || '@username'}<br />
          Transaction ID: {data.paypalTx || 'TXID-000'}<br />
          {data.paypalAmt && <>Amount: {data.paypalAmt}</>}
        </div>
      </div>
    )
  }
  if (data.activePayments.includes('bank')) {
    payBlocks.push(
      <div key="bank" style={{ marginBottom: 10 }}>
        <div style={S.payTitle}>Bank Transfer</div>
        <div style={S.detail}>
          Bank: {data.bkName || 'Bank Name'}<br />
          Account: {data.bkAcc || '0000000000'}<br />
          {data.bkSwift && <>SWIFT/IFSC: {data.bkSwift}<br /></>}
          {data.bkAmt && <>Amount: {data.bkAmt}</>}
        </div>
      </div>
    )
  }
  if (data.activePayments.includes('mpesa')) {
    payBlocks.push(
      <div key="mpesa" style={{ marginBottom: 10 }}>
        <div style={S.payTitle}>M-Pesa</div>
        <div style={S.detail}>
          Pay To: {data.mpNum || '0703119107'}<br />
          {isReceipt && data.mpTx && <>Transaction Code: {data.mpTx}<br /></>}
          {data.mpAmt && <>Amount: {data.mpAmt}</>}
        </div>
      </div>
    )
  }

  return (
    <div id="doc-preview" style={{ width: 700, background: '#fff', fontFamily: "'DM Sans', sans-serif", color: '#111' }}>

      {/* TOP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '3px solid #111' }}>
        <div style={{ padding: '32px 30px 24px', borderRight: '1px solid #ddd' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
            {data.docType}
          </div>
        </div>
        <div style={{ padding: '32px 30px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={S.metaLabel}>{isReceipt ? 'Receipt To' : 'Invoice To'}</div>
              <div style={S.metaValue}>{data.clientEntity || 'ENTITY NAME'}</div>
            </div>
            <div>
              <div style={S.metaLabel}>{isReceipt ? 'Receipt' : 'Invoice'} Number</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {invNum.split('').map((c, i) => (
                  <div key={i} style={{ width: 22, height: 22, border: '1px solid #999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{c}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATE BAR */}
      <div style={{ background: '#111', color: '#fff', padding: '8px 22px', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
        {isReceipt ? 'SETTLED ON' : 'ISSUED ON'} &nbsp;·&nbsp; {fmt(data.date)}
      </div>

      {/* BODY */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>

        {/* LEFT */}
        <div style={{ borderRight: '1px solid #ddd' }}>
          <div style={S.leftSection}>
            <div style={S.sectionTitle}>{isReceipt ? 'Paid By' : 'Billed To'}</div>
            <div style={S.name}>{clientName}</div>
            <div style={S.entity}>{data.clientEntity || 'Entity Name'}</div>
            <div style={S.detail}>
              {data.clientWeb && <>{data.clientWeb}<br /></>}
              {data.clientAddress || 'Address, City, Country'}<br />
              {data.clientEmail || 'client@email.com'}
            </div>
          </div>

          <div style={S.leftSection}>
            <div style={S.sectionTitle}>{isReceipt ? 'Paid To' : 'From'}</div>
            <div style={S.name}>{provName}</div>
            <div style={S.entity}>{data.provEntity || 'Entity Name'}</div>
            <div style={S.detail}>
              {data.provWeb && <>{data.provWeb}<br /></>}
              {data.provAddress || 'Address, City, Country'}<br />
              {data.provEmail || 'you@email.com'}
            </div>
          </div>

          <div style={S.leftSection}>
            <div style={S.sectionTitle}>Payment Method</div>
            {payBlocks.length > 0 ? payBlocks : <div style={S.detail}>No payment details added</div>}
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {/* Project desc */}
          <div style={{ padding: '20px 26px', borderBottom: '1px solid #ddd' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#aaa', marginBottom: 8 }}>Project Description</div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7 }}>
              {data.description || 'A brief overview of the project, including its objectives and scope.'}
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111' }}>
                <th style={S.th}>Description of Items</th>
                <th style={{ ...S.th, textAlign: 'center' as const, width: 60 }}>Qty.</th>
                <th style={{ ...S.th, textAlign: 'right' as const }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => {
                const extras = item.extra.split('\n').filter(Boolean)
                return (
                  <tr key={item.id} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, color: '#111' }}>{item.name || 'Item'}</div>
                      {extras.length > 0 && (
                        <div style={{ fontSize: 9.5, color: '#888', marginTop: 2, lineHeight: 1.5 }}>
                          {extras.map((e, j) => <div key={j}>· {e}</div>)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' as const }}>{String(item.qty).padStart(2, '0')}</td>
                    <td style={{ ...S.td, textAlign: 'right' as const }}>{cur} {item.amount || '0'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Seal */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '24px 26px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, #e8c96a, #b8932a 60%, #8a6a18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(184,147,42,0.4)', position: 'relative' as const,
            }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>
                {isReceipt ? 'PAID' : 'DUE'}
              </span>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#888', marginTop: 10, fontStyle: 'italic' as const }}>
              Thank You
            </div>
          </div>

          {/* Totals */}
          <div style={{ padding: '16px 26px' }}>
            <div style={S.totalRow}>
              <span>SUBTOTAL</span>
              <span>{subtotal > 0 ? fmtMoney(subtotal, cur) : `${cur} —`}</span>
            </div>
            <div style={{ ...S.totalRow, color: '#888', fontSize: 11 }}>
              <span>{data.taxLabel}{data.taxRate > 0 ? ` · ${data.taxRate}%` : ''}</span>
              <span style={{ color: data.taxRate > 0 ? '#555' : '#bbb' }}>
                {data.taxRate > 0 ? fmtMoney(taxAmt, cur) : 'Included'}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              background: '#111', color: '#fff',
              padding: '11px 16px', margin: '6px -10px 0',
              borderRadius: 4, fontWeight: 700, fontSize: 14,
            }}>
              <span>BILL TOTAL</span>
              <span>{fmtMoney(billTotal, cur)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SIGNATURE AREA — bottom right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 26px 20px', borderTop: '1px solid #eee' }}>
        <div style={{ width: 200, textAlign: 'center' as const }}>
          {data.sigDataUrl
            ? <img src={data.sigDataUrl} alt="signature" style={{ width: '100%', height: 60, objectFit: 'contain', display: 'block' }} />
            : <div style={{ width: '100%', height: 60, borderBottom: '1.5px solid #333' }} />
          }
          <div style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#aaa', marginTop: 5 }}>Authorised Signature</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, color: '#444', marginTop: 2 }}>{provName}</div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fafafa', borderTop: '1px solid #eee' }}>
        <div style={{ padding: '16px 22px', borderRight: '1px solid #eee' }}>
          <div style={S.footTitle}>Got Any Questions?</div>
          <div style={{ fontSize: 10, color: '#555', lineHeight: 1.8 }}>
            <strong>{conName}</strong><br />
            {data.conWeb && <>{data.conWeb}<br /></>}
            {data.conEmail && <>{data.conEmail}<br /></>}
            {data.conPhone && <>CALL / WHATSAPP {data.conPhone}</>}
          </div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          <div style={S.footTitle}>Payment Acknowledgement</div>
          <div style={{ fontSize: 9, color: '#aaa', lineHeight: 1.6, marginTop: 4 }}>
            The total {isReceipt ? 'invoice' : 'billed'} amount has been {isReceipt ? 'fully paid by' : 'invoiced to'}{' '}
            <strong style={{ color: '#777' }}>{clientName}</strong>
            {data.clientEntity ? <> of <strong style={{ color: '#777' }}>{data.clientEntity}</strong></> : ''}{' '}
            without any deductions. The bill total has been rounded off to the nearest whole number.
          </div>
        </div>
      </div>

    </div>
  )
}

const S = {
  metaLabel: { fontSize: 8, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: '#999', marginBottom: 3 },
  metaValue: { fontSize: 13, fontWeight: 600, color: '#111' },
  leftSection: { padding: '18px 22px', borderBottom: '1px solid #eee' },
  sectionTitle: { fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#bbb', marginBottom: 8 },
  name: { fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, marginBottom: 2 },
  entity: { fontSize: 10, color: '#888', marginBottom: 6 },
  detail: { fontSize: 10, color: '#555', lineHeight: 1.6 },
  payTitle: { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.8, color: '#333', marginBottom: 4 },
  th: { padding: '9px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1, textAlign: 'left' as const, color: '#fff' },
  td: { padding: '9px 14px', fontSize: 11, borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' as const },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f5f5f5', color: '#555' },
  footTitle: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#bbb', marginBottom: 6 },
}
