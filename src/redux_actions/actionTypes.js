export const START_GAME = 'START_GAME';
export const RESET_BOARD = 'RESET_BOARD';
export const ADD_MOVE = 'ADD_MOVE';
export const STORE_MOVE = 'STORE_MOVE';
export const MOVE_FORWARD = 'MOVE_FORWARD';
export const MOVE_BACK = 'MOVE_BACK';
export const MOVE_GOTO = 'MOVE_GOTO';
export const REMOVE_SNACK = 'REMOVE_SNACK';
export const START_THINKING = 'START_THINKING';
export const STOP_THINKING = 'STOP_THINKING';
export const LOAD_WASM = 'LOAD_WASM';
export const CHANGE_GAME = 'CHANGE_GAME';
export const CHANGE_LEVEL = 'CHANGE_LEVEL';
export const UNDO_MOVE = 'UNDO_MOVE';
export const CHANGE_COLOR = 'CHANGE_COLOR';
export const SUBSCRIBER = 'SUBSCRIBER';
export const OPENING_BOOK = 'OPENING_BOOK';

// Dead-Pente (docs/dead-pente-spec.md, Phase 2).
export const SELECT_DEAD_PENTE_CONFIG = 'SELECT_DEAD_PENTE_CONFIG';
export const TOGGLE_DEAD_STONE_MODE = 'TOGGLE_DEAD_STONE_MODE';
export const PLACE_DEAD_STONE = 'PLACE_DEAD_STONE';

// Dead-Pente, on_capture trigger (Phase 4, Noah's four presets). Distinct from PLACE_DEAD_STONE
// so the saga can `take` specifically a human's reactive placement without also catching the
// AI's own self-dispatched PLACE_DEAD_STONE calls (Karl's turn_window and this trigger's own
// AI-capture path both dispatch plain PLACE_DEAD_STONE). The reducer handles this action
// identically to PLACE_DEAD_STONE.
export const RESOLVE_CAPTURE_DEAD_STONE = 'RESOLVE_CAPTURE_DEAD_STONE';
export const DECLINE_DEAD_STONE_WINDOW = 'DECLINE_DEAD_STONE_WINDOW';

// Local two-player mode (e.g. Corpse-Pente): disables the AI call in sagas.js so both
// colors are played by humans at this screen, same spirit as Dead-Pente's allowAi: false
// but as a plain toggle rather than a config field, since it isn't tied to any one variant.
export const TOGGLE_PVP_MODE = 'TOGGLE_PVP_MODE';

