import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { DEAD_PENTE_CONFIGS } from '../Classes/DeadPenteConfigs';

const DEAD_STONE_INTRO = "A dead stone is a permanent, colorless wall placed on the board. " +
    "Nobody can ever place a normal stone there again, it can never be captured, and it blocks " +
    "a line of five from completing through it. Every variant below is standard Pente with one " +
    "extra rule layered on top: when and how each player gets to place dead stones.";

const DeadPenteRulesModal = ({ open, onClose, activeId }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Dead-Pente rules</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" style={{ marginBottom: 20 }}>
                    {DEAD_STONE_INTRO}
                </Typography>
                {Object.values(DEAD_PENTE_CONFIGS).map((cfg, i) => (
                    <div key={cfg.gameModeId}>
                        {i > 0 && <Divider style={{ margin: '12px 0' }} />}
                        <Typography variant="subtitle1"
                                    style={{
                                        fontWeight: 'bold',
                                        color: cfg.gameModeId === activeId ? '#1976d2' : undefined,
                                    }}>
                            {cfg.displayName}{cfg.gameModeId === activeId ? ' (current)' : ''}
                        </Typography>
                        <Typography variant="body2">
                            {cfg.description}
                        </Typography>
                    </div>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeadPenteRulesModal;
