import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const CorpsePenteRulesModal = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Corpse-Pente rules</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" paragraph>
                    Corpse-Pente is just like regular Pente, except for one twist: when you
                    capture a pair, the two captured stones aren't removed from the board --
                    they're replaced with two red "corpse" stones.
                </Typography>
                <Typography variant="body2" paragraph>
                    Corpse stones can't be used by either player to form a line of five -- they
                    block, the same as a wall. But they CAN be used to capture against: a corpse
                    stands in as a flank for either color. So a red corpse - black - black -
                    white pattern captures the black pair the moment white completes it, exactly
                    as if the corpse were another white stone.
                </Typography>
                <Typography variant="body2" paragraph>
                    Corpse stones can themselves be cleaned up. However they end up sandwiched --
                    even by one black and one white stone -- the two corpses are removed from the
                    board. That doesn't count as a capture for either player.
                </Typography>
                <Typography variant="body2">
                    Everything else is standard Pente: captures still win the game at 10.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default CorpsePenteRulesModal;
