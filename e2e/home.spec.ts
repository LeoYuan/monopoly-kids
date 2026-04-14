import { test, expect } from '@playwright/test'

test.describe('Home screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/')
  })

  test('shows title and player selection buttons', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('糖果大富翁')
    await expect(page.locator('button[data-count="2"]')).toBeVisible()
    await expect(page.locator('button[data-count="3"]')).toBeVisible()
    await expect(page.locator('button[data-count="4"]')).toBeVisible()
  })

  test('clicking 2-player starts the game', async ({ page }) => {
    await page.locator('button[data-count="2"]').click()
    await expect(page.locator('#name-screen')).toHaveClass(/active/)
    await page.locator('#btn-name-start').click()
    await expect(page.locator('#game-screen')).toHaveClass(/active/)
    await expect(page.locator('#home-screen')).not.toHaveClass(/active/)
    await expect(page.locator('#players-list')).toContainText('小白兔')
    await expect(page.locator('#players-list')).toContainText('小熊熊')
  })

  test('clicking 3-player starts the game with 3 players', async ({ page }) => {
    await page.locator('button[data-count="3"]').click()
    await expect(page.locator('#name-screen')).toHaveClass(/active/)
    await page.locator('#btn-name-start').click()
    await expect(page.locator('#game-screen')).toHaveClass(/active/)
    await expect(page.locator('#players-list')).toContainText('小猫咪')
  })

  test('clicking 4-player starts the game with 4 players', async ({ page }) => {
    await page.locator('button[data-count="4"]').click()
    await expect(page.locator('#name-screen')).toHaveClass(/active/)
    await page.locator('#btn-name-start').click()
    await expect(page.locator('#game-screen')).toHaveClass(/active/)
    await expect(page.locator('#players-list')).toContainText('小狗狗')
  })
})
