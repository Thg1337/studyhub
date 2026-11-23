# Plano de atualização do StudyHub

Este plano foi preparado para execução em etapas pequenas. Nenhuma alteração do plano foi aplicada nesta etapa.

## Ordem de prioridade

### P0 — Segurança e estabilidade

1. Atualizar `react-router-dom` para uma versão corrigida e revisar a compatibilidade das rotas.
2. Adicionar rate limit nas rotas `/api/chat` e `/api/youtube`, com limites separados por IP e janela de tempo.
3. Validar arquivos importados em `dataTransfer.js`: tamanho máximo, tipos, campos obrigatórios, datas e limites de texto.
4. Padronizar `try/catch` nas gravações em `localStorage` para que armazenamento cheio ou modo privado não quebre a interface.
5. Revisar as políticas CSP e remover `unsafe-inline` quando os estilos permitirem.
6. Rodar `npm audit`, build e testes antes de cada publicação.

### P1 — Usabilidade principal

1. Corrigir textos com codificação quebrada (`Ã`, `Â` e caracteres semelhantes).
2. Após trocar de rota, mover o foco para o título principal e anunciar a nova página para leitores de tela.
3. Atualizar o painel imediatamente após importar dados, sem exigir recarga manual.
4. Completar o gerenciamento de foco dos modais de imagem e confirmação.
5. Adicionar mensagens claras para erro de rede, limite de IA e indisponibilidade de vídeos.
6. Garantir estados de foco, teclado, toque e contraste em todos os botões.

### P2 — Performance

1. Reintroduzir divisão de código por rota sem mostrar uma tela branca ou spinner entre páginas.
2. Usar carregamento antecipado das rotas mais prováveis e preservar a transição visual atual.
3. Aplicar `loading="lazy"` e dimensões estáveis às imagens e aos players externos.
4. Reduzir o bundle inicial e medir o resultado antes/depois.
5. Evitar recalcular listas inteiras de eventos e favoritos em cada renderização.

### P3 — Qualidade do produto

1. Criar testes para importação/exportação e limites de entrada.
2. Criar testes de acessibilidade para navegação, modais e formulários.
3. Criar um checklist de verificação visual para desktop, celular e Firefox.
4. Documentar variáveis de ambiente e comportamento das APIs.

## Como executar sem esgotar tokens

- Uma prioridade por sessão; não misturar segurança, design e deploy no mesmo bloco.
- Cada sessão deve alterar no máximo três arquivos relacionados.
- Primeiro inspecionar, depois editar, depois testar; evitar reabrir arquivos já verificados.
- Usar buscas focadas com `rg` e saídas curtas.
- Fazer um único build e uma única rodada de testes por etapa, salvo falha concreta.
- Commitar cada etapa com uma mensagem curta e independente.
- Publicar somente depois de build, testes e revisão do diff passarem.
- Manter este arquivo como checklist e marcar os itens concluídos em commits separados.

## Sequência recomendada de sessões

1. P0.1: dependência e testes de segurança.
2. P0.2: rate limit das APIs.
3. P0.3: validação de importação e armazenamento local.
4. P1.1: codificação dos textos.
5. P1.2: foco, teclado e atualização após importação.
6. P2: divisão de código e imagens.
7. P3: testes e documentação.

## Critério de conclusão

Cada etapa só deve ser considerada concluída quando tiver diff revisado, build aprovado, testes relevantes aprovados e, quando houver alteração visual ou de deploy, verificação no navegador.
