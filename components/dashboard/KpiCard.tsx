import { LucideIcon, TrendingUp } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  icon: LucideIcon
  iconBg: string
  iconColor: string
  accentColor: string
  warning?: boolean
}

export default function KpiCard({ label, value, trend, trendUp = true, icon: Icon, iconBg, iconColor, accentColor, warning }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 relative overflow-hidden transition-theme">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: accentColor }} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-600">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
      </div>
      <div className={`text-2xl font-bold leading-none ${warning ? '' : 'text-gray-900 dark:text-gray-100'}`} style={warning ? { color: accentColor } : {}}>
        {value}
      </div>
      {trend && (
        <div className={`text-[10px] mt-2 flex items-center gap-1 ${trendUp ? 'text-emerald-500' : 'text-red-400'}`}>
          <TrendingUp size={10} />{trend}
        </div>
      )}
    </div>
  )
}
