import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// Navigate to the ordering view and wait until the menu has loaded.
export const goToOrder = async (page: Page) => {
  await page.goto('/order')
  await expect(page.getByTestId('menu-panel')).toBeVisible()
  // Wait for at least one menu card to appear — menu is fetched async on mount.
  await expect(page.getByTestId('menu-panel').getByRole('button').first()).toBeVisible()
}

// Click a menu item by name in the menu panel. Scoped to the menu panel so it
// never accidentally matches the same name appearing in the cart.
export const addItem = async (page: Page, itemName: string) => {
  await page.getByTestId('menu-panel').getByRole('button', { name: new RegExp(itemName, 'i') }).click()
}

// Switch to the named category tab in the menu panel.
export const selectCategory = async (page: Page, categoryName: string) => {
  await page.getByTestId('menu-panel').getByRole('tab', { name: categoryName }).click()
}

// Get a cart line element scoped to a specific item name.
export const getCartLine = (page: Page, itemName: string) =>
  page.getByTestId('cart-line').filter({ hasText: itemName })

// Click the Place Order button and wait for the cart to clear.
export const placeOrder = async (page: Page) => {
  await page.getByTestId('place-order-btn').click()
  // Cart clears immediately on submit — "Add items from the menu" placeholder appears.
  await expect(page.getByTestId('cart-panel')).toContainText('Add items', { timeout: 5_000 })
}
