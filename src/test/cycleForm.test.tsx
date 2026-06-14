import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import CycleForm from '../components/CycleForm'

describe('CycleForm', () => {
  it('submits valid cycle values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<CycleForm onSubmit={onSubmit} />)

    await user.clear(screen.getByLabelText(/cycle name/i))
    await user.type(screen.getByLabelText(/cycle name/i), 'Tontine Q1')

    await user.clear(screen.getByLabelText(/amount per person/i))
    await user.type(screen.getByLabelText(/amount per person/i), '10000')

    await user.clear(screen.getByLabelText(/number of rounds/i))
    await user.type(screen.getByLabelText(/number of rounds/i), '12')

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('requires cycle name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<CycleForm onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
