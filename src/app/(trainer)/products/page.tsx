import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductsManager } from './products-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Products' }

export default async function ProductsPage() {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') redirect('/login')
  const trainerId = session.user.trainerId
  if (!trainerId) redirect('/login')

  const products = await prisma.product.findMany({
    where: { trainerId },
    orderBy: [{ category: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sell physical items and digital downloads to your clients.
          </p>
        </div>
      </div>

      <ProductsManager
        initialProducts={products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          kind: p.kind as 'PHYSICAL' | 'DIGITAL',
          priceCents: p.priceCents,
          imageUrl: p.imageUrl,
          downloadUrl: p.downloadUrl,
          category: p.category,
          featured: p.featured,
          active: p.active,
        }))}
      />
    </div>
  )
}
