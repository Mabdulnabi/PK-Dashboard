'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, AppWindow, CreditCard, BarChart3, Receipt, Bell, Settings, Key, LogOut, Upload, Globe, Zap, CreditCard as PlanIcon, MessageSquare, UserCircle, ShoppingBag, SlidersHorizontal, Server} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useUISettings } from '@/lib/use-ui-settings'

const nav = [
  { section:'Overview', items:[
    { label:'Dashboard',  href:'/dashboard', icon:LayoutDashboard },
  ]},
  { section:'Members', items:[
    { label:'Members',    href:'/members',   icon:UserCircle },
    { label:'Plans',      href:'/plans',     icon:PlanIcon },
    { label:'Support',    href:'/support',   icon:MessageSquare },
  ]},
  { section:'Catalog', items:[
    { label:'Products',   href:'/products',  icon:AppWindow },
    { label:'Customers',  href:'/customers', icon:Users },
  ]},
  { section:'Finance', items:[
    { label:'Analytics',     href:'/analytics',        icon:BarChart3 },
    { label:'Transactions',  href:'/transactions',     icon:Receipt },
    { label: 'Payment Methods',  href:'/payment-gateways', icon:CreditCard },
  ]},
  { section:'Group Buy', items:[
    { label:'Group Buy',  href:'/groupbuy',   icon:Globe },
    { label:'OneClick',   href:'/oneclick',   icon:Zap },
    { label:'Servers',    href:'/servers',    icon:Server },  // ← ضيف السطر ده
    { label:'Shop Tools', href:'/shop-admin', icon:ShoppingBag },
    { label:'Site Settings', href:'/site-settings', icon:SlidersHorizontal },
  ]},
  { section:'System', items:[
    { label:'Alerts',     href:'/alerts',    icon:Bell },
    { label:'Import',     href:'/import',    icon:Upload },
    { label:'Settings',   href:'/settings',  icon:Settings },
    { label:'UI Settings', href:'/ui-settings', icon:SlidersHorizontal }
  ]},
]

export default function Sidebar({ expiringCount=0, userName='Admin' }:{ expiringCount?:number; userName?:string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const ui       = useUISettings()
  const signOut  = async()=>{ await supabase.auth.signOut(); router.push('/auth/login') }

  const adminLogo = ui.admin_logo_dark_url || ''

  return (
    <aside className="w-[210px] flex-shrink-0 flex flex-col h-screen sticky top-0" style={{background:'#111827',borderRight:'1px solid #1F2937'}}>
      <div className="px-4 py-4 flex items-center gap-3" style={{borderBottom:'1px solid #1F2937'}}>
        {adminLogo ? (
          <img src={adminLogo} alt="Logo" style={{ width:`${ui.admin_logo_width}px`, height:`${ui.admin_logo_height}px`, objectFit:'contain' }} className="flex-shrink-0"/>
        ) : (
          <>
            <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
              <Key size={18} className="text-white"/>
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Pro<span className="text-red-400">Keys</span></div>
              <div className="text-[10px] text-gray-500 mt-0.5 tracking-wide uppercase">Sub Manager</div>
            </div>
          </>
        )}
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto flex flex-col gap-0.5">
        {nav.map(group=>(
          <div key={group.section}>
            <div className="text-[9px] font-semibold uppercase tracking-widest px-2 py-2 mt-2" style={{color:'#374151'}}>{group.section}</div>
            {group.items.map(item=>{
              const active = pathname===item.href||pathname.startsWith(item.href+'/')
              const Icon   = item.icon
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all relative group"
                  style={{background:active?'#1F2937':'transparent',color:active?'#F9FAFB':'#9CA3AF'}}>
                  {active&&<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500 rounded-r-full"/>}
                  <Icon size={16} className={active?'text-red-400':'text-gray-600 group-hover:text-gray-300'}/>
                  <span className="group-hover:text-gray-200 transition-colors">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="px-3 py-3" style={{borderTop:'1px solid #1F2937'}}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{userName.slice(0,2).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-200 truncate">{userName}</div>
            <div className="text-[10px] text-gray-500">Admin · Pro Plan</div>
          </div>
          <button onClick={signOut} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <LogOut size={13} className="text-gray-500 hover:text-red-400"/>
          </button>
        </div>
      </div>
    </aside>
  )
}
