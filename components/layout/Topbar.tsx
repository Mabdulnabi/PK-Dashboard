'use client'
import { Bell, Plus } from 'lucide-react'

export default function Topbar({ title, subtitle, onAdd, addLabel = 'Add New' }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string
}) {
  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: '#0D1117', borderBottom: '1px solid #1a2233' }}
    >
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-gray-100 leading-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-[#1a2233] transition-colors relative"
          title="Notifications"
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/20"
          >
            <Plus size={13} />{addLabel}
          </button>
        )}
      </div>
    </header>
  )
}
