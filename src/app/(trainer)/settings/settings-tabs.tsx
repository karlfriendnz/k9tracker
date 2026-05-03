'use client'

import { useState } from 'react'
import { User, ListChecks, Globe } from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'custom', label: 'Custom fields', icon: ListChecks },
  { id: 'forms', label: 'Embed forms', icon: Globe },
] as const

type TabId = typeof TABS[number]['id']

export function SettingsTabs({
  profile,
  customFields,
  forms,
}: {
  profile: React.ReactNode
  customFields: React.ReactNode
  forms: React.ReactNode
}) {
  const [tab, setTab] = useState<TabId>('profile')

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {active && (
                <span className="absolute -bottom-px left-3 right-3 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      <div>
        <div className={tab === 'profile' ? '' : 'hidden'}>{profile}</div>
        <div className={tab === 'custom' ? '' : 'hidden'}>{customFields}</div>
        <div className={tab === 'forms' ? '' : 'hidden'}>{forms}</div>
      </div>
    </div>
  )
}
