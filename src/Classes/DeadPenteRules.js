// Dead Stones Rule Middleware (docs/dead-pente-spec.md section 2). Legality for WHEN a
// player may place a dead stone, config-driven. Deliberately duck-typed against the Game
// interface (game.deadStoneMoves, game.deadStoneAttachments, game.currentPlayer(),
// game.canPlaceDeadStone(x, y)) rather than importing GameClass.js, so this file has no
// dependency on the core engine module and can be unit-tested standalone.
//
// Phase 2 implemented 'anytime' (dead-pente-ned-open). Phase 3 added 'turn_window' (Karl's two
// presets). Phase 4 adds 'on_capture' (Noah's four presets).

// Move-history indices alternate players the same way GameClass.js's addMove/addMoveFromList
// do: index 0 is player 1, index 1 is player 2, etc. This also correctly identifies the owner
// of an actionCost: 'additional' attachment, since it's keyed by the index of the real move it
// rides along with (same player, same turn). Exported: sagas.js needs it to identify who just
// moved for on_capture (see onCaptureEligible below -- by the time that trigger is checked,
// currentPlayer() has already flipped to the opponent, since the capturing move already
// pushed onto moves[]).
export const ownerOfMoveIndex = (i) => 1 + (i % 2);

// Every move-history index at which `player` has placed a dead stone, whether as its own
// 'replacement' moves[] entry (game.deadStoneMoves) or as an 'additional' attachment to a real
// move (game.deadStoneAttachments, keyed by that real move's index) -- sorted ascending.
export function deadStonePlacementIndices(game, player) {
    const indices = [];
    for (const i of game.deadStoneMoves) {
        if (ownerOfMoveIndex(i) === player) {
            indices.push(i);
        }
    }
    for (const i of game.deadStoneAttachments.keys()) {
        if (ownerOfMoveIndex(i) === player) {
            indices.push(i);
        }
    }
    return indices.sort((a, b) => a - b);
}

export function deadStonesPlacedBy(game, player) {
    return deadStonePlacementIndices(game, player).length;
}

export function remainingDeadStones(game, config, player) {
    const max = config.deadStones.maxPerPlayer;
    if (max === null || max === undefined) {
        return Infinity;
    }
    return max - deadStonesPlacedBy(game, player);
}

// How many of `player`'s own turns have already happened -- both a normal move and a
// 'replacement' dead-stone turn occupy one moves[] entry each, so this counts moves[] entries
// owned by `player`. An 'additional' attachment does NOT add an entry (see attachDeadStone),
// so it doesn't double-count; it rides along with the real move that does.
function ownTurnsSoFar(game, player) {
    let count = 0;
    for (let i = 0; i < game.moves.length; i++) {
        if (ownerOfMoveIndex(i) === player) {
            count += 1;
        }
    }
    return count;
}

// turn_window eligibility (Karl's two presets). P2's window is a fixed range of their own
// turn numbers (p2WindowStart..p2WindowEnd). P1's window only opens at all once P2 has placed
// theirs (p1RequiresP2Trigger), then runs for p1WindowDuration of P1's own turns counting from
// right after P2's placement.
function turnWindowEligible(game, config, player) {
    const { p2WindowStart, p2WindowEnd, p1WindowDuration, p1RequiresP2Trigger } = config.deadStones;
    const myTurnNumber = ownTurnsSoFar(game, player) + 1; // the turn about to be played, 1-indexed

    if (player === 2) {
        return myTurnNumber >= p2WindowStart && myTurnNumber <= p2WindowEnd;
    }

    // player === 1
    if (!p1RequiresP2Trigger) {
        // No current preset reaches this (both Karl configs set p1RequiresP2Trigger: true) --
        // fail closed rather than guess a window with no config fields to define it.
        return false;
    }
    const p2Placements = deadStonePlacementIndices(game, 2);
    if (p2Placements.length === 0) {
        return false; // P2 hasn't triggered P1's right yet
    }
    const triggerIndex = p2Placements[0];
    let p1TurnsBeforeTrigger = 0;
    for (let i = 0; i < triggerIndex; i++) {
        if (ownerOfMoveIndex(i) === 1) {
            p1TurnsBeforeTrigger += 1;
        }
    }
    const windowStart = p1TurnsBeforeTrigger + 1;
    const windowEnd = p1TurnsBeforeTrigger + p1WindowDuration;
    return myTurnNumber >= windowStart && myTurnNumber <= windowEnd;
}

// on_capture eligibility (Noah's four presets). Unlike 'anytime'/'turn_window', this is
// necessarily checked AFTER the triggering move already happened -- the capturing move itself
// had to be played (via the normal addMove()) before anyone can know it captured anything,
// which already pushed onto moves[] and flipped currentPlayer() to the opponent. So this
// trigger does NOT check currentPlayer() at all: `player` is eligible if the single most
// recently played move (moves.length - 1) belongs to them AND captured something AND they
// haven't already placed their reactive dead stone for that specific move.
function onCaptureEligible(game, config, player) {
    if (game.moves.length === 0) {
        return false;
    }
    const lastIndex = game.moves.length - 1;
    if (ownerOfMoveIndex(lastIndex) !== player) {
        return false;
    }
    if (!game.lastCaptureVacancies || game.lastCaptureVacancies.length === 0) {
        return false;
    }
    if (game.deadStoneAttachments.has(lastIndex)) {
        return false; // already used the reactive window for this capture
    }
    return true;
}

// Trigger/window/count eligibility for `player`, independent of which cell they'd place on.
// Split out from canPlaceDeadStoneNow so callers that don't have a specific cell yet (e.g. "is
// the place-dead-stone button even worth showing", or the AI deciding whether to look for a
// cell at all) don't need to invent one just to ask.
export function isDeadStoneTurnEligible(game, config, player) {
    if (!config || !config.deadStones) {
        return false;
    }
    if (remainingDeadStones(game, config, player) <= 0) {
        return false;
    }
    switch (config.deadStones.trigger) {
        case 'anytime':
            return game.currentPlayer() === player;
        case 'turn_window':
            return game.currentPlayer() === player && turnWindowEligible(game, config, player);
        case 'on_capture':
            return onCaptureEligible(game, config, player);
        default:
            return false;
    }
}

// Whether `player` may place a dead stone at (x, y) right now: turn eligibility, the cell must
// be empty, and -- for placementLocation: 'vacated_capture_space' (every on_capture config) --
// (x, y) must actually be one of the cells the triggering capture vacated, not just any empty
// cell.
export function canPlaceDeadStoneNow(game, config, player, x, y) {
    if (!isDeadStoneTurnEligible(game, config, player)) {
        return false;
    }
    if (!game.canPlaceDeadStone(x, y)) {
        return false;
    }
    if (config.deadStones.placementLocation === 'vacated_capture_space') {
        return game.lastCaptureVacancies.some(([vx, vy]) => vx === x && vy === y);
    }
    return true;
}
