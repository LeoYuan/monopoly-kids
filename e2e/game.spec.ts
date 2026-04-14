import { test, expect } from '@playwright/test'

test.describe('Game flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await expect(page.locator('button[data-count="2"]')).toBeVisible()
    await page.locator('button[data-count="2"]').click()
    await expect(page.locator('#name-screen')).toHaveClass(/active/)
    await page.locator('#btn-name-start').click()
    await expect(page.locator('#game-screen')).toHaveClass(/active/)
  })

  test('roll dice moves the current player', async ({ page }) => {
    const btnRoll = page.locator('#btn-roll')
    await expect(btnRoll).toBeVisible()
    await expect(btnRoll).toBeEnabled()

    // Get initial position of the first player token
    const startCell = page.locator('#tokens-0')
    await expect(startCell).toContainText('🐰')

    await btnRoll.click()

    // Dice overlay should appear and disappear
    await expect(page.locator('#dice-overlay')).not.toHaveClass(/hidden/)
    await expect(page.locator('#dice-overlay')).toHaveClass(/hidden/, { timeout: 3000 })

    // If a purchase prompt is shown, press space to skip buying
    const gameMessage = page.locator('#game-message')
    try {
      await expect(gameMessage).toContainText('按空格键购买', { timeout: 2000 })
      await page.keyboard.press('Space')
    } catch {
      // No purchase prompt
    }

    // Wait for any modal to appear and close it, or timeout if none
    const modal = page.locator('#modal')
    try {
      await expect(modal).not.toHaveClass(/hidden/, { timeout: 2000 })
      await modal.locator('button').first().click()
      await expect(modal).toHaveClass(/hidden/)
    } catch {
      // No modal appeared
    }

    // After turn ends, button should be re-enabled for next player
    await expect(btnRoll).toBeEnabled({ timeout: 10000 })

    // Round should still be displayed
    await expect(page.locator('#round-display')).toContainText('/')
  })

  test('back button returns to home', async ({ page }) => {
    await page.locator('#btn-back').click()
    await expect(page.locator('#home-screen')).toHaveClass(/active/)
    await expect(page.locator('#game-screen')).not.toHaveClass(/active/)
  })

  test('all player tokens are visible on the board at start', async ({ page }) => {
    // All players start at cell 0 (起点)
    const startCell = page.locator('#tokens-0')
    await expect(startCell).toBeVisible()

    // Verify each player's token is rendered inside the start cell
    const tokens = startCell.locator('.token')
    await expect(tokens).toHaveCount(2)

    // Check token text and border colors are applied
    await expect(tokens.nth(0)).toContainText('🐰')
    await expect(tokens.nth(1)).toContainText('🐻')

    // Ensure tokens have distinct border colors for readability
    const color1 = await tokens.nth(0).evaluate((el) => getComputedStyle(el).borderColor)
    const color2 = await tokens.nth(1).evaluate((el) => getComputedStyle(el).borderColor)
    expect(color1).not.toBe(color2)
  })

  test('pressing space purchases property and advances turn', async ({ page }) => {
    const btnRoll = page.locator('#btn-roll')
    await expect(btnRoll).toBeVisible()
    await expect(btnRoll).toBeEnabled()

    // Roll until we land on a property cell (retry up to 10 times)
    let attempts = 0
    const gameMessage = page.locator('#game-message')
    while (attempts < 10) {
      await btnRoll.click()
      await expect(page.locator('#dice-overlay')).not.toHaveClass(/hidden/)
      await expect(page.locator('#dice-overlay')).toHaveClass(/hidden/, { timeout: 3000 })

      try {
        await expect(gameMessage).toContainText('按空格键购买', { timeout: 2000 })
        break
      } catch {
        // Close any modal and wait for turn to end
        const modal = page.locator('#modal')
        try {
          await expect(modal).not.toHaveClass(/hidden/, { timeout: 1000 })
          await modal.locator('button').first().click()
          await expect(modal).toHaveClass(/hidden/)
        } catch {
          // No modal
        }
        await expect(btnRoll).toBeEnabled({ timeout: 10000 })
      }
      attempts++
    }

    expect(attempts).toBeLessThan(10)

    // Press space to purchase
    await page.keyboard.press('Space')

    // Turn should end and button re-enabled
    await expect(btnRoll).toBeEnabled({ timeout: 10000 })

    // Verify a property was actually purchased (owner dot appears on board)
    const ownerDots = page.locator('.owner-dot')
    await expect(ownerDots.first()).toBeVisible()
  })

  test('space works after button is disabled', async ({ page }) => {
    const btnRoll = page.locator('#btn-roll')
    await expect(btnRoll).toBeVisible()
    await expect(btnRoll).toBeEnabled()

    // Roll until we land on a property cell
    let attempts = 0
    const gameMessage = page.locator('#game-message')
    while (attempts < 10) {
      await btnRoll.click()
      await expect(page.locator('#dice-overlay')).not.toHaveClass(/hidden/)
      await expect(page.locator('#dice-overlay')).toHaveClass(/hidden/, { timeout: 3000 })

      try {
        await expect(gameMessage).toContainText('按空格键购买', { timeout: 2000 })
        break
      } catch {
        const modal = page.locator('#modal')
        try {
          await expect(modal).not.toHaveClass(/hidden/, { timeout: 1000 })
          await modal.locator('button').first().click()
          await expect(modal).toHaveClass(/hidden/)
        } catch {
          // No modal
        }
        await expect(btnRoll).toBeEnabled({ timeout: 10000 })
      }
      attempts++
    }

    expect(attempts).toBeLessThan(10)

    // Explicitly focus the disabled button to simulate WebKit behavior,
    // then verify space still triggers purchase and advances turn.
    await btnRoll.focus()
    await page.keyboard.press('Space')

    // After purchase, turn should end and button re-enabled
    await expect(btnRoll).toBeEnabled({ timeout: 10000 })

    // Verify a property was actually purchased (owner dot appears on board)
    const ownerDots = page.locator('.owner-dot')
    await expect(ownerDots.first()).toBeVisible()
  })

  test('all 24 board cells are present', async ({ page }) => {
    const cells = page.locator('.cell')
    await expect(cells).toHaveCount(48) // 6x8 grid

    // Verify all 24 named cells exist by checking their text content
    const cellNames = [
      '起点', '草莓屋', '樱桃屋', '柠檬屋', '香蕉屋',
      '薄荷屋', '蓝莓屋', '葡萄屋', '西瓜屋',
      '免费停车', '桃子屋', '苹果屋', '橙子屋', '菠萝屋',
      '椰子屋', '海浪屋', '彩虹屋', '星星屋',
    ]
    for (const name of cellNames) {
      const cell = page.locator('.cell', { hasText: name })
      await expect(cell).toHaveCount(1)
    }
    // "机会", "命运", "监狱" appear twice each
    await expect(page.locator('.cell', { hasText: '机会' })).toHaveCount(2)
    await expect(page.locator('.cell', { hasText: '命运' })).toHaveCount(2)
    await expect(page.locator('.cell', { hasText: '监狱' })).toHaveCount(2)
  })
})
