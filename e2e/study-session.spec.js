import { expect, test } from '@playwright/test'

test('abre treino pelo início e permite refazer um erro sem revelar o gabarito', async ({ page }) => {
  await page.route('https://api.enem.dev/v1/exams/2023/questions?*', (route) => route.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: { questions: [136, 145, 155, 165, 172].map((index) => ({
      index, discipline: 'matematica', context: `Questão de geometria ${index}`, files: [],
      alternatives: ['Correta', 'Incorreta', 'Outra', 'Quarta', 'Quinta'].map((text, i) => ({ text, isCorrect: i === 0 }))
    })) }
  }))
  await page.goto('/')
  await page.getByRole('link', { name: /Estudar agora/ }).click()
  await page.getByRole('button', { name: /^Geometria/ }).click()
  await expect(page.getByText('Questão 1 de 5')).toBeVisible()
  await page.getByRole('button', { name: /B\s+Incorreta/ }).click()
  await expect(page.getByText('Resposta incorreta', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Progresso', exact: true }).click()
  await page.getByRole('link', { name: 'Abrir caderno de erros' }).click()
  await page.getByRole('combobox', { name: 'Matéria', exact: true }).selectOption('Matemática')
  await page.getByRole('button', { name: 'Refazer erros (1)' }).click()
  await expect(page.getByText('Questão 1 de 1')).toBeVisible()
  await expect(page.getByText('Resposta incorreta', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /^A\s+Correta$/ }).click()
  await expect(page.getByText('Correto!', { exact: true })).toBeVisible()
})

test('a matéria escolhida no início define os treinos e o seletor atualiza a lista', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Praticar Geografia', exact: true }).click()
  const subject = page.getByLabel('Matéria da prática')
  await expect(subject).toHaveValue('Geografia')
  await expect(page.getByRole('button', { name: /^Solos e uso da terra/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Geopolítica/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Clima e impactos/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Geometria/ })).toHaveCount(0)
  await subject.selectOption('Matemática')
  await expect(page.getByRole('button', { name: /^Geometria/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Porcentagem/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Solos e uso da terra/ })).toHaveCount(0)
})
