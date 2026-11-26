import { expect, test } from '@playwright/test'

const distinction = {
  q: 'Qual é a diferença entre “mal” e “mau”?',
  opts: ['Mal significa maldade em todos os casos.', 'Mau é o oposto de bom.', 'Mau é um verbo.', 'Mal é sempre adjetivo.', 'As duas palavras são sinônimas.'],
  correct: 1
}
const repeated = { ...distinction, q: 'Como distinguir “mau” de “mal”?' }
const practice = {
  q: 'Complete: depois de dormir ___, o aluno chegou cansado.',
  opts: ['más', 'maus', 'mau', 'mal', 'males'],
  correct: 3
}
const wrongKey = {
  q: 'Qual palavra é o oposto de “bem” na expressão “ele dormiu bem”?',
  opts: ['melhor', 'ótimo', 'mau', 'mal', 'bom'],
  correct: 2
}

test('gera a Prática com questões distintas e gabaritos confirmados', async ({ page }) => {
  const responses = [
    [distinction, repeated, wrongKey, { ...practice, opts: ['mau', ' MAL ', 'mal', 'má', 'maus'] }],
    [
      { index: 0, correct: 1, explain: 'Mau é adjetivo e seu antônimo é bom.' },
      { index: 1, correct: 3, explain: 'Mal é o oposto de bem nessa frase.' }
    ],
    [repeated, practice],
    [{ index: 0, correct: 3, explain: 'Mal modifica o verbo dormir e é o oposto de bem.' }]
  ]
  const requests = []
  await page.route('**/api/chat', async (route) => {
    requests.push(JSON.parse(route.request().postDataJSON().messages[0].content))
    const content = JSON.stringify(responses[requests.length - 1])
    await route.fulfill({ json: { choices: [{ finish_reason: 'stop', message: { content } }] } })
  })
  await page.goto('/quiz/Matem%C3%A1tica')
  await page.getByLabel('Assunto').fill('Diferença entre mal e mau')
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: 'Gerar questões' }).click()

  await expect(page.getByText('Questão 1 de 2')).toBeVisible()
  await expect(page.getByText(/Foi possível confirmar 2 de 3 questões/)).toBeVisible()
  expect(requests[1]).toEqual([distinction, wrongKey].map(({ q, opts }) => ({ q, opts })))
  expect(requests[2]).toMatchObject({ quantidade: 2, enunciadosJaAceitos: [distinction.q] })
  expect(requests[3]).toEqual([{ q: practice.q, opts: practice.opts }])
  await page.getByRole('button', { name: /Mau é o oposto de bom/ }).click()
  await expect(page.getByText('Correto!', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Ir para questão 2/ }).click()
  await expect(page.getByRole('heading', { name: practice.q })).toBeVisible()
  await page.getByRole('button', { name: /^[A-E]\s*mau$/ }).click()
  await expect(page.getByText('Resposta incorreta', { exact: true })).toBeVisible()
  await expect(page.getByText('Mal modifica o verbo dormir e é o oposto de bem.')).toBeVisible()
})

test('retoma um quiz antigo sem a repetição e conserva uma resposta válida', async ({ page }) => {
  await page.addInitScript(({ first, duplicate, next }) => {
    localStorage.setItem('studyhub_quiz_draft', JSON.stringify({
      questions: [{ ...first, id: 1 }, { ...duplicate, id: 2 }, { ...next, id: 3 }],
      answers: { 2: 1 },
      revealed: { 2: true },
      current: 0
    }))
  }, { first: distinction, duplicate: repeated, next: practice })
  await page.goto('/quiz/Matem%C3%A1tica')
  await expect(page.getByText('1 de 2 questões respondidas.')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar quiz' }).click()
  await expect(page.getByText('Questão 2 de 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: practice.q })).toBeVisible()
  await page.getByRole('button', { name: 'Ir para questão 1, respondida' }).click()
  await expect(page.getByRole('heading', { name: repeated.q })).toBeVisible()
  await expect(page.getByText('Correto!', { exact: true })).toBeVisible()
})
