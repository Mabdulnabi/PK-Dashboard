import React from 'react'
import path from 'path'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Inter-Regular.woff'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/Inter-Bold.woff'),    fontWeight: 700 },
  ],
})

const GOLD   = '#C9A84C'
const GOLD2  = '#E8C96A'
const INK    = '#1A1A1A'
const MUTED  = '#888888'
const LIGHT  = '#F5F0E8'
const BORDER = '#E8D9B0'
const WHITE  = '#FFFFFF'
const GREEN  = '#2D7A4F'
const GREENB = '#E6F4ED'

const f = { xs: 7, sm: 8, md: 9.5, lg: 12, xl: 16, xxl: 28 }

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', backgroundColor: WHITE, fontSize: f.md, color: INK },

  // ── HEADER ──
  header:       { paddingHorizontal: 48, paddingTop: 38, paddingBottom: 0 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  logoImg:      { width: 52, height: 52, borderRadius: 6 },
  logoMark:     { width: 52, height: 52, borderRadius: 6, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  logoLetter:   { color: WHITE, fontSize: 18, fontWeight: 700 },
  brandName:    { fontSize: f.xl, fontWeight: 700, color: INK, marginBottom: 2 },
  brandTag:     { fontSize: f.xs, color: MUTED, letterSpacing: 1 },
  invBlock:     { alignItems: 'flex-end' },
  invWord:      { fontSize: f.xs, fontWeight: 700, color: GOLD, letterSpacing: 3, marginBottom: 5 },
  invNum:       { fontSize: f.xl, fontWeight: 700, color: INK, marginBottom: 3 },
  invDate:      { fontSize: f.xs, color: MUTED },

  // gold divider line
  dividerOuter: { paddingHorizontal: 48, marginVertical: 16 },
  divider:      { height: 1.5, backgroundColor: GOLD },
  dividerThin:  { height: 0.5, backgroundColor: BORDER, marginTop: 3 },

  // ── BODY ──
  body:         { paddingHorizontal: 48, paddingBottom: 40 },

  // ── INFO ROW (4 cols) ──
  infoRow:      { flexDirection: 'row', gap: 0, marginBottom: 28, marginTop: 8 },
  infoCol:      { flex: 1, paddingRight: 16 },
  infoDivider:  { width: 1, backgroundColor: BORDER, marginRight: 16 },
  infoLabel:    { fontSize: f.xs, fontWeight: 700, color: GOLD, letterSpacing: 1.5, marginBottom: 5 },
  infoVal:      { fontSize: f.sm, color: INK, fontWeight: 700, lineHeight: 1.5 },
  infoSub:      { fontSize: f.xs, color: MUTED, lineHeight: 1.6 },

  // status pill
  paidPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREENB, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  paidDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: GREEN },
  paidTxt:      { fontSize: f.xs, fontWeight: 700, color: GREEN, letterSpacing: 0.5 },

  // code badge
  codeBadge:    { backgroundColor: LIGHT, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: BORDER, alignSelf: 'flex-start' },
  codeTxt:      { fontSize: f.sm, fontWeight: 700, color: INK, letterSpacing: 1.5 },

  // ── ITEMS TABLE ──
  tableCap:     { fontSize: f.xs, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 8 },
  tableWrap:    { borderWidth: 1, borderColor: BORDER, borderRadius: 6, overflow: 'hidden', marginBottom: 24 },
  thead:        { flexDirection: 'row', backgroundColor: LIGHT, paddingHorizontal: 16, paddingVertical: 9 },
  theadCell:    { fontSize: f.xs, fontWeight: 700, color: MUTED, letterSpacing: 1.2 },
  trow:         { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: WHITE },
  trowAlt:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#FDFAF3' },
  tcell:        { fontSize: f.md, color: INK },
  trowDivider:  { height: 0.5, backgroundColor: BORDER, marginHorizontal: 16 },

  // ── TOTALS ──
  totalsArea:   { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 32 },
  totalsBox:    { minWidth: 220, borderWidth: 1, borderColor: BORDER, borderRadius: 6, overflow: 'hidden' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  totalRowFill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: GOLD },
  totalKey:     { fontSize: f.sm, color: MUTED },
  totalVal:     { fontSize: f.sm, fontWeight: 700, color: INK },
  grandKey:     { fontSize: f.sm, fontWeight: 700, color: WHITE },
  grandVal:     { fontSize: f.lg, fontWeight: 700, color: WHITE },

  // ── FOOTER ──
  footerWrap:   { borderTopWidth: 1.5, borderTopColor: GOLD, marginTop: 8, paddingTop: 14 },
  footerThin:   { borderTopWidth: 0.5, borderTopColor: BORDER, marginTop: 3, marginBottom: 14 },
  footerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerTxt:    { fontSize: f.xs, color: MUTED, lineHeight: 1.8 },
  footerBrand:  { fontSize: f.xs, fontWeight: 700, color: GOLD, letterSpacing: 1 },
})

// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceData {
  id: string; amount: number; currency: string; gateway: string
  transaction_id: string | null; tool_name: string | null
  bundle_name: string | null; created_at: string; payment_code?: string | null
}
export interface MemberData { full_name: string; email: string; phone?: string | null }
interface Props { payment: InvoiceData; member: MemberData; logoUrl: string | null; siteName: string }

const GW: Record<string, string> = {
  instapay: 'InstaPay', vodafone: 'Vodafone Cash', binance: 'Binance Pay',
  bybit: 'Bybit Pay', bep20: 'USDT BEP20', easykash: 'EasyKash', coupon: 'Coupon',
}

function InfoCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.infoCol}>
      <Text style={s.infoLabel}>{label}</Text>
      {children}
    </View>
  )
}

export function InvoicePDF({ payment, member, logoUrl, siteName }: Props) {
  const invoiceN   = `INV-${payment.id.slice(0, 8).toUpperCase()}`
  const code       = payment.payment_code || `PK-${payment.id.slice(0, 6).toUpperCase()}`
  const issueDate  = new Date(payment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const dueDate    = issueDate // same day — paid invoice
  const currency   = (payment.currency || 'EGP').toUpperCase()
  const amount     = Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
  const method     = GW[payment.gateway] || payment.gateway || '—'
  const product    = payment.tool_name || payment.bundle_name || 'Digital Subscription'
  const abbr       = siteName.slice(0, 2).toUpperCase()

  return (
    <Document title={`Invoice ${invoiceN}`} author={siteName}>
      <Page size="A4" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            {/* Brand */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {logoUrl
                ? <Image src={logoUrl} style={s.logoImg} />
                : <View style={s.logoMark}><Text style={s.logoLetter}>{abbr}</Text></View>
              }
              <View>
                <Text style={s.brandName}>{siteName}</Text>
                <Text style={s.brandTag}>DIGITAL SUBSCRIPTIONS & TOOLS</Text>
              </View>
            </View>
            {/* Invoice meta */}
            <View style={s.invBlock}>
              <Text style={s.invWord}>INVOICE</Text>
              <Text style={s.invNum}>{invoiceN}</Text>
              <Text style={s.invDate}>Issued {issueDate}</Text>
            </View>
          </View>
        </View>

        {/* Gold rule */}
        <View style={s.dividerOuter}>
          <View style={s.divider}/>
          <View style={s.dividerThin}/>
        </View>

        {/* ── BODY ── */}
        <View style={s.body}>

          {/* ── INFO ROW ── */}
          <View style={s.infoRow}>
            <InfoCol label="BILLED TO">
              <Text style={s.infoVal}>{member.full_name}</Text>
              <Text style={s.infoSub}>{member.email}</Text>
              {member.phone ? <Text style={s.infoSub}>{member.phone}</Text> : null}
            </InfoCol>
            <View style={s.infoDivider}/>
            <InfoCol label="PAYMENT STATUS">
              <View style={s.paidPill}>
                <View style={s.paidDot}/>
                <Text style={s.paidTxt}>PAID IN FULL</Text>
              </View>
              <Text style={[s.infoSub, { marginTop: 5 }]}>Due Date: {dueDate}</Text>
            </InfoCol>
            <View style={s.infoDivider}/>
            <InfoCol label="PAYMENT METHOD">
              <Text style={s.infoVal}>{method}</Text>
              {payment.transaction_id
                ? <Text style={s.infoSub}>{payment.transaction_id}</Text>
                : null}
            </InfoCol>
            <View style={s.infoDivider}/>
            <InfoCol label="REFERENCE CODE">
              <View style={s.codeBadge}>
                <Text style={s.codeTxt}>{code}</Text>
              </View>
            </InfoCol>
          </View>

          {/* ── ITEMS TABLE ── */}
          <Text style={s.tableCap}>ORDER SUMMARY</Text>
          <View style={s.tableWrap}>
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 1 }]}>NO.</Text>
              <Text style={[s.theadCell, { flex: 5 }]}>DESCRIPTION</Text>
              <Text style={[s.theadCell, { flex: 2, textAlign: 'center' }]}>QTY</Text>
              <Text style={[s.theadCell, { flex: 2, textAlign: 'center' }]}>UNIT PRICE</Text>
              <Text style={[s.theadCell, { flex: 2, textAlign: 'right' }]}>TOTAL</Text>
            </View>
            <View style={s.trow}>
              <Text style={[s.tcell, { flex: 1, color: MUTED }]}>01</Text>
              <Text style={[s.tcell, { flex: 5, fontWeight: 700 }]}>{product}</Text>
              <Text style={[s.tcell, { flex: 2, textAlign: 'center', color: MUTED }]}>1</Text>
              <Text style={[s.tcell, { flex: 2, textAlign: 'center', color: MUTED }]}>{amount} {currency}</Text>
              <Text style={[s.tcell, { flex: 2, textAlign: 'right', fontWeight: 700, color: GOLD }]}>{amount} {currency}</Text>
            </View>
          </View>

          {/* ── TOTALS ── */}
          <View style={s.totalsArea}>
            <View style={s.totalsBox}>
              <View style={s.totalRow}>
                <Text style={s.totalKey}>Subtotal</Text>
                <Text style={s.totalVal}>{amount} {currency}</Text>
              </View>
              <View style={{ height: 0.5, backgroundColor: BORDER }}/>
              <View style={s.totalRow}>
                <Text style={s.totalKey}>Discount</Text>
                <Text style={s.totalVal}>0.00 {currency}</Text>
              </View>
              <View style={{ height: 0.5, backgroundColor: BORDER }}/>
              <View style={s.totalRowFill}>
                <Text style={s.grandKey}>TOTAL PAID</Text>
                <Text style={s.grandVal}>{amount} {currency}</Text>
              </View>
            </View>
          </View>

          {/* ── FOOTER ── */}
          <View style={s.footerWrap}>
            <View style={s.footerThin}/>
            <View style={s.footerRow}>
              <Text style={s.footerTxt}>
                Thank you for your purchase.{'\n'}
                For support, open a ticket in your member dashboard and reference code{' '}
                <Text style={{ fontWeight: 700, color: INK }}>{code}</Text>.
              </Text>
              <Text style={s.footerBrand}>{siteName.toUpperCase()}</Text>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  )
}
