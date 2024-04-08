const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Clone = require('../../util/clone');
const Cast = require('../../util/cast');
const Timer = require('../../util/timer');
// const nets = require('nets');
const RenderedTarget = require('../../sprites/rendered-target');
const formatMessage = require('format-message');

var audioCtx; 

const SPEECH_STATES = {
    IDLE: 0,
    PENDING: 1,
    FINISHED: 2
};


class Scratch3Speech {
    constructor (runtime) {
        this.runtime = runtime;
        this.SpeechRecognition = window.SpeechRecognition ||
                          window.webkitSpeechRecognition ||
                          window.mozSpeechRecognition ||
                          window.msSpeechRecognition ||
                          window.oSpeechRecognition;

        this.AudioContext = window.AudioContext || 
                            window.webkitAudioContext;

        // this._setupMicrophone();

        /**
         * A flag to indicate that speech recognition is paused during a speech synthesis utterance
         * to avoid feedback. This is used to avoid stopping and re-starting the speech recognition
         * engine.
         * @type {Boolean}
         */
        this.speechRecognitionPaused = false;

        /**
         * The most recent result from the speech recognizer, used for a reporter block.
         * @type {String}
         */
        this.latest_speech = '';

        /**
         * The name of the selected voice for speech synthesis.
         * @type {String}
         */
        this.current_voice_name = 'default';

        /**
         * The current speech synthesis utterance object.
         * Storing the utterance prevents a bug in which garbage collection causes the onend event to fail.
         * @type {String}
         */
        this.current_utterance = null;

        this.runtime.HACK_SpeechBlocks = this;
  
    }

    getInfo () {
        return {
            id: 'speech',
            name: formatMessage({
                id: 'speech.speechToText',
                default: 'Speech to Text',
                description: ''
            }),
            // blockIconURI: iconURI,
            blocks: [
                // {
                //     opcode: 'changeState',
                //     blockType: BlockType.COMMAND, 
                //     text: 'turn microphone [STATE]',
                //     arguments:{
                //         STATE: {
                //             type:ArgumentType.STRING,
                //             menu: 'STATES',
                //             defaultValue:'on'
                //         }
                //     }
                // },
                {
                    opcode: 'startSpeechRecognition',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'speech.startSpeechRecognition',
                        default: 'Start listening',
                        description: ''
                    })
                },
                {
                    opcode: 'stopSpeechRecognition',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'speech.stopSpeechRecognition',
                        default: 'Stop listening',
                        description: ''
                    })
                },
                {
                    opcode: 'whenIHear',
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: 'speech.whenIHearPhrase',
                        default: 'When I hear',
                        description: ''
                    }) + ' [TEXT]',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'cozmo.hello',
                                default: 'hello',
                                description: ''
                            })
                        }
                    }
                },
                 {
                    opcode: 'getLatestSpeech',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'speech.getLatestSpeech',
                        default: 'Get latest speech',
                        description: ''
                    })
                }
                
            ],
            menus: {
                trueFalse: [
                    formatMessage({
                        id: 'general.true',
                        default: 'true',
                        description: ''
                    }),
                    formatMessage({
                        id: 'general.false',
                        default: 'false',
                        description: ''
                    })
                ],
                STATES: [
                    formatMessage({
                        id: 'general.on',
                        default: 'on',
                        description: ''
                    }),
                    formatMessage({
                        id: 'general.off',
                        default: 'off',
                        description: ''
                    })
                ]
            }
        };
    }

    // changeState(args, util){
    //     let state = args.STATE;
    //     if(state == 'on' && audioCtx == null){
    //         if(audioCtx == null){
    //             audioCtx = new this.AudioContext();
    //         }
    //         navigator.getUserMedia({
    //             audio: true,
    //         }, (stream) => {
    //             var source = audioCtx.createMediaStreamSource(stream);
    //             console.log('Microphone on');
    //         }, (err) => {
    //             console.error(err);
    //         });
    //     } else if(state == 'on'){
    //         audioCtx.resume();
    //     } else if (state == 'off' && audioCtx != null) {
    //         audioCtx.close();
    //         console.log('Microphone off');
    //         audioCtx = null;
    //     }
    // }


    getHats() {
        return {
            speech_whenihear: {
                restartExistingThreads: false,
                edgeActivated: true
            }
        };
    };

    startSpeechRecognition(args, util) {
        if (!this.recognition){
        this.recognition = new this.SpeechRecognition();
        
        this.recognition.interimResults = true;
        this.continuous = true;
        this.recognized_speech = [];
        }

   

        this.recognition.onresult = function(event) {
            if (this.speechRecognitionPaused) {
                return;
            }

            const SpeechRecognitionResult = event.results[event.resultIndex];
            const results = [];

            for (let k=0; k<SpeechRecognitionResult.length; k++) {
                results[k] = SpeechRecognitionResult[k].transcript.toLowerCase();
            }
            this.recognized_speech = results;
            this.latest_speech = this.recognized_speech[0];
            console.log(this.latest_speech);
            this.recognition_state = SPEECH_STATES.FINISHED;
        }.bind(this);

        this.recognition.onend = function() {
            if (this.speechRecognitionPaused) {
                return;
            }
            console.log('speech ended');
            this.recognition.start();
        }.bind(this);

        this.recognition.onstart = function () {
            this.recognition_state = SPEECH_STATES.LISTENING;
            console.log('speech recognition started');
        };

        this.recognition.onerror = function(event) {
            console.log('speech recognition error', event.error);
            console.log('additional information: ' + event.message);
        };

        this.recognition.onnomatch = function() {
            console.log('Speech recognition: no match');
        }

        try {
            this.recognition.start();
        }
        catch(e) {
            console.error(e);
        }
    };

    stopSpeechRecognition(args, util) {
        this.recognition.onend = function() {
            console.log('speech recognition ended');
        };
        try {
            this.recognition.stop();
        } catch(e) {
            console.error(e);
        }
    };

    whenIHear(args, util) {
        if (!this.recognition) {
            return;
        }

        let input = Cast.toString(args.TEXT).toLowerCase();
        input = input.replace(/[.?!]/g, '');
        input = input.trim();

        if (input === '') return false;

        // Assuming 'this' refers to some object
if (this.recognized_speech && this.recognized_speech.length > 0 && this.recognized_speech[0] && this.recognized_speech[0].includes(input)) {
    // Do something if the recognized speech contains the input
    return this.recognized_speech[0].includes(input);
} 

        
    };

    getLatestSpeech(args, util) {
        console.log('latest speech: ', this.latest_speech);
        return this.latest_speech;
    };
}

module.exports = Scratch3Speech;
