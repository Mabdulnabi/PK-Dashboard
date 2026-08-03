// verify-easykash/index.ts
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

async function inquireEasykash(customerReference: string) {
  const apiKey = Deno.env.get('EASYKASH_API_KEY') ?? '';
  try {
    const res = await fetch('https://back.easykash.net/api/cash-api/inquire', {
      method: 'POST',
      headers: { authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerReference }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROKEYS_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('PROKEYS_SERVICE_ROLE_KEY') ?? '',
    );

    const { payment_id, member_id } = await req.json();
    if (!payment_id || !member_id) return json({ success: false, error: 'Missing fields' }, 400);

    const { data: payment } = await adminClient.from('payments')
      .select('id, user_id, amount, credits, status, gateway, pack_id')
      .eq('id', payment_id).eq('user_id', member_id).single();

    if (!payment) return json({ success: false, error: 'Payment not found' }, 404);
    if (payment.status === 'completed') return json({ success: false, error: 'Already completed' }, 409);

    const result = await inquireEasykash(payment_id);
    if (!result) return json({ success: true, verified: false, reason: 'inquiry_failed' });
    if (result.status !== 'PAID' && result.status !== 'DELIVERED')
      return json({ success: true, verified: false, reason: result.status || 'not_found' });

    const expectedEgp = Number(payment.amount);
    const paidEgp = Number(result.Amount ?? 0);
    if (Number.isNaN(paidEgp) || paidEgp < expectedEgp - 1.0) {
      await adminClient.from('payments').update({ failure_reason: `wrong_amount:paid=${paidEgp}:expected=${expectedEgp}` }).eq('id', payment_id);
      return json({ success: true, verified: false, reason: 'wrong_amount', paid: paidEgp, expected: expectedEgp });
    }

    const providerRef = result.easykashRef || payment_id;
    const confirmResult = await confirmTopup(adminClient, member_id, payment_id, payment.credits ?? 0, payment.gateway, providerRef, payment.pack_id || null);
    if (!confirmResult.ok) return json({ success: false, error: confirmResult.error, alreadyProcessed: confirmResult.alreadyProcessed });
    return json({ success: true, verified: true });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
