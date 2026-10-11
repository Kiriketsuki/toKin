// End-to-end tests of the browser host. Each test gets a fresh browser
// context, so each starts with empty localStorage. Pages in one context
// share storage, as two tabs of one browser do.

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const SAVE_KEY = 'tokin.save'

async function nameFounder(page: Page, name: string): Promise<void> {
  await page.goto('/')
  await page.locator('#founder-name').fill(name)
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-key="work"]')).toBeVisible()
}

async function work(page: Page, presses: number): Promise<void> {
  const button = page.locator('[data-key="work"]')
  for (let i = 0; i < presses; i += 1) await button.click()
}

const header = (page: Page) => page.locator('#app .box-column').first()
const viewerLine = (page: Page) => page.locator('#app .viewer')

test('a new player names the founder and works payroll by hand', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('You need a name on the paperwork.')).toBeVisible()
  await nameFounder(page, 'Ada')
  await expect(header(page)).toContainText('toKin | Ada |')
  await work(page, 10)
  await expect(header(page)).toContainText('$5.00')
  await expect(page.getByText('the numbers add up. they always do, eventually.').first()).toBeVisible()
})

test('a machine and an agent earn cash on their own', async ({ page }) => {
  await nameFounder(page, 'Grace')
  await work(page, 60)
  await page.locator('[data-key="buy:relay-rack"]').click()
  await expect(header(page)).toContainText('compute 0/1')
  await page.locator('[data-key="create:kin-0.1:earn"]').click()
  await expect(page.getByText('Agents (1)')).toBeVisible()
  await expect(header(page)).toContainText('(0.8/s)')
})

test('a refused press shows the reason in the pane', async ({ page }) => {
  await nameFounder(page, 'Ada')
  await page.locator('[data-key="buy:relay-rack"]').click()
  await expect(header(page)).toContainText('not enough cash')
})

test('the save survives a reload', async ({ page }) => {
  await nameFounder(page, 'Ada')
  await work(page, 3)
  await expect(header(page)).toContainText('$1.50')
  await page.reload()
  await expect(header(page)).toContainText('toKin | Ada |')
  await expect(header(page)).toContainText('$1.50')
})

test('a second tab is read-only and takes over when the first closes', async ({ context }) => {
  const first = await context.newPage()
  await nameFounder(first, 'Ada')
  const second = await context.newPage()
  await second.goto('/')
  await expect(viewerLine(second)).toHaveText('running in another tab. this tab is read-only.')
  await second.locator('[data-key="work"]').click()
  await expect(header(second)).toContainText('running in another tab')
  await expect(viewerLine(first)).toHaveCount(0)

  await first.close()
  await expect(viewerLine(second)).toHaveCount(0)
  await expect(header(second)).not.toContainText('running in another tab')
  await work(second, 2)
  await expect(header(second)).toContainText('$1.00')
})

test('time away is caught up with the sleep line', async ({ context }) => {
  const first = await context.newPage()
  await nameFounder(first, 'Ada')
  await first.close()
  // Before the next page loads, move the save back by 30 minutes.
  await context.addInitScript((key: string) => {
    if (sessionStorage.getItem('tokin.e2e.moved') !== null) return
    const raw = localStorage.getItem(key)
    if (raw === null) return
    const save = JSON.parse(raw) as { lastSavedAt: number }
    save.lastSavedAt -= 30 * 60 * 1000
    localStorage.setItem(key, JSON.stringify(save))
    sessionStorage.setItem('tokin.e2e.moved', '1')
  }, SAVE_KEY)
  const second = await context.newPage()
  await second.goto('/')
  await expect(second.getByText('you slept. it did not.')).toBeVisible()
})

test('a phone-width page has no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await nameFounder(page, 'Ada')
  await work(page, 60)
  await page.locator('[data-key="buy:relay-rack"]').click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
