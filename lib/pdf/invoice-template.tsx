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
const INK    = '#1A1A1A'
const MUTED  = '#888888'
const LIGHT  = '#F5F0E8'
const BORDER = '#E8D9B0'
const WHITE  = '#FFFFFF'
const GREEN  = '#2D7A4F'
const GREENB = '#E6F4ED'

const f = { xs: 7, sm: 8, md: 9.5, lg: 12, xxl: 26 }

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', backgroundColor: WHITE, fontSize: f.md, color: INK },

  // ── HEADER ──
  header:       { paddingHorizontal: 48, paddingTop: 38, paddingBottom: 0 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoImg:      { height: 44, maxWidth: 180, objectFit: 'contain' },

  invBlock:     { alignItems: 'flex-end' },
  invWord:      { fontSize: f.xs, fontWeight: 700, color: GOLD, letterSpacing: 3, marginBottom: 5 },
  invNum:       { fontSize: f.lg, fontWeight: 700, color: INK, marginBottom: 3 },
  invDate:      { fontSize: f.xs, color: MUTED },

  // gold rule
  ruleWrap:     { paddingHorizontal: 48, marginBottom: 24 },
  ruleLine:     { height: 1.5, backgroundColor: GOLD },
  ruleThin:     { height: 0.5, backgroundColor: BORDER, marginTop: 3 },

  // ── BODY ──
  body:         { paddingHorizontal: 48 },

  // ── 2-COL INFO ──
  infoRow:      { flexDirection: 'row', gap: 40, marginBottom: 28 },
  infoCol:      { flex: 1 },
  section:      { marginBottom: 18 },
  secLabel:     { fontSize: f.xs, fontWeight: 700, color: GOLD, letterSpacing: 1.8, marginBottom: 6 },
  secVal:       { fontSize: f.sm, fontWeight: 700, color: INK, lineHeight: 1.5 },
  secSub:       { fontSize: f.xs, color: MUTED, lineHeight: 1.6 },

  paidPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREENB,
                  borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 5 },
  paidDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: GREEN },
  paidTxt:      { fontSize: f.xs, fontWeight: 700, color: GREEN, letterSpacing: 0.5 },

  codeBadge:    { backgroundColor: LIGHT, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
                  borderWidth: 1, borderColor: BORDER, alignSelf: 'flex-start', marginBottom: 5 },
  codeTxt:      { fontSize: f.sm, fontWeight: 700, color: INK, letterSpacing: 2 },

  // ── TABLE ──
  tableCap:     { fontSize: f.xs, fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 8 },
  tableWrap:    { borderWidth: 1, borderColor: BORDER, borderRadius: 6, overflow: 'hidden', marginBottom: 24 },
  thead:        { flexDirection: 'row', backgroundColor: LIGHT, paddingHorizontal: 16, paddingVertical: 9 },
  theadCell:    { fontSize: f.xs, fontWeight: 700, color: MUTED, letterSpacing: 1.2 },
  trow:         { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13 },
  tcell:        { fontSize: f.md, color: INK },

  // ── TOTALS ──
  totalsArea:   { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 0 },
  totalsBox:    { minWidth: 230, borderWidth: 1, borderColor: BORDER, borderRadius: 6, overflow: 'hidden' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 8 },
  totalRowGold: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 10, backgroundColor: GOLD },
  totalKey:     { fontSize: f.sm, color: MUTED },
  totalVal:     { fontSize: f.sm, fontWeight: 700, color: INK },
  grandKey:     { fontSize: f.sm, fontWeight: 700, color: WHITE },
  grandVal:     { fontSize: f.lg, fontWeight: 700, color: WHITE },

  // ── FOOTER (absolute bottom) ──
  footer:       { position: 'absolute', bottom: 36, left: 48, right: 48,
                  borderTopWidth: 1.5, borderTopColor: GOLD, paddingTop: 12 },
  footerThin:   { borderTopWidth: 0.5, borderTopColor: BORDER, marginTop: 3, marginBottom: 12 },
  footerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
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

const LOGO_URL = 'https://mluqxggjbumtmyfldaon.supabase.co/storage/v1/object/public/site-assets/Horizontal%20Logo.png'

const GW: Record<string, string> = {
  instapay: 'InstaPay', vodafone: 'Vodafone Cash', binance: 'Binance Pay',
  bybit: 'Bybit Pay', bep20: 'USDT BEP20', easykash: 'EasyKash', coupon: 'Coupon',
}

export function InvoicePDF({ payment, member, logoUrl: _logoUrl, siteName }: Props) {
  const invoiceN  = `INV-${payment.id.slice(0, 8).toUpperCase()}`
  const code      = payment.payment_code || `PK-${payment.id.slice(0, 6).toUpperCase()}`
  const issueDate = new Date(payment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const currency  = (payment.currency || 'EGP').toUpperCase()
  const amount    = Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
  const method    = GW[payment.gateway] || payment.gateway || '—'
  const product   = payment.tool_name || payment.bundle_name || 'Digital Subscription'

  return (
    <Document title={`Invoice ${invoiceN}`} author={siteName}>
      <Page size="A4" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <Image src={LOGO_URL} style={s.logoImg}/>
            <View style={s.invBlock}>
              <Text style={s.invWord}>INVOICE</Text>
              <Text style={s.invNum}>{invoiceN}</Text>
              <Text style={s.invDate}>Issued {issueDate}</Text>
            </View>
          </View>
        </View>

        {/* Gold rule */}
        <View style={s.ruleWrap}>
          <View style={s.ruleLine}/>
          <View style={s.ruleThin}/>
        </View>

        {/* ── BODY ── */}
        <View style={s.body}>

          {/* ── 2-COL INFO ── */}
          <View style={s.infoRow}>
            {/* LEFT: Billed To → Payment Status */}
            <View style={s.infoCol}>
              <View style={s.section}>
                <Text style={s.secLabel}>BILLED TO</Text>
                <Text style={s.secVal}>{member.full_name}</Text>
                <Text style={s.secSub}>{member.email}</Text>
                {member.phone ? <Text style={s.secSub}>{member.phone}</Text> : null}
              </View>
              <View style={s.section}>
                <Text style={s.secLabel}>PAYMENT STATUS</Text>
                <View style={s.paidPill}>
                  <View style={s.paidDot}/>
                  <Text style={s.paidTxt}>PAID IN FULL</Text>
                </View>
                <Text style={s.secSub}>Due Date: {issueDate}</Text>
              </View>
            </View>

            {/* RIGHT: Reference Code → Payment Method */}
            <View style={s.infoCol}>
              <View style={s.section}>
                <Text style={s.secLabel}>REFERENCE CODE</Text>
                <View style={s.codeBadge}>
                  <Text style={s.codeTxt}>{code}</Text>
                </View>
              </View>
              <View style={s.section}>
                <Text style={s.secLabel}>PAYMENT METHOD</Text>
                <Text style={s.secVal}>{method}</Text>
                {payment.transaction_id
                  ? <Text style={s.secSub}>{payment.transaction_id}</Text>
                  : null}
              </View>
            </View>
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
              <View style={s.totalRowGold}>
                <Text style={s.grandKey}>TOTAL PAID</Text>
                <Text style={s.grandVal}>{amount} {currency}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* ── FOOTER (pinned to page bottom) ── */}
        <View style={s.footer} fixed>
          <View style={s.footerThin}/>
          <View style={s.footerRow}>
            <Text style={s.footerTxt}>
              Thank you for your purchase.{'\n'}
              For support, reference code <Text style={{ fontWeight: 700, color: INK }}>{code}</Text> in your ticket.
            </Text>
            <Text style={s.footerBrand}>{siteName.toUpperCase()}</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
