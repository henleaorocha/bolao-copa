---
status: completed
title: Write documentation and set up GitHub Actions CI/CD pipeline for automated testing and Vercel deployment
type: docs
complexity: medium
dependencies:
  - task_05
  - task_06
---

# Write documentation and set up GitHub Actions CI/CD pipeline for automated testing and Vercel deployment

## Overview

Create comprehensive documentation (README, API docs, deployment guide, schema diagram) and set up GitHub Actions CI/CD pipeline to automate linting, type-checking, testing, and deployment to Vercel. This enables other developers to understand the Foundation architecture and ensures code quality on every commit.

<critical>
Read the **TechSpec "Impact Analysis"** and **"Development Sequencing"** sections for deployment context. Read **"Monitoring and Observability"** for logging and alerting setup. Documentation must be clear and accessible to PRD 2+ authors who will extend the codebase. The CI/CD pipeline must enforce quality gates: tests pass, TypeScript strict mode, ESLint, coverage ≥ 80%. Deployment only succeeds if all checks pass.
</critical>

<requirements>

1. MUST create comprehensive README (root `README.md`):
   - **Project overview**: What is Bolão da Copa 2026? What does Foundation deliver?
   - **Tech stack**: Next.js 13+, TypeScript, Tailwind CSS, Supabase, Vercel
   - **Quick start guide**: 
     - Clone repo, install dependencies, setup Supabase project
     - Create `.env.local` with credentials
     - Run `npm run dev` → app runs on http://localhost:3000
     - Run `npm run test` → tests pass
   - **Project structure**: Brief description of `/app`, `/lib`, `/tests`, `/supabase` directories
   - **Database schema**: ASCII diagram or link to Mermaid diagram
   - **Contributing guide**: How to add new features, run tests, submit PRs
   - **Deployment guide**: How to deploy to Vercel (manual + automatic via CI)

2. MUST create API documentation (`docs/API.md`):
   - Endpoint reference: GET/POST methods, required auth, request/response examples
   - `/api/auth/me` — Full spec with request, response, error codes
   - `/api/auth/logout` — Full spec with request, response, error codes
   - `/api/health` — Full spec with request, response, error codes
   - Error codes reference: SESSION_EXPIRED, DATABASE_ERROR, DATABASE_UNAVAILABLE, etc.
   - Curl examples for testing each endpoint
   - Response envelope format (success and error)

3. MUST create database schema documentation (`docs/SCHEMA.md`):
   - **Table reference**: For each of the 7 tables, list columns, data types, constraints
   - **Relationships**: Foreign keys between tables (diagram)
   - **RLS policies**: Which user can access which tables/rows
   - **Triggers**: Auto-enrollment trigger explanation
   - **Seed data**: Default league, mock matches
   - **Mermaid diagram** (optional): ER diagram of all tables and relationships

4. MUST create deployment guide (`docs/DEPLOYMENT.md`):
   - **Local development**: `npm run dev`, `supabase start`, environment variables
   - **Staging deployment**: Manual push to Vercel staging branch
   - **Production deployment**: Vercel auto-deploy on main merge (via GitHub Actions)
   - **Environment variables**: Which variables needed for each environment (local, staging, prod)
   - **Database migrations**: Como as migrations são aplicadas no deploy do Vercel:
     - Opção A (recomendada): GitHub Actions executa `supabase db push --linked` após o deploy do Vercel ser confirmado como bem-sucedido
     - Opção B: `vercel.json` com `buildCommand` incluindo `supabase db push` (requer Supabase CLI na build)
     - Documentar ambas as opções e qual foi adotada
     - Incluir como verificar se migrations foram aplicadas: `SELECT * FROM information_schema.tables WHERE table_schema = 'public'`
   - **Rollback**: How to rollback a failed deploy (git revert, Vercel rollback button)
   - **Monitoring**: Where to find logs (Vercel dashboard, Supabase logs)

5. MUST create GitHub Actions workflow (`.github/workflows/ci.yml`):
   - **Triggers**: On every push to any branch, on PR, on manual trigger
   - **Jobs**:
     - **Lint**: Run `npm run lint` (ESLint); fail if errors
     - **Type check**: Run `npm run type-check` (TypeScript strict); fail if errors
     - **Test**: Run `npm run test`; fail if any test fails; fail if coverage < 80% em `lib/` e `app/api/`
     - **Build**: Run `npm run build` (Next.js build); fail if build fails
     - **Deploy** (main branch only): Deploy to Vercel staging; manual approval for production
   - **Environment setup para o job de Test** (CRÍTICO — requer Docker no runner):
     ```yaml
     - name: Setup Supabase CLI
       uses: supabase/setup-cli@v1
       with:
         version: latest
     - name: Start Supabase local
       run: supabase start
     - name: Apply migrations
       run: supabase db push
     - name: Run tests
       run: npm run test:coverage
       env:
         NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
         NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_LOCAL_ANON_KEY }}
     - name: Stop Supabase
       if: always()
       run: supabase stop
     ```
     - O runner do GitHub Actions deve ter Docker instalado (`ubuntu-latest` já tem)
     - `supabase/setup-cli@v1` instala o Supabase CLI automaticamente
   - **Environment setup para o job de Deploy**:
     - Usar `VERCEL_TOKEN` (set em repo secrets) para Vercel CLI
     - Executar `supabase db push --linked` após deploy para aplicar migrations na instância de produção (ver requisito 4 em `docs/DEPLOYMENT.md`)
   - **Artifacts**: Coletar e fazer upload de coverage reports (`lcov.info`), build logs
   - **Secrets necessários em GitHub**:
     - `VERCEL_TOKEN` — Vercel deploy
     - `SUPABASE_PROJECT_ID` — linked Supabase project
     - `SUPABASE_ACCESS_TOKEN` — Supabase CLI auth para `db push --linked`

6. MUST create npm scripts in `package.json`:
   - `npm run dev` — Start dev server
   - `npm run build` — Build for production
   - `npm run lint` — Run ESLint
   - `npm run type-check` — Run TypeScript compiler check
   - `npm run test` — Run all tests
   - `npm run test:watch` — Run tests in watch mode
   - `npm run test:coverage` — Run tests with coverage report
   - `npm run format` — Format code with Prettier (optional)
   - `npm run db:push` — Apply Supabase migrations locally
   - `npm run db:reset` — Reset local database (delete all data, re-apply migrations)

7. SHOULD create security/best practices guide (`docs/SECURITY.md`):
   - **Data privacy**: User data handling, GDPR considerations
   - **Session security**: HTTP-only cookies, PKCE, JWT refresh
   - **RLS policies**: How row-level security protects user data
   - **Environment variables**: Never commit secrets; use Vercel Secrets Manager
   - **API security**: Input validation, error message sanitization
   - **Deployment security**: HTTPS only (production), TLS certificates
   - **Incident response**: What to do if credentials are exposed

8. SHOULD create environment variables guide (`.env.example`):
   - Document all required and optional environment variables
   - Provide example values (placeholders)
   - Describe where to get each value (Supabase dashboard, etc.)
   - Mark which are public (NEXT_PUBLIC_*) vs. secret

</requirements>

## Subtasks

- [ ] Create `README.md` at project root with overview, quick start, project structure, schema diagram
- [ ] Create `docs/API.md` with endpoint reference, error codes, curl examples
- [ ] Create `docs/SCHEMA.md` with table reference, relationships, RLS policies, Mermaid diagram
- [ ] Create `docs/DEPLOYMENT.md` with local dev, staging, production, rollback, monitoring instructions
- [ ] Create `docs/SECURITY.md` with data privacy, session security, environment variables, incident response
- [ ] Create `.env.example` with all required environment variables and descriptions
- [ ] Create `.github/workflows/ci.yml` with lint, type-check, test, build, deploy jobs:
  - [ ] Configurar step de `supabase/setup-cli@v1` no job de test
  - [ ] Configurar `supabase start` e `supabase db push` antes de `npm run test:coverage`
  - [ ] Configurar `supabase stop` no `if: always()` (cleanup)
  - [ ] Adicionar GitHub Secrets necessários: `VERCEL_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`
  - [ ] Configurar step pós-deploy para `supabase db push --linked` (aplicar migrations em produção)
- [ ] Add npm scripts to `package.json`: dev, build, lint, type-check, test, test:watch, test:coverage, db:push, db:reset
- [ ] Test CI/CD locally: Create a feature branch, make a change, push → GitHub Actions should run all checks
- [ ] Verify Vercel deployment: Merge to main → GitHub Actions deploys to Vercel staging
- [ ] Create CONTRIBUTING.md with guidelines for future PRD authors
- [ ] Add schema diagram to docs (Mermaid or similar)

## Implementation Details

**Files to create**:
- `README.md` — Project overview, quick start, contributing guide
- `docs/API.md` — API endpoint reference
- `docs/SCHEMA.md` — Database schema reference
- `docs/DEPLOYMENT.md` — Deployment guide
- `docs/SECURITY.md` — Security best practices
- `CONTRIBUTING.md` — Contributing guide
- `.env.example` — Environment variables template
- `.github/workflows/ci.yml` — GitHub Actions workflow
- `docs/schema-diagram.mmd` (optional) — Mermaid diagram of database schema

**Files to modify**:
- `package.json` — Add npm scripts
- `.gitignore` — May need to exclude test artifacts, coverage reports

**CI/CD environment**:
- Lint job: Runs `npm run lint`
- Type check job: Runs `npm run type-check` with strict mode
- Test job: Runs `npm run test`, collects coverage, fails if coverage < 80%
- Build job: Runs `npm run build` to verify production build succeeds
- Deploy job: Uses Vercel CLI to deploy to staging (auto) and production (manual approval)

**Integration points**:
- GitHub Actions uses `GITHUB_TOKEN` (auto-injected) for PR checks
- Deploy job uses `VERCEL_TOKEN` (set in repo secrets) for Vercel CLI auth
- Supabase migrations run automatically during Vercel deploy (via hook)
- Test job may use Supabase test project credentials (set in repo secrets)

**Reference TechSpec sections**:
- **"Monitoring and Observability"**: Logging, alerting, key metrics
- **"Impact Analysis"**: Lists deployment targets and risks
- **"Development Sequencing"**: Mentions CI/CD setup and testing

### Relevant Files

- `README.md`, `docs/*.md`, `.env.example` (created here)
- `.github/workflows/ci.yml` (created here)
- `package.json` (modified)
- `.gitignore` (modified)
- All source code (tasks 01-07) — Documented and tested

### Dependent Files

- All API routes, middleware, pages (tasks 01-07) — Documented here
- Future PRDs — Will reference Foundation docs and extend deployment pipeline

### Related ADRs

- [[ADR-002]]: Documents Next.js App Router architecture
- [[ADR-003]]: Documents Supabase Auth Helpers
- [[ADR-004]]: Documents Supabase CLI migrations

## Deliverables

1. **README.md**: Project overview, quick start, project structure, contributing guide
2. **docs/API.md**: Endpoint reference with request/response examples, error codes
3. **docs/SCHEMA.md**: Table definitions, relationships, RLS policies, ER diagram
4. **docs/DEPLOYMENT.md**: Local dev, staging, production, rollback, monitoring guides
5. **docs/SECURITY.md**: Data privacy, session security, environment variables, incident response
6. **CONTRIBUTING.md**: Contributing guidelines for future developers
7. **.env.example**: Environment variables template with descriptions
8. **.github/workflows/ci.yml**: GitHub Actions workflow for lint, test, build, deploy
9. **npm scripts**: dev, build, lint, type-check, test, test:watch, test:coverage, db:push, db:reset
10. **Mermaid diagram** (optional): Database schema ER diagram

## Tests

### Unit Tests
- N/A (documentation and CI/CD; no code logic)

### Integration Tests
- ✅ GitHub Actions workflow syntax is valid (no YAML errors)
- ✅ CI/CD runs on every push: Lint, type-check, test jobs execute
- ✅ Lint job fails if ESLint errors exist
- ✅ Type-check job fails if TypeScript strict mode errors exist
- ✅ Test job fails if any test fails or coverage < 80%
- ✅ Build job fails if Next.js build fails
- ✅ Deploy job deploys to Vercel on main branch merge
- ✅ Environment variables are properly documented in `.env.example`
- ✅ README quick-start instructions work (clone, install, dev server starts)
- ✅ API documentation matches actual endpoints (curl examples work)
- ✅ Schema documentation matches actual database (tables, columns, constraints)
- ✅ Deployment guide instructions are accurate and tested

## Success Criteria

- ✅ README.md exists and includes overview, quick start, project structure, schema
- ✅ docs/API.md documents all three endpoints with request/response/error codes
- ✅ docs/SCHEMA.md documents all 7 tables, relationships, RLS, triggers
- ✅ docs/DEPLOYMENT.md includes local, staging, production, rollback, monitoring
- ✅ docs/SECURITY.md covers data privacy, session security, environment variables
- ✅ .env.example documents all required environment variables
- ✅ .github/workflows/ci.yml is valid YAML and runs on every push/PR
- ✅ CI/CD jobs include: lint, type-check, test, build, deploy
- ✅ Test job fails if coverage < 80%
- ✅ Deploy job deploys to Vercel on main branch merge
- ✅ All npm scripts are defined and functional
- ✅ CONTRIBUTING.md provides guidelines for future PRD authors
- ✅ Mermaid diagram (or equivalent) shows database schema ER relationships
- ✅ Documentation is written in Portuguese (PT-BR) where applicable (or English for technical terms)
- ✅ All links in docs are valid (no broken references)
- ✅ README quick-start instructions are accurate and tested
