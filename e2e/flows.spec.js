import { expect, test } from '@playwright/test'

test('keeps the previous tab visible and clears the indicator on Back', async ({ page }) => {
  let release
  const hold = new Promise((resolve) => { release = resolve })
  await page.route(/\/assets\/Progresso-[^/]+\.js$/, async (route) => {
    await hold
    await route.continue()
  })
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  const progress = nav.getByRole('link', { name: 'Progresso' })
  try {
    await progress.click()
    await expect(progress).toHaveClass(/!text-accent/)
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Carregando página…')).toHaveCount(0)
  } finally {
    release()
  }
  await expect(page.getByRole('heading', { name: 'Painel de estudos' })).toBeFocused()
  await page.goBack()
  await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  await expect(progress).not.toHaveClass(/!text-accent/)
})

test('opens the mobile menu and closes the Tutor with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir tutor IA' }).click()
  const tutor = page.getByRole('dialog', { name: 'Tutor IA' })
  await expect(tutor.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
  await expect(tutor.getByRole('button', { name: 'Fechar tutor IA' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(tutor).toBeHidden()
})

test('a single timer expiry advances exactly one question and survives reload', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() => {
    if (sessionStorage.getItem('exam-test-initialized')) return
    sessionStorage.setItem('exam-test-initialized', 'true')
    const questions = [1, 2, 3].map((id) => ({
      id: String(id), year: 2023, area: 'Matemática', q: `Pergunta ${id}`,
      opts: ['A', 'B', 'C', 'D', 'E'], correct: 0, files: [], altFiles: []
    }))
    sessionStorage.setItem('studyhub_exam_draft', JSON.stringify({
      version: 1, questions, answers: {}, current: 0, timerActive: true, timerOn: true,
      realExamMode: false, yearsUsed: ['2023'], selectedDisciplines: ['matematica'], examStartedAt: Date.now()
    }))
    sessionStorage.setItem('studyhub_exam_timer', '2')
  })
  await page.goto('/simulados')
  await expect(page.getByText(/Questão 1 de 3/)).toBeVisible()
  await page.clock.runFor(1000)
  await page.clock.runFor(1000)
  await expect(page.getByText(/Questão 2 de 3/)).toBeVisible()
  await page.clock.runFor(2000)
  await expect(page.getByText(/Questão 2 de 3/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Questão 2 de 3/)).toBeVisible()
})
