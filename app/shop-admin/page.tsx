'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, Copy, X, Check, AlertCircle, ToggleLeft, ToggleRight, Star, Package, Tag, Layout, ChevronUp, ChevronDown, MessageCircle, ThumbsUp, ThumbsDown, Globe2 } from 'lucide-react'
import RichEditor from '@/components/ui/RichEditor'

function PageRichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData(); form.append('file', file)
    const res = await fetch('/api/member/upload', { method: 'POST', body: form })
    const j = await res.json(); return j.url || ''
  }
  return <RichEditor value={value} onChange={onChange} placeholder="Write page content…" minHeight={350} onImageUpload={uploadImage}/>
}
import { v4 as uuid } from 'uuid'

interface Category { id:string; name:string; slug:string; color:string; icon:string; sort_order:number; is_active:boolean }
interface Tool {
  id:string; name:string; description:string; image_url?:string
  category_slug:string; category_id?:string; price_egp:number; price_usd?:number; retail_price_egp?:number
  duration_label:string; duration_days:number; delivery_label:string
  rating:number; review_count:number; video_url?:string
  features:string[]; is_active:boolean; is_out_of_stock:boolean; sort_order:number
  landing_blocks?: LandingBlock[]
}
interface LandingBlock {
  id: string
  layout: 'image_left'|'image_right'|'text_only'|'image_only'|'features_grid'|'video'|'faq'
  image_url?: string
  video_url?: string
  title_en?: string; title_ar?: string
  body_en?: string;  body_ar?: string
  features?: { icon: string; en: string; ar: string }[]
  faqs?: { q_en: string; q_ar: string; a_en: string; a_ar: string }[]
}
interface Review {
  id: string; tool_id: string; member_name: string; stars: number
  comment?: string; approved: boolean; created_at: string
  shop_tools?: { name: string }
}

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

function StarRow({ n }: { n: number }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i=><Star key={i} size={12} fill={i<=n?'#F59E0B':'none'} stroke={i<=n?'#F59E0B':'#D1D5DB'}/>)}</div>
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"
const SHOP_CATS = ['shared','private','bundle']
const PRESET_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#06B6D4','#6B7280','#F97316','#14B8A6']
const LAYOUTS: { value: LandingBlock['layout']; label: string }[] = [
  { value:'image_left',     label:'🖼️ Image Left + Text Right' },
  { value:'image_right',    label:'📝 Text Left + Image Right' },
  { value:'text_only',      label:'📄 Text Only' },
  { value:'image_only',     label:'🖼️ Image Only (full width)' },
  { value:'features_grid',  label:'⚡ Features Grid (icons)' },
  { value:'video',          label:'🎬 Video Embed' },
  { value:'faq',            label:'❓ FAQ Accordion' },
]

export default function ShopAdminPage() {
  const [tab,      setTab]      = useState<'tools'|'categories'|'reviews'|'deals'|'blogs'|'pages'>('tools')
  const [tools,    setTools]    = useState<Tool[]>([])
  const [cats,     setCats]     = useState<Category[]>([])
  const [reviews,  setReviews]  = useState<Review[]>([])
  const [revLoad,  setRevLoad]  = useState(false)
  const [toolCat,  setToolCat]  = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add-tool'|'edit-tool'|'add-cat'|'edit-cat'|'landing'|null>(null)
  const [editItem, setEdit]     = useState<any>(null)
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,   setSaving]   = useState(false)
  const [delItem,  setDel]      = useState<any>(null)
  const [delType,  setDelType]  = useState<'tool'|'cat'>('tool')

  // Landing blocks state
  const [landingTool,   setLandingTool]   = useState<Tool|null>(null)
  const [landingBlocks, setLandingBlocks] = useState<LandingBlock[]>([])

  // Bundle items state
  const [bundleItemIds, setBundleItemIds] = useState<string[]>([])

  // Deals tab state
  const [featuredIds,   setFeaturedIds]   = useState<string[]>([])
  const [dealSections,  setDealSections]  = useState<{id:string;title_en:string;title_ar:string;subtitle_en:string;subtitle_ar:string;emoji:string;tool_ids:string[]}[]>([])
  const [dealSaving,    setDealSaving]    = useState(false)

  // Blogs tab state
  const [blogPosts,   setBlogPosts]   = useState<any[]>([])
  const [blogLoad,    setBlogLoad]    = useState(false)
  const [blogError,   setBlogError]   = useState<string|null>(null)
  const [blogAction,  setBlogAction]  = useState<{id:string;type:'reject'|'revision';text:string}|null>(null)
  const [expandedBlog,setExpandedBlog]= useState<string|null>(null)
  const [adminNote,   setAdminNote]   = useState<{id:string;text:string}|null>(null)

  // Pages tab state
  const PAGE_SLUGS = ['about-us','contact-us','privacy-policy','refund-policy','delivery-policy','terms-of-use']
  const PAGE_LABELS: Record<string,{en:string;ar:string}> = {
    'about-us':        {en:'About Us',ar:'من نحن'},
    'contact-us':      {en:'Contact Us',ar:'اتصل بنا'},
    'privacy-policy':  {en:'Privacy Policy',ar:'سياسة الخصوصية'},
    'refund-policy':   {en:'Refund Policy',ar:'سياسة الاسترداد'},
    'delivery-policy': {en:'Delivery Policy',ar:'سياسة التسليم'},
    'terms-of-use':    {en:'Terms of Use',ar:'شروط الاستخدام'},
  }
  const [pageSettings,   setPageSettings]   = useState<Record<string,string>>({})
  const [activePageSlug, setActivePageSlug] = useState('about-us')
  const [pageLang,       setPageLang]       = useState<'en'|'ar'>('en')
  const [pageContent,    setPageContent]    = useState('')
  const [pageSaving,     setPageSaving]     = useState(false)

  // Tool form
  const emptyTool = { name:'',description:'',description_ar:'',image_url:'',category_slug:'shared',category_id:'',price_egp:'',price_usd:'',retail_price_egp:'',duration_label:'28 Days',duration_days:'28',delivery_label:'INSTANT',rating:'5.0',review_count:'0',video_url:'',features:'',sort_order:'0',is_out_of_stock:false,details_url:'',details_slug:'',sales_count:'0' }
  const [toolForm, setToolForm] = useState(emptyTool)

  // Category form
  const emptyCat = { name:'', name_ar:'', slug:'', color:'#3B82F6', icon:'🔧', image_url:'', image_url_ar:'', sort_order:'0' }
  const [catForm, setCatForm] = useState(emptyCat)

  const load = useCallback(async()=>{
    const [tRes,cRes] = await Promise.all([
      supabase.from('shop_tools').select('*').order('category_slug').order('sort_order'),
      supabase.from('tool_categories').select('*').order('sort_order'),
    ])
    if(tRes.data) setTools(tRes.data)
    if(cRes.data) setCats(cRes.data)
    setLoading(false)
  },[])

  const loadReviews = useCallback(async()=>{
    setRevLoad(true)
    const res = await fetch('/api/admin/reviews')
    const d   = await res.json()
    setReviews(d.reviews||[])
    setRevLoad(false)
  },[])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(tab==='reviews') loadReviews() },[tab,loadReviews])
  useEffect(()=>{
    if(tab!=='deals') return
    fetch('/api/admin/ui-settings').then(r=>r.json()).then(d=>{
      const ui = d.settings as Record<string,string>
      try { setFeaturedIds(JSON.parse(ui?.dashboard_featured_ids||'[]')) } catch {}
      try { setDealSections(JSON.parse(ui?.dashboard_sections||'[]').map((s:any)=>({subtitle_en:'',subtitle_ar:'',emoji:'🔖',...s,id:s.id||uuid()}))) } catch {}
    })
  },[tab])

  useEffect(()=>{
    if(tab!=='blogs') return
    setBlogLoad(true); setBlogError(null)
    fetch('/api/admin/blogs')
      .then(r=>r.json())
      .then(d=>{
        if(Array.isArray(d)) { setBlogPosts(d); setBlogLoad(false) }
        else { setBlogError(d?.error||'Failed to load blog posts'); setBlogLoad(false) }
      })
      .catch(e=>{ setBlogError(String(e)); setBlogLoad(false) })

    const reloadBlogs = () =>
      fetch('/api/admin/blogs').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setBlogPosts(d) }).catch(()=>{})

    // Realtime: new submissions (INSERT) and member deletions (DELETE)
    const channel = supabase
      .channel('admin-blogs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_posts' }, payload => {
        // Prepend the new post from payload — avoid full reload to prevent overwriting local approval state
        const p = payload.new as any
        if (!p?.id) return
        setBlogPosts(prev => prev.some((x:any) => x.id === p.id) ? prev : [{ ...p, members: null }, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blog_posts' }, payload => {
        // REPLICA IDENTITY FULL ensures payload.old has all columns incl. id
        const deleted = (payload.old as any)
        if (deleted?.id) {
          setBlogPosts(prev => prev.filter((p:any) => p.id !== deleted.id))
        } else {
          reloadBlogs() // fallback
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },[tab])

  useEffect(()=>{
    if(tab!=='pages') return
    fetch('/api/admin/ui-settings').then(r=>r.json()).then(d=>{
      const ui = (d.settings||{}) as Record<string,string>
      setPageSettings(ui)
      const key = `page_${activePageSlug}_${pageLang}`
      setPageContent(ui[key]||'')
    })
  },[tab])

  useEffect(()=>{
    if(tab!=='pages') return
    const key = `page_${activePageSlug}_${pageLang}`
    setPageContent(pageSettings[key]||'')
  },[activePageSlug,pageLang])

  // ── Tool CRUD ──
  const openAddTool  = ()=>{ setToolForm(emptyTool); setEdit(null); setModal('add-tool') }
  const openEditTool = async (t:Tool)=>{
    setToolForm({name:t.name,description:t.description||'',description_ar:(t as any).description_ar||'',image_url:t.image_url||'',category_slug:t.category_slug,category_id:t.category_id||'',price_egp:String(t.price_egp),price_usd:String(t.price_usd||''),retail_price_egp:String(t.retail_price_egp||''),duration_label:t.duration_label,duration_days:String(t.duration_days),delivery_label:t.delivery_label,rating:String(t.rating),review_count:String(t.review_count),video_url:t.video_url||'',features:(t.features||[]).join('\n'),sort_order:String(t.sort_order),is_out_of_stock:t.is_out_of_stock,details_url:(t as any).details_url||'',details_slug:(t as any).details_slug||'',sales_count:String((t as any).sales_count||0)})
    // Load bundle items if editing a bundle
    if (t.category_slug === 'bundle') {
      const res = await fetch('/api/admin/bundles')
      const d   = await res.json()
      const bundle = (d.bundles || []).find((b:any) => b.id === t.id)
      setBundleItemIds((bundle?.items || []).map((i:any) => i.id))
    } else {
      setBundleItemIds([])
    }
    setEdit(t); setModal('edit-tool')
  }

  const duplicateTool = async (t: Tool) => {
    const { error } = await supabase.from('shop_tools').insert({
      name: t.name + ' (Copy)', description: t.description, image_url: t.image_url||null,
      category_slug: t.category_slug, category_id: t.category_id||null,
      price_egp: t.price_egp, price_usd: t.price_usd||null, retail_price_egp: t.retail_price_egp||0,
      duration_label: t.duration_label, duration_days: t.duration_days,
      delivery_label: t.delivery_label||'INSTANT',
      rating: t.rating, review_count: t.review_count,
      video_url: t.video_url||null, features: t.features||[],
      sort_order: t.sort_order, is_out_of_stock: t.is_out_of_stock,
    })
    if (error) setToast({ msg: 'Duplicate failed', type: 'err' })
    else { setToast({ msg: 'Tool duplicated', type: 'ok' }); load() }
  }

  const saveTool = async()=>{
    if(!toolForm.name||!toolForm.price_egp) return
    setSaving(true)
    const payload:any = {
      name:toolForm.name, description:toolForm.description||null, description_ar:toolForm.description_ar||null, image_url:toolForm.image_url||null,
      category_slug:toolForm.category_slug, category_id:toolForm.category_id||null,
      price_egp:parseFloat(toolForm.price_egp), price_usd:toolForm.price_usd?parseFloat(toolForm.price_usd):null,
      retail_price_egp:toolForm.retail_price_egp?parseFloat(toolForm.retail_price_egp):0,
      duration_label:toolForm.duration_label, duration_days:parseInt(toolForm.duration_days)||28,
      delivery_label:toolForm.delivery_label||'INSTANT',
      rating:parseFloat(toolForm.rating)||5.0, review_count:parseInt(toolForm.review_count)||0,
      video_url:toolForm.video_url||null,
      features:toolForm.features.split('\n').map(f=>f.trim()).filter(Boolean),
      sort_order:parseInt(toolForm.sort_order)||0, is_out_of_stock:toolForm.is_out_of_stock,
      details_url:toolForm.details_url||null,
      details_slug:toolForm.details_slug||null,
      sales_count:parseInt((toolForm as any).sales_count)||0,
    }
    const res = editItem
      ? await supabase.from('shop_tools').update(payload).eq('id',editItem.id)
      : await supabase.from('shop_tools').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}

    // Save bundle items if this is a bundle tool being edited
    if (toolForm.category_slug === 'bundle' && editItem) {
      await fetch('/api/admin/bundles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editItem.id, tool_ids: bundleItemIds }),
      })
    }

    setToast({msg:editItem?'Tool updated':'Tool added',type:'ok'})
    setModal(null); load()
  }

  const toggleTool = async(t:Tool, field:'is_active'|'is_out_of_stock')=>{
    await supabase.from('shop_tools').update({[field]:!t[field]}).eq('id',t.id)
    setToast({msg:'Updated',type:'ok'}); load()
  }

  // ── Landing Blocks ──
  const openLanding = (t:Tool)=>{
    setLandingTool(t)
    setLandingBlocks(Array.isArray(t.landing_blocks) ? t.landing_blocks : [])
    setModal('landing')
  }

  const addBlock = ()=>{
    const newBlock: LandingBlock = { id: uuid(), layout:'image_left', image_url:'', title_en:'', title_ar:'', body_en:'', body_ar:'' }
    setLandingBlocks(b=>[...b, newBlock])
  }

  const updateBlock = (id:string, patch: Partial<LandingBlock>)=>{
    setLandingBlocks(b=>b.map(bl=>bl.id===id?{...bl,...patch}:bl))
  }

  const removeBlock = (id:string)=>{
    setLandingBlocks(b=>b.filter(bl=>bl.id!==id))
  }

  const moveBlock = (id:string, dir:-1|1)=>{
    setLandingBlocks(b=>{
      const idx = b.findIndex(bl=>bl.id===id)
      if (idx<0) return b
      const next = idx+dir
      if (next<0||next>=b.length) return b
      const arr = [...b]
      ;[arr[idx],arr[next]] = [arr[next],arr[idx]]
      return arr
    })
  }

  const saveLandingBlocks = async()=>{
    if (!landingTool) return
    setSaving(true)
    const res = await supabase.from('shop_tools').update({ landing_blocks: landingBlocks }).eq('id', landingTool.id)
    setSaving(false)
    if (res.error) { setToast({msg:res.error.message,type:'err'}); return }
    setToast({msg:'Landing page saved',type:'ok'})
    setModal(null); load()
  }

  // ── Category CRUD ──
  const openAddCat  = ()=>{ setCatForm(emptyCat); setEdit(null); setModal('add-cat') }
  const openEditCat = (c:Category)=>{
    setCatForm({name:c.name,name_ar:(c as any).name_ar||'',slug:c.slug,color:c.color,icon:c.icon,image_url:(c as any).image_url||'',image_url_ar:(c as any).image_url_ar||'',sort_order:String(c.sort_order)})
    setEdit(c); setModal('edit-cat')
  }

  const saveCat = async()=>{
    if(!catForm.name) return
    setSaving(true)
    const slug = catForm.slug||catForm.name.toLowerCase().replace(/[^a-z0-9]/g,'_')
    const payload = {name:catForm.name,name_ar:catForm.name_ar||null,slug,color:catForm.color,icon:catForm.icon,image_url:catForm.image_url||null,image_url_ar:catForm.image_url_ar||null,sort_order:parseInt(catForm.sort_order)||0}
    const res = editItem
      ? await supabase.from('tool_categories').update(payload).eq('id',editItem.id)
      : await supabase.from('tool_categories').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}
    setToast({msg:editItem?'Category updated':'Category added',type:'ok'})
    setModal(null); load()
  }

  const toggleCat = async(c:Category)=>{
    await supabase.from('tool_categories').update({is_active:!c.is_active}).eq('id',c.id)
    setToast({msg:'Updated',type:'ok'}); load()
  }

  const del = async()=>{
    if(!delItem) return
    const table = delType==='tool'?'shop_tools':'tool_categories'
    const res = await supabase.from(table).delete().eq('id',delItem.id)
    if(res.error){setToast({msg:'Cannot delete — in use',type:'err'});setDel(null);return}
    setToast({msg:'Deleted',type:'ok'}); setDel(null); load()
  }

  // ── Reviews ──
  const approveReview = async(id:string, approved:boolean)=>{
    await fetch(`/api/admin/reviews/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({approved})})
    setToast({msg:approved?'Approved ✓':'Hidden',type:'ok'})
    loadReviews()
  }
  const deleteReview = async(id:string)=>{
    await fetch(`/api/admin/reviews/${id}`,{method:'DELETE'})
    setToast({msg:'Deleted',type:'ok'})
    loadReviews()
  }

  const filtered = toolCat==='all'?tools:tools.filter(t=>t.category_slug===toolCat)
  const counts:any={}; SHOP_CATS.forEach(c=>{counts[c]=tools.filter(t=>t.category_slug===c).length})
  const catName = (id?:string) => cats.find(c=>c.id===id)?.name||'—'
  const pendingReviews = reviews.filter(r=>!r.approved).length

  const saveDeals = async () => {
    setDealSaving(true)
    await fetch('/api/admin/ui-settings', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        dashboard_featured_ids: JSON.stringify(featuredIds),
        dashboard_sections:     JSON.stringify(dealSections.map(s=>({id:s.id,title_en:s.title_en,title_ar:s.title_ar,subtitle_en:s.subtitle_en,subtitle_ar:s.subtitle_ar,emoji:s.emoji,tool_ids:s.tool_ids}))),
      })
    })
    setDealSaving(false)
    setToast({ msg:'Deals saved ✓', type:'ok' })
  }

  const toggleFeatured = (id: string) =>
    setFeaturedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])

  const addSection = () =>
    setDealSections(p=>[...p,{id:uuid(),title_en:'',title_ar:'',subtitle_en:'',subtitle_ar:'',emoji:'🔖',tool_ids:[]}])

  const removeSection = (id:string) => setDealSections(p=>p.filter(s=>s.id!==id))

  const updateSection = (id:string, key:string, val:any) =>
    setDealSections(p=>p.map(s=>s.id===id?{...s,[key]:val}:s))

  const toggleSectionTool = (secId:string, toolId:string) =>
    setDealSections(p=>p.map(s=>s.id===secId
      ? {...s, tool_ids: s.tool_ids.includes(toolId) ? s.tool_ids.filter(x=>x!==toolId) : [...s.tool_ids, toolId]}
      : s))

  const approveBlog = async (id:string, action:'approve'|'reject'|'revision', reason?:string) => {
    const res = await fetch(`/api/admin/blogs/${id}/approve`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,reason}) })
    if(res.ok) {
      const newStatus = action==='approve'?'approved':action==='revision'?'revision_needed':'rejected'
      setBlogPosts(prev => prev.map(p => p.id===id ? {...p, status:newStatus, rejection_reason:reason||null, updated_at:new Date().toISOString()} : p))
      setBlogAction(null)
      const msg = action==='approve'?'Post approved ✓':action==='revision'?'Revision requested ✓':'Post rejected'
      setToast({msg, type: action==='approve'?'ok':action==='revision'?'ok':'err'})
    } else { const j = await res.json().catch(()=>({})); setToast({msg: j.error || 'Error', type:'err'}) }
  }

  const saveAdminNote = async (id:string, note:string) => {
    const res = await fetch(`/api/admin/blogs/${id}/approve`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'note',reason:note}) })
    if(res.ok) { setBlogPosts(prev=>prev.map(p=>p.id===id?{...p,admin_note:note}:p)); setAdminNote(null); setToast({msg:'Note saved',type:'ok'}) }
    else setToast({msg:'Error',type:'err'})
  }

  const savePage = async () => {
    setPageSaving(true)
    const key = `page_${activePageSlug}_${pageLang}`
    const res = await fetch('/api/admin/ui-settings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({[key]: pageContent}) })
    if(res.ok) { setPageSettings(prev=>({...prev,[key]:pageContent})); setToast({msg:'Page saved!',type:'ok'}) }
    else setToast({msg:'Error saving page',type:'err'})
    setPageSaving(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Shop Manager" subtitle="Manage tools, categories & reviews"/>

        {/* Top tabs */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={()=>setTab('tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='tools'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              <Package size={12}/>Tools ({tools.length})
            </button>
            <button onClick={()=>setTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='categories'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              <Tag size={12}/>Categories ({cats.length})
            </button>
            <button onClick={()=>setTab('reviews')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='reviews'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              <MessageCircle size={12}/>Reviews
              {pendingReviews>0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-red-500">{pendingReviews}</span>}
            </button>
            <button onClick={()=>setTab('deals')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='deals'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              🎯 Deals Tab
            </button>
            <button onClick={()=>setTab('blogs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='blogs'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              ✍️ Blogs
              {blogPosts.filter((p:any)=>p.status==='pending').length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-purple-500">{blogPosts.filter((p:any)=>p.status==='pending').length}</span>}
            </button>
            <button onClick={()=>setTab('pages')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='pages'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              📄 Pages
            </button>
          </div>

          {tab==='tools' ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {[['all','All'],['shared','Shared'],['private','Private'],['bundle','Bundle']].map(([id,label])=>(
                  <button key={id} onClick={()=>setToolCat(id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${toolCat===id?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500'}`}>
                    {label}{id!=='all'?` (${counts[id]||0})`:''}
                  </button>
                ))}
              </div>
              <button onClick={openAddTool} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
                <Plus size={13}/>Add Tool
              </button>
            </div>
          ) : tab==='categories' ? (
            <button onClick={openAddCat} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
              <Plus size={13}/>Add Category
            </button>
          ) : tab==='deals' ? (
            <button onClick={saveDeals} disabled={dealSaving} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold transition-colors">
              <Check size={13}/>{dealSaving ? 'Saving…' : 'Save Deals'}
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* ── Tools table ── */}
          {tab==='tools' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {['Tool','Shop Type','Category','Price','Rating','Landing','Status','Actions'].map(h=>(
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading&&<tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">Loading...</td></tr>}
                  {!loading&&filtered.length===0&&(
                    <tr><td colSpan={8} className="text-center py-12">
                      <Package size={28} className="text-gray-200 mx-auto mb-3"/>
                      <p className="text-sm text-gray-400 mb-3">No tools yet</p>
                      <button onClick={openAddTool} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">
                        <Plus size={12}/>Add First Tool
                      </button>
                    </td></tr>
                  )}
                  {filtered.map(t=>{
                    const CAT_COLORS:any={shared:'#3B82F6',private:'#8B5CF6',bundle:'#F59E0B'}
                    const hasLanding = Array.isArray(t.landing_blocks) && t.landing_blocks.length > 0
                    return (
                      <tr key={t.id} className={`border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${!t.is_active?'opacity-50':''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {t.image_url?<img src={t.image_url} alt={t.name} className="w-7 h-7 object-contain"/>:<span className="text-[10px] font-bold text-gray-400">{t.name.slice(0,2).toUpperCase()}</span>}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t.name}</div>
                              <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{t.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{background:CAT_COLORS[t.category_slug]+'20',color:CAT_COLORS[t.category_slug]}}>
                            {t.category_slug}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {t.category_id ? (
                            <div className="flex items-center gap-1.5">
                              <span>{cats.find(c=>c.id===t.category_id)?.icon}</span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">{catName(t.category_id)}</span>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{Number(t.price_egp).toLocaleString()} EGP</div>
                          {t.price_usd&&<div className="text-[10px] text-gray-400">${t.price_usd}</div>}
                          <div className="text-[10px] text-gray-400">/{t.duration_label}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star size={11} fill="#F59E0B" stroke="#F59E0B"/>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t.rating}</span>
                            <span className="text-[10px] text-gray-400">({t.review_count})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={()=>openLanding(t)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${hasLanding?'bg-emerald-50 text-emerald-600 border border-emerald-200':'bg-gray-50 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-500'}`}>
                            <Layout size={10}/>{hasLanding?`${t.landing_blocks!.length} blocks`:'+ Add'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <button onClick={()=>toggleTool(t,'is_active')} className="flex items-center gap-1">
                              {t.is_active?<ToggleRight size={18} className="text-emerald-500"/>:<ToggleLeft size={18} className="text-gray-300"/>}
                              <span className="text-[10px] text-gray-500">{t.is_active?'Active':'Off'}</span>
                            </button>
                            <button onClick={()=>toggleTool(t,'is_out_of_stock')} className="flex items-center gap-1">
                              {t.is_out_of_stock?<ToggleRight size={18} className="text-red-500"/>:<ToggleLeft size={18} className="text-gray-300"/>}
                              <span className="text-[10px] text-gray-500">{t.is_out_of_stock?'OOS':'In Stock'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={()=>openEditTool(t)} title="Edit" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={12}/></button>
                            <button onClick={()=>duplicateTool(t)} title="Duplicate" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><Copy size={12}/></button>
                            <button onClick={()=>{setDel(t);setDelType('tool')}} title="Delete" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Categories grid ── */}
          {tab==='categories' && (
            <div className="grid grid-cols-4 gap-4">
              {loading&&<div className="col-span-4 flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
              {cats.map(c=>{
                const toolCount = tools.filter(t=>t.category_id===c.id).length
                return (
                  <div key={c.id} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden ${!c.is_active?'opacity-60':''}`}>
                    <div className="h-1.5" style={{background:c.color}}/>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden" style={{background:c.color+'15'}}>
                          {(c as any).image_url ? <img src={(c as any).image_url} className="w-full h-full object-cover" alt=""/> : c.icon}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openEditCat(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={12}/></button>
                          <button onClick={()=>{setDel(c);setDelType('cat')}} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12}/></button>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">{c.name}</div>
                      {(c as any).name_ar && <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5" dir="rtl">{(c as any).name_ar}</div>}
                      <div className="text-[10px] font-mono text-gray-400 mb-3">{c.slug}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400"><span className="font-bold text-gray-700 dark:text-gray-300">{toolCount}</span> tools</span>
                        <button onClick={()=>toggleCat(c)}>{c.is_active?<ToggleRight size={20} style={{color:c.color}}/>:<ToggleLeft size={20} className="text-gray-300"/>}</button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {!loading&&cats.length===0&&(
                <div className="col-span-4 text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                  <Tag size={28} className="text-gray-200 mx-auto mb-3"/>
                  <p className="text-sm text-gray-400 mb-3">No categories yet</p>
                  <button onClick={openAddCat} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600"><Plus size={12}/>Add Category</button>
                </div>
              )}
            </div>
          )}

          {/* ── Deals tab ── */}
          {tab==='deals' && (
            <div className="space-y-6 max-w-4xl">

              {/* Featured Products */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">⭐ Featured Products</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Products shown as "Top Picks" on the Deals tab ({featuredIds.length} selected)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {tools.filter(t=>t.is_active).map(t=>{
                    const sel = featuredIds.includes(t.id)
                    return (
                      <button key={t.id} onClick={()=>toggleFeatured(t.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 text-start transition-all ${sel?'border-amber-400 bg-amber-50 dark:bg-amber-900/10':'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                        <div className="w-8 h-8 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {t.image_url?<img src={t.image_url} alt={t.name} className="w-6 h-6 object-contain"/>:<span className="text-[9px] font-bold text-gray-400">{t.name.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{t.name}</div>
                          <div className="text-[10px] text-gray-400 capitalize">{t.category_slug}</div>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${sel?'bg-amber-400':'bg-gray-100 dark:bg-gray-800'}`}>
                          {sel && <Check size={10} className="text-white"/>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sections */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">📂 Product Sections</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Curated sections shown below featured products on Deals tab</p>
                  </div>
                  <button onClick={addSection} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-colors">
                    <Plus size={12}/>Add Section
                  </button>
                </div>

                {dealSections.length===0 && (
                  <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400">
                    No sections yet. Click "Add Section" to create one.
                  </div>
                )}

                <div className="space-y-4">
                  {dealSections.map((sec, si) => (
                    <div key={sec.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/20">
                      {/* Row 1: number + emoji + delete */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">Section #{si+1}</span>
                        <button type="button" onClick={()=>removeSection(sec.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs transition-colors">
                          <Trash2 size={12}/>Remove
                        </button>
                      </div>
                      {/* Row 2: emoji */}
                      <div className="mb-3">
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Emoji</label>
                        <input
                          type="text"
                          value={sec.emoji}
                          onChange={e => updateSection(sec.id, 'emoji', e.target.value)}
                          placeholder="🔖"
                          className={`${inp} w-24 text-center text-lg`}
                        />
                      </div>
                      {/* Row 3: titles */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Title (EN)</label>
                          <input
                            type="text"
                            value={sec.title_en}
                            onChange={e => updateSection(sec.id, 'title_en', e.target.value)}
                            placeholder="Section title in English"
                            className={inp}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide text-right">العنوان (AR)</label>
                          <input
                            type="text"
                            value={sec.title_ar}
                            onChange={e => updateSection(sec.id, 'title_ar', e.target.value)}
                            placeholder="عنوان القسم بالعربية"
                            dir="rtl"
                            className={inp}
                          />
                        </div>
                      </div>
                      {/* Row 4: subtitles */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Subtitle (EN) — optional</label>
                          <input
                            type="text"
                            value={sec.subtitle_en}
                            onChange={e => updateSection(sec.id, 'subtitle_en', e.target.value)}
                            placeholder="Short description…"
                            className={inp}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide text-right">العنوان الفرعي (AR) — اختياري</label>
                          <input
                            type="text"
                            value={sec.subtitle_ar}
                            onChange={e => updateSection(sec.id, 'subtitle_ar', e.target.value)}
                            placeholder="وصف مختصر…"
                            dir="rtl"
                            className={inp}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-2">Products in this section ({sec.tool_ids.length} selected):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {tools.filter(t=>t.is_active).map(t=>{
                          const sel = sec.tool_ids.includes(t.id)
                          return (
                            <button key={t.id} onClick={()=>toggleSectionTool(sec.id, t.id)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-start transition-all text-xs ${sel?'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10':'border-gray-100 dark:border-gray-800 hover:border-gray-200'}`}>
                              <div className="w-6 h-6 rounded-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {t.image_url?<img src={t.image_url} alt="" className="w-5 h-5 object-contain"/>:<span className="text-[8px] text-gray-400">{t.name.slice(0,2)}</span>}
                              </div>
                              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{t.name}</span>
                              {sel && <Check size={10} className="text-indigo-500 flex-shrink-0"/>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── Blogs tab ── */}
          {tab==='blogs' && (
            <div className="space-y-3 max-w-4xl">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">✍️ Blog Posts — Moderation</h3>
                  <button onClick={()=>{ setBlogLoad(true); setBlogError(null); fetch('/api/admin/blogs').then(r=>r.json()).then(d=>{ setBlogPosts(Array.isArray(d)?d:[]); if(!Array.isArray(d)) setBlogError(d?.error||'Error'); setBlogLoad(false) }).catch(e=>{ setBlogError(String(e)); setBlogLoad(false) }) }}
                    className="text-[11px] text-purple-500 hover:text-purple-700 font-semibold">↺ Refresh</button>
                </div>
                {blogLoad && <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>}
                {blogError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 text-xs text-red-600 dark:text-red-400 font-mono mb-3">{blogError}</div>}
                {!blogLoad && !blogError && blogPosts.length===0 && <p className="text-center text-sm text-gray-400 py-8">No blog posts yet</p>}
                {!blogLoad && blogPosts.map(post=>{
                  const statusCls = post.status==='pending'?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':
                    post.status==='approved'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                    post.status==='revision_needed'?'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400':
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  const borderCls = post.status==='pending'?'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/5':
                    post.status==='revision_needed'?'border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-900/5':
                    'border-gray-100 dark:border-gray-800'
                  const isExpanded = expandedBlog === post.id
                  return (
                    <div key={post.id} className={`border rounded-xl mb-3 overflow-hidden ${borderCls}`}>
                      {/* Header row */}
                      <div className="flex items-start gap-3 p-4">
                        {post.cover_image_url && <img src={post.cover_image_url} alt="" className="w-14 h-12 rounded-lg object-cover flex-shrink-0"/>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{post.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCls}`}>{post.status.replace('_',' ')}</span>
                          </div>
                          <p className="text-[11px] text-gray-400">By <strong className="text-gray-600 dark:text-gray-300">{post.members?.full_name||'Unknown'}</strong> · {new Date(post.updated_at||post.created_at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</p>
                          {post.rejection_reason && <p className="text-[11px] mt-1 text-amber-600 dark:text-amber-400">📝 Feedback: {post.rejection_reason}</p>}
                          {post.admin_note && <p className="text-[11px] mt-1 text-gray-400 italic">🔒 Note: {post.admin_note}</p>}
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={()=>setExpandedBlog(isExpanded?null:post.id)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
                            {isExpanded?'Hide':'Read'}
                          </button>
                          {post.status!=='approved' && (
                            <button onClick={()=>approveBlog(post.id,'approve')}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors">
                              <Check size={11}/>Approve
                            </button>
                          )}
                          {post.status!=='revision_needed' && (
                            <button onClick={()=>setBlogAction({id:post.id,type:'revision',text:''})}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors">
                              <Pencil size={11}/>Revision
                            </button>
                          )}
                          {post.status!=='rejected' && (
                            <button onClick={()=>setBlogAction({id:post.id,type:'reject',text:''})}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 text-[11px] font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                              <X size={11}/>Reject
                            </button>
                          )}
                          <button onClick={()=>setAdminNote({id:post.id,text:post.admin_note||''})}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
                            🔒 Note
                          </button>
                        </div>
                      </div>

                      {/* Inline action box */}
                      {blogAction && blogAction.id === post.id && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            {blogAction.type==='revision'?'Request Revision — what should the member fix?':'Rejection reason for the member:'}
                          </p>
                          <textarea value={blogAction.text} onChange={e=>setBlogAction(a=>a?{...a,text:e.target.value}:a)} rows={3}
                            placeholder={blogAction.type==='revision'?'e.g. Please add more detail in section 2 and fix the spelling in the intro…':'Reason for rejection…'}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-purple-400 resize-none mb-2"/>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>approveBlog(post.id,blogAction.type,blogAction.text||undefined)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-colors ${blogAction.type==='revision'?'bg-blue-500 hover:bg-blue-600':'bg-red-500 hover:bg-red-600'}`}>
                              <Check size={11}/>{blogAction.type==='revision'?'Send Revision Request':'Reject Post'}
                            </button>
                            <button onClick={()=>setBlogAction(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Admin note box */}
                      {adminNote && adminNote.id === post.id && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🔒 Internal admin note (not visible to member)</p>
                          <textarea value={adminNote.text} onChange={e=>setAdminNote(a=>a?{...a,text:e.target.value}:a)} rows={2}
                            placeholder="Internal notes…"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-purple-400 resize-none mb-2"/>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>saveAdminNote(post.id,adminNote!.text)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold transition-colors">
                              <Check size={11}/>Save Note
                            </button>
                            <button onClick={()=>setAdminNote(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Expanded content preview */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                          <div className="prose prose-xs dark:prose-invert max-w-none text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-h-80 overflow-y-auto"
                            dangerouslySetInnerHTML={{__html:(post.content||'').replace(/^<div data-dir="(?:rtl|ltr)">/,'').replace(/<\/div>$/,'')}}/>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Pages tab ── */}
          {tab==='pages' && (
            <div className="max-w-4xl">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-4">📄 Quick Link Pages</h3>
                <div className="flex gap-3 mb-4 flex-wrap">
                  {PAGE_SLUGS.map(slug=>(
                    <button key={slug} onClick={()=>setActivePageSlug(slug)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activePageSlug===slug?'bg-teal-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}>
                      {PAGE_LABELS[slug].en}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Language:</span>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {(['en','ar'] as const).map(l=>(
                      <button key={l} onClick={()=>setPageLang(l)}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${pageLang===l?'bg-teal-500 text-white':'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        {l==='en'?'English':'عربي'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 ms-2">Editing: <strong>{PAGE_LABELS[activePageSlug]?.[pageLang]}</strong></span>
                </div>
                {/* Inline import of RichEditor to avoid circular deps */}
                <PageRichEditor value={pageContent} onChange={setPageContent}/>
                <div className="flex justify-end mt-3">
                  <button onClick={savePage} disabled={pageSaving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                    {pageSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={14}/>}
                    Save Page
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Reviews tab ── */}
          {tab==='reviews' && (
            <div className="space-y-4">
              {revLoad && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
              {!revLoad && reviews.length===0 && (
                <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm text-gray-400">
                  <MessageCircle size={28} className="text-gray-200 mx-auto mb-3"/>No reviews yet
                </div>
              )}
              {!revLoad && reviews.map(r=>(
                <div key={r.id} className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-start gap-4 ${!r.approved?'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10':'border-gray-100 dark:border-gray-800'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{r.member_name}</span>
                      <StarRow n={r.stars}/>
                      {!r.approved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                      {r.approved  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Approved</span>}
                      <span className="text-[10px] text-gray-400 ms-auto">{r.shop_tools?.name}</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">{r.comment}</p>}
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5">{new Date(r.created_at).toLocaleString('en-GB')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!r.approved && (
                      <button onClick={()=>approveReview(r.id,true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors">
                        <ThumbsUp size={12}/>Approve
                      </button>
                    )}
                    {r.approved && (
                      <button onClick={()=>approveReview(r.id,false)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-colors">
                        <ThumbsDown size={12}/>Hide
                      </button>
                    )}
                    <button onClick={()=>deleteReview(r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Landing Blocks Modal ── */}
      {modal==='landing' && landingTool && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl shadow-2xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Landing Page — {landingTool.name}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Blocks show below the tool description on the landing page</p>
              </div>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>

            <div className="p-5 space-y-4">
              {landingBlocks.length===0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400">
                  No blocks yet. Add your first block below.
                </div>
              )}

              {landingBlocks.map((block, i)=>(
                <div key={block.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  {/* Block header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Block {i+1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>moveBlock(block.id,-1)} disabled={i===0} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={13}/></button>
                      <button onClick={()=>moveBlock(block.id,1)} disabled={i===landingBlocks.length-1} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={13}/></button>
                      <button onClick={()=>removeBlock(block.id)} className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50"><X size={13}/></button>
                    </div>
                  </div>

                  {/* Layout picker */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Layout</label>
                    <select value={block.layout} onChange={e=>updateBlock(block.id,{layout:e.target.value as any})} className={inp}>
                      {LAYOUTS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>

                  {/* Image URL */}
                  {(block.layout==='image_left'||block.layout==='image_right'||block.layout==='image_only') && (
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Image / GIF URL</label>
                      <input value={block.image_url||''} onChange={e=>updateBlock(block.id,{image_url:e.target.value})} placeholder="https://..." className={inp}/>
                      {block.image_url && <img src={block.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover border border-gray-100 dark:border-gray-700"/>}
                    </div>
                  )}

                  {/* Video URL */}
                  {block.layout==='video' && (
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">YouTube URL</label>
                      <input value={block.video_url||''} onChange={e=>updateBlock(block.id,{video_url:e.target.value})} placeholder="https://youtube.com/watch?v=..." className={inp}/>
                    </div>
                  )}

                  {/* Title + Body (most layouts) */}
                  {!['image_only','features_grid','faq'].includes(block.layout) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 flex items-center gap-1 block"><Globe2 size={9}/>Title (EN)</label>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Section title" className={inp}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 flex items-center gap-1 block"><Globe2 size={9}/>عنوان (AR)</label>
                        <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="عنوان القسم" className={inp+" text-right"} dir="rtl"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Body (EN)</label>
                        <textarea value={block.body_en||''} onChange={e=>updateBlock(block.id,{body_en:e.target.value})} rows={3} placeholder="Description text..." className={inp+" resize-none"}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">نص (AR)</label>
                        <textarea value={block.body_ar||''} onChange={e=>updateBlock(block.id,{body_ar:e.target.value})} rows={3} placeholder="النص بالعربي..." className={inp+" resize-none text-right"} dir="rtl"/>
                      </div>
                    </div>
                  )}

                  {/* Features Grid */}
                  {block.layout==='features_grid' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Title (EN)</label>
                          <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Why choose us" className={inp}/>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">عنوان (AR)</label>
                          <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="لماذا تختارنا" className={inp+" text-right"} dir="rtl"/>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-2 block">Feature Items</label>
                        {(block.features||[]).map((f,fi)=>(
                          <div key={fi} className="flex items-center gap-2 mb-2">
                            <input value={f.icon} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="⚡" className={inp+" w-14 text-center text-lg"}/>
                            <input value={f.en} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,en:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="Feature EN" className={inp+" flex-1"}/>
                            <input value={f.ar} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,ar:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="ميزة AR" className={inp+" flex-1 text-right"} dir="rtl"/>
                            <button onClick={()=>{ const fs=(block.features||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{features:fs}) }} className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 flex-shrink-0"><X size={12}/></button>
                          </div>
                        ))}
                        <button onClick={()=>updateBlock(block.id,{features:[...(block.features||[]),{icon:'⭐',en:'',ar:''}]})}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11}/>Add Feature</button>
                      </div>
                    </div>
                  )}

                  {/* FAQ */}
                  {block.layout==='faq' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Section Title (EN)</label>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Frequently Asked Questions" className={inp}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-2 block">FAQ Items</label>
                        {(block.faqs||[]).map((faq,fi)=>(
                          <div key={fi} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-gray-400">Q{fi+1}</span>
                              <button onClick={()=>{ const fs=(block.faqs||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{faqs:fs}) }} className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={faq.q_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="Question EN" className={inp}/>
                              <input value={faq.q_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="السؤال AR" className={inp+" text-right"} dir="rtl"/>
                              <textarea value={faq.a_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="Answer EN" className={inp+" resize-none"}/>
                              <textarea value={faq.a_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="الإجابة AR" className={inp+" resize-none text-right"} dir="rtl"/>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>updateBlock(block.id,{faqs:[...(block.faqs||[]),{q_en:'',q_ar:'',a_en:'',a_ar:''}]})}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11}/>Add Question</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addBlock}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                <Plus size={14}/>Add Block
              </button>
            </div>

            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={saveLandingBlocks} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>Save Landing Page</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Tool Modal ── */}
      {(modal==='add-tool'||modal==='edit-tool') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add-tool'?'Add Tool':'Edit Tool'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Tool Name *</label>
                <input value={toolForm.name} onChange={e=>setToolForm({...toolForm,name:e.target.value})} placeholder="QuillBot Premium - Lite" className={inp}/>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Description (EN)</label>
                <textarea value={toolForm.description} onChange={e=>setToolForm({...toolForm,description:e.target.value})} className={inp+" resize-none h-16"}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">الوصف بالعربي</label>
                <textarea value={toolForm.description_ar} onChange={e=>setToolForm({...toolForm,description_ar:e.target.value})} className={inp+" resize-none h-16"} dir="rtl" placeholder="أدخل الوصف بالعربي..."/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Shop Type</label>
                <select value={toolForm.category_slug} onChange={e=>setToolForm({...toolForm,category_slug:e.target.value})} className={inp+" cursor-pointer"}>
                  {SHOP_CATS.map(c=><option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Category (للفلتر)</label>
                <select value={toolForm.category_id} onChange={e=>setToolForm({...toolForm,category_id:e.target.value})} className={inp+" cursor-pointer"}>
                  <option value="">— No category —</option>
                  {cats.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Image URL</label>
                <input value={toolForm.image_url} onChange={e=>setToolForm({...toolForm,image_url:e.target.value})} placeholder="https://..." className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Video URL (YouTube)</label>
                <input value={toolForm.video_url} onChange={e=>setToolForm({...toolForm,video_url:e.target.value})} placeholder="https://youtube.com/watch?v=..." className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Price EGP *</label>
                <input type="number" value={toolForm.price_egp} onChange={e=>setToolForm({...toolForm,price_egp:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Price USD</label>
                <input type="number" value={toolForm.price_usd} onChange={e=>setToolForm({...toolForm,price_usd:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Retail Price EGP</label>
                <input type="number" value={toolForm.retail_price_egp} onChange={e=>setToolForm({...toolForm,retail_price_egp:e.target.value})} placeholder="0" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Duration Label</label>
                <input value={toolForm.duration_label} onChange={e=>setToolForm({...toolForm,duration_label:e.target.value})} placeholder="28 Days" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Duration (days)</label>
                <input type="number" value={toolForm.duration_days} onChange={e=>setToolForm({...toolForm,duration_days:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Delivery Label</label>
                <input value={toolForm.delivery_label} onChange={e=>setToolForm({...toolForm,delivery_label:e.target.value})} placeholder="INSTANT" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Sort Order</label>
                <input type="number" value={toolForm.sort_order} onChange={e=>setToolForm({...toolForm,sort_order:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Rating (0-5)</label>
                <input type="number" step="0.1" min="0" max="5" value={toolForm.rating} onChange={e=>setToolForm({...toolForm,rating:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Review Count</label>
                <input type="number" value={toolForm.review_count} onChange={e=>setToolForm({...toolForm,review_count:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Sales Count (Base)</label>
                <input type="number" min="0" value={(toolForm as any).sales_count} onChange={e=>setToolForm({...toolForm,...{sales_count:e.target.value}} as any)} className={inp} placeholder="0"/>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Features (سطر لكل feature)</label>
                <textarea value={toolForm.features} onChange={e=>setToolForm({...toolForm,features:e.target.value})}
                  placeholder={"10 daily downloads\nUnlimited licenses"} className={inp+" resize-none h-20"}/>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Details Slug (مثال: quillbot-pro)</label>
                <input value={toolForm.details_slug} onChange={e=>setToolForm({...toolForm,details_slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')})} placeholder="quillbot-pro — URL: /u/quillbot-pro" className={inp}/>
                <p className="text-[10px] text-gray-400 mt-1">الرابط الداخلي للـ landing page — يجب أن يكون فريداً</p>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Official Site URL (رابط الموقع الرسمي)</label>
                <input value={toolForm.details_url} onChange={e=>setToolForm({...toolForm,details_url:e.target.value})} placeholder="https://quillbot.com" className={inp}/>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={toolForm.is_out_of_stock} onChange={e=>setToolForm({...toolForm,is_out_of_stock:e.target.checked})} className="rounded"/>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</span>
                </label>
              </div>
            </div>
            {/* Bundle items picker — only shown when category is bundle */}
            {toolForm.category_slug === 'bundle' && (
              <div className="px-5 pb-4">
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Bundle Items (select tools to include)</label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {tools.filter(t => t.category_slug !== 'bundle').map(t => {
                    const checked = bundleItemIds.includes(t.id)
                    return (
                      <label key={t.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${checked ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <input type="checkbox" checked={checked}
                          onChange={e => setBundleItemIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                          className="rounded accent-blue-500"/>
                        {t.image_url && <img src={t.image_url} className="w-5 h-5 object-contain rounded flex-shrink-0" alt=""/>}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{t.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{t.category_slug}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{bundleItemIds.length} tools selected</p>
              </div>
            )}

            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={saveTool} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add-tool'?'Add Tool':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Category Modal ── */}
      {(modal==='add-cat'||modal==='edit-cat') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{maxHeight:'90vh'}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add-cat'?'Add Category':'Edit Category'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3 overflow-y-auto flex-1">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:catForm.color+'15',border:`1px solid ${catForm.color}30`}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden" style={{background:catForm.color+'20'}}>
                  {catForm.image_url ? <img src={catForm.image_url} className="w-full h-full object-cover" alt=""/> : catForm.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{catForm.name||'Category Name'}</div>
                  <div className="text-[10px] font-mono text-gray-400">{catForm.slug||'slug'}</div>
                </div>
              </div>
              {/* Row 1: Name EN + Icon */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Name (EN) *</label>
                  <input value={catForm.name} onChange={e=>setCatForm({...catForm,name:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'_')})} placeholder="Writing & AI" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Icon</label>
                  <input value={catForm.icon} onChange={e=>setCatForm({...catForm,icon:e.target.value})} placeholder="✍️" className={inp+" text-center text-xl"}/>
                </div>
              </div>
              {/* Row 2: Name AR + Slug side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">الاسم بالعربي</label>
                  <input value={catForm.name_ar} onChange={e=>setCatForm({...catForm,name_ar:e.target.value})} placeholder="الكتابة والذكاء" className={inp} dir="rtl"/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Slug</label>
                  <input value={catForm.slug} onChange={e=>setCatForm({...catForm,slug:e.target.value})} className={inp+" font-mono"}/>
                </div>
              </div>
              {/* Row 3: Images side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Image (EN)</label>
                  <input value={catForm.image_url} onChange={e=>setCatForm({...catForm,image_url:e.target.value})} placeholder="https://..." className={inp}/>
                  {catForm.image_url && (
                    <div className="mt-1.5 w-full h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={catForm.image_url} className="w-full h-full object-cover" alt="en"/>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">صورة (AR)</label>
                  <input value={catForm.image_url_ar} onChange={e=>setCatForm({...catForm,image_url_ar:e.target.value})} placeholder="https://..." className={inp}/>
                  {catForm.image_url_ar && (
                    <div className="mt-1.5 w-full h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={catForm.image_url_ar} className="w-full h-full object-cover" alt="ar"/>
                    </div>
                  )}
                </div>
              </div>
              {/* Row 4: Color + Sort Order side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1.5 block">Color</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {PRESET_COLORS.map(c=>(
                      <button key={c} onClick={()=>setCatForm({...catForm,color:c})}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                        style={{background:c,outline:catForm.color===c?`2px solid ${c}`:'none',outlineOffset:2}}>
                        {catForm.color===c&&<Check size={10} className="text-white"/>}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input type="color" value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})} className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"/>
                    <input value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})} className={inp+" flex-1 font-mono text-xs"}/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Sort Order</label>
                  <input type="number" value={catForm.sort_order} onChange={e=>setCatForm({...catForm,sort_order:e.target.value})} className={inp}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5 pt-3 flex-shrink-0 border-t border-gray-100 dark:border-gray-800">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={saveCat} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add-cat'?'Add':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={18} className="text-red-500"/></div>
            <h3 className="font-bold text-center mb-1">Delete {delType==='tool'?'Tool':'Category'}?</h3>
            <p className="text-xs text-center text-gray-400 mb-5"><span className="font-semibold text-gray-700 dark:text-gray-300">{delItem.name}</span></p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
