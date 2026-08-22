'use client'
export default function DashboardTab() {
  return (
    <div className="-m-6 h-[calc(100vh-58px)]">
      <iframe
        src="/landing?embedded=1"
        className="w-full h-full border-0"
        title="Landing Page"
      />
    </div>
  )
}
