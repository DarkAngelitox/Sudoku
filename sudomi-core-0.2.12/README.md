# SUDOMI 0.2.12 — arcade de dos jugadores

Based on SUDOMI 0.2.11.

All 15 arcade entries can now be opened. The six existing games remain playable. Nine new games support two-player pass-and-play and two-player Wi-Fi:

- **Dominó:** two players draw, place matching ends, or pass; blocked games count remaining pips.
- **Memoria de animales:** eight pairs; a mismatch passes the turn and matches earn another turn.
- **Puntos y cajas:** draw edges; closing a box scores and grants another move.
- **STOP:** ten randomly selected categories, a random letter, 20 seconds for each answer, then alternating votes on the opponent's answers. The first release supports two players; basic letter and answer voting are used to score.
- **Duelo Mahjong:** a two-player matching-pairs variant using Mahjong tile symbols. This is not the traditional four-player Mahjong ruleset.
- **Blackjack:** two players play against one shared automatic dealer.
- **Póker:** two-player five-card draw, up to three card exchanges; no betting.
- **Escoba:** two-player Spanish-deck capture game; capture combinations totaling 15.
- **Rummy:** two-player draw, discard, and lay down runs or sets.

New games currently provide player-versus-player modes only (same device or Wi-Fi); they do not include computer opponents. The LAN relay supports two players per room. Card hands are hidden on the other Wi-Fi player's game screen.

## Start a Wi-Fi game

Run `Iniciar-SUDOMI-LAN.bat` on the host PC. Open the shown local address on both phones while connected to the same Wi-Fi, then create or join a room from the selected game's Wi-Fi mode.

This build includes the existing Wi-Fi victory acknowledgement and centered tic-tac-toe board fixes from 0.2.11.
