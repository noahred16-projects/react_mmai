// Dead Stones Rule Middleware fixtures (docs/dead-pente-spec.md, Phase 2: dead-pente-ned-open
// vertical slice). Run: node tests/dead-pente-rules.test.mjs
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

const gc = loadAsEsm('src/Classes/GameClass.js', 'gameclass.rules');
const { Game } = await import(pathToFileURL(gc.tmpPath).href);
unlinkSync(gc.tmpPath);

const rules = loadAsEsm('src/Classes/DeadPenteRules.js', 'deadpente.rules');
const { canPlaceDeadStoneNow, isDeadStoneTurnEligible, remainingDeadStones, deadStonesPlacedBy } =
    await import(pathToFileURL(rules.tmpPath).href);
unlinkSync(rules.tmpPath);

const configs = loadAsEsm('src/Classes/DeadPenteConfigs.js', 'deadpente.configs');
const { DEAD_PENTE_CONFIGS } = await import(pathToFileURL(configs.tmpPath).href);
unlinkSync(configs.tmpPath);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
    if (cond) { pass++; console.log(`ok   - ${name}`); }
    else { fail++; console.log(`FAIL - ${name}${extra ? '  :: ' + extra : ''}`); }
}
const XY = (x, y) => y * 19 + x;
function freshGame() { const g = new Game(); g.setGame(1); g.reset(); g.rated = false; return g; }
function seed(g, cells) { for (const [x, y, v] of cells) g.abstractBoard[x][y] = v; }

const ned = DEAD_PENTE_CONFIGS['dead-pente-ned-open'];

// ---------------------------------------------------------------------------
// dead-pente-ned-open: trigger 'anytime', actionCost 'replacement', maxPerPlayer 1
// ---------------------------------------------------------------------------

{
    const g = freshGame();
    check('ned-open: player 1 may place on move 0 (anytime, no window)',
        canPlaceDeadStoneNow(g, ned, 1, 9, 9) === true);
    check('ned-open: it is not player 2\'s turn yet',
        canPlaceDeadStoneNow(g, ned, 2, 3, 3) === false);
}

{
    const g = freshGame();
    g.addMove(XY(9, 9)); // player 1 plays a real move; player 2 to move
    check('ned-open: player 2 may place anytime after player 1\'s move',
        canPlaceDeadStoneNow(g, ned, 2, 3, 3) === true);
    check('ned-open: cell must be empty', canPlaceDeadStoneNow(g, ned, 2, 9, 9) === false,
        'occupied cell (9,9) should not be placeable');
}

{
    const g = freshGame();
    g.addMove(XY(9, 9));          // player 1
    g.addDeadStoneMove(XY(3, 3)); // player 2 spends their one dead stone
    check('ned-open: deadStonesPlacedBy(player 2) is 1 after use',
        deadStonesPlacedBy(g, 2) === 1);
    check('ned-open: remainingDeadStones(player 2) is 0 after use',
        remainingDeadStones(g, ned, 2) === 0);
    g.addMove(XY(10, 9)); // player 1
    check('ned-open: player 2 cannot place a second dead stone (maxPerPlayer: 1)',
        canPlaceDeadStoneNow(g, ned, 2, 4, 4) === false);
    check('ned-open: player 1 still has their own unused right (independent per player)',
        remainingDeadStones(g, ned, 1) === 1);
}

// ---------------------------------------------------------------------------
// dead-pente-karl-extra / dead-pente-karl-turn: trigger 'turn_window'
// p2WindowStart=4, p2WindowEnd=6, p1WindowDuration=3, p1RequiresP2Trigger=true, maxPerPlayer=1
// ---------------------------------------------------------------------------

const karlExtra = DEAD_PENTE_CONFIGS['dead-pente-karl-extra'];
const karlTurn = DEAD_PENTE_CONFIGS['dead-pente-karl-turn'];

// Colors strictly alternate along this placeholder sequence (player 1 at even x, player 2 at
// odd x), so it never accidentally forms a capture or a five -- pure turn-number padding.
function playPlaceholderMoves(g, count) {
    for (let k = 0; k < count; k++) {
        g.addMove(XY(k, 0));
    }
}

// P2's own-turn number N is reached after exactly 2N-1 total moves (P1 always moves first).
{
    const g = freshGame();
    playPlaceholderMoves(g, 5); // P2 about to take their 3rd own turn
    check('karl-extra: P2 before the window (turn 3 of 4-6) is not eligible',
        isDeadStoneTurnEligible(g, karlExtra, 2) === false);
}
{
    const g = freshGame();
    playPlaceholderMoves(g, 7); // P2 about to take their 4th own turn (window start)
    check('karl-extra: P2 at the window start (turn 4) is eligible',
        isDeadStoneTurnEligible(g, karlExtra, 2) === true);
}
{
    const g = freshGame();
    playPlaceholderMoves(g, 11); // P2 about to take their 6th own turn (window end)
    check('karl-extra: P2 at the window end (turn 6) is eligible',
        isDeadStoneTurnEligible(g, karlExtra, 2) === true);
}
{
    const g = freshGame();
    playPlaceholderMoves(g, 13); // P2 about to take their 7th own turn (just past the window)
    check('karl-extra: P2 just past the window (turn 7) is not eligible',
        isDeadStoneTurnEligible(g, karlExtra, 2) === false);
}

// P1 is gated behind P2's trigger regardless of P1's own turn number.
{
    const g = freshGame();
    playPlaceholderMoves(g, 6); // P1 about to take their 4th own turn; P2 has never placed
    check('karl-extra: P1 is never eligible before P2 has triggered it',
        isDeadStoneTurnEligible(g, karlExtra, 1) === false);
}

// P2 triggers at their window start (own turn 4, move index 7); P1's window should then open
// for P1's turns 5-7 (p1TurnsBeforeTrigger=4, +1..+3) and close at turn 8.
{
    const g = freshGame();
    playPlaceholderMoves(g, 7); // moves.length=7, P2's turn
    g.attachDeadStone(XY(15, 1));
    g.addMove(XY(16, 1)); // completes P2's turn-4 (additional cost): moves.length=8, P1 to move
    check('karl-extra: P1 window opens immediately at P1 turn 5 right after P2 triggers',
        isDeadStoneTurnEligible(g, karlExtra, 1) === true);

    playPlaceholderMoves(g, 2); // one more P1+P2 round trip -> P1's turn 6 (still mid-window)
    check('karl-extra: P1 window still open at turn 6', isDeadStoneTurnEligible(g, karlExtra, 1) === true);

    playPlaceholderMoves(g, 2); // another round trip -> P1's turn 7 (window end)
    check('karl-extra: P1 window still open at turn 7 (last turn)', isDeadStoneTurnEligible(g, karlExtra, 1) === true);

    playPlaceholderMoves(g, 2); // another round trip -> P1's turn 8 (just past the window)
    check('karl-extra: P1 window closed at turn 8', isDeadStoneTurnEligible(g, karlExtra, 1) === false);
}

// maxPerPlayer still applies even while the window is technically still open.
{
    const g = freshGame();
    playPlaceholderMoves(g, 7); // P2's turn 4
    g.attachDeadStone(XY(15, 1));
    g.addMove(XY(16, 1));
    playPlaceholderMoves(g, 1); // P1's normal turn 5 (declines their own window)
    check('karl-extra: P2 cannot place again at turn 5 even though 4-6 is still open',
        isDeadStoneTurnEligible(g, karlExtra, 2) === false);
}

// canPlaceDeadStoneNow combines window eligibility with the cell-emptiness check.
{
    const g = freshGame();
    playPlaceholderMoves(g, 7); // P2's turn 4, window open
    check('karl-extra: canPlaceDeadStoneNow true on an empty cell inside the window',
        canPlaceDeadStoneNow(g, karlExtra, 2, 15, 1) === true);
    check('karl-extra: canPlaceDeadStoneNow false on an occupied cell even inside the window',
        canPlaceDeadStoneNow(g, karlExtra, 2, 0, 0) === false);
}

// dead-pente-karl-turn (actionCost: 'replacement') shares the exact same window/trigger math;
// this also cross-checks that deadStonePlacementIndices correctly reads a 'replacement'-style
// placement (game.deadStoneMoves), not just an 'additional' attachment.
{
    const g = freshGame();
    playPlaceholderMoves(g, 7); // P2's turn 4
    check('karl-turn: P2 eligible at window start', isDeadStoneTurnEligible(g, karlTurn, 2) === true);
    g.addDeadStoneMove(XY(15, 1)); // consumes P2's whole turn-4 (replacement cost)
    check('karl-turn: P1 window opens right after P2\'s replacement-cost placement',
        isDeadStoneTurnEligible(g, karlTurn, 1) === true);
}
// ---------------------------------------------------------------------------
// dead-pente-noah-*: trigger 'on_capture', actionCost 'additional',
// placementLocation 'vacated_capture_space'. The mandatory vs. optional distinction lives
// entirely in the saga/UI layer (whether the opponent is blocked and whether a decline path
// exists) -- isDeadStoneTurnEligible/canPlaceDeadStoneNow behave identically either way, so
// these tests exercise the optional configs and don't duplicate coverage for mandatory ones.
// ---------------------------------------------------------------------------

const noahLimitedOptional = DEAD_PENTE_CONFIGS['dead-pente-noah-limited-optional'];
const noahUnlimitedOptional = DEAD_PENTE_CONFIGS['dead-pente-noah-unlimited-optional'];

// A capturing move makes the CAPTURING player eligible -- not currentPlayer(), which has
// already flipped to the opponent by the time this is checked (the capturing move already
// pushed onto moves[]). Only the vacated cells are valid placements.
{
    const g = freshGame();
    seed(g, [[5, 5, 1], [6, 5, 2], [7, 5, 2]]);
    g.addMove(XY(8, 5)); // player 1 captures (6,5) and (7,5)
    check('noah: currentPlayer has already flipped to the opponent', g.currentPlayer() === 2);
    check('noah: the capturing player (1), not currentPlayer (2), is eligible',
        isDeadStoneTurnEligible(g, noahLimitedOptional, 1) === true);
    check('noah: the opponent is not eligible merely because it is now their turn',
        isDeadStoneTurnEligible(g, noahLimitedOptional, 2) === false);
    check('noah: a vacated cell is placeable', canPlaceDeadStoneNow(g, noahLimitedOptional, 1, 6, 5) === true);
    check('noah: a non-vacated empty cell is not placeable (placementLocation constraint)',
        canPlaceDeadStoneNow(g, noahLimitedOptional, 1, 0, 0) === false);
}

// A non-capturing move never opens the window.
{
    const g = freshGame();
    g.addMove(XY(9, 9));
    check('noah: a move that captured nothing is not eligible',
        isDeadStoneTurnEligible(g, noahLimitedOptional, 1) === false);
}

// Once placed (attached to the capturing move's own index, since it already happened), the
// reactive window for that specific capture closes.
{
    const g = freshGame();
    seed(g, [[5, 5, 1], [6, 5, 2], [7, 5, 2]]);
    g.addMove(XY(8, 5)); // player 1 captures, move index 0
    g.attachDeadStone(XY(6, 5), g.moves.length - 1);
    check('noah: the reactive window closes once the dead stone is placed',
        isDeadStoneTurnEligible(g, noahLimitedOptional, 1) === false);
}

// maxPerPlayer: a limited config stops prompting once its one dead stone is spent, even on a
// later capture; an unlimited config keeps prompting on every capture.
{
    const g = freshGame();
    seed(g, [[5, 5, 1], [6, 5, 2], [7, 5, 2]]);
    g.addMove(XY(8, 5)); // player 1 captures #1 (move index 0)
    g.attachDeadStone(XY(6, 5), g.moves.length - 1);
    g.addMove(XY(0, 0)); // player 2, non-capturing (index 1)
    seed(g, [[10, 10, 1], [11, 10, 2], [12, 10, 2]]);
    g.addMove(XY(13, 10)); // player 1 captures #2 (index 2)
    check('noah-limited: no longer eligible once the single dead stone is already spent',
        isDeadStoneTurnEligible(g, noahLimitedOptional, 1) === false);
    check('noah-unlimited: still eligible on a second capture (maxPerPlayer: null)',
        isDeadStoneTurnEligible(g, noahUnlimitedOptional, 1) === true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
