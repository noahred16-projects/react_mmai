// Dead-Pente AI dead-stone policy (docs/dead-pente-spec.md, Phase 3). There is no policy
// field in the DeadStonesConfig schema -- this is a single hardcoded heuristic for an
// AI-controlled seat (allowAi: true, e.g. Karl's two presets) to use when its turn_window is
// open, not a tunable option. Replace/parameterize once there's real spec behind an AI policy.
//
// Heuristic: block the opponent's longest existing run by placing on one of its open ends;
// if no opponent run has a placeable open end (including an empty board), fall back to the
// empty cell nearest the board center. Deliberately simple -- it has no idea whether blocking
// is even strategically relevant to the current position, matching the "basic AI" scope this
// whole mode was built under (docs/dead-pente-spec.md section 2: the engine itself has no
// concept of dead stones either).
//
// nearestLegalCell is also the fix for that same engine blind spot cutting the other way: the
// WASM engine's move array never includes dead stones (docs/dead-pente-spec.md section 2), so
// its own move search can legally -- from its perspective -- land a normal move on a cell that
// is actually a dead stone. sagas.js nudges any such collision to the nearest real empty cell
// before dispatching it, rather than silently overwriting the dead stone.

const AXES = [[1, 0], [0, 1], [1, 1], [1, -1]];

// The empty cell nearest (tx, ty), or (tx, ty) itself if it's already empty. "Empty" reuses
// canPlaceDeadStone's strict-emptiness check (=== 0) -- it's the same legality a normal stone
// placement needs too, not anything dead-stone-specific. Returns null only if the board is
// entirely full.
export function nearestLegalCell(game, tx, ty) {
    if (game.canPlaceDeadStone(tx, ty)) {
        return [tx, ty];
    }
    const N = game.gridSize;
    let best = null, bestDist = Infinity;
    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            if (!game.canPlaceDeadStone(x, y)) {
                continue;
            }
            const d = (x - tx) ** 2 + (y - ty) ** 2;
            if (d < bestDist) {
                bestDist = d;
                best = [x, y];
            }
        }
    }
    return best;
}

export function chooseAiDeadStoneCell(game, aiPlayer) {
    const opponent = 3 - aiPlayer;
    const N = game.gridSize;
    const onBoard = (x, y) => x >= 0 && x < N && y >= 0 && y < N;

    let best = null; // { length, cell: [x, y] }
    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            if (game.abstractBoard[x][y] !== opponent) {
                continue;
            }
            for (const [dx, dy] of AXES) {
                // Only score a run from its first stone on this axis (the cell one step
                // back isn't the opponent's color), so each run is scored exactly once.
                const px = x - dx, py = y - dy;
                if (onBoard(px, py) && game.abstractBoard[px][py] === opponent) {
                    continue;
                }
                let len = 0, cx = x, cy = y;
                while (onBoard(cx, cy) && game.abstractBoard[cx][cy] === opponent) {
                    len += 1;
                    cx += dx; cy += dy;
                }
                // cx,cy is the cell just past the run's far end; px,py is just before its near end.
                const candidates = [];
                if (onBoard(px, py) && game.canPlaceDeadStone(px, py)) {
                    candidates.push([px, py]);
                }
                if (onBoard(cx, cy) && game.canPlaceDeadStone(cx, cy)) {
                    candidates.push([cx, cy]);
                }
                if (candidates.length > 0 && (!best || len > best.length)) {
                    best = { length: len, cell: candidates[0] };
                }
            }
        }
    }
    if (best) {
        return best.cell;
    }

    // Fallback: no blockable opponent run with an open end -- nearest empty cell to center.
    const center = (N - 1) / 2;
    return nearestLegalCell(game, center, center);
}

// Dead-Pente, on_capture trigger (Phase 4, Noah's four presets): which of the just-captured
// vacancies an AI-controlled seat places its reactive dead stone into. Same "no policy field
// in the schema" situation as chooseAiDeadStoneCell -- a single hardcoded, deliberately simple
// tie-break (nearest to board center), not a real evaluation of which vacancy matters more.
export function chooseAiVacancy(game, vacancies) {
    if (!vacancies || vacancies.length === 0) {
        return null;
    }
    const center = (game.gridSize - 1) / 2;
    let best = vacancies[0], bestDist = Infinity;
    for (const [x, y] of vacancies) {
        const d = (x - center) ** 2 + (y - center) ** 2;
        if (d < bestDist) {
            bestDist = d;
            best = [x, y];
        }
    }
    return best;
}
