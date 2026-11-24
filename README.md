<div align="center">

<h1>StudyHub</h1>

<h3>Estude mais rápido. Entenda de verdade.</h3>

<p>Questões reais do ENEM, simulados e revisão inteligente em um só lugar.</p>

<p><strong>Gratuito · Sem cadastro · Feito para estudar no seu ritmo</strong></p>

<p><a href="https://studyhub-sage-phi.vercel.app">Acessar o StudyHub</a> · <a href="#o-que-você-encontra-aqui">Conheça os recursos</a> · <a href="#como-executar">Rode localmente</a></p>

</div>

<br />

## Prévia

<img src="./previa-animacoes-studyhub.jpg" alt="Página inicial do StudyHub com uma questão de matemática, correção comentada e acesso ao tutor de IA" width="100%" />

<p align="center"><em>Uma interface clara para transformar cada questão em aprendizado.</em></p>

## O que você encontra aqui

| Recurso | Como ajuda nos estudos |
| :--- | :--- |
| **Questões do ENEM** | Pratique por matéria com questões reais e correção comentada. |
| **Simulados** | Monte provas, acompanhe o tempo e analise os acertos por área. |
| **Revisão espaçada** | Retome questões erradas e conteúdos no momento de revisar. |
| **Flashcards** | Gere cartões por assunto e revise os que estiverem pendentes. |
| **Tutor de IA** | Peça explicações contextualizadas para questões e assuntos. |
| **Favoritas e progresso** | Guarde questões e acompanhe sua rotina de estudo. |

> O progresso e os itens salvos ficam no navegador. Os recursos de IA e busca de vídeos precisam das chaves de API configuradas no servidor.

## Como executar

Você precisa de Node.js e npm compatíveis com o Vite 7.

```bash
git clone https://github.com/Thg1337/studyhub.git
cd studyhub
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite no terminal. Para gerar a versão de produção, execute `npm run build`.

As questões do ENEM são carregadas da API pública `api.enem.dev`. O servidor em `api/` usa `GROQ_API_KEY` para o tutor e `YOUTUBE_API_KEY` para a busca de vídeos. O comando `npm run dev` inicia apenas o frontend; para usar essas rotas localmente, execute o projeto em um ambiente com suporte a funções de API e configure as variáveis de ambiente nele. Nunca coloque chaves no código do frontend.

## Tecnologias

React · Vite · Tailwind CSS · Framer Motion · React Router · KaTeX

---

<div align="center">

**StudyHub** — uma questão por vez, até virar rotina.

</div>

