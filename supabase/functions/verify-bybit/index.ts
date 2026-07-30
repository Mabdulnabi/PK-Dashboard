// verify-bybit/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function confirmTopup(adminClient: any, userId: string, paymentId: string, credits: number, gateway: string, providerRef: string, packId: string | null = null) {
  const { error: refError } = await adminClient.from('processed_payment_refs').insert({ gateway, provider_ref: providerRef, payment_id: paymentId });
  if (refError) {
    if (refError.code === '23505') return { ok: false, alreadyProcessed: true, error: 'Already processed' };
    return { ok: false, error: refError.message };
  }
  await adminClient.from('payments').update({ status: 'completed', verified_at: new Date().toISOString(), transaction_id: providerRef }).eq('id', paymentId);
  if (packId) {
    const { data: tool } = await adminClient.from('shop_tools').select('duration_days').eq('id', packId).single();
    const durationDays = tool?.duration_days || 30;
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    await adminClient.from('tool_purchases').insert({
      member_id: userId, tool_id: packId, amount_egp: credits,
      payment_method: gateway, status: 'confirmed', reference: providerRef,
      starts_at: startsAt.toISOString(), expires_at: expiresAt.toISOString(),
      confirmed_at: new Date().toISOString(),
    });
  }
  return { ok: true };
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchBybitOrders(apiKey: string, apiSecret: string) {
  const endpoint = '/v5/pay/order-list';
  const params = 'limit=50&orderType=INCOME';
  const timestamp = String(Date.now());
  const recvWindow = '5000';
  const sig = await hmacSha256Hex(apiSecret, timestamp + apiKey + recvWindow + params);
  try {
    const res = await fetch(`https://api.bybit.com${endpoint}?${params}`, {
      headers: { 'X-BAPI-API-KEY': apiKey, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-SIGN': sig, 'X-BAPI-RECV-WINDOW': recvWindow },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return data?.retCode === 0 ? data.result?.list || [] : [];
  } catch { return []; }
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const adminClient = createClient(Deno.env.get('PROKEYS_SUPABASE_URL') ?? '', Deno.env.get('PROKEYS_SERVICE_ROLE_KEY') ?? '');

    const { payment_id, tx_id, member_id } = await req.json();
    if (!payment_id || !tx_id || !member_id) return json({ success: false, error: 'Missing fields' }, 400);

    const { data: payment } = await adminClient.from('payments').select('id, amount, credits, status, pack_id').eq('id', payment_id).eq('user_id', member_id).single();
    if (!payment) return json({ success: false, error: 'Payment not found' }, 404);
    if (payment.status === 'completed') return json({ success: false, error: 'Already completed' }, 409);

    const { data: vaultKey } = await adminClient.rpc('get_payment_api_secret', { p_name: 'BYBIT_API_KEY' });
    const { data: vaultSecret } = await adminClient.rpc('get_payment_api_secret', { p_name: 'BYBIT_API_SECRET' });
    const apiKey = vaultKey || Deno.env.get('BYBIT_API_KEY') || '';
    const apiSecret = vaultSecret || Deno.env.get('BYBIT_API_SECRET') || '';
    if (!apiKey || !apiSecret) return json({ success: false, error: 'Server misconfiguration' }, 500);

    const orders = await fetchBybitOrders(apiKey, apiSecret);
    const tx = orders.find((t: any) => (t.orderId || '') === String(tx_id).trim());

    if (!tx) return json({ success: true, verified: false, reason: 'tx_not_found' });
    const status = tx.orderStatus || tx.status || '';
    if (!['PAID','SUCCESS','COMPLETED','paid','success'].includes(status)) return json({ success: true, verified: false, reason: 'not_paid' });
    const paid = Number(tx.amount || tx.totalAmount || 0);
    if (paid < Number(payment.amount) - 0.05) return json({ success: true, verified: false, reason: 'wrong_amount', paid });

    const result = await confirmTopup(adminClient, member_id, payment_id, payment.credits ?? 0, 'bybit', tx.orderId || '', payment.pack_id || null);
    if (!result.ok) return json({ success: false, error: result.error, alreadyProcessed: result.alreadyProcessed });
    return json({ success: true, verified: true });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
