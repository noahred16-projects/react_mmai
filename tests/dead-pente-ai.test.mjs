// Dead-Pente AI dead-stone heuristic fixtures (docs/dead-pente-spec.md, Phase 3).
// Run: node tests/dead-pente-ai.test.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function loadAsEsm(relPath, tag) {
    const srcPath = join(here, '..', relPath);
    const tmpPath = join(tmpdir(), `${tag}.${process.pid}.mjs`);
    writeFileSync(tmpPath, readFileSync(srcPath, 'utf8'));
    return { tmpPath };
}

const gc = loadAsEsm('src/Classes/GameClass.js', 'gameclass.ai');
const { Game } = await import(pathToFileURL(gc.tmpPath).href);
unlinkSync(gc.tmpPath);

const ai = loadAsEsm('src/Classes/DeadPenteAI.js', 'deadpente.ai');
const { chooseAiDeadStoneCell, nearestLegalCell, chooseAiVacancy } = await import(pathToFileURL(ai.tmpPath).href);
unlinkSync(ai.tmpPath);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
    if (cond) { pass++; console.log(`ok   - ${name}`); }
    else { fail++; console.log(`FAIL - ${name}${extra ? '  :: ' + extra : ''}`); }
}
function freshGame() { const g = new Game(); g.setGame(1); g.reset(); g.rated = false; return g; }
function seed(g, cells) { for (const [x, y, v] of cells) g.abstractBoard[x][y] = v; }
const sameCell = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

// AI is player 1 (black's stones live at value 2, opponent); block the opponent's run.
{
    const g = freshGame();
    seed(g, [[5, 5, 2], [6, 5, 2], [7, 5, 2]]); // opponent (2) open-three, both ends free
    const cell = chooseAiDeadStoneCell(g, 1);
    check('blocks a run by landing on one of its two open ends',
        sameCell(cell, [4, 5]) || sameCell(cell, [8, 5]), `cell=${JSON.stringify(cell)}`);
}

// Prefers the longer of two runs.
{
    const g = freshGame();
    seed(g, [[5, 5, 2], [6, 5, 2]]);                    // run of 2 (open ends 4,5 and 7,5)
    seed(g, [[2, 2, 2], [2, 3, 2], [2, 4, 2], [2, 5, 2]]); // run of 4, vertical (open ends 2,1 and 2,6)
    const cell = chooseAiDeadStoneCell(g, 1);
    check('prefers blocking the longer run over the shorter one',
        sameCell(cell, [2, 1]) || sameCell(cell, [2, 6]), `cell=${JSON.stringify(cell)}`);
}

// One end blocked by the AI's own stone -- picks the other (still-open) end.
{
    const g = freshGame();
    seed(g, [[5, 5, 2], [6, 5, 2], [7, 5, 2], [4, 5, 1]]); // AI stone already at the left flank
    const cell = chooseAiDeadStoneCell(g, 1);
    check('skips an end that is not actually placeable', sameCell(cell, [8, 5]),
        `cell=${JSON.stringify(cell)}`);
}

// A single opponent stone fully encircled by the AI's own stones: every axis's run (length 1
// through this stone) has both its immediate neighbours occupied, so there is truly no
// placeable candidate anywhere -- falls back to nearest-to-center.
{
    const g = freshGame();
    seed(g, [[2, 2, 2]]);
    seed(g, [[1, 1, 1], [2, 1, 1], [3, 1, 1], [1, 2, 1], [3, 2, 1], [1, 3, 1], [2, 3, 1], [3, 3, 1]]);
    const cell = chooseAiDeadStoneCell(g, 1);
    check('falls back to nearest-to-center when the only opponent stone is fully encircled',
        sameCell(cell, [9, 9]), `cell=${JSON.stringify(cell)}`);
}

// Empty board: no opponent stones at all -- falls back to nearest-to-center (tengen).
{
    const g = freshGame();
    const cell = chooseAiDeadStoneCell(g, 1);
    check('falls back to tengen on an empty board', sameCell(cell, [9, 9]),
        `cell=${JSON.stringify(cell)}`);
}

// Returned cell is always legal to place a dead stone on.
{
    const g = freshGame();
    seed(g, [[5, 5, 2], [6, 5, 2], [7, 5, 2]]);
    const cell = chooseAiDeadStoneCell(g, 1);
    check('the chosen cell is always currently placeable', g.canPlaceDeadStone(cell[0], cell[1]) === true,
        `cell=${JSON.stringify(cell)}, board value=${g.abstractBoard[cell[0]][cell[1]]}`);
}

// ---------------------------------------------------------------------------
// nearestLegalCell -- the fix for the WASM engine landing a normal move on a dead stone
// (it has no concept of dead stones, so its own search can legally pick that cell)
// ---------------------------------------------------------------------------

// Already-empty target: returned as-is.
{
    const g = freshGame();
    const cell = nearestLegalCell(g, 9, 9);
    check('an already-empty target is returned unchanged', sameCell(cell, [9, 9]));
}

// Target is a dead stone (the actual reported bug scenario): nudged to the nearest empty cell.
{
    const g = freshGame();
    g.placeDeadStone(9, 9);
    const cell = nearestLegalCell(g, 9, 9);
    check('a dead-stone target is not returned as-is', !sameCell(cell, [9, 9]), `cell=${JSON.stringify(cell)}`);
    check('the nudged cell is actually empty', g.canPlaceDeadStone(cell[0], cell[1]) === true);
    // (9,8) and (9,10) are the nearest empty cells (distance 1); either is an equally valid pick.
    check('the nudged cell is genuinely the nearest one, not an arbitrary one',
        sameCell(cell, [9, 8]) || sameCell(cell, [10, 9]) || sameCell(cell, [9, 10]) || sameCell(cell, [8, 9]),
        `cell=${JSON.stringify(cell)}`);
}

// Target occupied by a real stone works the same way (defensive: same fix path covers any
// unexpected collision, not just dead stones specifically).
{
    const g = freshGame();
    seed(g, [[9, 9, 1]]);
    const cell = nearestLegalCell(g, 9, 9);
    check('a real-stone target is also nudged away', !sameCell(cell, [9, 9]), `cell=${JSON.stringify(cell)}`);
    check('the nudged cell is actually empty (real-stone case)', g.canPlaceDeadStone(cell[0], cell[1]) === true);
}

// ---------------------------------------------------------------------------
// chooseAiVacancy -- Phase 4, Noah's on_capture presets: which captured-pair vacancy the AI
// places its reactive dead stone into.
// ---------------------------------------------------------------------------

{
    const g = freshGame();
    check('null on no vacancies', chooseAiVacancy(g, []) === null);
}
{
    const g = freshGame();
    const vac = chooseAiVacancy(g, [[0, 0], [9, 9]]);
    check('prefers the vacancy nearest the board center', sameCell(vac, [9, 9]), `vac=${JSON.stringify(vac)}`);
}
{
    const g = freshGame();
    const vac = chooseAiVacancy(g, [[3, 3]]);
    check('a single vacancy is returned as-is', sameCell(vac, [3, 3]), `vac=${JSON.stringify(vac)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
