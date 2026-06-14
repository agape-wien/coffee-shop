# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-ordering.spec.ts >> item with note and same item without note become separate cart lines
- Location: e2e\01-ordering.spec.ts:48:1

# Error details

```
TimeoutError: locator.click: Timeout 8000ms exceeded.
Call log:
  - waiting for getByTestId('menu-panel').getByRole('button', { name: /Flat White/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - tablist [ref=e9]:
        - tab [selected] [ref=e10] [cursor=pointer]: Coffee
        - tab [ref=e11] [cursor=pointer]: Other
      - generic [ref=e13]:
        - button [ref=e15] [cursor=pointer]:
          - heading [level=6] [ref=e17]: Espresso
        - button [ref=e19] [cursor=pointer]:
          - heading [level=6] [ref=e21]: Doppio
        - button [ref=e23] [cursor=pointer]:
          - heading [level=6] [ref=e25]: Americano
        - button [ref=e27] [cursor=pointer]:
          - heading [level=6] [ref=e29]: Cappuccino
        - button [ref=e31] [cursor=pointer]:
          - heading [level=6] [ref=e33]: Latte
        - generic [ref=e34]:
          - button [ref=e35] [cursor=pointer]:
            - heading [level=6] [ref=e37]: Flat White
          - generic:
            - generic: ×1
        - button [ref=e39] [cursor=pointer]:
          - heading [level=6] [ref=e41]: Macchiato
    - generic [ref=e43]:
      - generic [ref=e45]:
        - generic [ref=e46]: Table
        - generic [ref=e47]:
          - combobox [ref=e48] [cursor=pointer]: Bar
          - textbox: bar
          - img
          - group:
            - generic: Table
      - generic [ref=e49]:
        - tablist [ref=e52]:
          - tab [selected] [ref=e53] [cursor=pointer]: Order
          - tab [ref=e54] [cursor=pointer]:
            - generic [ref=e55]:
              - generic [ref=e56]: Open
              - generic [ref=e57]: "29"
        - generic [ref=e59]:
          - paragraph [ref=e60]: "#"
          - generic [ref=e62]:
            - spinbutton [ref=e63]: "6"
            - group
      - separator [ref=e64]
      - generic [ref=e66]:
        - generic [ref=e67]:
          - paragraph [ref=e68]: Your Order
          - paragraph [ref=e69]: 1 item
        - list [ref=e71]:
          - listitem [ref=e72]:
            - generic [ref=e73]:
              - heading [level=6] [ref=e74] [cursor=pointer]: Flat White
              - generic [ref=e75]:
                - button [ref=e76] [cursor=pointer]:
                  - img [ref=e77]
                - paragraph [ref=e79]: "1"
                - button [ref=e80] [cursor=pointer]:
                  - img [ref=e81]
        - separator [ref=e83]
        - button [ref=e84] [cursor=pointer]: Place Order
  - dialog "Flat White" [ref=e87]:
    - heading "Flat White" [level=2] [ref=e88]
    - generic [ref=e91]:
      - textbox "Notes (e.g. oat milk, no sugar)" [active] [ref=e92]: oat milk
      - group
    - generic [ref=e93]:
      - button "Cancel" [ref=e94] [cursor=pointer]
      - button "Save" [ref=e95] [cursor=pointer]
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test'
  2  | import { expect } from '@playwright/test'
  3  | 
  4  | // Navigate to the ordering view and wait until the menu has loaded.
  5  | export const goToOrder = async (page: Page) => {
  6  |   await page.goto('/order')
  7  |   await expect(page.getByTestId('menu-panel')).toBeVisible()
  8  |   // Wait for at least one menu card to appear — menu is fetched async on mount.
  9  |   await expect(page.getByTestId('menu-panel').getByRole('button').first()).toBeVisible()
  10 | }
  11 | 
  12 | // Click a menu item by name in the menu panel. Scoped to the menu panel so it
  13 | // never accidentally matches the same name appearing in the cart.
  14 | export const addItem = async (page: Page, itemName: string) => {
> 15 |   await page.getByTestId('menu-panel').getByRole('button', { name: new RegExp(itemName, 'i') }).click()
     |                                                                                                 ^ TimeoutError: locator.click: Timeout 8000ms exceeded.
  16 | }
  17 | 
  18 | // Switch to the named category tab in the menu panel.
  19 | export const selectCategory = async (page: Page, categoryName: string) => {
  20 |   await page.getByTestId('menu-panel').getByRole('tab', { name: categoryName }).click()
  21 | }
  22 | 
  23 | // Get a cart line element scoped to a specific item name.
  24 | export const getCartLine = (page: Page, itemName: string) =>
  25 |   page.getByTestId('cart-line').filter({ hasText: itemName })
  26 | 
  27 | // Click the Place Order button and wait for the cart to clear.
  28 | export const placeOrder = async (page: Page) => {
  29 |   await page.getByTestId('place-order-btn').click()
  30 |   // Cart clears immediately on submit — "Add items from the menu" placeholder appears.
  31 |   await expect(page.getByTestId('cart-panel')).toContainText('Add items', { timeout: 5_000 })
  32 | }
  33 | 
```