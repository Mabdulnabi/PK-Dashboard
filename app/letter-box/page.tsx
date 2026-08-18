'use client'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Mail } from 'lucide-react'

export default function LetterBoxPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Letter Box" subtitle="Mailing lists & newsletters" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Mail size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Letter Box</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Coming soon</p>
          </div>
        </div>
      </main>
    </div>
  )
}
