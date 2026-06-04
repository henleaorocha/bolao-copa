# Trustworthy Match Data & Pre-Launch Validation — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Reconcile 2026 roster to seed 020 | completed | medium | — |
| 02 | EN→PT team-name normalization map | completed | low | task_01 |
| 03 | Rewrite football-api.ts as openfootball adapter | completed | high | task_01, task_02 |
| 04 | Re-key knockout bracket to openfootball num | completed | high | task_03 |
| 05 | Add is_manual / manual_updated_at migration | completed | low | — |
| 06 | Sync route excludes manually-controlled matches | completed | medium | task_03, task_05 |
| 07 | Operator result control — endpoint + unlisted page + guard | completed | medium | task_05 |
| 08 | Scrub remaining api-sports references | completed | low | task_03 |
| 09 | Validation harness — seeds + Playwright run + evidence doc | completed | high | task_03, task_04, task_06, task_07 |
