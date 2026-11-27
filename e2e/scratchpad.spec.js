import { expect, test } from '@playwright/test'

test('draws, edits and preserves calculations while the scratchpad is closed', async ({ page }) => {
  await page.goto('/quiz/Matem%C3%A1tica')
  const toggle = page.getByRole('button', { name: 'Rascunho', exact: true })
  await toggle.click()
  const pad = page.getByRole('dialog', { name: 'Rascunho' })
  const board = pad.getByRole('img', { name: /Quadro para escrever/ })
  const bounds = await board.boundingBox()
  expect(bounds).not.toBeNull()
  for (const offset of [20, 60]) {
    await page.mouse.move(bounds.x + offset, bounds.y + 20)
    await page.mouse.down()
    await page.mouse.move(bounds.x + offset + 25, bounds.y + 65, { steps: 5 })
    await page.mouse.up()
  }
  await expect(board.locator('path')).toHaveCount(2)
  await pad.getByRole('button', { name: 'Desfazer traço' }).click()
  await expect(board.locator('path')).toHaveCount(1)
  await pad.getByLabel('Contas digitadas').fill('12 × 5 = 60')
  await page.keyboard.press('Escape')
  await expect(pad).toHaveCount(0)
  await expect(toggle).toBeFocused()
  await toggle.click()
  await expect(board.locator('path')).toHaveCount(1)
  await expect(pad.getByLabel('Contas digitadas')).toHaveValue('12 × 5 = 60')
  await pad.getByRole('button', { name: 'Limpar quadro' }).click()
  await expect(board.locator('path')).toHaveCount(0)
})
