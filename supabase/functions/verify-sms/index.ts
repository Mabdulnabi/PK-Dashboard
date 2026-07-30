// verify-sms/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function confirmTopup(adminClient: any, userId: string, paymentId: string, credits: number, gateway: string, providerRef: string, packId: string | null) {
  const { error: refError } = await adminClient.from('processed_payment_refs').insert({ gateway, provider_ref: providerRef, payment_id: paymentId });
  if (refError) {
    if (refError.code === '23505') return { ok: false, alreadyProcessed: true, error: 'Already processed' };
    return { ok: false, error: refError.message };
  }

  await adminClient.from('payments')
    .update({ status: 'completed', verified_at: new Date().toISOString(), transaction_id: providerRef })
    .eq('id', paymentId);

  // Add tool_purchases entry if pack_id exists
  if (packId) {
    const { data: tool } = await adminClient
      .from('shop_tools')
      .select('duration_days')
      .eq('id', packId)
      .single();

    const durationDays = tool?.duration_days || 30;
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const { error: tpError } = await adminClient.from('tool_purchases').insert({
      member_id:      userId,
      tool_id:        packId,
      amount_egp:     credits,
      payment_method: gateway,
      status:         'confirmed',
      reference:      providerRef,
      starts_at:      startsAt.toISOString(),
      expires_at:     expiresAt.toISOString(),
      confirmed_at:   new Date().toISOString(),
    });
    if (tpError) console.error('tool_purchases insert failed:', tpError.message);
  }

  return { ok: true };
}

const SHEET_ID = '1OlThxZmk0g3F2-g3sV6f20QrIuGoInF8GgoaLakGnrQ';
const SHEET_NAME = 'Sheet1';

async function getGoogleAccessToken(): Promise<string> {
  const credsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') ?? '{}';
  const creds = JSON.parse(credsJson);
  const now = Math.floor(Date.now() / 1000);
  const b64url = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({ iss: creds.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now })}`;
  const pemBody = (creds.private_key as string).replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pemBody), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to obtain Google access token: ' + JSON.stringify(data));
  return data.access_token;
}

async function getAllRows(): Promise<string[][]> {
  try {
    const token = await getGoogleAccessToken();
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A:E`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return data.values || [];
  } catch(e) {
    console.log('SHEET ERROR:', e);
    return [];
  }
}

async function markUsed(rowIndex: number): Promise<void> {
  try {
    const token = await getGoogleAccessToken();
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!E${rowIndex}?valueInputOption=RAW`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [['TRUE']] }) });
  } catch {}
}

function normalizeRef(r: string): string {
  let s = String(r).trim();
  if (s.startsWith("'")) s = s.slice(1);
  s = s.replace(/^[\u200f\u200e\u202a\u202b]+/, '').trim().replace(/^0+/, '');
  return s || '0';
}

function matchSms(rows: string[][], ref: string, expectedEgp: number) {
  const normInput = normalizeRef(ref);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i === 0 && row.length && ['ref_number','ref','رقم'].includes(String(row[0]).toLowerCase())) continue;
    if (row.length < 2) continue;
    const sheetRef = String(row[0]).trim().replace(/^'/, '').replace(/^[\u200f\u200e\u202a\u202b]+/, '').trim();
    if (sheetRef !== ref && normalizeRef(sheetRef) !== normInput) continue;
    const used = row.length > 4 ? String(row[4]).trim().toUpperCase() : '';
    if (used === 'TRUE') return { ok: false, reason: 'already_used' as const };
    const paid = parseFloat(String(row[1]).replace(/,/g, '').trim()) || 0;
    if (Math.abs(paid - expectedEgp) <= 1.0) return { ok: true, paid, row: i + 1, source: row[2] || '' };
    return { ok: false, reason: 'wrong_amount' as const, paid };
  }
  return { ok: false, reason: 'not_found' as const };
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const adminClient = createClient(Deno.env.get('PROKEYS_SUPABASE_URL') ?? '', Deno.env.get('PROKEYS_SERVICE_ROLE_KEY') ?? '');

    const { payment_id, ref_number, member_id } = await req.json();
    if (!payment_id || !ref_number || !member_id) return json({ success: false, error: 'Missing fields' }, 400);

    const { data: payment } = await adminClient.from('payments').select('id, user_id, amount, credits, status, gateway, pack_id').eq('id', payment_id).eq('user_id', member_id).single();
    if (!payment) return json({ success: false, error: 'Payment not found' }, 404);
    if (payment.status === 'completed') return json({ success: false, error: 'Already completed' }, 409);

    const rows = await getAllRows();
    const match = matchSms(rows, ref_number, Number(payment.amount));

    if (!match.ok) {
      if (match.reason === 'wrong_amount') await adminClient.from('payments').update({ failure_reason: 'wrong_amount' }).eq('id', payment_id);
      return json({ success: true, verified: false, reason: match.reason, paid: match.paid });
    }

    if (match.row) await markUsed(match.row);
    const result = await confirmTopup(adminClient, member_id, payment_id, payment.credits ?? 0, payment.gateway, `sheet-row-${match.row}-${ref_number}`, payment.pack_id);
    if (!result.ok) return json({ success: false, error: result.error, alreadyProcessed: result.alreadyProcessed });
    return json({ success: true, verified: true });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
