import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import ContributionDialog from '../components/ContributionDialog'
import type { Cycle, CycleMember } from '../types'

const mockCycle: Cycle = {
  id: 'cycle1',
  name: 'Test Cycle',
  contributionMode: 'fixed',
  fixedAmountPerPerson: 5000,
  frequency: 'monthly',
  startDate: new Date('2026-01-01'),
  status: 'active',
  terms: {},
  totalRounds: 12,
  closedRounds: [],
  payoutOrder: [],
  defaultPaymentMethod: 'cash',
}

const mockMember: CycleMember = {
  id: 'member1',
  cycleId: 'cycle1',
  name: 'John Doe',
  phone: '+237699000000',
  joinDate: new Date('2026-01-01'),
  contributionAmount: 5000,
}

describe('ContributionDialog', () => {
  it('renders with preset values from cycle and member', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    render(
      <ContributionDialog
        open={true}
        cycle={mockCycle}
        member={mockMember}
        roundNumber={1}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText(/Record Contribution/i)).toBeInTheDocument()
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    expect(screen.getByText(/Round 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Amount/i)).toHaveValue(5000)
    expect(screen.getByLabelText(/Payment method/i)).toHaveValue('cash')
  })

  it('renders in edit mode with existing contribution values', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const existingContribution = {
      id: 'contrib1',
      cycleId: 'cycle1',
      memberId: 'member1',
      amount: 6000,
      date: new Date('2026-01-15'),
      roundNumber: 1,
      method: 'mobile_money' as const,
      notes: 'Test note',
    }

    render(
      <ContributionDialog
        open={true}
        cycle={mockCycle}
        member={mockMember}
        roundNumber={1}
        existingContribution={existingContribution}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText(/Edit Contribution/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Amount/i)).toHaveValue(6000)
    expect(screen.getByLabelText(/Payment method/i)).toHaveValue('mobile_money')
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('Test note')
  })

  it('validates amount must be greater than zero', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <ContributionDialog
        open={true}
        cycle={mockCycle}
        member={mockMember}
        roundNumber={1}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    const amountInput = screen.getByLabelText(/Amount/i)
    await user.clear(amountInput)
    await user.type(amountInput, '0')

    await user.click(screen.getByRole('button', { name: /Save Payment/i }))

    expect(await screen.findByText(/Amount must be greater than zero/i)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with correct values when form is valid', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <ContributionDialog
        open={true}
        cycle={mockCycle}
        member={mockMember}
        roundNumber={1}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    const amountInput = screen.getByLabelText(/Amount/i)
    await user.clear(amountInput)
    await user.type(amountInput, '7000')

    const methodSelect = screen.getByLabelText(/Payment method/i)
    await user.selectOptions(methodSelect, 'bank_transfer')

    const notesInput = screen.getByLabelText(/Notes/i)
    await user.type(notesInput, 'Payment received')

    await user.click(screen.getByRole('button', { name: /Save Payment/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 7000,
        method: 'bank_transfer',
        notes: 'Payment received',
      })
    )
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <ContributionDialog
        open={true}
        cycle={mockCycle}
        member={mockMember}
        roundNumber={1}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    const { container } = render(
      <ContributionDialog
        open={false}
        cycle={mockCycle}
        member={mockMember}
        roundNumber={1}
        onSave={onSave}
        onCancel={onCancel}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})
