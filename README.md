# barsarg

Plataforma web para gerir `cotas` mensais de um bar. O objetivo principal e controlar `divida` (meses em falta).

> Nota: na workstation da empresa a rede bloqueou instalacao via npm/npx. Este README deixa tudo preparado para quando clonares no teu PC pessoal e avancarmos logo na implementacao.

## Regras de negocio (MVP)
1. Cada utilizador tem um **mes de entrada** (derivado de “data de entrada”).
2. A `divida` e **mensal**:
   - se entrou a meio do mes, conta **esse mes** como devido.
   - a divida conta do mes de entrada ate ao mes atual (inclusive).
3. O pagamento e **por mes, de uma vez so** (valor total).
4. O valor da cota **pode mudar** ao longo do tempo:
   - guardamos o valor por `mes` (chave `YYYY-MM`).
5. “Credito para meses a seguir”:
   - o admin pode registar pagamento de meses futuros (fica automaticamente como pago).
6. “Divida mostra ambos”:
   - UI do admin e do utilizador deve mostrar:
     - meses em falta
     - valor em falta (soma dos meses em falta usando a cota do mes correspondente)

## Modelos (Prisma / entidades)
1. `User`
   - `id` (uuid, pk)
   - `name` (string)
   - `entryDate` (date)
   - `active` (boolean)
   - `publicTokenHash` (string) (token para vista do utilizador sem login)
   - `createdAt`

2. `MonthlyQuota`
   - `id` (uuid, pk)
   - `monthKey` (string, `YYYY-MM`, unica)
   - `amountCents` (int)
   - `createdAt`

3. `Payment`
   - `id` (uuid, pk)
   - `userId`
   - `monthKey` (string, `YYYY-MM`)
   - `paidAt` (datetime)
   - `amountCents` (int) (snapshot no momento do pagamento)
   - `note` (string, opcional)
   - constraint: unica combinacao (`userId`, `monthKey`)

## Funcionalidades (MVP)
- Login admin (1 admin por agora, evolutivo para mais)
- CRUD de utilizadores
- Definir quota por mes
- Registar pagamento por utilizador/mes
- Painel de divida (meses em falta + valor em falta)
- QR unico para pagina publica `/consulta`
- Acesso a `/consulta` protegido por PIN
- Admin pode gerir/alterar o PIN no painel

## Acesso publico por QR + PIN
- O QR aponta para: `/consulta`
- A pagina `/consulta` pede PIN antes de mostrar dados
- Depois de validar PIN, mostra lista de utilizadores e estado de divida
- Clique num utilizador abre detalhe da divida
- Implementacao do PIN (MVP):
  - valor inicial via `.env` (`PUBLIC_CONSULT_PIN`)
  - depois o admin pode alterar no painel, ficando guardado na base de dados

## Stack recomendada
- `Next.js` (frontend + backend)
- `PostgreSQL` gerido (Neon/Supabase/Vercel Postgres)
- `Prisma` (schema + migracoes)
- Deploy no `Vercel`

## Inicializacao no PC pessoal (raiz do repo)
1. Confirmar Node:
   - `node -v`
   - `npm -v`
   - `npx -v`

2. Gerar projeto Next **na raiz**:
   - `npx create-next-app@latest . --ts --eslint --app --tailwind --src-dir --import-alias "@/*" --use-npm --no-turbo`

3. Instalar Prisma:
   - `npm i -D prisma`
   - `npm i @prisma/client`

4. Inicializar Prisma:
   - `npx prisma init --datasource-provider postgresql`

5. Configurar ambiente:
   - copia `.env.example` para `.env`
   - ajusta `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PUBLIC_CONSULT_PIN`

6. Migracoes:
   - `npx prisma migrate dev`

7. Arrancar local:
   - `npm run dev`

## Checklist para retomarmos
1. Moeda fica EUR no MVP?
2. Confirmas bloqueio de pagamentos sem `MonthlyQuota` definida para o mes?
3. Queres autenticacao admin simples com user/password em `.env` na primeira versao?
4. Confirmas QR unico com `/consulta` + PIN gerido pelo admin?
