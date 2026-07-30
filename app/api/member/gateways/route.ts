// app/api/member/gateways/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('payment_gateways')
      .select('id, name_ar, name_en, currency, logo_url, qr_url, uid, uid_label_ar, uid_label_en, input_label_ar, input_label_en, input_placeholder_ar, input_placeholder_en, instructions_ar, instructions_en, edge_fn, payload_key, is_dynamic, sort_order')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return NextResponse.json({ gateways: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
