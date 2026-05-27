# Mata-mata — Knockout Bracket & Tournament Scoring — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Static bracket skeleton (`lib/bracket-skeleton.ts`) | completed | medium | — |
| 02 | Bracket endpoint (`GET /api/leagues/[id]/bracket`) | completed | medium | task_01 |
| 03 | Mata-mata screen (desktop + mobile) | completed | high | task_02 |
| 04 | Navigation: enable Mata-mata + reorder bottom tab bar | completed | low | task_03 |
| 05 | Predictions confirmed-teams guard | completed | low | task_01 |
| 06 | Phase-unlock indicator (banner + nav dot) | completed | medium | task_03, task_04 |
| 07 | Pure scoring engine (`lib/scoring.ts`) | completed | medium | — |
| 08 | Sync result ingestion (status + scores) | completed | medium | — |
| 09 | League API scoring wiring (replace hardcoded zeros) | completed | high | task_07, task_08 |
