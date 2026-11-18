// Índice diagnóstico, não uma nota TRI: a API não fornece parâmetros calibrados
// dos itens nem uma conversão para a escala oficial do INEP.
export function estimatePerformance(responses) {
  const total = responses.length
  if (!total) return { score: null, low: null, high: null, correct: 0, total: 0 }

  const correct = responses.filter((response) => response.correct === true).length
  const proportion = correct / total
  const z = 1.96
  const denominator = 1 + z * z / total
  const center = (proportion + z * z / (2 * total)) / denominator
  const margin = z * Math.sqrt(proportion * (1 - proportion) / total + z * z / (4 * total * total)) / denominator

  return {
    // Suavização de Jeffreys: reduz a falsa certeza em provas pequenas.
    score: Math.round(1000 * (correct + 0.5) / (total + 1)),
    low: Math.round(1000 * Math.max(0, center - margin)),
    high: Math.round(1000 * Math.min(1, center + margin)),
    correct,
    total
  }
}
