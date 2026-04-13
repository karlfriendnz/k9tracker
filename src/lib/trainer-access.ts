import { prisma } from './prisma'

/**
 * Returns the client profile if the trainer has access (owns it or has a CO_MANAGE share).
 * Also returns whether the trainer can edit (owns it or CO_MANAGE, not just READ_ONLY).
 */
export async function getClientAccess(clientId: string, userId: string) {
  const trainer = await prisma.trainerProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!trainer) return null

  // Primary trainer
  const owned = await prisma.clientProfile.findFirst({
    where: { id: clientId, trainerId: trainer.id },
    select: { id: true, userId: true, dogId: true, trainerId: true },
  })
  if (owned) return { client: owned, trainerId: trainer.id, canEdit: true }

  // Shared access
  const share = await prisma.clientShare.findFirst({
    where: { clientId, sharedWithId: trainer.id },
    include: {
      client: { select: { id: true, userId: true, dogId: true, trainerId: true } },
    },
  })
  if (!share) return null

  const canEdit = share.shareType === 'CO_MANAGE'
  return { client: share.client, trainerId: trainer.id, canEdit }
}
