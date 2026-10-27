import React, { useState } from 'react';
import { connect } from 'react-redux';
import { START_GAME, CHANGE_GAME, CHANGE_LEVEL,
    UNDO_MOVE, CHANGE_COLOR, OPENING_BOOK,
    SELECT_DEAD_PENTE_CONFIG, TOGGLE_DEAD_STONE_MODE,
    DECLINE_DEAD_STONE_WINDOW, TOGGLE_PVP_MODE } from "../redux_actions/actionTypes";
import { remainingDeadStones, isDeadStoneTurnEligible } from "../Classes/DeadPenteRules";
import { DEAD_PENTE_CONFIGS } from "../Classes/DeadPenteConfigs";

// Every trigger type is implemented as of Phase 4 (docs/dead-pente-spec.md).
const AVAILABLE_DEAD_PENTE_CONFIGS = Object.values(DEAD_PENTE_CONFIGS);
import Grid from '@mui/material/Grid';
import ListItem from '@mui/material/ListItem';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Captures from './Captures';
import { withStyles } from '@mui/styles';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import MovesListPanel from './MovesListPanel';
import DeadPenteRulesModal from './DeadPenteRulesModal';
import CorpsePenteRulesModal from './CorpsePenteRulesModal';
import CorpsePenteV2RulesModal from './CorpsePenteV2RulesModal';

const styles = theme => ({
    root: {
        flexGrow: 1,
    },
    paper: {
        textAlign: 'center',
    },
});

const mapStateToProps = state => {
    return {
        pressed_play: state.pressed_play,
        game: state.game,
        level: state.level,
        color: state.game.me,
        use_book: state.opening_book,
        thinking: state.thinking,
        deadPenteConfig: state.deadPenteConfig,
        placingDeadStone: state.placingDeadStone,
        pvpMode: state.pvpMode
    }
};

const mapDispatchToProps = dispatch => {
    return {
        play_pressed: () => {
            dispatch({ type: START_GAME })
        },
        change_game: (event) => {
            dispatch({ type: CHANGE_GAME, payload: event.target.value })
        },
        change_level: (event) => {
            dispatch({ type: CHANGE_LEVEL, payload: event.target.value })
        },
        undo_move: () => {
            dispatch({ type: UNDO_MOVE })
        },
        change_color: () => {
            dispatch({ type: CHANGE_COLOR })
        },
        toggle_openingbook: () => {
            dispatch({ type: OPENING_BOOK })
        },
        select_dead_pente: (configId) => {
            dispatch({ type: SELECT_DEAD_PENTE_CONFIG, payload: configId })
        },
        toggle_dead_stone_mode: () => {
            dispatch({ type: TOGGLE_DEAD_STONE_MODE })
        },
        decline_dead_stone_window: () => {
            dispatch({ type: DECLINE_DEAD_STONE_WINDOW })
        },
        toggle_pvp_mode: () => {
            dispatch({ type: TOGGLE_PVP_MODE })
        },
    }
};





const UnconnectedGameInfoPanel = (props) => {
    const { game, play_pressed, change_game, change_level,
        level, undo_move, change_color, color,
        toggle_openingbook, use_book, thinking,
        deadPenteConfig, placingDeadStone, select_dead_pente, toggle_dead_stone_mode,
        decline_dead_stone_window, pvpMode, toggle_pvp_mode } = props;

    const [rulesOpen, setRulesOpen] = useState(false);
    const [corpseRulesOpen, setCorpseRulesOpen] = useState(false);
    const [corpseV2RulesOpen, setCorpseV2RulesOpen] = useState(false);

    // Dead-Pente, on_capture trigger (Phase 4): the human's own capturing move left them a
    // pending reactive placement. `color` is the human's seat ('white'/'black'); game.me tracks
    // the same thing, used here (not currentPlayer(), which has already flipped) per the same
    // reasoning as Board.js and the saga.
    const humanColor = color === 'white' ? 1 : 2;
    const pendingCaptureReaction = deadPenteConfig &&
        deadPenteConfig.deadStones.trigger === 'on_capture' &&
        isDeadStoneTurnEligible(game, deadPenteConfig, humanColor);

    return (
        <div style={{width: '100%', height: '100%'}}>
            <Grid container direction={'column'} alignItems={'stretch'} wrap={'nowrap'} 
                  style={{width: '100%', height: '100%'}}>
                <Grid item>
                    <Paper style={{textAlign: 'center'}}>
                        <Typography variant="h3" color={thinking?'error':'textPrimary'}>
                            {game.game_name()}
                        </Typography>
                    </Paper>
                    <hr/>
                </Grid>
                {game.gameHasCaptures() &&
                <Grid item>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'wrap'} spacing={1}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs style={{paddingLeft: 10}}>
                            <Typography variant='h4'>
                                Captures:
                            </Typography>
                        </Grid>
                        <Grid item xs>
                            <Captures seat={1}/>
                        </Grid>
                        <Grid item xs>
                            <Captures seat={2}/>
                        </Grid>
                    </Grid>
                </Grid>
                }
                <Grid item>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'wrap'} spacing={1}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="primary" onClick={play_pressed} className={'button-glow'}>
                                    play
                                </Button>
                            </div>
                        </Grid>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <ListItem key='game' >
                                    <Select
                                        onChange={change_level}
                                        value={level}
                                        input={
                                            <OutlinedInput
                                                // labelWidth={0}
                                                name="game"
                                                id="outlined-age-simple"
                                            />
                                        }
                                    >
                                        {/*{[1,3,5,7,9,11,13,15,17,19,21,23].map(game =>*/}
                                        {/*<MenuItem key={game} value={game}>{table.game_name(game)}</MenuItem>*/}
                                        {/*)}*/}
                                        {Array.from({length: 12}, (v, i) => i+1).map(lvl =>
                                            <MenuItem key={lvl} value={lvl}>Level {lvl}</MenuItem>
                                        )}
                                    </Select>
                                </ListItem>
                            </div>
                        </Grid>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="primary" onClick={undo_move}
                                        disabled={pendingCaptureReaction}>
                                    Undo
                                </Button>
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'wrap'} spacing={1}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <ListItem key='variant'>
                                    <Select
                                        onChange={change_game}
                                        value={game.game}
                                        input={
                                            <OutlinedInput
                                                name="variant"
                                                id="outlined-variant-simple"
                                            />
                                        }
                                    >
                                        {[1, 3, 11, 13, 15, 25, 27, 29].map(g =>
                                            <MenuItem key={g} value={g}>{game.game_name(g)}</MenuItem>
                                        )}
                                    </Select>
                                </ListItem>
                            </div>
                        </Grid>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="primary" onClick={change_color}>
                                    play as {color}
                                </Button>
                            </div>
                        </Grid>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="primary" onClick={toggle_openingbook}>
                                    {use_book === 1?'use':'no'} opening book
                                </Button>
                            </div>
                        </Grid>
                        {(game.game === 27 || game.game === 29) &&
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color={pvpMode ? 'error' : 'primary'} onClick={toggle_pvp_mode}>
                                    {pvpMode ? 'two-player mode (on)' : 'two-player mode (off)'}
                                </Button>
                            </div>
                        </Grid>
                        }
                        {game.game === 27 &&
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="secondary" onClick={() => setCorpseRulesOpen(true)}>
                                    corpse-pente rules
                                </Button>
                            </div>
                        </Grid>
                        }
                        {game.game === 29 &&
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="secondary" onClick={() => setCorpseV2RulesOpen(true)}>
                                    corpse-pente v2 rules
                                </Button>
                            </div>
                        </Grid>
                        }
                    </Grid>
                </Grid>
                <Grid item>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'wrap'} spacing={1}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <ListItem key='dead-pente-mode'>
                                    <Select
                                        onChange={(e) => select_dead_pente(e.target.value || null)}
                                        value={deadPenteConfig ? deadPenteConfig.gameModeId : ''}
                                        style={{minWidth: 140}}
                                        displayEmpty
                                        input={
                                            <OutlinedInput
                                                name="dead-pente-mode"
                                                id="outlined-dead-pente-mode"
                                            />
                                        }
                                    >
                                        <MenuItem value=''>-- normal play --</MenuItem>
                                        {AVAILABLE_DEAD_PENTE_CONFIGS.map(cfg =>
                                            <MenuItem key={cfg.gameModeId} value={cfg.gameModeId}>{cfg.displayName}</MenuItem>
                                        )}
                                    </Select>
                                </ListItem>
                            </div>
                        </Grid>
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="secondary" onClick={() => setRulesOpen(true)}>
                                    dead-pente rules
                                </Button>
                            </div>
                        </Grid>
                        {deadPenteConfig && deadPenteConfig.deadStones.trigger !== 'on_capture' &&
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color={placingDeadStone ? 'error' : 'primary'}
                                        onClick={toggle_dead_stone_mode}>
                                    {placingDeadStone ? 'placing dead stone (click board)' : 'place dead stone'}
                                </Button>
                            </div>
                        </Grid>
                        }
                        {deadPenteConfig &&
                        <Grid item xs>
                            <Typography variant='body1' style={{textAlign: 'center'}}>
                                dead stones left -- white: {remainingDeadStones(game, deadPenteConfig, 1)},
                                black: {remainingDeadStones(game, deadPenteConfig, 2)}
                            </Typography>
                        </Grid>
                        }
                    </Grid>
                </Grid>
                {pendingCaptureReaction &&
                <Grid item>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'wrap'} spacing={1}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <Typography variant='body1' color='error' style={{textAlign: 'center'}}>
                                capture! place your dead stone at: {game.lastCaptureVacancies
                                    .map(([vx, vy]) => game.getMoveCoord(vy * game.gridSize + vx))
                                    .join(' or ')}
                                {deadPenteConfig.deadStones.mandatory ? ' (required)' : ''}
                            </Typography>
                        </Grid>
                        {!deadPenteConfig.deadStones.mandatory &&
                        <Grid item xs>
                            <div style={{display: 'table', margin: '0 auto'}}>
                                <Button variant="outlined" color="secondary" onClick={decline_dead_stone_window}>
                                    skip
                                </Button>
                            </div>
                        </Grid>
                        }
                    </Grid>
                </Grid>
                }
                <Grid item style={{flex: '1 1 auto', minHeight: '0px'}}>
                    <MovesListPanel />
                </Grid>
            </Grid>
            <DeadPenteRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)}
                                  activeId={deadPenteConfig ? deadPenteConfig.gameModeId : null}/>
            <CorpsePenteRulesModal open={corpseRulesOpen} onClose={() => setCorpseRulesOpen(false)}/>
            <CorpsePenteV2RulesModal open={corpseV2RulesOpen} onClose={() => setCorpseV2RulesOpen(false)}/>
        </div>
    );
};


const GameInfoPanel = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedGameInfoPanel))

export default GameInfoPanel;