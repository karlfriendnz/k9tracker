import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Trainers' }

export default async function AdminTrainersPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q ?? ''

  const trainers = await prisma.user.findMany({
    where: {
      role: 'TRAINER',
      ...(q ? { OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ]} : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      trainerProfile: {
        select: {
          businessName: true,
          subscriptionStatus: true,
          subscriptionPlan: { select: { name: true } },
          _count: { select: { clients: true } },
        },
      },
    },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Trainer Accounts</h1>
        <p className="text-slate-400 text-sm mt-1">{trainers.length} trainer{trainers.length !== 1 ? 's' : ''} registered</p>
      </div>

      <form className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email..."
          className="w-full max-w-sm h-11 rounded-xl bg-slate-800 border border-slate-700 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Business</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Clients</th>
              <th className="text-left px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {trainers.map(t => (
              <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{t.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-300">{t.email}</td>
                <td className="px-4 py-3 text-slate-300">{t.trainerProfile?.businessName ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.trainerProfile?.subscriptionStatus === 'ACTIVE' ? 'bg-green-900 text-green-300' :
                    t.trainerProfile?.subscriptionStatus === 'TRIALING' ? 'bg-blue-900 text-blue-300' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {t.trainerProfile?.subscriptionPlan?.name ?? 'No plan'} · {t.trainerProfile?.subscriptionStatus ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{t.trainerProfile?._count?.clients ?? 0}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {trainers.length === 0 && (
          <p className="text-center py-8 text-slate-500">No trainers found</p>
        )}
      </div>
    </div>
  )
}
