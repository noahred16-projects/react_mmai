// Native smoke test for Corpse-Pente v1 (game 27) and v2 (game 29) in the AI engine. Not
// part of the WASM build
// (compile.sh doesn't reference it) -- a standalone check runnable with plain g++ in an
// environment without emscripten, since getMove() is the only public surface (board/corpse
// state is protected), this can only check for crashes/hangs/illegal-looking moves, not
// directly inspect corpse placement. Build: g++ -std=c++11 -O2 Ai.cpp corpse_smoke.cpp -o
// corpse_smoke && ./corpse_smoke   (run from MMAIWASM/ so files/ resolves).
#include <iostream>
#include <unistd.h>
#include "Ai.h"
using namespace std;

// Move() reseeds srand() from time(NULL) on every single call (pre-existing, unrelated to
// Corpse-Pente -- reproduces identically on plain Pente, game 1). Looping getMove() faster
// than 1-per-second makes many consecutive calls draw the SAME seed, which on similar early
// positions can replay the SAME "random" tie-break and legitimately produce a duplicate move
// -- a pre-existing engine timing artifact, not a corpse-logic bug. Space calls out so this
// test isn't chasing that known artifact instead of real corpse-interaction bugs.
static bool runSelfPlay(const char *label, int gameId, int *moves, int seeded, int extraPlies, int level) {
    int n = seeded;
    for (int ply = 0; ply < extraPlies; ++ply) {
        usleep(1050000);
        CAi ai(gameId, level, 1);
        int mv = ai.getMove(moves, n);
        if (mv < 0 || mv > 360) {
            cout << "FAIL - " << label << " ply " << ply << ": out-of-range move " << mv << "\n";
            return false;
        }
        for (int i = 0; i < n; ++i)
            if (moves[i] == mv) {
                cout << "FAIL - " << label << " ply " << ply << ": engine replayed move " << mv
                     << " (already played at index " << i << ") -- suggests it thinks an occupied cell is empty\n";
                return false;
            }
        moves[n++] = mv;
    }
    cout << "ok   - " << label << " ran " << n << " plies, no crash/duplicate\n";
    return true;
}

int main() {
    int fails = 0;

    // 1. Plain self-play sanity, a couple of trials (spaced calls -- see note above).
    for (int trial = 0; trial < 2; ++trial) {
        int moves[400];
        char label[64];
        snprintf(label, sizeof(label), "self-play trial %d", trial);
        if (!runSelfPlay(label, 27, moves, 0, 18, 3)) fails++;
    }

    // 2. Scripted standard capture (white flanks a black pair -> corpses at (4,5),(5,5)),
    //    then keep self-playing so later search actively explores corpse interactions
    //    (corpse-assisted capture, cleanup) via dmov()'s real-board replay on every call.
    //    tn parity: odd tn = white, even tn = black (2 - tn%2).
    {
        int moves[400];
        // tn1 white (3,5)=98, tn2 black (4,5)=99, tn3 white dummy (10,10)=200,
        // tn4 black (5,5)=100, tn5 white (6,5)=101 -> captures (4,5)/(5,5).
        int seeded[] = {98, 99, 200, 100, 101};
        int n = sizeof(seeded) / sizeof(int);
        for (int i = 0; i < n; ++i) moves[i] = seeded[i];
        if (!runSelfPlay("scripted corpse-capture then self-play", 27, moves, n, 18, 3)) fails++;
    }

    // 3. Corpse-Pente v2 (game 29) self-play sanity -- separate code path from game 27 above.
    for (int trial = 0; trial < 2; ++trial) {
        int moves[400];
        char label[64];
        snprintf(label, sizeof(label), "v2 self-play trial %d", trial);
        if (!runSelfPlay(label, 29, moves, 0, 18, 3)) fails++;
    }

    cout << "\n" << (fails == 0 ? "ALL OK" : "FAILURES") << " (" << fails << " failed)\n";
    return fails > 0 ? 1 : 0;
}
