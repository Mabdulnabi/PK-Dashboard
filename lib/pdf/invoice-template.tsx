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

const GOLD   = '#C8960C'
const DARK   = '#0F1623'
const DARK2  = '#1A2333'
const GRAY   = '#8B9BB4'
const LGRAY  = '#E8ECF2'
const WHITE  = '#FFFFFF'
const GREEN  = '#0D9E6E'
const GREENL = '#E6F7F2'

const s = StyleSheet.create({
  page:       { fontFamily:'Inter', backgroundColor: WHITE, padding: 0 },

  // Header band
  header:     { backgroundColor: DARK, paddingHorizontal: 44, paddingVertical: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoImg:    { width: 48, height: 48, borderRadius: 10 },
  logoBox:    { width: 48, height: 48, borderRadius: 10, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  logoTxt:    { color: DARK, fontSize: 16, fontWeight: 700 },
  brandName:  { color: WHITE, fontSize: 16, fontWeight: 700, marginBottom: 2 },
  brandSub:   { color: GRAY,  fontSize: 8 },
  invTag:     { color: GOLD,  fontSize: 7, fontWeight: 700, letterSpacing: 2.5, marginBottom: 5 },
  invNum:     { color: WHITE, fontSize: 22, fontWeight: 700 },
  invDate:    { color: GRAY,  fontSize: 8, marginTop: 5 },

  // Sub-header stripe
  stripe:     { backgroundColor: DARK2, paddingHorizontal: 44, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stripeKey:  { color: GRAY,  fontSize: 7, fontWeight: 700, letterSpacing: 1.5, marginBottom: 3 },
  stripeVal:  { color: WHITE, fontSize: 9, fontWeight: 700 },

  // Body
  body:       { paddingHorizontal: 44, paddingVertical: 32 },

  // Cards row
  cardsRow:   { flexDirection: 'row', gap: 16, marginBottom: 28 },
  card:       { flex: 1, borderWidth: 1, borderColor: LGRAY, borderRadius: 10, padding: 16 },
  cardLabel:  { fontSize: 7, fontWeight: 700, color: GRAY, letterSpacing: 1.5, marginBottom: 10 },
  cardName:   { fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 4 },
  cardSub:    { fontSize: 8, color: GRAY },

  badge:      { backgroundColor: GREENL, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  badgeTxt:   { fontSize: 7, fontWeight: 700, color: GREEN },
  divider:    { height: 1, backgroundColor: LGRAY, marginVertical: 10 },
  refLabel:   { fontSize: 7, color: GRAY, marginBottom: 3 },
  refVal:     { fontSize: 8, fontWeight: 700, color: DARK },

  // Table
  tableLabel: { fontSize: 7, fontWeight: 700, color: GRAY, letterSpacing: 1.5, marginBottom: 10 },
  tHead:      { flexDirection: 'row', backgroundColor: DARK, borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingHorizontal: 16, paddingVertical: 11 },
  tRow:       { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: LGRAY },
  tHCell:     { fontSize: 7, fontWeight: 700, color: GRAY, letterSpacing: 1 },
  tCell:      { fontSize: 9, color: DARK },

  // Total
  totalWrap:  { alignItems: 'flex-end', marginTop: 4, marginBottom: 32 },
  totalBox:   { backgroundColor: DARK, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 18, alignItems: 'flex-end', minWidth: 200 },
  totalLbl:   { fontSize: 7, color: GRAY, letterSpacing: 1.5, marginBottom: 6 },
  totalAmt:   { fontSize: 26, fontWeight: 700, color: GOLD },
  totalCurr:  { fontSize: 11, fontWeight: 700, color: GRAY, marginTop: 2 },

  // Footer
  footer:     { borderTopWidth: 1, borderTopColor: LGRAY, paddingTop: 20, alignItems: 'center' },
  footerTxt:  { fontSize: 7.5, color: GRAY, textAlign: 'center', lineHeight: 1.9 },
})

export interface InvoiceData {
  id:             string
  amount:         number
  currency:       string
  gateway:        string
  transaction_id: string | null
  tool_name:      string | null
  bundle_name:    string | null
  created_at:     string
}

export interface MemberData {
  full_name: string
  email:     string
  phone?:    string | null
}

interface Props {
  payment:  InvoiceData
  member:   MemberData
  logoUrl:  string | null
  siteName: string
}

const GW: Record<string, string> = {
  instapay: 'InstaPay', vodafone: 'Vodafone Cash',
  binance: 'Binance Pay', bybit: 'Bybit Pay',
  bep20: 'USDT BEP20', easykash: 'EasyKash', coupon: 'Coupon',
}

export function InvoicePDF({ payment, member, logoUrl, siteName }: Props) {
  const invoiceN = `INV-${payment.id.slice(0, 8).toUpperCase()}`
  const date     = new Date(payment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const currency = (payment.currency || 'EGP').toUpperCase()
  const amount   = Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
  const method   = GW[payment.gateway] || payment.gateway || '-'
  const product  = payment.tool_name || payment.bundle_name || 'Subscription'

  return (
    <Document title={`Invoice ${invoiceN}`} author={siteName}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {logoUrl
              ? <Image src={logoUrl} style={s.logoImg} />
              : <View style={s.logoBox}><Text style={s.logoTxt}>{siteName.slice(0, 2).toUpperCase()}</Text></View>
            }
            <View style={{ marginLeft: 4 }}>
              <Text style={s.brandName}>{siteName}</Text>
              <Text style={s.brandSub}>Digital Subscriptions & Tools</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.invTag}>INVOICE</Text>
            <Text style={s.invNum}>{invoiceN}</Text>
            <Text style={s.invDate}>Issued {date}</Text>
          </View>
        </View>

        {/* ── Info stripe ── */}
        <View style={s.stripe}>
          {[
            { k: 'BILLED TO',  v: member.full_name },
            { k: 'EMAIL',      v: member.email },
            { k: 'GATEWAY',    v: method },
            { k: 'CURRENCY',   v: currency },
          ].map(({ k, v }) => (
            <View key={k}>
              <Text style={s.stripeKey}>{k}</Text>
              <Text style={s.stripeVal}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={s.body}>

          {/* ── Cards ── */}
          <View style={s.cardsRow}>
            {/* Bill To card */}
            <View style={s.card}>
              <Text style={s.cardLabel}>BILL TO</Text>
              <Text style={s.cardName}>{member.full_name}</Text>
              <Text style={s.cardSub}>{member.email}</Text>
              {member.phone ? <Text style={[s.cardSub, { marginTop: 2 }]}>{member.phone}</Text> : null}
            </View>
            {/* Payment Status card */}
            <View style={s.card}>
              <Text style={s.cardLabel}>PAYMENT STATUS</Text>
              <View style={s.badge}><Text style={s.badgeTxt}>PAID IN FULL</Text></View>
              <View style={s.divider}/>
              <Text style={s.refLabel}>TRANSACTION REFERENCE</Text>
              <Text style={s.refVal}>{payment.transaction_id || 'AUTO-VERIFIED'}</Text>
            </View>
          </View>

          {/* ── Items table ── */}
          <Text style={s.tableLabel}>ORDER SUMMARY</Text>
          <View style={{ borderWidth: 1, borderColor: LGRAY, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
            <View style={s.tHead}>
              <Text style={[s.tHCell, { flex: 4 }]}>DESCRIPTION</Text>
              <Text style={[s.tHCell, { flex: 2, textAlign: 'center' }]}>PAYMENT METHOD</Text>
              <Text style={[s.tHCell, { flex: 2, textAlign: 'right' }]}>AMOUNT</Text>
            </View>
            <View style={s.tRow}>
              <Text style={[s.tCell, { flex: 4, fontWeight: 700 }]}>{product}</Text>
              <Text style={[s.tCell, { flex: 2, textAlign: 'center', color: GRAY }]}>{method}</Text>
              <Text style={[s.tCell, { flex: 2, textAlign: 'right', fontWeight: 700, color: GOLD }]}>
                {amount} {currency}
              </Text>
            </View>
          </View>

          {/* ── Total ── */}
          <View style={s.totalWrap}>
            <View style={s.totalBox}>
              <Text style={s.totalLbl}>TOTAL AMOUNT PAID</Text>
              <Text style={s.totalAmt}>{amount}</Text>
              <Text style={s.totalCurr}>{currency}</Text>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={s.footer}>
            <Text style={s.footerTxt}>
              Thank you for your purchase — we appreciate your business.{'\n'}
              This invoice was automatically generated. For questions, open a support ticket in your member dashboard.
            </Text>
          </View>

        </View>
      </Page>
    </Document>
  )
}
