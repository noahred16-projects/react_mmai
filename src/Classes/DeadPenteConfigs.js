// Dead-Pente config catalogue (docs/dead-pente-spec.md section 4). Source of truth for the
// 7 named presets; the markdown doc should stay in sync with this file, not the other way
// round. Each config layers purely on top of plain Pente (baseRules.proPente === true) via
// the Dead Stones Rule Middleware (DeadPenteRules.js) -- nothing here touches GameClass.js's
// per-variant dispatch.

/** @typedef {'turn_window' | 'on_capture' | 'anytime'} TriggerType */
/** @typedef {'additional' | 'replacement'} ActionCost */

/**
 * @typedef {Object} DeadStonesConfig
 * @property {string} gameModeId
 * @property {string} displayName
 * @property {string} description Plain-English rules summary shown in the in-app rules modal.
 * @property {{boardSize: number, proPente: boolean, deadStoneColor: string}} baseRules
 * @property {{
 *   trigger: TriggerType,
 *   actionCost: ActionCost,
 *   maxPerPlayer: number | null,
 *   mandatory?: boolean,
 *   placementLocation?: 'any_open' | 'vacated_capture_space',
 *   p2WindowStart?: number,
 *   p2WindowEnd?: number,
 *   p1WindowDuration?: number,
 *   p1RequiresP2Trigger?: boolean,
 *   allowAi?: boolean,
 * }} deadStones
 */

/** @type {Record<string, DeadStonesConfig>} */
export const DEAD_PENTE_CONFIGS = {
    'dead-pente-karl-extra': {
        gameModeId: 'dead-pente-karl-extra',
        displayName: "Karl's Window (Extra Action)",
        description: "Standard Pente, except: starting with your 4th move and lasting through " +
            "your 6th, you get a one-time option to also place a dead stone anywhere on the " +
            "board -- in addition to your normal move, so it costs you no tempo. If you use it, " +
            "your opponent then gets the same one-time option for the next 3 of their own " +
            "moves. If you let your window pass without using it, it's gone for the rest of the " +
            "game, and your opponent never gets theirs either.",
        baseRules: { boardSize: 19, proPente: true, deadStoneColor: 'red' },
        deadStones: {
            trigger: 'turn_window',
            actionCost: 'additional',
            maxPerPlayer: 1,
            placementLocation: 'any_open',
            p2WindowStart: 4,
            p2WindowEnd: 6,
            p1WindowDuration: 3,
            p1RequiresP2Trigger: true,
            allowAi: true,
        },
    },
    'dead-pente-karl-turn': {
        gameModeId: 'dead-pente-karl-turn',
        displayName: "Karl's Window (Turn Replacement)",
        description: "The same timed window as Karl's Window (Extra Action) -- your 4th-6th " +
            "move, then your opponent's next 3 moves if you use it -- except placing the dead " +
            "stone uses up your WHOLE turn instead of being free. Using the window means " +
            "skipping a normal move that turn, so it's a real tempo cost, not just a bonus.",
        baseRules: { boardSize: 19, proPente: true, deadStoneColor: 'red' },
        deadStones: {
            trigger: 'turn_window',
            actionCost: 'replacement',
            maxPerPlayer: 1,
            placementLocation: 'any_open',
            p2WindowStart: 4,
            p2WindowEnd: 6,
            p1WindowDuration: 3,
            p1RequiresP2Trigger: true,
            allowAi: true,
        },
    },
    'dead-pente-noah-limited-optional': {
        gameModeId: 'dead-pente-noah-limited-optional',
        displayName: "Noah's Capture (1-Use, Optional)",
        description: "Standard Pente, except: the first time you capture a pair, you may " +
            "(but don't have to) immediately place a dead stone into one of the intersections " +
            "the capture just emptied -- permanently denying your opponent the chance to " +
            "replay there. It costs no tempo (your normal move for that turn is unaffected), " +
            "but you only ever get this choice once, on your first capture.",
        baseRules: { boardSize: 19, proPente: true, deadStoneColor: 'red' },
        deadStones: {
            trigger: 'on_capture',
            actionCost: 'additional',
            placementLocation: 'vacated_capture_space',
            maxPerPlayer: 1,
            mandatory: false,
            allowAi: true,
        },
    },
    'dead-pente-noah-limited-mandatory': {
        gameModeId: 'dead-pente-noah-limited-mandatory',
        displayName: "Noah's Capture (1-Use, Mandatory)",
        description: "Same as Noah's Capture (1-Use, Optional), except the first time you " +
            "capture a pair, you MUST place a dead stone into one of the vacated " +
            "intersections before play can continue -- there's no declining it. After that " +
            "one forced placement, every later capture is a normal, free capture again.",
        baseRules: { boardSize: 19, proPente: true, deadStoneColor: 'red' },
        deadStones: {
            trigger: 'on_capture',
            actionCost: 'additional',
            placementLocation: 'vacated_capture_space',
            maxPerPlayer: 1,
            mandatory: true,
            allowAi: true,
        },
    },
    'dead-pente-noah-unlimited-optional': {
        gameModeId: 'dead-pente-noah-unlimited-optional',
        displayName: "Noah's Capture (Unlimited, Optional)",
        description: "Same idea as Noah's Capture (1-Use, Optional) -- every capture gives " +
            "you the choice to wall off one of the vacated intersections -- except this " +
            "choice isn't limited to your first capture. It's offered again every single " +
            "time you capture a pair, for the rest of the game, and you can always decline.",
        baseRules: { boardSize: 19, proPente: true, deadStoneColor: 'red' },
        deadStones: {
            trigger: 'on_capture',
            actionCost: 'additional',
            placementLocation: 'vacated_capture_space',
            maxPerPlayer: null,
            mandatory: false,
            allowAi: true,
        },
    },
    'dead-pente-noah-unlimited-mandatory': {
        gameModeId: 'dead-pente-noah-unlimited-mandatory',
        displayName: "Noah's Capture (Unlimited, Mandatory)",
        description: "The sharpest variant: EVERY capture you ever make, for the whole game, " +
            "forces you to immediately wall off one of the vacated intersections before play " +
            "continues -- no declining, no limit. Capturing stops being free: you have to " +
            "weigh whether the forced wall is worth the capture before you go looking for one.",
        baseRules: { boardSize: 19, proPente: true, deadStoneColor: 'red' },
        deadStones: {
            trigger: 'on_capture',
            actionCost: 'additional',
            placementLocation: 'vacated_capture_space',
            maxPerPlayer: null,
            mandatory: true,
            allowAi: true,
        },
    },
    'dead-pente-ned-open': {
        gameModeId: 'dead-pente-ned-open',
        displayName: "Ned's Open Placement (PvP)",
        description: "The simplest variant. Each player gets one dead stone they can place on " +
            "any empty intersection, at any point in the game, whenever they choose. Placing " +
            "it uses your whole turn (no normal move that turn). No computer opponent in this " +
            "mode -- it's local pass-and-play, so bring a second player to this screen.",
        baseRules: { boardSize: 19, proPente: true, deadStoneColor: 'red' },
        deadStones: {
            trigger: 'anytime',
            actionCost: 'replacement',
            placementLocation: 'any_open',
            maxPerPlayer: 1,
            allowAi: false,
        },
    },
};
