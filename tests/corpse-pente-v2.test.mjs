// GameClass.js referee fixtures for Corpse-Pente v2 (game 29/30). Mirrors
// tests/corpse-pente.test.mjs's structure but exercises the v2 capture rule: flanks must
// match the mover's own color exactly (no corpse stand-in), while the two middle cells no
// longer need to match each other -- each is judged independently (real opponent stone ->
// captured +1; existing corpse -> swept, no credit).
// Run: npm run test:corpse-pente-v2
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, '..', 'src', 'Classes', 'GameClass.js');
const tmpPath = join(tmpdir(), `gameclass.corpsev2.${process.pid}.mjs`);
writeFileSync(tmpPath, readFileSync(srcPath, 'utf8'));
const { Game, CORPSE_STONE } = await import(pathToFileURL(tmpPath).href);
unlinkSync(tmpPath);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
    if (cond) { pass++; console.log(`ok   - ${name}`); }
    else { fail++; console.log(`FAIL - ${name}${extra ? '  :: ' + extra : ''}`); }
}
const XY = (x, y) => y * 19 + x;
function freshGame() { const g = new Game(); g.setGame(29); g.reset(); g.rated = false; return g; }
function seed(g, cells) { for (const [x, y, v] of cells) g.abstractBoard[x][y] = v; }

// 1. Standard full capture: both middle cells are a real opponent stone, flanks match
//    (both white) -- same as plain Pente, credits 2, both become corpses.
{
    const g = freshGame();
    seed(g, [[3, 5, 1], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // player 1 (white) completes the flank
    check('v2 standard full capture credits 2', g.captures[2] === 2, `captures=${JSON.stringify(g.captures)}`);
    check('v2 standard full capture leaves corpses',
        g.abstractBoard[4][5] === CORPSE_STONE && g.abstractBoard[5][5] === CORPSE_STONE);
}

// 2. The user's example: black - red - white - black. Flanks are both black; the middle is
//    one pre-existing corpse and one real white stone. Only the white counts (+1); the red
//    doesn't count and is swept to empty, not left as a corpse.
{
    const g = freshGame();
    // black at (3,5), corpse at (4,5), white at (5,5), black completes at (6,5).
    // moves.length must be odd before this call so the mover comes out black (2 - length%2);
    // a raw placeholder push (not a real move) is enough since addMove only reads the length.
    g.moves.push(0);
    seed(g, [[3, 5, 2], [4, 5, CORPSE_STONE], [5, 5, 1]]);
    g.addMove(XY(6, 5)); // player 2 (black) completes the flank
    check('v2 mixed sandwich credits exactly 1 (only the real stone)',
        g.captures[1] === 1, `captures=${JSON.stringify(g.captures)}`);
    check('v2 mixed sandwich: the real stone becomes a corpse',
        g.abstractBoard[5][5] === CORPSE_STONE);
    check('v2 mixed sandwich: the pre-existing corpse is swept to empty, not left behind',
        g.abstractBoard[4][5] === 0);
}

// 3. Pure corpse-corpse middle, matching flanks: both swept, credits nobody.
{
    const g = freshGame();
    seed(g, [[3, 5, 1], [4, 5, CORPSE_STONE], [5, 5, CORPSE_STONE]]);
    g.addMove(XY(6, 5)); // player 1 (white) on both ends
    check('v2 pure corpse-corpse sandwich credits nobody',
        g.captures[1] === 0 && g.captures[2] === 0, `captures=${JSON.stringify(g.captures)}`);
    check('v2 pure corpse-corpse sandwich sweeps both',
        g.abstractBoard[4][5] === 0 && g.abstractBoard[5][5] === 0);
}

// 4. A corpse can no longer stand in as a FLANK (v1's mechanic, deliberately removed in v2).
//    red(corpse) - black - black - white should NOT capture the black pair.
{
    const g = freshGame();
    seed(g, [[3, 5, CORPSE_STONE], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // player 1 (white) -- the far flank is a corpse, not white
    check('v2 corpse can no longer complete a capture as a flank',
        g.captures[1] === 0 && g.captures[2] === 0, `captures=${JSON.stringify(g.captures)}`);
    check('v2 corpse-flank: the black pair is untouched',
        g.abstractBoard[4][5] === 2 && g.abstractBoard[5][5] === 2);
}

// 5. A middle cell of the MOVER's own color is not capturable -- no capture fires at all
//    even though the far flank matches and the other middle cell is a real opponent stone.
{
    const g = freshGame();
    seed(g, [[3, 5, 1], [4, 5, 1], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // player 1 (white); middle has white(own)+black
    check('v2 own-color stone in the middle blocks the capture entirely',
        g.captures[1] === 0 && g.captures[2] === 0, `captures=${JSON.stringify(g.captures)}`);
    check('v2 own-color-in-middle: nothing on the board changed',
        g.abstractBoard[4][5] === 1 && g.abstractBoard[5][5] === 2);
}

// 6. Corpses still block line-of-five (unchanged shared mechanism).
{
    const g = freshGame();
    seed(g, [[0, 5, 1], [1, 5, 1], [2, 5, 1], [3, 5, 1], [4, 5, CORPSE_STONE]]);
    g.addMove(XY(5, 5));
    check('v2 corpse blocks a white line-of-five', g.winner === undefined);
}

// 7. Capture-win threshold is the same as v1 / plain Pente: 10, immediate, no advantage.
{
    const g = freshGame();
    g.captures = [undefined, 0, 9];
    seed(g, [[3, 5, 1], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // standard full capture pushes captures[2] from 9 to 11
    g.isGameOver();
    check('v2 capture win fires at threshold 10 (loser=2 -> winner=1)', g.winner === 1,
        `captures=${JSON.stringify(g.captures)} winner=${g.winner}`);
}

// 8. v1 (game 27) must be completely unaffected: corpse-as-flank still works there.
{
    const g = new Game(); g.setGame(27); g.reset(); g.rated = false;
    seed(g, [[3, 5, CORPSE_STONE], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5));
    check('v1 (game 27) corpse-as-flank capture still works, unaffected by v2',
        g.captures[2] === 2 && g.abstractBoard[4][5] === CORPSE_STONE && g.abstractBoard[5][5] === CORPSE_STONE,
        `captures=${JSON.stringify(g.captures)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
