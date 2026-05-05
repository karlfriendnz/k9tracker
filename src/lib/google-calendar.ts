import type { TrainingSession } from '@/generated/prisma'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

export async function syncSessionToGoogleCalendar(
  refreshToken: string,
  session: TrainingSession
): Promise<string | null> {
  const accessToken = await getAccessToken(refreshToken)
  const end = new Date(session.scheduledAt)
  end.setMinutes(end.getMinutes() + session.durationMins)

  const event = {
    summary: session.title,
    description: session.description ?? undefined,
    location: session.location ?? undefined,
    start: { dateTime: session.scheduledAt.toISOString() },
    end: { dateTime: end.toISOString() },
  }

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.id ?? null
}

export async function deleteGoogleCalendarEvent(
  refreshToken: string,
  eventId: string
): Promise<void> {
  const accessToken = await getAccessToken(refreshToken)
  await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
