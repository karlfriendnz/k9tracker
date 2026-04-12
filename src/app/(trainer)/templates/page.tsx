import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Plus, Layers, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Training Templates' }

export default async function TemplatesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!trainerProfile) redirect('/onboarding')

  const templates = await prisma.trainingTemplate.findMany({
    where: { trainerId: trainerProfile.id },
    include: { _count: { select: { tasks: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Reusable programs you can apply to any client</p>
        </div>
        <Link href="/templates/new">
          <Button size="sm"><Plus className="h-4 w-4" />New template</Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No templates yet</p>
          <p className="text-sm mt-1">Create a reusable training program to save time</p>
          <Link href="/templates/new" className="mt-4 inline-block">
            <Button size="sm"><Plus className="h-4 w-4" />New template</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => (
            <Link key={t.id} href={`/templates/${t.id}`}>
              <Card className="hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                <CardBody className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      {t.description && <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">{t._count.tasks} task{t._count.tasks !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
