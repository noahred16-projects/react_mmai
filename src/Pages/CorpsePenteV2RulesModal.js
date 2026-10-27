import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const CorpsePenteV2RulesModal = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Corpse-Pente v2 rules</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" paragraph>
                    Corpse-Pente v2 changes one thing from the original: a corpse can no longer
                    stand in as a flank. To capture, both slices of bread in the sandwich have to
                    be the same color -- your own color, exactly like regular Pente.
                </Typography>
                <Typography variant="body2" paragraph>
                    What's new is the middle. The two stones being sandwiched no longer have to
                    match each other. So black - red - white - black is a valid capture for
                    black, even though the two middle stones are different: one corpse, one
                    white.
                </Typography>
                <Typography variant="body2" paragraph>
                    Only real stones count toward your capture total -- the red ones don't. In
                    that example, black captures exactly one stone (the white one), not two. A
                    corpse caught in a sandwich like this is simply swept off the board for free.
                    Keep track in intervals of one, not always two.
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

export default CorpsePenteV2RulesModal;
