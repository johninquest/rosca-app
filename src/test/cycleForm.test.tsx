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

  describe('editMode', () => {
    it('hides non-editable fields when editMode is true', () => {
      const onSubmit = vi.fn()
      const defaultValues = {
        name: 'Test Cycle',
        contributionMode: 'fixed' as const,
        fixedAmountPerPerson: 5000,
        frequency: 'monthly' as const,
        startDate: '2026-01-01',
        totalRounds: 12,
        defaultPaymentMethod: 'cash' as const,
      }

      render(<CycleForm editMode defaultValues={defaultValues} onSubmit={onSubmit} />)

      // Should NOT show these fields in edit mode
      expect(screen.queryByLabelText(/cycle name/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/contribution mode/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/frequency/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/number of rounds/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Terms & Rules/i)).not.toBeInTheDocument()
    })

    it('shows only editable fields when editMode is true', () => {
      const onSubmit = vi.fn()
      const defaultValues = {
        name: 'Test Cycle',
        contributionMode: 'fixed' as const,
        fixedAmountPerPerson: 5000,
        frequency: 'monthly' as const,
        startDate: '2026-01-01',
        totalRounds: 12,
        defaultPaymentMethod: 'cash' as const,
      }

      render(<CycleForm editMode defaultValues={defaultValues} onSubmit={onSubmit} />)

      // Should show these editable fields
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/default payment method/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/amount per person/i)).toBeInTheDocument()
    })

    it('populates default values correctly in edit mode', () => {
      const onSubmit = vi.fn()
      const defaultValues = {
        name: 'Test Cycle',
        contributionMode: 'fixed' as const,
        fixedAmountPerPerson: 7500,
        frequency: 'monthly' as const,
        startDate: '2026-03-15',
        totalRounds: 10,
        defaultPaymentMethod: 'mobile_money' as const,
      }

      render(<CycleForm editMode defaultValues={defaultValues} onSubmit={onSubmit} />)

      expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-03-15')
      expect(screen.getByLabelText(/default payment method/i)).toHaveValue('mobile_money')
      expect(screen.getByLabelText(/amount per person/i)).toHaveValue(7500)
    })

    it('shows "Update Cycle" button label in edit mode', () => {
      const onSubmit = vi.fn()
      const defaultValues = {
        name: 'Test Cycle',
        contributionMode: 'fixed' as const,
        fixedAmountPerPerson: 5000,
        frequency: 'monthly' as const,
        startDate: '2026-01-01',
        totalRounds: 12,
        defaultPaymentMethod: 'cash' as const,
      }

      render(<CycleForm editMode defaultValues={defaultValues} onSubmit={onSubmit} />)

      expect(screen.getByRole('button', { name: /update cycle/i })).toBeInTheDocument()
    })

    it('submits only editable fields in edit mode', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      const defaultValues = {
        name: 'Test Cycle',
        contributionMode: 'fixed' as const,
        fixedAmountPerPerson: 5000,
        frequency: 'monthly' as const,
        startDate: '2026-01-01',
        totalRounds: 12,
        defaultPaymentMethod: 'cash' as const,
      }

      render(<CycleForm editMode defaultValues={defaultValues} onSubmit={onSubmit} />)

      // Change the amount
      const amountInput = screen.getByLabelText(/amount per person/i)
      await user.clear(amountInput)
      await user.type(amountInput, '8000')

      await user.click(screen.getByRole('button', { name: /update cycle/i }))

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fixedAmountPerPerson: 8000,
          startDate: '2026-01-01',
          defaultPaymentMethod: 'cash',
        })
      )
    })
  })
})
