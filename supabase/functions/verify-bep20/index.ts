// verify-bep20/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const USDT_BEP20_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
const ETHERSCAN_API = 'https://api.etherscan.io/v2/api';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

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

async function verifyBep20Tx(txHash: string, expectedAddress: string, expectedAmountUsdt: number, apiKey: string) {
  let hash = txHash.trim();
  if (!hash.startsWith('0x')) hash = '0x' + hash;
  const params = new URLSearchParams({ chainid: '56', module: 'proxy', action: 'eth_getTransactionReceipt', txhash: hash, apikey: apiKey });
  try {
    const res = await fetch(`${ETHERSCAN_API}?${params}`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const result = data?.result;
    if (!result || result === 'null') return { ok: false, reason: 'tx_not_found' as const };
    if (result.status !== '0x1') return { ok: false, reason: 'tx_failed' as const };
    if ((result.to || '').toLowerCase() !== USDT_BEP20_CONTRACT.toLowerCase()) return { ok: false, reason: 'wrong_contract' as const };
    for (const log of result.logs || []) {
      const topics = log.topics || [];
      if (!topics.length || topics[0].toLowerCase() !== TRANSFER_TOPIC.toLowerCase()) continue;
      if (topics.length < 3) continue;
      const recipient = '0x' + topics[2].slice(-40);
      if (recipient.toLowerCase() !== expectedAddress.toLowerCase()) continue;
      const amountUsdt = Number(BigInt(log.data || '0x')) / 10 ** 18;
      if (amountUsdt >= expectedAmountUsdt - 0.05) return { ok: true, amount: amountUsdt };
      return { ok: false, reason: 'wrong_amount' as const, paid: amountUsdt };
    }
    return { ok: false, reason: 'no_transfer_log' as const };
  } catch { return { ok: false, reason: 'network_error' as const }; }
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const adminClient = createClient(Deno.env.get('PROKEYS_SUPABASE_URL') ?? '', Deno.env.get('PROKEYS_SERVICE_ROLE_KEY') ?? '');

    const { payment_id, tx_hash, member_id } = await req.json();
    if (!payment_id || !tx_hash || !member_id) return json({ success: false, error: 'Missing fields' }, 400);

    const { data: payment } = await adminClient.from('payments').select('id, amount, credits, status, pack_id').eq('id', payment_id).eq('user_id', member_id).single();
    if (!payment) return json({ success: false, error: 'Payment not found' }, 404);
    if (payment.status === 'completed') return json({ success: false, error: 'Already completed' }, 409);

    const { data: vaultAddress } = await adminClient.rpc('get_payment_api_secret', { p_name: 'BEP20_ADDRESS' });
    const { data: vaultApiKey } = await adminClient.rpc('get_payment_api_secret', { p_name: 'BEP20_API_KEY' });
    const address = vaultAddress || Deno.env.get('BEP20_ADDRESS') || '';
    const apiKey = vaultApiKey || Deno.env.get('BEP20_API_KEY') || '';
    if (!address || !apiKey) return json({ success: false, error: 'Server misconfiguration' }, 500);

    const result = await verifyBep20Tx(tx_hash, address, Number(payment.amount), apiKey);
    if (!result.ok) return json({ success: true, verified: false, reason: result.reason, paid: (result as any).paid });

    const confirm = await confirmTopup(adminClient, member_id, payment_id, payment.credits ?? 0, 'bep20', tx_hash.trim(), payment.pack_id || null);
    if (!confirm.ok) return json({ success: false, error: confirm.error, alreadyProcessed: confirm.alreadyProcessed });
    return json({ success: true, verified: true });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
