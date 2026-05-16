import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventForm from '../components/EventForm'

describe('EventForm targetAmount', () => {
  it('submits without targetAmount when left empty (undefined default)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <EventForm
        onSubmit={onSubmit}
        defaultValues={{
          title: 'Community Support',
          currency: 'XAF',
          targetAmount: undefined,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].targetAmount).toBeUndefined()
  })

  it('submits without targetAmount when PocketBase returned 0 as default', async () => {
    // PocketBase returns 0 (not null) for unset numeric fields.
    // EditEventPage normalises: event.targetAmount || undefined  →  0 becomes undefined.
    // This test verifies the form behaves correctly when that normalized undefined is passed in.
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    // Simulate what EditEventPage does: 0 || undefined === undefined
    const normalizedTarget = 0 || undefined

    render(
      <EventForm
        onSubmit={onSubmit}
        defaultValues={{
          title: 'Community Support',
          currency: 'XAF',
          targetAmount: normalizedTarget,
        }}
      />,
    )

    // Field should be empty, not showing 0
    const targetInput = screen.getByLabelText(/target amount/i)
    expect(targetInput).toHaveValue(null)

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].targetAmount).toBeUndefined()
  })

  it('shows validation error when targetAmount is zero', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <EventForm
        onSubmit={onSubmit}
        defaultValues={{
          title: 'Community Support',
          currency: 'XAF',
          targetAmount: undefined,
        }}
      />,
    )

    const targetInput = screen.getByLabelText(/target amount/i)
    // type a 0, then clear it to force a 0 submission via keyboard
    await user.type(targetInput, '0')
    // The field now holds the string '0'; validate should reject it
    await user.click(screen.getByRole('button', { name: /save/i }))

    // setValueAs('0') → 0 (finite number) → validate(0): 0 >= 1 is false → error shown
    expect(await screen.findByText('Must be at least 1')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
