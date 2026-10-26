// Dead-Pente core-engine fixtures (docs/dead-pente-spec.md, Phase 1: core DEAD-cell support).
// Proves DEAD_STONE acts as a wall for the *existing, unmodified* capture/win detectors --
// no change to #detectPenteCapture/#detectPenteOf/#detectKeryoPenteCapture/#detectPoof was
// needed because they all match by strict equality against color 1/2.
// Run: node tests/dead-pente.test.mjs  (plain node, no test framework in this repo).
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, '..', 'src', 'Classes', 'GameClass.js');
const tmpPath = join(tmpdir(), `gameclass.deadpente.${process.pid}.mjs`);
writeFileSync(tmpPath, readFileSync(srcPath, 'utf8'));
const { Game, DEAD_STONE } = await import(pathToFileURL(tmpPath).href);
unlinkSync(tmpPath);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
    if (cond) { pass++; console.log(`ok   - ${name}`); }
    else { fail++; console.log(`FAIL - ${name}${extra ? '  :: ' + extra : ''}`); }
}
const XY = (x, y) => y * 19 + x;
function freshGame(id = 1) { const g = new Game(); g.setGame(id); g.reset(); g.rated = false; return g; }
function seed(g, cells) { for (const [x, y, v] of cells) g.abstractBoard[x][y] = v; }

// ---------------------------------------------------------------------------
// 1. DEAD_STONE blocks line-of-5 (#detectPenteOf)
// ---------------------------------------------------------------------------

// 3 black in a row + a DEAD wall at the 5th-cell position; placing the 4th still only makes
// a run of 4 because the scan stops dead (literally) at the wall instead of skipping over it.
{
    const g = freshGame(1);
    seed(g, [[5, 5, 1], [6, 5, 1], [7, 5, 1]]);
    g.abstractBoard[9][5] = DEAD_STONE;
    g.addMove(XY(8, 5)); // player 1: board is now 5,6,7,8 real + DEAD at 9
    check('wall stops a run at 4 instead of being skipped as empty', g.winner === undefined,
        `winner=${g.winner}`);
}

// Sanity: an unrelated DEAD stone elsewheer does not spuriously block a genuine five.
{
    const g = freshGame(1);
    seed(g, [[4, 5, 1], [5, 5, 1], [6, 5, 1], [7, 5, 1]]);
    g.abstractBoard[0][0] = DEAD_STONE;
    g.addMove(XY(8, 5)); // completes (4,5)-(8,5)
    check('an unrelated wall does not block a genuine five', g.winner === 1, `winner=${g.winner}`);
}

// ---------------------------------------------------------------------------
// 2. DEAD_STONE blocks pair capture (#detectPenteCapture) and is itself never removed
// ---------------------------------------------------------------------------

// Flank pattern my(5)-DEAD(6)-opp(7)-me(8,just played): the capture needs BOTH 6 and 7 to
// equal the opponent color; 6 is DEAD, so no capture fires at all, and the wall is untouched.
{
    const g = freshGame(1);
    seed(g, [[5, 5, 1], [7, 5, 2]]);
    g.abstractBoard[6][5] = DEAD_STONE;
    g.addMove(XY(8, 5)); // player 1
    check('a wall in one flank slot prevents the capture from firing', g.captures[2] === 0,
        `captures=${JSON.stringify(g.captures)}`);
    check('the wall itself is not removed by the failed capture attempt',
        g.abstractBoard[6][5] === DEAD_STONE, `cell=${g.abstractBoard[6][5]}`);
    check('the real opponent stone next to the wall is also left alone (no partial capture)',
        g.abstractBoard[7][5] === 2, `cell=${g.abstractBoard[7][5]}`);
}

// Sanity: the same shape with a real opponent pair (no wall) still captures normally --
// confirms the fixture above is actually exercising the wall, not some unrelated typo.
{
    const g = freshGame(1);
    seed(g, [[5, 5, 1], [6, 5, 2], [7, 5, 2]]);
    g.addMove(XY(8, 5)); // player 1
    check('the same shape captures normally without a wall', g.captures[2] === 2,
        `captures=${JSON.stringify(g.captures)}`);
}

// ---------------------------------------------------------------------------
// 3. placeDeadStone / canPlaceDeadStone legality
// ---------------------------------------------------------------------------

{
    const g = freshGame(1);
    check('canPlaceDeadStone: true on an empty cell', g.canPlaceDeadStone(5, 5) === true);
    const ok = g.placeDeadStone(5, 5);
    check('placeDeadStone: succeeds on an empty cell and returns true', ok === true);
    check('placeDeadStone: writes DEAD_STONE', g.abstractBoard[5][5] === DEAD_STONE,
        `cell=${g.abstractBoard[5][5]}`);
}

{
    const g = freshGame(1);
    seed(g, [[5, 5, 1]]);
    check('canPlaceDeadStone: false on a black stone', g.canPlaceDeadStone(5, 5) === false);
    const ok = g.placeDeadStone(5, 5);
    check('placeDeadStone: fails on an occupied cell and returns false', ok === false);
    check('placeDeadStone: does not overwrite the existing stone', g.abstractBoard[5][5] === 1,
        `cell=${g.abstractBoard[5][5]}`);
}

{
    const g = freshGame(1);
    g.abstractBoard[5][5] = DEAD_STONE;
    const ok = g.placeDeadStone(5, 5);
    check('placeDeadStone: fails on an already-dead cell', ok === false);
}

{
    const g = freshGame(1);
    g.rated = true;
    g.addMove(XY(9, 9)); // player 1
    g.addMove(XY(9, 8)); // player 2 -- addMove applies the tournament rule right after this
    check('tournament-blocked (-1) cell exists after move 2', g.abstractBoard[8][8] === -1,
        `cell=${g.abstractBoard[8][8]}`);
    const ok = g.placeDeadStone(8, 8);
    check('placeDeadStone: fails on a tournament-blocked (-1) cell', ok === false);
}

// ---------------------------------------------------------------------------
// 4. addDeadStoneMove / history integration (undo, forward-back, goto)
// ---------------------------------------------------------------------------

// addDeadStoneMove consumes a whole turn (actionCost: 'replacement'): currentPlayer flips
// exactly like it would after a normal addMove, because both just push onto `moves`.
{
    const g = freshGame(1);
    g.addMove(XY(9, 9)); // player 1
    check('sanity: player 2 to move after one normal move', g.currentPlayer() === 2);
    g.addDeadStoneMove(XY(3, 3)); // player 2 spends their turn on a dead stone
    check('addDeadStoneMove advances the turn like a normal move', g.currentPlayer() === 1,
        `currentPlayer=${g.currentPlayer()}`);
    check('addDeadStoneMove wrote DEAD_STONE to the board', g.abstractBoard[3][3] === DEAD_STONE,
        `cell=${g.abstractBoard[3][3]}`);
    check('addDeadStoneMove recorded the move index as a dead placement',
        g.deadStoneMoves.has(1) === true, `deadStoneMoves=${JSON.stringify([...g.deadStoneMoves])}`);
}

// undoMove after a dead-stone placement: the cell goes back to empty and the index is no
// longer tracked as a dead placement (replayGame rebuilds from moves+deadStoneMoves; undoMove
// also prunes the now-out-of-range index).
{
    const g = freshGame(1);
    g.addMove(XY(9, 9));
    g.addDeadStoneMove(XY(3, 3));
    g.undoMove();
    check('undo after a dead-stone move clears the cell', g.abstractBoard[3][3] === 0,
        `cell=${g.abstractBoard[3][3]}`);
    check('undo after a dead-stone move drops the stale deadStoneMoves index',
        g.deadStoneMoves.has(1) === false, `deadStoneMoves=${JSON.stringify([...g.deadStoneMoves])}`);
    check('undo after a dead-stone move restores the turn', g.currentPlayer() === 2,
        `currentPlayer=${g.currentPlayer()}`);
}

// A dead-stone placement survives a full backward+forward replay via goForwardBack, the same
// navigation MovesListPanel drives -- this is what the Phase 1 writeup flagged as unsupported.
{
    const g = freshGame(1);
    g.addMove(XY(9, 9));          // move 0, player 1
    g.addDeadStoneMove(XY(3, 3)); // move 1, player 2's dead stone
    g.addMove(XY(10, 9));         // move 2, player 1
    check('sanity: 3 moves played', g.moves.length === 3);

    g.goForwardBack(false); // back one: undoes move 2
    check('goForwardBack(false) once: dead stone still on board', g.abstractBoard[3][3] === DEAD_STONE,
        `cell=${g.abstractBoard[3][3]}`);
    g.goForwardBack(false); // back one more: undoes the dead-stone move itself
    check('goForwardBack(false) twice: dead stone cell is empty again', g.abstractBoard[3][3] === 0,
        `cell=${g.abstractBoard[3][3]}`);

    g.goForwardBack(true); // forward: replays the dead-stone move
    check('goForwardBack(true) replays the dead stone (not a real stone)',
        g.abstractBoard[3][3] === DEAD_STONE, `cell=${g.abstractBoard[3][3]}`);
    g.goForwardBack(true); // forward: replays the real move after it
    check('goForwardBack(true) replays the real move after the dead stone',
        g.abstractBoard[10][9] === 1, `cell=${g.abstractBoard[10][9]}`);
    check('goForwardBack round-trip leaves the dead stone as DEAD_STONE, not a real stone',
        g.abstractBoard[3][3] === DEAD_STONE, `cell=${g.abstractBoard[3][3]}`);
}

// goto_move exercises the same path for jumping directly (used by MovesListPanel).
{
    const g = freshGame(1);
    g.addMove(XY(9, 9));
    g.addDeadStoneMove(XY(3, 3));
    g.addMove(XY(10, 9));
    g.goto_move(2); // "until" is a move COUNT, not an index: 2 == moves 0,1 applied (0-indexed: through the dead stone)
    check('goto_move(2) shows the dead stone', g.abstractBoard[3][3] === DEAD_STONE,
        `cell=${g.abstractBoard[3][3]}`);
    check('goto_move(2) has not yet replayed the move after it', g.abstractBoard[10][9] === 0,
        `cell=${g.abstractBoard[10][9]}`);
    g.goto_move(3); // jump forward to the end again
    check('goto_move(3) replays everything, dead stone intact', g.abstractBoard[3][3] === DEAD_STONE &&
        g.abstractBoard[10][9] === 1);
}

// ---------------------------------------------------------------------------
// 5. attachDeadStone (actionCost: 'additional') -- does NOT consume a moves[] entry
// ---------------------------------------------------------------------------

{
    const g = freshGame(1);
    g.addMove(XY(9, 9)); // player 1
    check('sanity: player 2 to move', g.currentPlayer() === 2);
    g.attachDeadStone(XY(3, 3)); // player 2 attaches a dead stone to their upcoming turn
    check('attachDeadStone does NOT push onto moves', g.moves.length === 1,
        `moves.length=${g.moves.length}`);
    check('attachDeadStone does NOT advance the turn', g.currentPlayer() === 2,
        `currentPlayer=${g.currentPlayer()}`);
    check('attachDeadStone wrote DEAD_STONE to the board immediately', g.abstractBoard[3][3] === DEAD_STONE,
        `cell=${g.abstractBoard[3][3]}`);
    g.addMove(XY(10, 9)); // player 2's normal move completing the same turn
    check('the follow-up addMove still belongs to player 2 (same turn)', g.abstractBoard[10][9] === 2,
        `cell=${g.abstractBoard[10][9]}`);
    check('after the follow-up move, it is player 1\'s turn', g.currentPlayer() === 1,
        `currentPlayer=${g.currentPlayer()}`);
    check('the attachment is recorded against the real move\'s index (1)',
        g.deadStoneAttachments.has(1) === true,
        `attachments=${JSON.stringify([...g.deadStoneAttachments.entries()])}`);
}

// undo removes BOTH the attached dead stone and its real move together, as one turn-unit.
{
    const g = freshGame(1);
    g.addMove(XY(9, 9));
    g.attachDeadStone(XY(3, 3));
    g.addMove(XY(10, 9));
    g.undoMove();
    check('undo after an additional-cost turn clears the real move', g.abstractBoard[10][9] === 0,
        `cell=${g.abstractBoard[10][9]}`);
    check('undo after an additional-cost turn also clears the attached dead stone',
        g.abstractBoard[3][3] === 0, `cell=${g.abstractBoard[3][3]}`);
    check('undo after an additional-cost turn drops the stale attachment',
        g.deadStoneAttachments.has(1) === false);
    check('undo after an additional-cost turn restores the turn', g.currentPlayer() === 2,
        `currentPlayer=${g.currentPlayer()}`);
}

// the attachment survives a full backward+forward replay (goForwardBack / goto_move), same
// as a 'replacement' dead stone did in section 4.
{
    const g = freshGame(1);
    g.addMove(XY(9, 9));          // move 0, player 1
    g.attachDeadStone(XY(3, 3));  // attached to the upcoming move 1
    g.addMove(XY(10, 9));         // move 1, player 2 (with the attachment)
    g.addMove(XY(11, 9));         // move 2, player 1

    g.goForwardBack(false); // undo move 2
    check('goForwardBack(false) once: attached dead stone still on board',
        g.abstractBoard[3][3] === DEAD_STONE, `cell=${g.abstractBoard[3][3]}`);
    g.goForwardBack(false); // undo move 1 (and its attachment)
    check('goForwardBack(false) twice: attached dead stone cell is empty again',
        g.abstractBoard[3][3] === 0, `cell=${g.abstractBoard[3][3]}`);

    g.goForwardBack(true); // replays move 1 + its attachment
    check('goForwardBack(true) replays both the real move and its attached dead stone',
        g.abstractBoard[10][9] === 2 && g.abstractBoard[3][3] === DEAD_STONE,
        `real=${g.abstractBoard[10][9]}, dead=${g.abstractBoard[3][3]}`);
}

// ---------------------------------------------------------------------------
// 6. lastCaptureVacancies (Phase 4: on_capture trigger support)
// ---------------------------------------------------------------------------

{
    const g = freshGame(1);
    seed(g, [[5, 5, 1], [6, 5, 2], [7, 5, 2]]); // same capture shape as section 2's sanity check
    g.addMove(XY(8, 5)); // player 1 captures the pair at (6,5) and (7,5)
    check('lastCaptureVacancies records both captured cells', g.lastCaptureVacancies.length === 2,
        `vacancies=${JSON.stringify(g.lastCaptureVacancies)}`);
    const has = (x, y) => g.lastCaptureVacancies.some(([vx, vy]) => vx === x && vy === y);
    check('lastCaptureVacancies contains (6,5)', has(6, 5));
    check('lastCaptureVacancies contains (7,5)', has(7, 5));
}

// A move that captures nothing clears any vacancies left over from a previous move.
{
    const g = freshGame(1);
    seed(g, [[5, 5, 1], [6, 5, 2], [7, 5, 2]]);
    g.addMove(XY(8, 5)); // captures
    g.addMove(XY(0, 0)); // unrelated, non-capturing move
    check('lastCaptureVacancies resets to empty after a non-capturing move',
        g.lastCaptureVacancies.length === 0, `vacancies=${JSON.stringify(g.lastCaptureVacancies)}`);
}

// A move capturing two separate pairs at once (one on the i-3 "left" axis, one on the j-3
// "up" axis of #detectPenteCapture) records all four vacated cells.
{
    const g = freshGame(1);
    seed(g, [
        [2, 5, 1], [4, 5, 2], [3, 5, 2], // left axis: myColor at i-3, opp pair at i-1/i-2
        [5, 2, 1], [5, 4, 2], [5, 3, 2], // up axis: myColor at j-3, opp pair at j-1/j-2
    ]);
    g.addMove(XY(5, 5)); // player 1: completes both flanks in one move
    check('a double-pair capture records all 4 vacated cells', g.lastCaptureVacancies.length === 4,
        `vacancies=${JSON.stringify(g.lastCaptureVacancies)}, captures=${JSON.stringify(g.captures)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
