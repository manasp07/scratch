
import PropTypes from "prop-types";
import React, { useState,useRef,useEffect } from "react";
import classNames from "classnames";
import Box from "../box/box.jsx";
import DOMElementRenderer from "../../containers/dom-element-renderer.jsx";
import Loupe from "../loupe/loupe.jsx";
import MonitorList from "../../containers/monitor-list.jsx";
import TargetHighlight from "../../containers/target-highlight.jsx";
import GreenFlagOverlay from "../../containers/green-flag-overlay.jsx";
import Question from "../../containers/question.jsx";
import MicIndicator from "../mic-indicator/mic-indicator.jsx";
import { STAGE_DISPLAY_SIZES } from "../../lib/layout-constants.js";
import { getStageDimensions } from "../../lib/screen-utils.js";
import styles from "./stage.css";
import { Editor } from '@monaco-editor/react';
import Scratch3MotionBlocks from '../../../../scratch-vm/src/blocks/scratch3_motion.js'; // Your Scratch 3 block logic

// const CodeEditor = () => {
//     const [currentState, setCurrentState] = useState(() => {
//         const savedState = localStorage.getItem("currentState");
//         return savedState ? JSON.parse(savedState) : null;
//     });

//     return (
//         <div>
//             {console.log("CURR:",currentState)}
//             {currentState && (
//                 <div style={{ padding: '20px', backgroundColor: '#f0f0f0', overflow: 'auto', maxHeight: '400px' }}>
//                     <pre>
//                         {(() => {
//                             const blocks = Object.keys(currentState)[0];
//                             console.log("Blocks:", currentState[blocks]);
//                             return JSON.stringify(currentState[blocks].blocks, null, 2);
//                         })()}
//                     </pre>
//                 </div>
//             )}
//         </div>
//     );
// };

const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        const tick = () => {
            savedCallback.current();
        };
        if (delay !== null) {
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

const CodeEditor = () => {
    const dict = {
        motion_movesteps:`moveSteps (args, util) {
            const steps = Cast.toNumber(args.STEPS);
            const radians = MathUtil.degToRad(90 - util.target.direction);
            const dx = steps * Math.cos(radians);
            const dy = steps * Math.sin(radians);
            util.target.setXY(util.target.x + dx, util.target.y + dy);
        }`,
        motion_turnright:`turnRight (args, util) {
            const degrees = Cast.toNumber(args.DEGREES);
            util.target.setDirection(util.target.direction + degrees);
        }`,
        motion_gotoxy:`goToXY (args, util) {
            const x = Cast.toNumber(args.X);
            const y = Cast.toNumber(args.Y);
            util.target.setXY(x, y);
        }`,
        motion_turnleft:`turnLeft (args, util) {
            const degrees = Cast.toNumber(args.DEGREES);
            util.target.setDirection(util.target.direction - degrees);
        }`,
        motion_goto:` goTo (args, util) {
            const targetXY = this.getTargetXY(args.TO, util);
            if (targetXY) {
                util.target.setXY(targetXY[0], targetXY[1]);
            }
        }`,
        motion_pointindirection:`pointInDirection (args, util) {
            const direction = Cast.toNumber(args.DIRECTION);
            util.target.setDirection(direction);
        }`,
        motion_pointtowards:`pointTowards (args, util) {
            let targetX = 0;
            let targetY = 0;
            if (args.TOWARDS === '_mouse_') {
                targetX = util.ioQuery('mouse', 'getScratchX');
                targetY = util.ioQuery('mouse', 'getScratchY');
            } else if (args.TOWARDS === '_random_') {
                util.target.setDirection(Math.round(Math.random() * 360) - 180);
                return;
            } else {
                args.TOWARDS = Cast.toString(args.TOWARDS);
                const pointTarget = this.runtime.getSpriteTargetByName(args.TOWARDS);
                if (!pointTarget) return;
                targetX = pointTarget.x;
                targetY = pointTarget.y;
            }
    
            const dx = targetX - util.target.x;
            const dy = targetY - util.target.y;
            const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
            util.target.setDirection(direction);
        }`,
        motion_glideto:`glide (args, util) {
            if (util.stackFrame.timer) {
                const timeElapsed = util.stackFrame.timer.timeElapsed();
                if (timeElapsed < util.stackFrame.duration * 1000) {
                    // In progress: move to intermediate position.
                    const frac = timeElapsed / (util.stackFrame.duration * 1000);
                    const dx = frac * (util.stackFrame.endX - util.stackFrame.startX);
                    const dy = frac * (util.stackFrame.endY - util.stackFrame.startY);
                    util.target.setXY(
                        util.stackFrame.startX + dx,
                        util.stackFrame.startY + dy
                    );
                    util.yield();
                } else {
                    // Finished: move to final position.
                    util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
                }
            } else {
                // First time: save data for future use.
                util.stackFrame.timer = new Timer();
                util.stackFrame.timer.start();
                util.stackFrame.duration = Cast.toNumber(args.SECS);
                util.stackFrame.startX = util.target.x;
                util.stackFrame.startY = util.target.y;
                util.stackFrame.endX = Cast.toNumber(args.X);
                util.stackFrame.endY = Cast.toNumber(args.Y);
                if (util.stackFrame.duration <= 0) {
                    // Duration too short to glide.
                    util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
                    return;
                }
                util.yield();
            }
        }`,
        motion_glidesecstoxy:` glideTo (args, util) {
            const targetXY = this.getTargetXY(args.TO, util);
            if (targetXY) {
                this.glide({SECS: args.SECS, X: targetXY[0], Y: targetXY[1]}, util);
            }
        }`,
        motion_ifonedgebounce:`ifOnEdgeBounce (args, util) {
            const bounds = util.target.getBounds();
            if (!bounds) {
                return;
            }
            // Measure distance to edges.
            // Values are positive when the sprite is far away,
            // and clamped to zero when the sprite is beyond.
            const stageWidth = this.runtime.constructor.STAGE_WIDTH;
            const stageHeight = this.runtime.constructor.STAGE_HEIGHT;
            const distLeft = Math.max(0, (stageWidth / 2) + bounds.left);
            const distTop = Math.max(0, (stageHeight / 2) - bounds.top);
            const distRight = Math.max(0, (stageWidth / 2) - bounds.right);
            const distBottom = Math.max(0, (stageHeight / 2) + bounds.bottom);
            // Find the nearest edge.
            let nearestEdge = '';
            let minDist = Infinity;
            if (distLeft < minDist) {
                minDist = distLeft;
                nearestEdge = 'left';
            }
            if (distTop < minDist) {
                minDist = distTop;
                nearestEdge = 'top';
            }
            if (distRight < minDist) {
                minDist = distRight;
                nearestEdge = 'right';
            }
            if (distBottom < minDist) {
                minDist = distBottom;
                nearestEdge = 'bottom';
            }
            if (minDist > 0) {
                return; // Not touching any edge.
            }
            // Point away from the nearest edge.
            const radians = MathUtil.degToRad(90 - util.target.direction);
            let dx = Math.cos(radians);
            let dy = -Math.sin(radians);
            if (nearestEdge === 'left') {
                dx = Math.max(0.2, Math.abs(dx));
            } else if (nearestEdge === 'top') {
                dy = Math.max(0.2, Math.abs(dy));
            } else if (nearestEdge === 'right') {
                dx = 0 - Math.max(0.2, Math.abs(dx));
            } else if (nearestEdge === 'bottom') {
                dy = 0 - Math.max(0.2, Math.abs(dy));
            }
            const newDirection = MathUtil.radToDeg(Math.atan2(dy, dx)) + 90;
            util.target.setDirection(newDirection);
            // Keep within the stage.
            const fencedPosition = util.target.keepInFence(util.target.x, util.target.y);
            util.target.setXY(fencedPosition[0], fencedPosition[1]);
        }`,
        motion_setrotationstyle:`setRotationStyle (args, util) {
            util.target.setRotationStyle(args.STYLE);
        }`,
        motion_changexby:`changeX (args, util) {
            const dx = Cast.toNumber(args.DX);
            util.target.setXY(util.target.x + dx, util.target.y);
        }`,
        motion_setx:`setX (args, util) {
            const x = Cast.toNumber(args.X);
            util.target.setXY(x, util.target.y);
        }`,
        motion_changeyby:`changeY (args, util) {
            const dy = Cast.toNumber(args.DY);
            util.target.setXY(util.target.x, util.target.y + dy);
        }`,
        motion_sety:`setY (args, util) {
            const y = Cast.toNumber(args.Y);
            util.target.setXY(util.target.x, y);
        }`,
        motion_getx:` getX (args, util) {
            return this.limitPrecision(util.target.x);
        }`,
        motion_gety:`getY (args, util) {
            return this.limitPrecision(util.target.y);
        }`,
        motion_getdirection:` getDirection (args, util) {
            return util.target.direction;
        }`,
        motion_limitprecision:`limitPrecision (coordinate) {
            const rounded = Math.round(coordinate);
            const delta = coordinate - rounded;
            const limitedCoord = (Math.abs(delta) < 1e-9) ? rounded : coordinate;
    
            return limitedCoord;
        }`,
    
    }
    const [currentState, setCurrentState] = useState(() => {
        const savedState = localStorage.getItem("currentState");
        return savedState ? JSON.parse(savedState) : null;
    });
    const [val,setVal] = useState("");
    const [ssh,setSsh] = useState("");
    // Fetch from local storage every 10 seconds
    setInterval(() => {
        // localStorage.setItem("currentState", JSON.stringify(currentState))
        const savedState = JSON.parse(localStorage.getItem("currentState"));
        setCurrentState(savedState ? savedState : null);
        const blocks = Object.keys(savedState)[0];
        console.log(blocks)
        // setVal(JSON.stringify(savedState[blocks].blocks, null, 2))
        // console.log("Iddsgfsgrf",blocks)
        const newObjKey = Object.keys(savedState[blocks].blocks)[0]
        console.log("Object:- ",savedState[blocks].blocks[newObjKey])
        setVal(JSON.stringify(savedState[blocks].blocks[newObjKey].opcode, null, 2))
        
        setSsh(blocks)
    }, 10000);

    return (
        <>
        <Editor height="90vh" width= "100%" defaultLanguage="javascript" defaultValue="// edit your code"  value={dict[val.substr(1,val?.length-2)]} />
        {console.log(dict,dict[val.substr(1,val?.length-2)],val.substr(1,val?.length-2))}
        </>
        // <div>
        //     {currentState && (
        //         <div style={{ padding: '20px', backgroundColor: '#f0f0f0', overflow: 'auto', maxHeight: '400px' }}>
        //             <pre>
        //                 {(() => {
        //                     const blocks = Object.keys(currentState)[0];
        //                     console.log("Blocks:", currentState[blocks]);
        //                     return JSON.stringify(currentState[blocks].blocks, null, 2);
        //                 })()}
        //             </pre>
        //         </div>
        //     )}
        // </div>
    );
};

const StageComponent = (props) => {
    const {
        canvas,
        dragRef,
        isColorPicking,
        isFullScreen,
        isStarted,
        colorInfo,
        micIndicator,
        question,
        stageSize,
        useEditorDragStyle,
        onDeactivateColorPicker,
        onDoubleClick,
        onQuestionAnswered,
        ...boxProps
    } = props;

    const stageDimensions = getStageDimensions(stageSize, isFullScreen);
    const [isEditor, setIsEditor] = useState(false);
    return (
        <React.Fragment>
            <button
                onClick={() => setIsEditor(!isEditor)}
                style={{
                    padding: "8px 16px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    backgroundColor: "purple",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    width: "100%",
                }}
            >
                {isEditor ? "Go to Canvas" : "Go to Editor"}
            </button>

            {
                // Render the stage if isEditor is true
                !isEditor ? (
                    <Box
                        className={classNames(styles.stageWrapper, {
                            [styles.withColorPicker]:
                                !isFullScreen && isColorPicking,
                        })}
                        onDoubleClick={onDoubleClick}
                    >
                        <Box
                            className={classNames(styles.stage, {
                                [styles.fullScreen]: isFullScreen,
                            })}
                            style={{
                                height: stageDimensions.height,
                                width: stageDimensions.width,
                            }}
                        >
                            <DOMElementRenderer
                                domElement={canvas}
                                style={{
                                    height: stageDimensions.height,
                                    width: stageDimensions.width,
                                }}
                                {...boxProps}
                            />
                            <Box className={styles.monitorWrapper}>
                                <MonitorList
                                    draggable={useEditorDragStyle}
                                    stageSize={stageDimensions}
                                />
                            </Box>
                            <Box className={styles.frameWrapper}>
                                <TargetHighlight
                                    className={styles.frame}
                                    stageHeight={stageDimensions.height}
                                    stageWidth={stageDimensions.width}
                                />
                            </Box>
                            {isColorPicking && colorInfo ? (
                                <Loupe colorInfo={colorInfo} />
                            ) : null}
                        </Box>

                        {/* `stageOverlays` is for items that should *not* have their overflow contained within the stage */}
                        
                        <Box
                            className={classNames(styles.stageOverlays, {
                                [styles.fullScreen]: isFullScreen,
                            })}
                        >
                            <div
                                className={styles.stageBottomWrapper}
                                style={{
                                    width: stageDimensions.width,
                                    height: stageDimensions.height,
                                    overflow: "auto",
                                }}
                            >
                                {micIndicator ? (
                                    <MicIndicator
                                        className={styles.micIndicator}
                                        stageSize={stageDimensions}
                                    />
                                ) : null}
                                {question === null ? null : (
                                    <div
                                        className={styles.questionWrapper}
                                        style={{ width: stageDimensions.width }}
                                    >
                                        <Question
                                            question={question}
                                            onQuestionAnswered={
                                                onQuestionAnswered
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                            <div
                                id="docx"
                                style={{
                                    maxHeight: stageDimensions.height,
                                    maxWidth: stageDimensions.width,
                                    overflow: "auto",
                                    width: stageDimensions.width,
                                    height: stageDimensions.height,
                                }}
                            ></div>
                            <canvas
                                className={styles.draggingSprite}
                                height={0}
                                ref={dragRef}
                                width={0}
                            />
                            
                        </Box>
                        {isStarted ? null : (
                            <GreenFlagOverlay
                                className={styles.greenFlagOverlay}
                                wrapperClass={styles.greenFlagOverlayWrapper}
                            />
                        )}
                    </Box>
                ) : (
                    <CodeEditor/>
                    // <Editor height="90vh" defaultLanguage="javascript" defaultValue="// edit your code"  value="hello world"/>
                )
            }
        </React.Fragment>
    );
};

StageComponent.propTypes = {
    canvas: PropTypes.instanceOf(Element).isRequired,
    colorInfo: Loupe.propTypes.colorInfo,
    dragRef: PropTypes.func,
    isColorPicking: PropTypes.bool,
    isFullScreen: PropTypes.bool.isRequired,
    isStarted: PropTypes.bool,
    micIndicator: PropTypes.bool,
    onDeactivateColorPicker: PropTypes.func,
    onDoubleClick: PropTypes.func,
    onQuestionAnswered: PropTypes.func,
    question: PropTypes.string,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    useEditorDragStyle: PropTypes.bool,
};

StageComponent.defaultProps = {
    dragRef: () => {},
};

export default StageComponent;

