// app/api/admin/payment-gateways/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET all gateways
export async function GET() {
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('*')
    .order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gateways: data });
}

// PATCH update gateway
export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('payment_gateways')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST upload image → returns public URL
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file     = formData.get('file') as File;
  const path     = formData.get('path') as string;

  if (!file || !path) return NextResponse.json({ error: 'file and path required' }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: upErr } = await supabase.storage
    .from('site-assets')
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
  return NextResponse.json({ url: urlData.publicUrl });
}
