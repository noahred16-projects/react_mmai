import '../redux_actions/actionTypes';
import {
    START_GAME, MOVE_BACK, MOVE_FORWARD, MOVE_GOTO,
    REMOVE_SNACK, STORE_MOVE, ADD_MOVE, RESET_BOARD,
    START_THINKING, STOP_THINKING, LOAD_WASM, CHANGE_GAME,
    CHANGE_LEVEL, UNDO_MOVE, CHANGE_COLOR, SUBSCRIBER,
    OPENING_BOOK, SELECT_DEAD_PENTE_CONFIG, TOGGLE_DEAD_STONE_MODE,
    PLACE_DEAD_STONE, RESOLVE_CAPTURE_DEAD_STONE
} from "../redux_actions/actionTypes";
import { Game } from '../Classes/GameClass';
import { DEAD_PENTE_CONFIGS } from '../Classes/DeadPenteConfigs';
import { canPlaceDeadStoneNow, ownerOfMoveIndex } from '../Classes/DeadPenteRules';

const initialState = {
    subscriber: true,
    game: new Game(),
    started: false,
    thinking: false,
    level: 1,
    opening_book: 1,
    // Dead-Pente (docs/dead-pente-spec.md): null outside a Dead-Pente mode, so every other
    // variant's reducer/saga behavior is completely untouched by the fields below.
    deadPenteConfig: null,
    placingDeadStone: false
};

// async function loadWasm(state) {
//     // const response = await fetch('http://localhost:8080/MMAIWASM/ai.wasm');
//     // const buffer = await response.arrayBuffer();
//     // const obj = await WebAssembly.instantiate(buffer);    // const wasmImport = await import('../wasm/ai.js');
//     // state.wsm = obj;
//     const { instance } = await WebAssembly.instantiateStreaming(fetch('http://localhost:8080/MMAIWASM/ai.wasm'));
//     state.wasm = instance;
// }

function mmaiApp (state = initialState, action) {
    let newState = { ...state };
    let newGame;
    // console.log(JSON.stringify(action))
    switch(action.type) {
        // case LOAD_WASM:
        //     loadWasm(newState);
        //     break;
        case OPENING_BOOK:
            newState.opening_book = 1 - state.opening_book;
            break;
        case SUBSCRIBER:
            newState.subscriber = action.payload;
            break;
        case CHANGE_COLOR:
            newGame = newState.game.newInstance();
            newGame.reset();
            if (newGame.me === 'white') {
                newGame.me = 'black';
            } else {
                newGame.me = 'white';
            }
            newState.game = newGame;
            newState.started = false;
            newState.snack = undefined;
            break;
        case CHANGE_LEVEL:
            newState.level = parseInt(action.payload);
            break;
        case UNDO_MOVE:
            if (newState.started) {
                newGame = newState.game.newInstance();
                // In a no-AI Dead-Pente mode (e.g. dead-pente-ned-open) both colors are
                // played locally by humans, so "pop until it's my turn" (undoMyTurn, built
                // for popping through the AI's reply) isn't the right semantics -- a single
                // ply back is.
                if (newState.deadPenteConfig && newState.deadPenteConfig.deadStones.allowAi === false) {
                    newGame.undoMove();
                } else {
                    newGame.undoMyTurn();
                }
                newState.game = newGame;
            }
            break;
        case CHANGE_GAME:
            newGame = newState.game.newInstance();
            newGame.reset();
            // payload is the canonical variant id (1, 3, 11, 15, 25). Mirrors the
            // old toggle's reset/start-new-game flow, just parameterised by the id.
            newGame.setGame(parseInt(action.payload));
            newState.game = newGame;
            newState.started = false;
            newState.snack = undefined;
            // Switching variant via the main dropdown always exits any active Dead-Pente mode.
            newState.deadPenteConfig = null;
            newState.placingDeadStone = false;
            break;
        case SELECT_DEAD_PENTE_CONFIG:
            newGame = newState.game.newInstance();
            newGame.reset();
            newGame.setGame(1); // every current Dead-Pente preset layers on plain Pente
            newState.game = newGame;
            newState.deadPenteConfig = action.payload ? DEAD_PENTE_CONFIGS[action.payload] : null;
            newState.placingDeadStone = false;
            newState.started = false;
            newState.snack = undefined;
            break;
        case TOGGLE_DEAD_STONE_MODE:
            newState.placingDeadStone = !state.placingDeadStone;
            break;
        case PLACE_DEAD_STONE:
        case RESOLVE_CAPTURE_DEAD_STONE:
            if (newState.deadPenteConfig && newState.started) {
                const move = parseInt(action.payload);
                const x = move % newState.game.gridSize, y = Math.floor(move / newState.game.gridSize);
                const trigger = newState.deadPenteConfig.deadStones.trigger;
                // on_capture (Phase 4): the triggering move already happened and currentPlayer()
                // has already flipped to the opponent, so the relevant player is whoever owns
                // the most recently played move, not currentPlayer(). Every other trigger still
                // uses currentPlayer() (it's that player's own turn, not a reaction to one just past).
                const player = trigger === 'on_capture'
                    ? ownerOfMoveIndex(newState.game.moves.length - 1)
                    : newState.game.currentPlayer();
                if (canPlaceDeadStoneNow(newState.game, newState.deadPenteConfig, player, x, y)) {
                    newGame = newState.game.newInstance();
                    // actionCost 'additional': attach without consuming its own turn slot.
                    // Karl (turn_window): attaches to the UPCOMING move (default atIndex) --
                    // the dead stone comes before the accompanying normal move.
                    // Noah (on_capture): attaches to the move that JUST captured (moves.length - 1)
                    // -- there is no "upcoming" move, the reaction follows the real move.
                    // 'replacement' (ned-open, karl-turn): the dead stone IS the whole turn.
                    if (newState.deadPenteConfig.deadStones.actionCost === 'additional') {
                        if (trigger === 'on_capture') {
                            newGame.attachDeadStone(move, newGame.moves.length - 1);
                        } else {
                            newGame.attachDeadStone(move);
                        }
                    } else {
                        newGame.addDeadStoneMove(move);
                    }
                    newState.game = newGame;
                    newState.placingDeadStone = false;
                    if (newGame.isGameOver()) {
                        newState.started = false;
                        if ((newGame.me === 'white' && newGame.winner === 1) || (newGame.me === 'black' && newGame.winner === 2)) {
                            newState.snack = 1;
                        } else {
                            newState.snack = 0;
                        }
                    }
                }
            }
            break;
        case RESET_BOARD:
            newGame = newState.game.newInstance();
            newGame.reset();
            newState.game = newGame;
            newState.started = true;
            newState.snack = undefined;
            break;
        case STORE_MOVE:
            newGame = newState.game.newInstance();
            newGame.addMove(action.payload);
            newState.game = newGame;
            if (newGame.isGameOver()) {
                newState.started = false;
                if ((newGame.me === 'white' && newGame.winner === 1) || (newGame.me === 'black' && newGame.winner === 2)) {
                    newState.snack = 1;
                } else {
                    newState.snack = 0;
                }
            }
            break;
        case START_THINKING:
            newState.thinking = true;
            break;
        case STOP_THINKING:
            newState.thinking = false;
            break;
        case MOVE_BACK:
            // moveForwardBack(false, newState);
            break;
        case MOVE_FORWARD:
            // moveForwardBack(true, newState);
            break;
        case MOVE_GOTO:
            // moveGoTo(action.payload, newState);
            break;
        case REMOVE_SNACK:
            delete newState.snack;
            break;
        default: break;
    }
    return newState;
}

export default mmaiApp;