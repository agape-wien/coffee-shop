import { test, expect } from '@playwright/test'
import { goToOrder, addItem, placeOrder } from './helpers.js'

// Tests 6–7: end-to-end workflows across multiple views.
// Each test opens several pages in the same browser context so they share a
// Socket.io connection to the same server — real-time updates flow between them
// exactly as they do in production with multiple staff devices.
//
// The DB accumulates orders across test runs (tests 1–5 leave PENDING orders).
// Targeting by item name or order number is ambiguous once the same test has run
// more than once. Instead we capture the order's UUID from the POST /orders
// response and use data-orderid attributes on cards to select exactly the right one.

// ─── Test 6: Full preparation flow ───────────────────────────────────────────

test('full coffee preparation flow: order → barista → counter pickup', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } })
  const orderPage = await ctx.newPage()
  const baristaPage = await ctx.newPage()
  const counterPage = await ctx.newPage()

  await goToOrder(orderPage)
  await baristaPage.goto('/barista')
  await counterPage.goto('/counter')

  // Wait for barista and counter to finish loading
  await expect(baristaPage.getByText('Pending', { exact: true })).toBeVisible()
  await expect(counterPage.getByTestId('counter-pickup')).toBeVisible()

  // Place the order and capture the order ID from the server response.
  // waitForResponse must be set up before the click that triggers the request.
  await addItem(orderPage, 'Americano')
  const responsePromise = orderPage.waitForResponse(
    (resp) => resp.url().includes('/api/v1/orders') && resp.request().method() === 'POST'
  )
  await placeOrder(orderPage)
  const response = await responsePromise
  const { data: order } = await response.json() as { data: { id: string; number: number } }
  const orderId = order.id

  // Barista: click the specific pending card by order ID (immune to other pending orders)
  const pendingPanel = baristaPage.getByTestId('barista-pending')
  await expect(pendingPanel.locator(`[data-orderid="${orderId}"]`)).toBeVisible({ timeout: 5_000 })
  await pendingPanel.locator(`[data-orderid="${orderId}"]`).click()

  // Barista: card moves to In Progress
  const inProgressPanel = baristaPage.getByTestId('barista-inprogress')
  await expect(inProgressPanel.locator(`[data-orderid="${orderId}"]`)).toBeVisible({ timeout: 5_000 })
  await expect(pendingPanel.locator(`[data-orderid="${orderId}"]`)).not.toBeVisible()

  // Barista: mark done
  await inProgressPanel.locator(`[data-orderid="${orderId}"]`).click()
  await expect(inProgressPanel.locator(`[data-orderid="${orderId}"]`)).not.toBeVisible({ timeout: 5_000 })

  // Counter: the specific badge appears and can be dismissed
  const pickupPanel = counterPage.getByTestId('counter-pickup')
  await expect(pickupPanel.locator(`[data-orderid="${orderId}"]`)).toBeVisible({ timeout: 5_000 })
  await pickupPanel.locator(`[data-orderid="${orderId}"]`).click()
  await expect(pickupPanel.locator(`[data-orderid="${orderId}"]`)).not.toBeVisible({ timeout: 5_000 })

  await ctx.close()
})

// ─── Test 7: Deliver from the Open tab in the ordering view ──────────────────

test('deliver order from Open tab after barista marks done', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } })
  const orderPage = await ctx.newPage()
  const baristaPage = await ctx.newPage()

  await goToOrder(orderPage)
  await baristaPage.goto('/barista')
  await expect(baristaPage.getByText('Pending', { exact: true })).toBeVisible()

  // Place the order and capture the order ID from the server response.
  await addItem(orderPage, 'Macchiato')
  const responsePromise = orderPage.waitForResponse(
    (resp) => resp.url().includes('/api/v1/orders') && resp.request().method() === 'POST'
  )
  await orderPage.getByTestId('place-order-btn').click()
  const response = await responsePromise
  const { data: order } = await response.json() as { data: { id: string } }
  const orderId = order.id

  // Switch to Open tab
  await orderPage.getByRole('tab', { name: /Open/i }).click()

  // Open tab: find the specific order card by order ID, verify Deliver is disabled
  const cartPanel = orderPage.getByTestId('cart-panel')
  const orderCard = cartPanel.locator(`[data-orderid="${orderId}"]`)
  await expect(orderCard).toBeVisible({ timeout: 5_000 })
  const deliverBtn = orderCard.getByRole('button', { name: /Deliver/i })
  await expect(deliverBtn).toBeDisabled()

  // Barista: start the order
  const pendingPanel = baristaPage.getByTestId('barista-pending')
  await expect(pendingPanel.locator(`[data-orderid="${orderId}"]`)).toBeVisible({ timeout: 5_000 })
  await pendingPanel.locator(`[data-orderid="${orderId}"]`).click()

  // Barista: mark done
  const inProgressPanel = baristaPage.getByTestId('barista-inprogress')
  await expect(inProgressPanel.locator(`[data-orderid="${orderId}"]`)).toBeVisible({ timeout: 5_000 })
  await inProgressPanel.locator(`[data-orderid="${orderId}"]`).click()

  // Open tab: Deliver button is now enabled
  await expect(deliverBtn).toBeEnabled({ timeout: 5_000 })

  // Tap Deliver → order disappears from Open tab
  await deliverBtn.click()
  await expect(orderCard).not.toBeVisible({ timeout: 5_000 })

  await ctx.close()
})
