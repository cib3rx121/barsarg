# barsarg

Plataforma web para gerir cotas mensais de um bar, com foco em controlo de divida de forma simples e mobile-first.

## O que ja faz
- Painel admin para:
  - gerir associados (criar, editar, desativar/remover)
  - registar pagamentos e ajustes de divida
  - aplicar isencoes por intervalo de meses
  - definir valor atual da cota mensal
  - gerir seguranca (novo user de acesso, alterar password, alterar PIN publico)
  - publicar/remover aviso para a consulta publica
  - exportar CSV pronto para Excel
  - fechar mes e reabrir fecho mensal
- Consulta publica (`/consulta`) com:
  - acesso por PIN
  - lista de associados + saldo
  - detalhe de cada associado
  - aviso publico da administracao
  - aviso de convivios abertos
- Modulo de convivios:
  - criar convivio com **dia obrigatorio**
  - abrir/encerrar/reabrir inscricoes
  - eliminar convivio (com confirmacao)
  - custos por categorias (comida, bebida, outros)
  - divisao automatica pelos inscritos
  - perfis simplificados: `Tudo` ou `So comida`
  - liquidacao para saldo do associado
  - ordenacao por data do evento (mais proximo primeiro)
  - comprovativo de custos por upload direto (imagem/PDF)

## Regras de negocio
- Divida e mensal desde o mes de entrada (inclui o mes de entrada, mesmo a meio do mes).
- Pagamento e lancado de uma vez; pode gerar credito para meses seguintes.
- O valor em falta e sempre mostrado em EUR e com equivalente aproximado em meses.
- O cafe no contexto do projeto e tratado como regra social; o sistema serve para controlo financeiro.

## Stack
- `Next.js` (App Router, Server Actions)
- `TypeScript`
- `Prisma`
- `PostgreSQL` (Neon)
- `Vercel` (deploy)

## Setup rapido
1. Instalar Node LTS.
2. Instalar dependencias:
   - `npm install`
3. Criar `.env` a partir de `.env.example`.
4. Aplicar migracoes:
   - `npx prisma migrate deploy`
5. (Opcional local) gerar Prisma Client:
   - `npx prisma generate`
6. Arrancar app:
   - `npm run dev`

## Variaveis de ambiente
- `DATABASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `PUBLIC_CONSULT_PIN`
- `NEXT_PUBLIC_APP_URL`
- `BLOB_READ_WRITE_TOKEN` (para upload direto de comprovativos)

Nota: credenciais/PIN podem ser inicializados por `.env`, mas depois ficam geriveis no painel admin (guardados com hash).

## Fluxo recomendado de uso
1. Admin cria associados e define cota.
2. Regista pagamentos e ajustes ao longo do mes.
3. Publica avisos relevantes na consulta publica.
4. Gere convivios (inscricoes, custos, liquidacao).
5. No fim do mes, faz fecho mensal (com opcao de reabrir se for preciso).

## Deploy
- Plataforma preparada para deploy no Vercel com base de dados Neon.
- CI e migracoes devem correr antes de promover alteracoes para producao.
