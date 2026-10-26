import React, {useState, useEffect, useRef} from 'react';
import {connect} from 'react-redux';
import Board from '../Board/Board';
import Grid from '@mui/material/Grid';
// import AdSense from 'react-adsense';
import Snack from './Snack';
import GameInfoPanel from "./GameInfoPanel";

const mapStateToProps = state => {
   return {
      subscriber: state.subscriber
      // subscriber: true
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch();
      },
   }
};


// Below this container width, board + panel side-by-side (sized off container HEIGHT, which
// assumes a wide desktop window) no longer fits -- stack the board above the panel instead,
// each sized off the container WIDTH.
const MOBILE_BREAKPOINT = 700;

const UnconnectedTable = (props) => {

   const {table, subscriber} = props;
   const [height, setHeight] = useState(0);
   const [width, setWidth] = useState(0);
   const ref = useRef(null);

   // eslint-disable-next-line
   useEffect(() => {
      const measure = () => {
         if (ref.current !== null) {
            setHeight(ref.current.clientHeight);
            setWidth(ref.current.clientWidth);
         }
      };
      measure();
      // The original effect (no deps, re-measuring on every render) only ever caught a resize
      // if something else happened to trigger a re-render at the same time. An explicit
      // listener is what actually makes this responsive to window resize / orientation change.
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
   });

   const stacked = width > 0 && (width < MOBILE_BREAKPOINT || width < height);
   const boardSize = stacked ? width : height;
   const panelWidth = stacked ? width : Math.min(600, width - height);

   return (
      <div ref={ref} style={{height: '100%', width: '100%', overflowY: stacked ? 'auto' : 'hidden'}}>

         <Grid container direction={'column'} alignItems={'center'} wrap={'nowrap'}
               style={{minHeight: '100%', width: '100%'}}>
            {/*{!subscriber &&*/}
            {/*   <Grid item style={{display: 'inline-block', width: '970px', height: '90px'}}>*/}
            {/*      <AdSense.Google*/}
            {/*         client='ca-pub-3326997956703582'*/}
            {/*         slot='3134525496'*/}
            {/*         style={{display: 'inline-block', width: '970px', height: '90px'}}*/}
            {/*         format=''*/}
            {/*      />*/}
            {/*   </Grid>*/}
            {/*}*/}
            <Grid item style={stacked ? {width: '100%'} : {flex: '1', minHeight: '0px'}}>
               <div style={stacked
                  ? {width: '100%'}
                  : {height: '100%', width: Math.min(width, height + 600)}}>
                  <Grid container direction={stacked ? 'column' : 'row'} alignItems={'stretch'} wrap={'nowrap'}
                        style={stacked ? {width: '100%'} : {height: '100%'}}>
                     <Grid item style={stacked ? {width: '100%'} : {height: '100%'}}>
                        <div style={{height: boardSize, width: boardSize, margin: stacked ? '0 auto' : undefined}}>
                           <Board/>
                        </div>
                     </Grid>
                     <Grid item style={stacked
                        ? {width: '100%'}
                        : {height: '100%', width: panelWidth}}>
                        <Grid container direction={'column'} alignItems={'stretch'} wrap={'nowrap'}
                              style={{height: stacked ? 'auto' : '100%', width: '100%'}}>
                           <Grid item style={{height: stacked ? 'auto' : '100%', borderWidth: '1px', borderStyle: 'solid'}}>
                              <div style={{width: '100%', height: stacked ? 'auto' : '100%', backgroundColor: '#fffff'}}>
                                 <GameInfoPanel/>
                              </div>
                           </Grid>
                        </Grid>
                     </Grid>
                  </Grid>

                  <Snack/>
               </div>
            </Grid>
         </Grid>
      </div>
   );
};

UnconnectedTable.propTypes = {};


const TableView = connect(mapStateToProps, mapDispatchToProps)(UnconnectedTable);

export default TableView;