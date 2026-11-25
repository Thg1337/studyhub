# APIs e variáveis de ambiente

As funções em `api/` atendem o tutor de IA e a busca de vídeos. As questões do ENEM vêm diretamente de `api.enem.dev` no navegador; progresso, favoritas e flashcards ficam no armazenamento local do navegador.

## Configuração

| Variável | Uso | Necessária para |
| --- | --- | --- |
| `GROQ_API_KEY` | Autentica o servidor na API da Groq | `POST /api/chat` |
| `YOUTUBE_API_KEY` | Autentica o servidor na YouTube Data API | `GET /api/youtube` |
| `ALLOWED_ORIGIN` | Lista opcional de origens adicionais, separadas por vírgula | Chamadas de outras origens em produção |

Configure as chaves nas variáveis de ambiente do projeto que executa as funções. Não use prefixo `VITE_` nem coloque chaves no código do frontend: variáveis com esse prefixo são incluídas no bundle do navegador. Se uma chave estiver ausente, somente a rota correspondente retorna HTTP 500 com uma mensagem de configuração.

`npm run dev` inicia apenas o frontend Vite. Para testar `/api/chat` e `/api/youtube` localmente, use um ambiente que execute as funções de `api/` e forneça as variáveis acima. Os arquivos `.env` e `.env.local` estão ignorados pelo Git.

Em produção, as funções aceitam a origem do próprio site. `ALLOWED_ORIGIN` acrescenta outras origens completas, por exemplo `https://preview.exemplo.com,https://app.exemplo.com`; não é necessário incluir o domínio do próprio deploy. Requisições sem `Origin` só passam quando o navegador informa `Sec-Fetch-Site: same-origin` ou envia um `Referer` da mesma origem. Fora de `NODE_ENV=production`, a checagem de origem é desativada. Essa checagem não substitui autenticação nem limita o número de requisições; limites de tráfego dependem da configuração da plataforma.

## `POST /api/chat`

Corpo JSON:

```json
{
  "messages": [{ "role": "user", "content": "Explique a fotossíntese" }],
  "system": "Responda de forma breve",
  "temperature": 0.7,
  "max_tokens": 1024
}
```

`messages` deve ser uma lista com pelo menos uma mensagem não vazia e no máximo 40 entradas. Cada `content` pode ter até 4.000 caracteres; a soma pode ter até 40.000. `system` é opcional e pode ter até 4.000 caracteres. Papéis diferentes de `assistant` são enviados como `user`. O modelo é fixo em `openai/gpt-oss-20b`; se o corpo informar outro `model`, a rota retorna 400. `temperature` é limitada a 0–2 e `max_tokens` a 1–3.000.

Em sucesso, a rota devolve a resposta JSON da Groq. A consulta ao provedor expira após 25 segundos.

### Teto diário opcional da IA

Para ativar um teto compartilhado entre as funções, configure `CHAT_DAILY_REQUEST_LIMIT` como um inteiro positivo no ambiente da Vercel e forneça `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` de uma instância Redis da Upstash. Mantenha o token apenas no servidor. O contador reinicia à meia-noite UTC e guarda apenas a contagem agregada de solicitações enviadas ao provedor, inclusive quando o provedor falha. Cada solicitação pode pedir no máximo 3.000 tokens de saída. O orçamento diário limita solicitações, e o limite por IP continua separado.

Sem `CHAT_DAILY_REQUEST_LIMIT`, o orçamento diário fica desativado. Com ele ativo, a função retorna 429 ao atingir o teto ou 503 se o contador compartilhado estiver indisponível.

## `GET /api/youtube`

Parâmetros de consulta: `q` é obrigatório e limitado aos primeiros 200 caracteres; `maxResults` é opcional, usa 6 por padrão e é limitado a 1–12. A busca solicita apenas vídeos e retorna o JSON da YouTube Data API. A consulta ao provedor expira após 15 segundos.

Exemplo: `/api/youtube?q=fotoss%C3%ADntese&maxResults=6`.

Resultados de buscas bem-sucedidas são reutilizados por até cinco minutos na mesma instância. O cache mantém até 100 entradas.

## Respostas de erro

| HTTP | Condição |
| --- | --- |
| 400 | Entrada inválida, termo de busca ausente ou modelo não permitido |
| 403 | Origem não permitida em produção |
| 405 | Método HTTP incorreto |
| 429 | Limite diário de IA, do provedor ou da proteção da plataforma |
| 500 | Chave ausente ou erro interno da função |
| 502 | Falha do provedor |
| 503 | Contador do teto diário indisponível |
| 504 | Tempo esgotado ao consultar o provedor |

As funções retornam JSON com a propriedade `error` e usam mensagens próprias para falhas do provedor. Uma resposta gerada pela proteção da plataforma, como um 429, pode ter outro formato.
