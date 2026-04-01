export type DocType = 'INVOICE' | 'RECEIPT'
export type PaymentMethod = 'cheque' | 'paypal' | 'bank' | 'mpesa'

export interface LineItem {
  id: number
  name: string
  qty: number
  amount: string
  extra: string
}

export interface FormData {
  docType: DocType
  invNum: string
  date: string
  description: string
  // Client
  clientFirst: string
  clientLast: string
  clientEntity: string
  clientWeb: string
  clientAddress: string
  clientEmail: string
  // Provider
  provFirst: string
  provLast: string
  provEntity: string
  provWeb: string
  provAddress: string
  provEmail: string
  // Payment
  activePayments: PaymentMethod[]
  bankName: string
  bankAcc: string
  chequeNo: string
  chequeAmt: string
  paypalUser: string
  paypalTx: string
  paypalAmt: string
  bkName: string
  bkAcc: string
  bkSwift: string
  bkAmt: string
  mpNum: string
  mpTx: string
  mpAmt: string
  // Totals
  currency: string
  taxRate: number
  taxLabel: string
  // Contact
  conName: string
  conPhone: string
  conWeb: string
  conEmail: string
  // Items
  lineItems: LineItem[]
  // Signature
  sigDataUrl: string | null
}

export const defaultFormData: FormData = {
  docType: 'INVOICE',
  invNum: '0000001',
  date: new Date().toISOString().split('T')[0],
  description: '',
  clientFirst: '', clientLast: '', clientEntity: '', clientWeb: '', clientAddress: '', clientEmail: '',
  provFirst: 'RAPHAEL', provLast: 'GATHONDU',
  provEntity: 'CHARIS TECH STORE',
  provWeb: '',
  provAddress: 'Nyeri, Kenya',
  provEmail: '',
  activePayments: ['mpesa'],
  bankName: '', bankAcc: '', chequeNo: '', chequeAmt: '',
  paypalUser: '', paypalTx: '', paypalAmt: '',
  bkName: '', bkAcc: '', bkSwift: '', bkAmt: '',
  mpNum: '0703119107', mpTx: '', mpAmt: '',
  currency: 'KES',
  taxRate: 0,
  taxLabel: 'VAT (Included in price)',
  conName: 'RAPHAEL GATHONDU', conPhone: '0703119107', conWeb: '', conEmail: '',
  lineItems: [
    { id: 1, name: 'Billable Item 1', qty: 1, amount: '', extra: '' },
    { id: 2, name: 'Billable Item 2', qty: 1, amount: '', extra: '' },
  ],
  sigDataUrl: null,
}
