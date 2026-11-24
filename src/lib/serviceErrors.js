export function serviceHttpError(service, status) {
  const subject = service === 'IA' ? 'A IA' : 'A busca de vídeos'
  if (status === 429) return new Error(`Limite de uso ${service === 'IA' ? 'da IA' : 'da busca de vídeos'} atingido. Aguarde um minuto e tente novamente.`)
  if (status === 504) return new Error(`${subject} demorou para responder. Tente novamente.`)
  if (status === 401 || status === 403) return new Error(`${subject} está indisponível por configuração. Tente novamente mais tarde.`)
  if (status >= 500) return new Error(`${subject} está temporariamente indisponível. Tente novamente mais tarde.`)
  return new Error(`Não foi possível ${service === 'IA' ? 'consultar a IA' : 'buscar vídeos'}. Tente novamente.`)
}

export function serviceNetworkError(service) {
  return new Error(`Falha de conexão ao ${service === 'IA' ? 'consultar a IA' : 'buscar vídeos'}. Confira sua internet e tente novamente.`)
}
