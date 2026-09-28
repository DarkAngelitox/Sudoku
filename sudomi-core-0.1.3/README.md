# SUDOMI CORE 0.1.3 — RENDER DIAGNOSTIC
This build intentionally removes the expensive puzzle-carving step from startup.
It uses a bank of known-valid unique puzzles, randomizes their digits, solves them immediately,
and renders the board. This isolates whether the blank-board problem is caused by generation.
If the board appears, the next build will reconnect the full difficulty/uniqueness engine.
