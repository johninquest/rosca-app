import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import CycleForm from '../components/CycleForm'
import type { Member } from '../db/dexie-schema'

const members: Member[] = [
  {
    id: 'm1',
    name: 'Marie',
    phone: '+237699000000',
    joinDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'synced',
  },
]

describe('CycleForm', () => {
  it('submits valid cycle values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<CycleForm members={members} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/cycle name/i), 'Tontine Q1')
    await user.type(screen.getByLabelText(/amount per person/i), '10000')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows validation when no member is selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<CycleForm members={members} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/cycle name/i), 'Tontine Q1')
    await user.type(screen.getByLabelText(/amount per person/i), '10000')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/select at least one member/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
