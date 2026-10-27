import { call, put, takeEvery, all, select, delay, take, race } from 'redux-saga/effects'
import { ADD_MOVE, STORE_MOVE, RESET_BOARD,
        START_THINKING, STOP_THINKING, PLACE_DEAD_STONE,
        RESOLVE_CAPTURE_DEAD_STONE, DECLINE_DEAD_STONE_WINDOW } from '../redux_actions/actionTypes';
import { isDeadStoneTurnEligible, ownerOfMoveIndex } from '../Classes/DeadPenteRules';
import { chooseAiDeadStoneCell, chooseAiVacancy, nearestLegalCell } from '../Classes/DeadPenteAI';
import move_sound_file from '../sounds/move_sound.mp3';

const move_sound = new Audio(move_sound_file);

async function playSound(sound) {
    try {
        await sound.play();
    } catch(err) {
        if (process.env.NODE_ENV === 'development') {
            console.log('oops, no sound ', err);
        }
    }
}

function* addMove(action) {
    yield put({type: STORE_MOVE, payload: action.payload});
    yield delay(100);
    let game = yield select((state) => state.game);
    let deadPenteConfig = yield select((state) => state.deadPenteConfig);
    // Dead-Pente, on_capture trigger (Phase 4, Noah's four presets): the move just stored may
    // have captured, which makes its OWNER (not currentPlayer(), which already flipped to the
    // opponent the instant that move pushed onto moves[]) eligible for a reactive placement.
    // This runs before the normal "should the AI move" guard below, for two reasons: a human's
    // pending window must PAUSE the AI's reply (not race it), and an AI's own capture must
    // resolve its window immediately even though the guard below would otherwise return early
    // (it's now the human's turn next, so there's nothing else for the AI to do this call).
    if (deadPenteConfig && deadPenteConfig.deadStones.trigger === 'on_capture' && !game.isGameOver()) {
        const moverPlayer = ownerOfMoveIndex(game.moves.length - 1);
        if (isDeadStoneTurnEligible(game, deadPenteConfig, moverPlayer)) {
            const humanColor = game.me === 'white' ? 1 : 2;
            if (moverPlayer === humanColor) {
                // Human just captured -- block this saga call in place until they resolve it
                // (place in a vacancy, or for optional configs only, decline) rather than
                // letting the AI's reply race ahead of a decision the human hasn't made yet.
                if (deadPenteConfig.deadStones.mandatory) {
                    yield take(RESOLVE_CAPTURE_DEAD_STONE);
                } else {
                    yield race({
                        placed: take(RESOLVE_CAPTURE_DEAD_STONE),
                        declined: take(DECLINE_DEAD_STONE_WINDOW),
                    });
                }
                game = yield select((state) => state.game);
            } else {
                // AI just captured -- same "always uses it immediately" policy as the
                // turn_window heuristic below; no policy field in the schema to consult.
                const vac = chooseAiVacancy(game, game.lastCaptureVacancies);
                if (vac && game.canPlaceDeadStone(vac[0], vac[1])) {
                    const vacMove = vac[1] * game.gridSize + vac[0];
                    yield put({type: PLACE_DEAD_STONE, payload: vacMove});
                    yield call(playSound, move_sound);
                    yield delay(100);
                    game = yield select((state) => state.game);
                }
            }
        }
    }
    // Dead-Pente modes with allowAi: false (e.g. dead-pente-ned-open) are local pass-and-play
    // between two humans -- never invoke the WASM engine for "the other" color. Same for the
    // generic PvP toggle (Corpse-Pente's two-player mode).
    const pvpMode = yield select((state) => state.pvpMode);
    const aiDisabled = (deadPenteConfig && deadPenteConfig.deadStones.allowAi === false) || pvpMode;
    if (aiDisabled || game.isMyTurn() || game.isGameOver()) {
        return;
    }
    // Dead-Pente, turn_window (Phase 3, Karl's two presets): before its normal move, an
    // AI-controlled seat with an open window spends its dead stone first, via the single
    // hardcoded heuristic in DeadPenteAI.js -- the config schema has no AI policy field yet.
    if (deadPenteConfig && deadPenteConfig.deadStones.trigger === 'turn_window') {
        const aiPlayer = game.currentPlayer();
        if (isDeadStoneTurnEligible(game, deadPenteConfig, aiPlayer)) {
            const cell = chooseAiDeadStoneCell(game, aiPlayer);
            if (cell && game.canPlaceDeadStone(cell[0], cell[1])) {
                const move = cell[1] * game.gridSize + cell[0];
                yield put({type: PLACE_DEAD_STONE, payload: move});
                yield call(playSound, move_sound);
                yield delay(100);
                if (deadPenteConfig.deadStones.actionCost === 'replacement') {
                    return; // the dead stone WAS the AI's whole turn
                }
                game = yield select((state) => state.game); // re-fetch: board changed above
            }
        }
    }
    yield put({type: START_THINKING});
    yield delay(100);
    const Module = document.ai_module;
    const _arrayToHeap = function(typedArray){
        let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        let ptr = Module._malloc(numBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
        heapBytes.set(new Uint8Array(typedArray.buffer));
        return heapBytes;
    };
    let typedArray = new Int32Array(game.moves);
    let heapBytes = _arrayToHeap(typedArray);
    // Pass the canonical game id straight through. The WASM engine accepts
    // 1/3/11/15/25 (and legacy 2 = Keryo). ccall arg order matches
    // getAIMove(game, level, openingBook, moves*, numMoves) in MMAIWASM/mmai.cpp.
    let level = yield select((state) => state.level);
    let o = yield select((state) => state.opening_book);
    let move = Module.ccall('getAIMove', 'number',['number','number','number','number','number'], [game.game, level, o, heapBytes.byteOffset, typedArray.length]);
    yield Module._free(heapBytes.byteOffset);
    // Dead-Pente: the WASM engine's move array never includes dead stones (it has no concept
    // of them at all), so its search can legally -- from its own, blind, perspective -- land
    // on a cell that's actually a dead stone. addMove() doesn't legality-check (same as every
    // other variant), so left alone this would silently overwrite the dead stone. Nudge it to
    // the nearest real empty cell instead. Connect6 is unreachable here (Dead-Pente always
    // runs game 1), so this only ever needs to handle the single-move case.
    if (deadPenteConfig) {
        const mx = move % game.gridSize, my = Math.floor(move / game.gridSize);
        if (!game.canPlaceDeadStone(mx, my)) {
            const fixed = nearestLegalCell(game, mx, my);
            if (fixed) {
                move = fixed[1] * game.gridSize + fixed[0];
            }
        }
    }
    // Corpse-Pente: the JS referee (GameClass) and the WASM engine (Ai.cpp) implement the
    // corpse capture/cleanup rules independently -- same situation as every other variant
    // already has (the engine never shares board state with GameClass), just with more
    // mechanism to keep in lockstep. canPlaceDeadStone/nearestLegalCell are really just
    // "is this cell truly empty" / "nearest truly-empty cell" despite living in the
    // Dead-Pente files; reused here as a cheap defensive nudge in case the two
    // implementations ever drift, so a landed-on-a-corpse bug degrades to "AI played an
    // adjacent cell" instead of silently un-capturing a corpse with no cleanup credit.
    if (game.isCorpsePente()) {
        const mx = move % game.gridSize, my = Math.floor(move / game.gridSize);
        if (!game.canPlaceDeadStone(mx, my)) {
            const fixed = nearestLegalCell(game, mx, my);
            if (fixed) {
                move = fixed[1] * game.gridSize + fixed[0];
            }
        }
    }
    // Connect6 (game 13/14): the engine returns the AI's two stones packed in base
    // 362 -> packed = m1*362 + m2; m2 === 361 is the single-stone sentinel (only the
    // game's very first move). Decode and dispatch each stone as its own ADD_MOVE so
    // GameClass.addMove applies and win-checks them individually. Re-entrancy is safe:
    // both stones are dispatched (and STORE_MOVE-applied) before either nested addMove
    // saga clears its delay(100) and re-checks the turn -- by then GameClass
    // currentPlayer has flipped back to the human, so getAIMove is not re-entered.
    // Every other game returns a plain single move int -> the branch below is unchanged.
    if (game.isConnect6()) {
        const m1 = Math.floor(move / 362);
        const m2 = move % 362;
        yield put({type: ADD_MOVE, payload: m1});
        if (m2 !== 361) {
            yield put({type: ADD_MOVE, payload: m2});
        }
    } else {
        yield put({type: ADD_MOVE, payload: move});
    }
    yield call(playSound, move_sound);
    yield put({type: STOP_THINKING});
}
function* startGame(action) {
    yield put({type: RESET_BOARD});
    yield put({type: ADD_MOVE, payload: 180});
}



function* addMoveSaga() {
    yield takeEvery("ADD_MOVE", addMove)
}
function* startGameSaga() {
    yield takeEvery("START_GAME", startGame)
}

export default function* rootSaga() {
    yield all([
        addMoveSaga(),
        startGameSaga()
    ])
}