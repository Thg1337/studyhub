# Checklist visual do StudyHub

Use este roteiro após alterações de interface e antes de publicar. Registre a versão testada (commit ou URL do deploy), navegador, sistema e data. A criação deste roteiro **não** significa que as telas foram verificadas.

## Ambientes

| Ambiente | Tamanho sugerido | Resultado |
| --- | --- | --- |
| Desktop, navegador principal | 1440 × 900 | Pendente |
| Celular, navegador principal | 390 × 844 e 320 × 700 | Pendente |
| Firefox desktop | 1280 × 800 | Pendente |
| Firefox em largura de celular | 390 × 844 | Pendente |

Teste o mesmo commit ou deploy em todos os ambientes. Use os temas claro e escuro ao menos uma vez em cada tamanho. No celular, confira com o teclado virtual aberto quando houver campos de texto.

## Verificações comuns

- [ ] Não há rolagem horizontal na página nem texto, fórmula, imagem ou botão cortado. Tabelas e fórmulas longas podem rolar dentro do próprio conteúdo.
- [ ] O cabeçalho não cobre títulos ou campos focados; menu móvel abre, fecha e permite chegar a todas as rotas.
- [ ] O link “Pular para o conteúdo principal” aparece ao receber foco e leva ao conteúdo.
- [ ] Links e botões mostram foco visível por Tab, funcionam com Enter ou Espaço quando aplicável e têm alvo confortável ao toque.
- [ ] A troca de rota mantém a página utilizável durante o carregamento, move o foco para o título e atualiza o título da aba.
- [ ] Textos, ícones e estados de erro são legíveis nos temas claro e escuro; não dependem apenas de cor.
- [ ] Não surgem erros no console durante a navegação básica. Falhas de serviço, quando simuladas, exibem mensagem compreensível.

## Fluxos por tela

| Tela | O que verificar em desktop e celular |
| --- | --- |
| Início `/` | Hero, chamadas para ação, cartões de matérias e rodapé; nenhuma seção fica atrás do cabeçalho. |
| Prática `/quiz/Matemática` | Configuração, questão, alternativas, resposta e explicação; fórmulas e imagens cabem na largura. |
| Explorar `/explore` | Campo de assunto, sugestões, resposta de IA, lista de vídeos e player; estados de carregamento e erro não quebram o layout. |
| Simulados `/simulados` | Configuração, questão, cronômetro e resultado; botões e pontuação continuam visíveis. |
| Flashcards `/flashcards` | Formulário, frente e verso, avaliações e cartão pendente; confirmação de exclusão cabe na tela e prende o foco até fechar. |
| Favoritas `/favoritas` | Busca, filtros, alternativas e explicação; imagem ampliada cabe na tela e o foco retorna ao fechar. |
| Progresso `/progresso` | Indicadores, gráfico, meta e botões de importar/exportar; colunas se empilham sem cortar conteúdo. |

Para os fluxos que exigem dados salvos, use dados de teste e registre como foram criados. Não substitua dados reais do navegador para preparar a verificação.

## Atenção específica no Firefox

- [ ] Fontes, fórmulas KaTeX e gradientes aparecem corretamente.
- [ ] Animações, transição entre rotas e abertura de modais não deixam conteúdo invisível ou fora da tela.
- [ ] Tab e Shift+Tab circulam dentro dos modais; Escape fecha e devolve o foco ao controle anterior.
- [ ] A versão móvel mantém menu, formulários e player utilizáveis.

## Registro de execução

Copie este bloco para cada rodada:

```text
Commit/deploy:
Data:
Ambiente e navegador:
Rotas verificadas:
Resultado: aprovado / falhou / não testado
Problemas (rota, largura, passos, resultado esperado, captura):
```

Se alguma linha falhar, registre o problema antes de publicar e repita a linha após a correção. Marque como “não testado” qualquer fluxo sem dados ou sem acesso ao navegador necessário.
