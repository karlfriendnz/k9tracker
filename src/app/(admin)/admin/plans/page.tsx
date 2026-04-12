import { prisma } from '@/lib/prisma'
import { ManagePlansForm } from './manage-plans-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Manage Plans' }

export default async function AdminPlansPage() {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { priceMonthly: 'asc' } })
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <p className="text-slate-400 text-sm mt-1">Configure pricing and features for each plan tier</p>
      </div>
      <ManagePlansForm plans={plans} />
    </div>
  )
}
