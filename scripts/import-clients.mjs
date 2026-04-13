import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

const TRAINER_ID = 'cmnwufvpw000d11i49c1jjnv8' // hello@pawsandthrive.co.nz

function parseName(raw) {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  // "Last, First" → "First Last"
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',').map(s => s.trim())
    return [first, last].filter(Boolean).join(' ')
  }
  return trimmed
}

function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

async function main() {
  const csv = readFileSync('/Users/karl/Downloads/Paws & Thrive Clientele - Sheet1.csv', 'utf-8')
  const lines = csv.split('\n').filter(l => l.trim())

  let created = 0, skipped = 0, errors = 0

  for (const line of lines) {
    const cols = parseCSVLine(line)
    const rawName  = cols[0] ?? ''
    const email    = cols[1]?.trim() ?? ''
    const phone    = cols[2]?.trim() ?? ''
    const address  = cols[3]?.trim() ?? ''
    const dogField = cols[4]?.trim() ?? ''
    const notes1   = cols[5]?.trim() ?? ''
    const notes2   = cols[6]?.trim() ?? ''
    const notes3   = cols[7]?.trim() ?? ''

    const name = parseName(rawName)

    // Skip rows with no usable identity
    if (!name && !email) { skipped++; continue }

    // Generate placeholder email if none provided
    const finalEmail = email || `import.${(name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '.')}@pawsandthrive.co.nz`

    // Combine notes
    const allNotes = [notes1, notes2, notes3].filter(Boolean).join(' | ')
    const dogName  = dogField || null

    try {
      // Check for existing user
      const existing = await prisma.user.findUnique({ where: { email: finalEmail } })
      if (existing) {
        console.log(`  SKIP (exists): ${finalEmail}`)
        skipped++
        continue
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: finalEmail,
          name: name,
          role: 'CLIENT',
        },
      })

      // Create client profile
      const clientProfile = await prisma.clientProfile.create({
        data: {
          userId: user.id,
          trainerId: TRAINER_ID,
        },
      })

      // Create primary dog if we have a name
      if (dogName) {
        const dog = await prisma.dog.create({
          data: {
            name: dogName,
            notes: allNotes || null,
          },
        })
        await prisma.clientProfile.update({
          where: { id: clientProfile.id },
          data: { dogId: dog.id },
        })
      }

      // Store phone as custom field value if a phone field exists
      if (phone) {
        const phoneField = await prisma.customField.findFirst({
          where: { trainerId: TRAINER_ID, label: { contains: 'phone', mode: 'insensitive' } },
        })
        if (phoneField) {
          await prisma.customFieldValue.create({
            data: { fieldId: phoneField.id, clientId: clientProfile.id, value: phone },
          })
        }
      }

      // Store address as custom field value if an address field exists
      if (address) {
        const addrField = await prisma.customField.findFirst({
          where: { trainerId: TRAINER_ID, label: { contains: 'address', mode: 'insensitive' } },
        })
        if (addrField) {
          await prisma.customFieldValue.create({
            data: { fieldId: addrField.id, clientId: clientProfile.id, value: address },
          })
        }
      }

      console.log(`  ✓ ${name ?? finalEmail}${dogName ? ` · ${dogName}` : ''}`)
      created++
    } catch (err) {
      console.error(`  ✗ ${finalEmail}: ${err.message}`)
      errors++
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`)
}

main().finally(() => prisma.$disconnect())
