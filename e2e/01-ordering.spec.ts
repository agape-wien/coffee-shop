import { test, expect } from '@playwright/test'
import { goToOrder, addItem, selectCategory, getCartLine, placeOrder } from './helpers.js'

// Tests 1–5: all interactions within the ordering view (/order).
// Each test navigates fresh so cart state is clean on every run.
// These tests place real orders into the DB — that's intentional and harmless
// (they show up in management history but don't affect ongoing operations).

test.beforeEach(async ({ page }) => {
  await goToOrder(page)
})

// ─── Test 1: Single item ──────────────────────────────────────────────────────

test('order a single item', async ({ page }) => {
  await addItem(page, 'Espresso')

  await expect(getCartLine(page, 'Espresso')).toBeVisible()
  await expect(page.getByTestId('place-order-btn')).toBeEnabled()

  await placeOrder(page)
})

// ─── Test 2: Multiple items from multiple categories ──────────────────────────

test('order multiple items from multiple categories', async ({ page }) => {
  // Coffee category (default)
  await addItem(page, 'Cappuccino')
  await addItem(page, 'Espresso')

  // Switch to Other category
  await selectCategory(page, 'Other')
  await addItem(page, 'English Breakfast Tea')

  await expect(getCartLine(page, 'Cappuccino')).toBeVisible()
  await expect(getCartLine(page, 'Espresso')).toBeVisible()
  await expect(getCartLine(page, 'English Breakfast Tea')).toBeVisible()

  await placeOrder(page)
})

// ─── Test 3: Notes + same item without note creates a separate cart line ──────

// Core cart line grouping rule: pressing a menu card increments the empty-notes
// line for that item. Once a note is typed that line is locked, so the next press
// creates a new line. This results in two separate cart lines for the same item.

test('item with note and same item without note become separate cart lines', async ({ page }) => {
  await addItem(page, 'Flat White')

  // Expand notes on the cart line and type a modifier
  await getCartLine(page, 'Flat White').getByText('Flat White').click()
  await page.getByPlaceholder('Notes (e.g. oat milk, no sugar)').fill('oat milk')

  // Click the menu card again — the notes line is now locked, so this creates a new line
  await addItem(page, 'Flat White')

  // Two separate cart lines for Flat White should now exist
  const lines = page.getByTestId('cart-line').filter({ hasText: 'Flat White' })
  await expect(lines).toHaveCount(2)

  // One line has a visible notes input containing the note — filter({ hasText }) won't match
  // input values (only text nodes), so check the input value directly.
  await expect(lines.locator('input')).toHaveValue('oat milk')

  await placeOrder(page)
})

// ─── Test 4: Add, remove, and delete cart lines ───────────────────────────────

test('increase quantity, decrease quantity, and remove item from cart', async ({ page }) => {
  await addItem(page, 'Latte')
  const line = getCartLine(page, 'Latte')

  // Add two more → quantity 3
  await addItem(page, 'Latte')
  await addItem(page, 'Latte')
  await expect(line.getByText('3')).toBeVisible()

  // Remove once → quantity 2
  await line.getByRole('button').first().click()
  await expect(line.getByText('2')).toBeVisible()

  // Remove twice more → quantity 0 → line disappears
  await line.getByRole('button').first().click()
  await line.getByRole('button').first().click()
  await expect(line).not.toBeVisible()

  // Cart is empty — Place Order should be disabled
  await expect(page.getByTestId('place-order-btn')).toBeDisabled()
})

// ─── Test 5: Order number override ───────────────────────────────────────────

// Bar orders show an order number field. Staff can override it to sync with a new
// paper ticket block. After placing, the server updates the daily counter and the
// field auto-refills with override + 1.

test('override order number and verify counter increments', async ({ page }) => {
  // Bar is the default table; the number field is already visible.
  const numberInput = page.getByTestId('order-number-input')
  await expect(numberInput).toBeVisible()

  // Override to 50
  await numberInput.fill('50')

  await addItem(page, 'Doppio')
  await page.getByTestId('place-order-btn').click()

  // After placing, field should refill with 51
  await expect(numberInput).toHaveValue('51', { timeout: 5_000 })

  // Reset to a low number so later tests don't start at 52
  await numberInput.fill('1')
  await addItem(page, 'Espresso')
  await page.getByTestId('place-order-btn').click()
  await expect(numberInput).toHaveValue('2', { timeout: 5_000 })
})
