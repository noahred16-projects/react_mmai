// GameClass.js referee fixtures for Corpse-Pente (game 27/28).
// Run: npm run test:corpse-pente   (plain node, no test framework in this repo).
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, '..', 'src', 'Classes', 'GameClass.js');
const tmpPath = join(tmpdir(), `gameclass.corpse.${process.pid}.mjs`);
writeFileSync(tmpPath, readFileSync(srcPath, 'utf8'));
const { Game, CORPSE_STONE } = await import(pathToFileURL(tmpPath).href);
unlinkSync(tmpPath);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
    if (cond) { pass++; console.log(`ok   - ${name}`); }
    else { fail++; console.log(`FAIL - ${name}${extra ? '  :: ' + extra : ''}`); }
}
const XY = (x, y) => y * 19 + x;
function freshGame() { const g = new Game(); g.setGame(27); g.reset(); g.rated = false; return g; }
function seed(g, cells) { for (const [x, y, v] of cells) g.abstractBoard[x][y] = v; }

// 1. Plain pair capture (both flanks real stones, same as ordinary Pente) leaves corpses,
//    not empty cells, and credits the loser's capture count same as plain Pente.
{
    const g = freshGame();
    seed(g, [[3, 5, 1], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // player 1 completes the flank
    check('plain capture credits 2 to the loser', g.captures[2] === 2, `captures=${JSON.stringify(g.captures)}`);
    check('plain capture leaves corpses, not empty',
        g.abstractBoard[4][5] === CORPSE_STONE && g.abstractBoard[5][5] === CORPSE_STONE);
}

// 2. Corpse-assisted capture: red(corpse) - black - black - white(just placed). The corpse
//    stands in for white's own-color flank on the far side.
{
    const g = freshGame();
    seed(g, [[3, 5, CORPSE_STONE], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // player 1 (white) completes the corpse-assisted flank
    check('corpse-assisted capture fires', g.captures[2] === 2, `captures=${JSON.stringify(g.captures)}`);
    check('corpse-assisted capture leaves corpses',
        g.abstractBoard[4][5] === CORPSE_STONE && g.abstractBoard[5][5] === CORPSE_STONE);
    check('the original flanking corpse is untouched', g.abstractBoard[3][5] === CORPSE_STONE);
}

// 3. Corpse cleanup: a pre-existing corpse pair flanked by two stones of DIFFERENT colors
//    (one black, one white) vanishes with no capture credit to either side.
{
    const g = freshGame();
    seed(g, [[3, 5, 2], [4, 5, CORPSE_STONE], [5, 5, CORPSE_STONE]]);
    g.addMove(XY(6, 5)); // player 1 (white) completes the mixed-color sandwich
    check('mixed-color corpse cleanup removes both corpses',
        g.abstractBoard[4][5] === 0 && g.abstractBoard[5][5] === 0);
    check('corpse cleanup credits nobody', g.captures[1] === 0 && g.captures[2] === 0,
        `captures=${JSON.stringify(g.captures)}`);
}

// 3b. Corpse cleanup also fires when BOTH flanks are the same color.
{
    const g = freshGame();
    seed(g, [[3, 5, 1], [4, 5, CORPSE_STONE], [5, 5, CORPSE_STONE]]);
    g.addMove(XY(6, 5)); // player 1 (white) on both ends
    check('same-color corpse cleanup removes both corpses',
        g.abstractBoard[4][5] === 0 && g.abstractBoard[5][5] === 0);
    check('same-color corpse cleanup credits nobody', g.captures[1] === 0 && g.captures[2] === 0);
}

// 4. A fresh capture's own two new corpses must NOT self-trigger cleanup in the same move,
//    even though the pattern (flank - corpse - corpse - flank) is literally what a capture
//    produces. Flanks here are both white (myColor), same as fixture 1, but phrased so the
//    pattern after conversion reads exactly like a cleanup sandwich.
{
    const g = freshGame();
    seed(g, [[3, 5, 1], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // player 1 captures; both flanks happen to be white
    check('a capture\'s own new corpses survive the same move',
        g.abstractBoard[4][5] === CORPSE_STONE && g.abstractBoard[5][5] === CORPSE_STONE,
        `board4,5=${g.abstractBoard[4][5]} board5,5=${g.abstractBoard[5][5]}`);
}

// 5. Corpses block line-of-five for both colors.
{
    const g = freshGame();
    seed(g, [[0, 5, 1], [1, 5, 1], [2, 5, 1], [3, 5, 1], [4, 5, CORPSE_STONE]]);
    g.addMove(XY(5, 5)); // would be the 5th white stone in a row, but (4,5) is a corpse wall
    check('corpse blocks a white line-of-five', g.winner === undefined);
}

// 6. Capture-win threshold is plain Pente's: 10, immediate, no advantage clause needed.
{
    const g = freshGame();
    g.captures = [undefined, 0, 9];
    seed(g, [[3, 5, 1], [4, 5, 2], [5, 5, 2]]);
    g.addMove(XY(6, 5)); // player 1 captures the pair, pushing captures[2] to 11
    g.isGameOver();
    check('capture win fires at threshold 10 (loser=2 -> winner=1)', g.winner === 1,
        `captures=${JSON.stringify(g.captures)} winner=${g.winner}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
