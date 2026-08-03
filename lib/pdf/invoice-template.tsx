import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2', fontWeight: 700 },
  ],
})

const ACCENT = '#d99401'
const DARK   = '#111827'
const GRAY   = '#6B7280'
const LIGHT  = '#F9FAFB'
const BORDER = '#E5E7EB'

const s = StyleSheet.create({
  page:      { fontFamily:'Inter', backgroundColor:'#ffffff', padding:0 },
  header:    { backgroundColor:DARK, padding:'32 40', flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  logo:      { width:52, height:52, borderRadius:10 },
  logoBox:   { width:52, height:52, borderRadius:10, backgroundColor:ACCENT, alignItems:'center', justifyContent:'center' },
  logoFbTxt: { color:'#000', fontSize:20, fontWeight:700 },
  hRight:    { alignItems:'flex-end' },
  invLabel:  { color:ACCENT, fontSize:9, fontWeight:700, letterSpacing:2 },
  invNum:    { color:'#ffffff', fontSize:22, fontWeight:700, marginTop:3 },
  invDate:   { color:'#9CA3AF', fontSize:9, marginTop:4 },
  siteName:  { color:'#ffffff', fontSize:15, fontWeight:700 },
  siteTag:   { color:'#9CA3AF', fontSize:9, marginTop:3 },
  body:      { padding:'32 40' },
  label:     { fontSize:8, fontWeight:700, color:GRAY, letterSpacing:1.5, marginBottom:8 },
  card:      { backgroundColor:LIGHT, borderRadius:10, padding:'14 18', border:`1 solid ${BORDER}` },
  row:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  fRow:      { flexDirection:'row', gap:20, marginBottom:24 },
  col:       { flex:1 },
  tHead:     { flexDirection:'row', backgroundColor:DARK, borderRadius:'8 8 0 0', padding:'10 16' },
  tRow:      { flexDirection:'row', padding:'13 16', borderBottom:`1 solid ${BORDER}`, backgroundColor:'#ffffff' },
  tCellH:    { fontSize:8, color:'#9CA3AF', fontWeight:700, letterSpacing:1 },
  tCell:     { fontSize:9, color:DARK },
  totalBox:  { backgroundColor:DARK, borderRadius:10, padding:'16 24', alignItems:'flex-end' },
  totalLbl:  { fontSize:9, color:'#9CA3AF', marginBottom:4 },
  totalAmt:  { fontSize:24, color:ACCENT, fontWeight:700 },
  badge:     { backgroundColor:'#DCFCE7', borderRadius:4, paddingHorizontal:8, paddingVertical:4 },
  badgeTxt:  { fontSize:8, color:'#166534', fontWeight:700 },
  footer:    { marginTop:36, borderTop:`1 solid ${BORDER}`, paddingTop:20, alignItems:'center' },
  footerTxt: { fontSize:8, color:'#9CA3AF', textAlign:'center', lineHeight:1.7 },
  divider:   { height:1, backgroundColor:BORDER, marginVertical:10 },
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

const GATEWAY_LABELS: Record<string, string> = {
  instapay: 'InstaPay', vodafone: 'Vodafone Cash',
  binance:  'Binance Pay', bybit: 'Bybit Pay',
  bep20:    'USDT BEP20', easykash: 'EasyKash', coupon: 'Coupon',
}

export function InvoicePDF({ payment, member, logoUrl, siteName }: Props) {
  const date     = new Date(payment.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })
  const invoiceN = `INV-${payment.id.slice(0, 8).toUpperCase()}`
  const currency = (payment.currency || 'EGP').toUpperCase()
  const amount   = Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits:2 })
  const method   = GATEWAY_LABELS[payment.gateway] || payment.gateway || '—'
  const product  = payment.tool_name || payment.bundle_name || 'Subscription'

  return (
    <Document title={`Invoice ${invoiceN}`} author={siteName}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:16 }}>
            {logoUrl
              ? <Image src={logoUrl} style={s.logo} />
              : <View style={s.logoBox}><Text style={s.logoFbTxt}>{siteName.slice(0,2).toUpperCase()}</Text></View>
            }
            <View>
              <Text style={s.siteName}>{siteName}</Text>
              <Text style={s.siteTag}>Digital Subscriptions & Tools</Text>
            </View>
          </View>
          <View style={s.hRight}>
            <Text style={s.invLabel}>INVOICE</Text>
            <Text style={s.invNum}>{invoiceN}</Text>
            <Text style={s.invDate}>{date}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Bill To + Status ── */}
          <View style={s.fRow}>
            <View style={s.col}>
              <Text style={s.label}>BILL TO</Text>
              <View style={s.card}>
                <Text style={{ fontSize:12, fontWeight:700, color:DARK, marginBottom:4 }}>{member.full_name}</Text>
                <Text style={{ fontSize:9, color:GRAY }}>{member.email}</Text>
                {member.phone
                  ? <Text style={{ fontSize:9, color:GRAY, marginTop:2 }}>{member.phone}</Text>
                  : null}
              </View>
            </View>
            <View style={s.col}>
              <Text style={s.label}>PAYMENT STATUS</Text>
              <View style={s.card}>
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>✓  PAID</Text>
                </View>
                <View style={s.divider}/>
                <Text style={{ fontSize:8, color:GRAY }}>Transaction Reference</Text>
                <Text style={{ fontSize:9, color:DARK, fontWeight:700, marginTop:3 }}>
                  {payment.transaction_id || 'AUTO-VERIFIED'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Line Items ── */}
          <Text style={[s.label, { marginBottom:8 }]}>ITEMS</Text>
          <View style={{ borderRadius:8, overflow:'hidden', border:`1 solid ${BORDER}`, marginBottom:20 }}>
            <View style={s.tHead}>
              <Text style={[s.tCellH, { flex:3 }]}>Description</Text>
              <Text style={[s.tCellH, { flex:1, textAlign:'right' }]}>Method</Text>
              <Text style={[s.tCellH, { flex:1, textAlign:'right' }]}>Amount</Text>
            </View>
            <View style={s.tRow}>
              <Text style={[s.tCell, { flex:3, fontWeight:700 }]}>{product}</Text>
              <Text style={[s.tCell, { flex:1, textAlign:'right', color:GRAY }]}>{method}</Text>
              <Text style={[s.tCell, { flex:1, textAlign:'right', fontWeight:700, color:ACCENT }]}>
                {amount} {currency}
              </Text>
            </View>
          </View>

          {/* ── Total ── */}
          <View style={{ alignItems:'flex-end', marginBottom:36 }}>
            <View style={s.totalBox}>
              <Text style={s.totalLbl}>TOTAL AMOUNT DUE</Text>
              <Text style={s.totalAmt}>{amount} {currency}</Text>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={s.footer}>
            <Text style={s.footerTxt}>
              Thank you for your business. This is an automatically generated invoice.{'\n'}
              For support, please contact us through the Help Desk in your member dashboard.
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
