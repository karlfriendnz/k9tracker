import { TemplateBuilderForm } from '../template-builder-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New template' }

export default function NewTemplatePage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New training template</h1>
      <TemplateBuilderForm />
    </div>
  )
}
