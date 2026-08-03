import React from 'react'
import path from 'path'
import { Document, Page, Text, View, Image, StyleSheet, Font, Line, Svg } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Inter-Regular.woff'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/Inter-Bold.woff'),    fontWeight: 700 },
  ],
})

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ink:     '#0D1117',   // near-black text
  navy:    '#161F2E',   // dark header bg
  navy2:   '#1E2A3D',   // slightly lighter panel
  gold:    '#E6A817',   // amber accent
  goldDim: '#7A5A0A',   // muted gold for subtitles on dark bg
  muted:   '#64748B',   // body muted text
  border:  '#E2E8F0',   // card border
  bg:      '#F8FAFC',   // light card bg
  white:   '#FFFFFF',
  green:   '#059669',
  greenBg: '#D1FAE5',
}

const f = {
  xs:  7,
  sm:  8,
  md:  9.5,
  lg:  12,
  xl:  18,
  xxl: 26,
}

const s = StyleSheet.create({
  page:        { fontFamily: 'Inter', backgroundColor: C.white, fontSize: f.md, color: C.ink },

  // ── TOP BAR ──
  topBar:      { backgroundColor: C.navy, paddingHorizontal: 48, paddingTop: 36, paddingBottom: 32 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoImg:     { width: 44, height: 44, borderRadius: 8 },
  logoMark:    { width: 44, height: 44, borderRadius: 8, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  logoLetter:  { color: C.navy, fontSize: 17, fontWeight: 700 },
  brandBlock:  { marginLeft: 12 },
  brandName:   { color: C.white, fontSize: f.lg, fontWeight: 700, marginBottom: 2 },
  brandTag:    { color: C.goldDim, fontSize: f.xs, letterSpacing: 0.5 },
  invMeta:     { alignItems: 'flex-end' },
  invWord:     { color: C.gold, fontSize: f.sm, fontWeight: 700, letterSpacing: 2, marginBottom: 6 },
  invNumber:   { color: C.white, fontSize: f.xl, fontWeight: 700, marginBottom: 4 },
  invDate:     { color: C.muted, fontSize: f.xs },

  // gold rule under top bar
  rule:        { height: 3, backgroundColor: C.gold },

  // ── BODY ──
  body:        { paddingHorizontal: 48, paddingTop: 32, paddingBottom: 40 },

  // ── BILL TO / STATUS row ──
  dualRow:     { flexDirection: 'row', gap: 20, marginBottom: 32 },
  infoCard:    { flex: 1, backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 18 },
  cardCap:     { fontSize: f.xs, fontWeight: 700, color: C.muted, letterSpacing: 1.8, marginBottom: 12 },
  personName:  { fontSize: f.lg, fontWeight: 700, color: C.ink, marginBottom: 3 },
  personSub:   { fontSize: f.sm, color: C.muted, lineHeight: 1.6 },

  paidPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.greenBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 14 },
  paidDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: C.green },
  paidTxt:     { fontSize: f.xs, fontWeight: 700, color: C.green },
  refLine:     { height: 1, backgroundColor: C.border, marginVertical: 12 },
  refKey:      { fontSize: f.xs, color: C.muted, marginBottom: 4 },
  refVal:      { fontSize: f.sm, fontWeight: 700, color: C.ink, letterSpacing: 0.3 },

  // ── ITEMS TABLE ──
  tableCap:    { fontSize: f.xs, fontWeight: 700, color: C.muted, letterSpacing: 1.8, marginBottom: 10 },
  tableWrap:   { borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  thead:       { flexDirection: 'row', backgroundColor: C.navy2, paddingHorizontal: 18, paddingVertical: 10 },
  theadCell:   { fontSize: f.xs, fontWeight: 700, color: C.muted, letterSpacing: 1.2 },
  tbody:       { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: C.white },
  tbodyCell:   { fontSize: f.md, color: C.ink },

  // ── TOTAL ──
  totalArea:   { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 36 },
  totalPanel:  { backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 20, alignItems: 'flex-end', minWidth: 210 },
  totalCap:    { fontSize: f.xs, color: C.muted, letterSpacing: 1.8, marginBottom: 8 },
  totalRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  totalNum:    { fontSize: f.xxl, fontWeight: 700, color: C.gold },
  totalCurr:   { fontSize: f.md, fontWeight: 700, color: C.muted },

  // ── FOOTER ──
  footerRule:  { height: 1, backgroundColor: C.border, marginBottom: 18 },
  footerTxt:   { fontSize: f.xs, color: C.muted, textAlign: 'center', lineHeight: 2 },
})

// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceData {
  id: string; amount: number; currency: string; gateway: string
  transaction_id: string | null; tool_name: string | null
  bundle_name: string | null; created_at: string
}
export interface MemberData { full_name: string; email: string; phone?: string | null }
interface Props { payment: InvoiceData; member: MemberData; logoUrl: string | null; siteName: string }

const GW: Record<string, string> = {
  instapay: 'InstaPay', vodafone: 'Vodafone Cash', binance: 'Binance Pay',
  bybit: 'Bybit Pay', bep20: 'USDT BEP20', easykash: 'EasyKash', coupon: 'Coupon',
}

export function InvoicePDF({ payment, member, logoUrl, siteName }: Props) {
  const invoiceN = `INV-${payment.id.slice(0, 8).toUpperCase()}`
  const date     = new Date(payment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const currency = (payment.currency || 'EGP').toUpperCase()
  const amount   = Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
  const method   = GW[payment.gateway] || payment.gateway || '-'
  const product  = payment.tool_name || payment.bundle_name || 'Digital Subscription'
  const abbr     = siteName.slice(0, 2).toUpperCase()

  return (
    <Document title={`Invoice ${invoiceN}`} author={siteName}>
      <Page size="A4" style={s.page}>

        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <View style={s.topRow}>
            {/* Brand */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {logoUrl
                ? <Image src={logoUrl} style={s.logoImg} />
                : <View style={s.logoMark}><Text style={s.logoLetter}>{abbr}</Text></View>
              }
              <View style={s.brandBlock}>
                <Text style={s.brandName}>{siteName}</Text>
                <Text style={s.brandTag}>Digital Subscriptions & Tools</Text>
              </View>
            </View>
            {/* Invoice ref */}
            <View style={s.invMeta}>
              <Text style={s.invWord}>INVOICE</Text>
              <Text style={s.invNumber}>{invoiceN}</Text>
              <Text style={s.invDate}>Issued {date}</Text>
            </View>
          </View>
        </View>

        {/* Gold rule */}
        <View style={s.rule} />

        {/* ── BODY ── */}
        <View style={s.body}>

          {/* Bill To + Status */}
          <View style={s.dualRow}>
            {/* Bill To */}
            <View style={s.infoCard}>
              <Text style={s.cardCap}>BILL TO</Text>
              <Text style={s.personName}>{member.full_name}</Text>
              <Text style={s.personSub}>{member.email}</Text>
              {member.phone ? <Text style={s.personSub}>{member.phone}</Text> : null}
            </View>
            {/* Status */}
            <View style={s.infoCard}>
              <Text style={s.cardCap}>PAYMENT STATUS</Text>
              <View style={s.paidPill}>
                <View style={s.paidDot} />
                <Text style={s.paidTxt}>PAID</Text>
              </View>
              <View style={s.refLine} />
              <Text style={s.refKey}>TRANSACTION REFERENCE</Text>
              <Text style={s.refVal}>{payment.transaction_id || 'AUTO-VERIFIED'}</Text>
            </View>
          </View>

          {/* Items table */}
          <Text style={s.tableCap}>ORDER DETAILS</Text>
          <View style={s.tableWrap}>
            {/* Head */}
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 4 }]}>DESCRIPTION</Text>
              <Text style={[s.theadCell, { flex: 2, textAlign: 'center' }]}>PAYMENT METHOD</Text>
              <Text style={[s.theadCell, { flex: 2, textAlign: 'right' }]}>AMOUNT</Text>
            </View>
            {/* Row */}
            <View style={s.tbody}>
              <Text style={[s.tbodyCell, { flex: 4, fontWeight: 700 }]}>{product}</Text>
              <Text style={[s.tbodyCell, { flex: 2, textAlign: 'center', color: C.muted }]}>{method}</Text>
              <Text style={[s.tbodyCell, { flex: 2, textAlign: 'right', fontWeight: 700, color: C.gold }]}>
                {amount} {currency}
              </Text>
            </View>
          </View>

          {/* Total */}
          <View style={s.totalArea}>
            <View style={s.totalPanel}>
              <Text style={s.totalCap}>TOTAL PAID</Text>
              <View style={s.totalRow}>
                <Text style={s.totalNum}>{amount}</Text>
                <Text style={s.totalCurr}>{currency}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={s.footerRule} />
          <Text style={s.footerTxt}>
            Thank you for your purchase. For any questions, please open a support ticket in your member dashboard.{'\n'}
            This invoice was automatically generated by {siteName}.
          </Text>

        </View>
      </Page>
    </Document>
  )
}
