import { describe, it, expect } from 'vitest'
import { buildWhatsAppUrl } from '../utils/whatsapp'

const event = {
  title: 'Funeral for Uncle Paul',
  currency: 'XAF',
  targetAmount: 500000,
}

const contributions = [
  { contributorName: 'Aunt Marie', amount: 50000, date: '2026-05-12', note: '' },
  { contributorName: 'Jean-Pierre', amount: 30000, date: '2026-05-11', note: '' },
]

const eventUrl = 'https://mocotr.web.app/event/abc123'

describe('buildWhatsAppUrl', () => {
  it('returns a wa.me URL', () => {
    const url = buildWhatsAppUrl(event, contributions, eventUrl)
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('includes the event title in the message', () => {
    const url = buildWhatsAppUrl(event, contributions, eventUrl)
    expect(decodeURIComponent(url)).toContain('Funeral for Uncle Paul')
  })

  it('includes target, collected, remaining and progress when target is set', () => {
    const decoded = decodeURIComponent(buildWhatsAppUrl(event, contributions, eventUrl))
    expect(decoded).toContain('Target')
    expect(decoded).toContain('Collected')
    expect(decoded).toContain('Remaining')
    expect(decoded).toContain('Progress')
  })

  it('omits target/remaining/progress lines when no target is set', () => {
    const noTarget = { ...event, targetAmount: null }
    const decoded = decodeURIComponent(buildWhatsAppUrl(noTarget, contributions, eventUrl))
    expect(decoded).not.toContain('Target')
    expect(decoded).not.toContain('Remaining')
    expect(decoded).not.toContain('Progress')
    expect(decoded).toContain('Collected')
  })

  it('includes the event URL in the message', () => {
    const decoded = decodeURIComponent(buildWhatsAppUrl(event, contributions, eventUrl))
    expect(decoded).toContain(eventUrl)
  })

  it('handles empty contributions array without crashing', () => {
    expect(() => buildWhatsAppUrl(event, [], eventUrl)).not.toThrow()
  })
})
