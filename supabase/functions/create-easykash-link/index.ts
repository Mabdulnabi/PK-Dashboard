// create-easykash-link/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROKEYS_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('PROKEYS_SERVICE_ROLE_KEY') ?? '',
    );

    const { payment_id, member_id, amount } = await req.json();
    if (!payment_id || !member_id) return json({ success: false, error: 'Missing fields' }, 400);

    const { data: payment } = await adminClient.from('payments')
      .select('id, user_id, amount, status, gateway')
      .eq('id', payment_id).eq('user_id', member_id).single();

    if (!payment) return json({ success: false, error: 'Payment not found' }, 404);
    if (payment.status === 'completed') return json({ success: false, error: 'Already completed' }, 409);

    // Get member info
    const { data: member } = await adminClient.from('members')
      .select('full_name, email, phone')
      .eq('id', member_id).single();

    const apiKey = Deno.env.get('EASYKASH_API_KEY') ?? '';
    const baseAppUrl = Deno.env.get('PROKEYS_APP_URL') || 'https://pro-keys.store';
    const redirectUrl = `${baseAppUrl}/u/dashboard`;

    const payload = {
      amount: Number(payment.amount),
      currency: 'EGP',
      paymentOptions: [2, 4, 6],
      cashExpiry: 3,
      name: member?.full_name || 'Customer',
      email: (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(member?.email || '') ? member!.email : null)
        ?? Deno.env.get('PROKEYS_FALLBACK_EMAIL')
        ?? 'noreply@pro-keys.store',
      mobile: member?.phone || '01000000000',
      redirectUrl,
      customerReference: payment.id,
    };

    const ekRes = await fetch('https://back.easykash.net/api/directpayv1/pay', {
      method: 'POST',
      headers: { authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const ekBody = await ekRes.text();
    if (!ekRes.ok) return json({ success: false, error: `EasyKash API error ${ekRes.status}: ${ekBody}` }, 502);

    let data: any;
    try { data = JSON.parse(ekBody); } catch { return json({ success: false, error: `EasyKash non-JSON: ${ekBody}` }, 502); }

    const payUrl = data.redirectUrl || data.paymentUrl || data.url || data.payUrl || data.link || data.payment_url || data.checkoutUrl;
    if (!payUrl) return json({ success: false, error: `EasyKash response has no URL. Keys: ${Object.keys(data).join(',')}. Body: ${ekBody.slice(0,300)}` }, 502);

    return json({ success: true, payUrl });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
