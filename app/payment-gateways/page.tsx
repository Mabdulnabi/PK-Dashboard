'use client';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

interface Gateway {
  id: string;
  name_ar: string;
  name_en: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
  logo_url: string | null;
  qr_url: string | null;
  uid: string | null;
  uid_label_ar: string | null;
  uid_label_en: string | null;
  input_label_ar: string | null;
  input_label_en: string | null;
  input_placeholder_ar: string | null;
  input_placeholder_en: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
  edge_fn: string | null;
  payload_key: string | null;
  is_dynamic: boolean;
}

const GATEWAY_ICONS: Record<string, string> = {
  binance: '🟡', bybit: '🟠', bep20: '🔷',
  instapay: '💳', vodafone: '📱', easykash: '💰',
};

export default function PaymentGatewaysPage() {
  const [gateways,     setGateways]     = useState<Gateway[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState<string | null>(null);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editData,     setEditData]     = useState<Partial<Gateway>>({});
  const [logoUploading,setLogoUploading]= useState(false);
  const [qrUploading,  setQrUploading]  = useState(false);
  const [msg,          setMsg]          = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchGateways(); }, []);

  async function fetchGateways() {
    setLoading(true);
    const res  = await fetch('/api/admin/payment-gateways');
    const data = await res.json();
    if (data.gateways) setGateways(data.gateways);
    setLoading(false);
  }

  function startEdit(gw: Gateway) {
    setEditingId(gw.id);
    setEditData({ ...gw });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  async function saveGateway() {
    if (!editingId) return;
    setSaving(editingId);
    const res = await fetch('/api/admin/payment-gateways', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, ...editData }),
    });
    const data = await res.json();
    setSaving(null);
    if (!res.ok) {
      setMsg({ type: 'error', text: 'حصل خطأ: ' + data.error });
    } else {
      setMsg({ type: 'success', text: `تم حفظ ${editData.name_ar} ✓` });
      setEditingId(null);
      fetchGateways();
    }
  }

  async function toggleActive(gw: Gateway) {
    await fetch('/api/admin/payment-gateways', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: gw.id, is_active: !gw.is_active }),
    });
    fetchGateways();
  }

  async function uploadImage(file: File, type: 'logo' | 'qr') {
    if (!editingId) return;
    const setter = type === 'logo' ? setLogoUploading : setQrUploading;
    setter(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `payment-gateways/${editingId}/${type}-${Date.now()}.${ext}`;
      const form = new FormData();
      form.append('file', file);
      form.append('path', path);
      const res  = await fetch('/api/admin/payment-gateways', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (type === 'logo') setEditData(p => ({ ...p, logo_url: data.url }));
      else                 setEditData(p => ({ ...p, qr_url:   data.url }));
    } catch (e: any) {
      setMsg({ type: 'error', text: 'فشل رفع الصورة: ' + e.message });
    }
    setter(false);
  }

  const fieldCls = "w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-3 py-2 border border-gray-200 dark:border-gray-600 focus:border-blue-400 outline-none transition-colors"

  function Field({ label, value, onChange, type = 'text', dir = 'rtl' }: any) {
    return (
      <div className="mb-3">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        {type === 'textarea' ? (
          <textarea dir={dir} value={value || ''} onChange={e => onChange(e.target.value)} rows={2}
            className={fieldCls + ' resize-none'}/>
        ) : (
          <input type="text" dir={dir} value={value || ''} onChange={e => onChange(e.target.value)}
            className={fieldCls}/>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="وسائل الدفع" subtitle="تحكم في لوجو وQR والأرقام وإعدادات كل وسيلة" />

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"/>
            </div>
          ) : (
            <>
              {msg && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                  msg.type === 'success'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {msg.text}
                </div>
              )}

              <div className="space-y-4">
                {gateways.map(gw => (
                  <div key={gw.id} className="bg-white dark:bg-[#111827] rounded-xl border border-gray-100 dark:border-[#1a2233] shadow-sm overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {gw.logo_url
                          ? <img src={gw.logo_url} alt={gw.name_en} className="w-full h-full object-contain"/>
                          : <span className="text-2xl">{GATEWAY_ICONS[gw.id] || '💰'}</span>
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-900 dark:text-white font-semibold">{gw.name_ar}</span>
                          <span className="text-gray-500 text-sm">/ {gw.name_en}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            gw.currency === 'EGP' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>{gw.currency}</span>
                          {gw.is_dynamic && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Webhook</span>
                          )}
                        </div>
                        {gw.uid && (
                          <p className="text-gray-400 text-xs mt-0.5 truncate">{gw.uid_label_en}: {gw.uid}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button onClick={() => toggleActive(gw)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gw.is_active ? 'bg-green-500' : 'bg-gray-600'}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gw.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                        <span className="text-xs text-gray-400">{gw.is_active ? 'مفعّل' : 'موقف'}</span>

                        {editingId === gw.id ? (
                          <button onClick={cancelEdit} className="text-gray-400 hover:text-white text-xs px-3 py-1 rounded border border-gray-600">
                            إلغاء
                          </button>
                        ) : (
                          <button onClick={() => startEdit(gw)} className="text-blue-400 hover:text-blue-300 text-xs px-3 py-1 rounded border border-blue-500/40 hover:border-blue-400">
                            ✏️ تعديل
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Edit panel */}
                    {editingId === gw.id && (
                      <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-5 bg-gray-50 dark:bg-gray-800/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                          {/* LEFT: Images */}
                          <div>
                            <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-4">🖼️ الصور</h3>

                            <div className="mb-5">
                              <label className="block text-xs text-gray-400 mb-2">لوجو الوسيلة</label>
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                  {editData.logo_url
                                    ? <img src={editData.logo_url} alt="logo" className="w-full h-full object-contain"/>
                                    : <span className="text-2xl">{GATEWAY_ICONS[gw.id]}</span>
                                  }
                                </div>
                                <div className="flex-1">
                                  <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                                    className="block text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded mb-2 disabled:opacity-50">
                                    {logoUploading ? 'جاري الرفع...' : '📤 رفع صورة'}
                                  </button>
                                  <Field label="أو URL مباشرة" value={editData.logo_url}
                                    onChange={(v: string) => setEditData(p => ({ ...p, logo_url: v }))} dir="ltr"/>
                                </div>
                              </div>
                              <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo')}/>
                            </div>

                            {!gw.is_dynamic && (
                              <div>
                                <label className="block text-xs text-gray-400 mb-2">QR Code</label>
                                <div className="flex items-center gap-3">
                                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                    {editData.qr_url
                                      ? <img src={editData.qr_url} alt="QR" className="w-full h-full object-contain"/>
                                      : <span className="text-3xl">📷</span>
                                    }
                                  </div>
                                  <div className="flex-1">
                                    <button onClick={() => qrInputRef.current?.click()} disabled={qrUploading}
                                      className="block text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded mb-2 disabled:opacity-50">
                                      {qrUploading ? 'جاري الرفع...' : '📤 رفع QR'}
                                    </button>
                                    <Field label="أو URL" value={editData.qr_url}
                                      onChange={(v: string) => setEditData(p => ({ ...p, qr_url: v }))} dir="ltr"/>
                                  </div>
                                </div>
                                <input ref={qrInputRef} type="file" accept="image/*" className="hidden"
                                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'qr')}/>
                              </div>
                            )}

                            <div className="mt-4">
                              <label className="block text-xs text-gray-400 mb-1">ترتيب الظهور</label>
                              <input type="number" value={editData.sort_order ?? 0}
                                onChange={e => setEditData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                                className="w-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-3 py-2 border border-gray-200 dark:border-gray-600 outline-none transition-colors"/>
                            </div>
                          </div>

                          {/* RIGHT: Text fields */}
                          <div>
                            <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-4">📝 النصوص والأرقام</h3>

                            {!gw.is_dynamic && (
                              <>
                                <Field label="العنوان / UID / الرقم" value={editData.uid}
                                  onChange={(v: string) => setEditData(p => ({ ...p, uid: v }))} dir="ltr"/>
                                <div className="grid grid-cols-2 gap-2">
                                  <Field label="اسم الحقل (عربي)" value={editData.uid_label_ar}
                                    onChange={(v: string) => setEditData(p => ({ ...p, uid_label_ar: v }))}/>
                                  <Field label="Field Name (EN)" value={editData.uid_label_en}
                                    onChange={(v: string) => setEditData(p => ({ ...p, uid_label_en: v }))} dir="ltr"/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Field label="حقل الإدخال (عربي)" value={editData.input_label_ar}
                                    onChange={(v: string) => setEditData(p => ({ ...p, input_label_ar: v }))}/>
                                  <Field label="Input Label (EN)" value={editData.input_label_en}
                                    onChange={(v: string) => setEditData(p => ({ ...p, input_label_en: v }))} dir="ltr"/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Field label="Placeholder (عربي)" value={editData.input_placeholder_ar}
                                    onChange={(v: string) => setEditData(p => ({ ...p, input_placeholder_ar: v }))}/>
                                  <Field label="Placeholder (EN)" value={editData.input_placeholder_en}
                                    onChange={(v: string) => setEditData(p => ({ ...p, input_placeholder_en: v }))} dir="ltr"/>
                                </div>
                              </>
                            )}

                            <Field label="التعليمات (عربي)" value={editData.instructions_ar}
                              onChange={(v: string) => setEditData(p => ({ ...p, instructions_ar: v }))} type="textarea"/>
                            <Field label="Instructions (EN)" value={editData.instructions_en}
                              onChange={(v: string) => setEditData(p => ({ ...p, instructions_en: v }))} type="textarea" dir="ltr"/>

                            <div className="grid grid-cols-2 gap-2">
                              <Field label="الاسم (عربي)" value={editData.name_ar}
                                onChange={(v: string) => setEditData(p => ({ ...p, name_ar: v }))}/>
                              <Field label="Name (EN)" value={editData.name_en}
                                onChange={(v: string) => setEditData(p => ({ ...p, name_en: v }))} dir="ltr"/>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <button onClick={saveGateway} disabled={saving === editingId}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors">
                            {saving === editingId ? '⏳ جاري الحفظ...' : '💾 حفظ التغييرات'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-5">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-3">⚙️ إعداد المفاتيح السرية (Vault)</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">شغّل في SQL Editor:</p>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-xs text-green-700 dark:text-green-300 font-mono space-y-1 overflow-x-auto border border-gray-200 dark:border-gray-700">
                  <div>select set_payment_api_secret('BINANCE_API_KEY', 'your-key');</div>
                  <div>select set_payment_api_secret('BINANCE_API_SECRET', 'your-secret');</div>
                  <div>select set_payment_api_secret('BYBIT_API_KEY', 'your-key');</div>
                  <div>select set_payment_api_secret('BYBIT_API_SECRET', 'your-secret');</div>
                  <div>select set_payment_api_secret('BEP20_ADDRESS', '0xYourAddress');</div>
                  <div>select set_payment_api_secret('BEP20_API_KEY', 'etherscan-v2-key');</div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
