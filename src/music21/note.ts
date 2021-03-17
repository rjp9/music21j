/**
 * music21j -- Javascript reimplementation of Core music21p features.
 * music21/note -- Note, Rest, NotRest, GeneralNote
 *
 * Copyright (c) 2013-19, Michael Scott Cuthbert and cuthbertLab
 * Based on music21 (music21p), Copyright (c) 2006–19, Michael Scott Cuthbert and cuthbertLab
 *
 * Module for note classes. See the namespace {@link music21.note}
 *
 * @requires music21/prebase
 * @requires music21/base
 * @requires music21/pitch
 * @requires music21/beam
 * @exports music21/note
 * Namespace for notes (single pitch) or rests, and some things like Lyrics that go on notes.
 *
 * @namespace music21.note
 * @memberof music21
 * @property {string[]} noteheadTypeNames - an Array of allowable notehead names.
 * @property {string[]} stemDirectionNames - an Array of allowable stemDirection names.
 */
import Vex from 'vexflow';
import * as MIDI from 'midicube';

import * as prebase from './prebase';
import * as base from './base';
import * as pitch from './pitch';
import * as beam from './beam';

import { debug } from './debug';
import { Music21Exception } from './exceptions21';

// imports just for typechecking
import * as articulations from './articulations';
import * as expressions from './expressions';


export class NotRestException extends Music21Exception {
    // no need
}

// noinspection JSUnusedGlobalSymbols
export const noteheadTypeNames = [
    'arrow down',
    'arrow up',
    'back slashed',
    'circle dot',
    'circle-x',
    'circled',
    'cluster',
    'cross',
    'diamond',
    'do',
    'fa',
    'inverted triangle',
    'la',
    'left triangle',
    'mi',
    'none',
    'normal',
    'other',
    're',
    'rectangle',
    'slash',
    'slashed',
    'so',
    'square',
    'ti',
    'triangle',
    'x',
];

export const stemDirectionNames = [
    'double',
    'down',
    'noStem',
    'none',
    'unspecified',
    'up',
];

/**
 * Class for a single Lyric attached to a {@link GeneralNote}
 *
 * @class Lyric
 * @memberOf music21.note
 * @param {string} text - the text of the lyric
 * @param {number} number=1 - the lyric number
 * @param {string} syllabic=undefined - placement of the syllable
 *     ('begin', 'middle', 'end', 'single'); undefined = interpret from text
 * @param {boolean} applyRaw=false - true = display the text exactly as it
 *     is or, false = use "-" etc. to determine syllabic
 * @param {string} identifier=undefined - identifier for the lyric.
 * @property {string} lyricConnector='-' - what to place between two
 *     lyrics that are syllabic.
 * @property {string} text - the text of the lyric syllable.
 * @property {string} syllabic - see above
 * @property {boolean} applyRaw - see above
 * @property {string} identifier - see above; gets .number if undefined
 * @property {number} number - see above
 * @property {string} rawText - text + any connectors
 */
export class Lyric extends prebase.ProtoM21Object {
    static get className() { return 'music21.note.Lyric'; }

    lyricConnector: string = '-';  // override to place something else between two notes...
    text: string;
    protected _number: number;
    protected _identifier: string|number;
    syllabic: string;
    applyRaw: boolean;
    style;

    constructor(
        text: string,
        number: number = 1,
        syllabic=undefined,
        applyRaw: boolean = undefined,
        identifier: string|number =undefined
    ) {
        super();
        this.text = text;
        this._number = number;
        this.syllabic = syllabic;
        this.applyRaw = applyRaw ?? false;
        this.setTextAndSyllabic(this.text, this.applyRaw);
        this._identifier = identifier;
        this.style = {
            fillStyle: 'black',
            strokeStyle: 'black',
            fontFamily: 'Serif',
            fontSize: 12,
            fontWeight: '',
        };
    }

    get identifier() {
        return this._identifier || this._number;
    }

    set identifier(i) {
        this._identifier = i;
    }

    // a property just to match m21p
    get number() {
        return this._number;
    }

    set number(n) {
        this._number = n;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * get rawText - gets the raw text.
     *
     * @return {string}  raw text
     */
    get rawText(): string {
        if (this.syllabic === 'begin') {
            return this.text + this.lyricConnector;
        } else if (this.syllabic === 'middle') {
            return this.lyricConnector + this.text + this.lyricConnector;
        } else if (this.syllabic === 'end') {
            return this.lyricConnector + this.text;
        } else {
            return this.text;
        }
    }

    // noinspection JSUnusedGlobalSymbols
    set rawText(t: string) {
        this.setTextAndSyllabic(t, true);
    }

    /**
     * setTextAndSyllabic - Given a setting for rawText and applyRaw,
     *     sets the syllabic type for a lyric based on the rawText
     *
     * @param  {string} rawText text
     * @param  {boolean} applyRaw = false if hyphens should not be applied
     * @return {this}
     */
    setTextAndSyllabic(rawText, applyRaw = false) {
        if (rawText === undefined) {
            this.text = undefined;
            return this;
        }

        if (
            !applyRaw
            && rawText.indexOf(this.lyricConnector) === 0
            && rawText.slice(-1) === this.lyricConnector
        ) {
            this.text = rawText.slice(1, -1);
            this.syllabic = 'middle';
        } else if (!applyRaw && rawText.indexOf(this.lyricConnector) === 0) {
            this.text = rawText.slice(1);
            this.syllabic = 'end';
        } else if (!applyRaw && rawText.slice(-1) === this.lyricConnector) {
            this.text = rawText.slice(0, -1);
            this.syllabic = 'begin';
        } else {
            this.text = rawText;
            if (this.syllabic === undefined) {
                this.syllabic = 'single';
            }
        }
        return this;
    }
}

/* Notes and rests etc... */

/**
 * Superclass for all Note values
 *
 * @class GeneralNote
 * @memberof music21.note
 * @param {(number|undefined)} [ql=1.0] - quarterLength of the note
 * @property {boolean} [isChord=false] - is this a chord
 * @property {number} quarterLength - shortcut to `.duration.quarterLength`
 * @property {Vex.Flow.StaveNote} [activeVexflowNote] - most recent
 *     Vex.Flow.StaveNote object to be made from this note (could change);
 *     default: undefined
 * @property {Array<music21.expressions.Expression>} expressions - array
 *     of attached expressions
 * @property {Array<music21.articulations.Articulation>} articulations - array
 *     of attached articulations
 * @property {string} lyric - the text of the first
 *     {@link Lyric} object; can also set one.
 * @property {Array<Lyric>} lyrics - array of attached lyrics
 * @property {number} [volume=60] - how loud is this note, 0-127, before
 *     articulations
 * @property {number} midiVolume - how loud is this note, taking into
 *     account articulations
 * @property {music21.tie.Tie|undefined} [tie=undefined] - a tie object
 */
export class GeneralNote extends base.Music21Object {
    static get className() { return 'music21.note.GeneralNote'; }

    isNote: boolean = false;
    isRest: boolean = false;
    isChord: boolean = false;
    volume: number = 60;
    expressions: expressions.Expression[];
    articulations: articulations.Articulation[];
    lyrics: Lyric[];
    tie;

    activeVexflowNote: Vex.Flow.Note;

    constructor(ql=1.0) {
        super();
        this.expressions = [];
        this.articulations = [];
        this.lyrics = [];

        this.duration.quarterLength = ql;
        /* TODO: editorial objects, style(color), addLyric, insertLyric, hasLyrics */
        /* Later: augmentOrDiminish, getGrace, */
    }

    get lyric() {
        if (this.lyrics.length > 0) {
            return this.lyrics[0].text;
        } else {
            return undefined;
        }
    }

    set lyric(value) {
        this.lyrics = [];
        if (value !== undefined) {
            this.lyrics.push(new Lyric(value));
        }
    }

    get midiVolume() {
        let volume = this.volume;
        if (volume === undefined) {
            volume = 60;
        }
        if (this.articulations !== undefined) {
            this.articulations.forEach(a => {
                volume *= a.dynamicScale;
                if (volume > 127) {
                    volume = 127;
                } else if (Number.isNaN(volume)) {
                    volume = 60;
                }
            });
        }
        volume = Math.floor(volume);
        return volume;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Add a {@link Lyric} object to the Note
     *
     * @param {string} text - text to be added
     * @param {number} [lyricNumber] - integer specifying lyric (defaults to the current `.lyrics.length` + 1)
     * @param {boolean} [applyRaw=false] - if `true`, do not parse the text for cluses about syllable placement.
     * @param {string} [lyricIdentifier] - an optional identifier
     */
    addLyric(text, lyricNumber, applyRaw = false, lyricIdentifier) {
        if (lyricNumber === undefined) {
            const maxLyrics = this.lyrics.length + 1;
            const newLyric = new Lyric(
                text,
                maxLyrics,
                undefined,
                applyRaw,
                lyricIdentifier
            );
            this.lyrics.push(newLyric);
        } else {
            let foundLyric = false;
            for (let i = 0; i < this.lyrics.length; i++) {
                const thisLyric = this.lyrics[i];
                if (thisLyric.number === lyricNumber) {
                    thisLyric.text = text;
                    foundLyric = true;
                    break;
                }
            }
            if (foundLyric === false) {
                const newLyric = new Lyric(
                    text,
                    lyricNumber,
                    undefined,
                    applyRaw,
                    lyricIdentifier
                );
                this.lyrics.push(newLyric);
            }
        }
    }

    /**
     * Change stem direction according to clef. Does nothing for GeneralNote; overridden in subclasses.
     *
     * @param {music21.clef.Clef} [clef] - clef to set the stem direction of.
     * @returns {this}
     */
    setStemDirectionFromClef(clef) {
        return this;
    }

    getStemDirectionFromClef(clef) {
        return undefined;
    }

    /**
     * Sets the vexflow accidentals (if any), the dots, and the stem direction
     *
     * @param {Vex.Flow.StaveNote} vfn - a Vex.Flow note
     * @param {Object} options -- a set of Vex Flow options
     */
    vexflowAccidentalsAndDisplay(vfn, options={}) {
        if (this.duration.dots > 0) {
            for (let i = 0; i < this.duration.dots; i++) {
                vfn.addDotToAll();
            }
        }
    }

    /**
     * Return the active channel for the instrument or activeSite's instrument
     * @param instrument
     */
    activeChannel(instrument=undefined): number {
        if (instrument === undefined) {
            if (this.activeSite !== undefined) {
                instrument = this.activeSite.instrument;
            }
        }
        let channel: number = 0;
        if (instrument !== undefined) {
            channel = instrument.midiChannel;
        }
        return channel;
    }

    /**
     * Play the current element as a MIDI note.
     *
     * For a general note -- same as a rest -- doesn't make a sound.  :-)
     *
     * @param {number} [tempo=120] - tempo in bpm
     * @param {base.Music21Object} [nextElement] - for determining
     *     the length to play in case of tied notes, etc.
     * @param {Object} [options] - other options (currently just
     *     `{instrument: {@link music21.instrument.Instrument} }`)
     * @returns {number} - delay time in milliseconds until the next element (may be ignored)
     */
    playMidi(
        tempo=120,
        nextElement,
        { instrument=undefined, channel=undefined } = {}
    ): number {
        // returns the number of milliseconds to the next element in
        // case that can't be determined otherwise.
        const ql = this.duration.quarterLength;
        const milliseconds = 60 * ql * 1000 / tempo;
        return milliseconds;
    }
}

/**
 * Specifies that a GeneralNote is not a rest (Unpitched, Note, Chord).
 *
 * @param {number} [ql=1.0] - length in quarter notes
 * @property {music21.beam.Beams} beams - a link to a beam object
 * @property {string} [notehead='normal'] - notehead type
 * @property {string} [noteheadFill='default'] - notehead fill (to be moved to style...)
 * @property {string|undefined} [noteheadColor=undefined] - notehead color
 * @property {boolean} [noteheadParenthesis=false] - put a parenthesis around the notehead?
 * @property {string|undefined} [stemDirection=undefined] - One of
 *     ['up','down','noStem', undefined] -- 'double' not supported
 */
export class NotRest extends GeneralNote {
    static get className() { return 'music21.note.NotRest'; }
    // noinspection JSUnusedGlobalSymbols
    notehead: string = 'normal';
    // noinspection JSUnusedGlobalSymbols
    noteheadFill: string = 'default';
    noteheadColor: string = 'black';
    noteheadParenthesis: boolean = false;
    volume: number = undefined; // not a real object yet.
    beams: beam.Beams;
    protected _stemDirection: string = 'unspecified';

    constructor(ql: number = 1.0) {
        super(ql);
        this.beams = new beam.Beams();
        /* TODO: this.duration.linkage -- need durationUnits */
        /* TODO: check notehead, noteheadFill, noteheadParentheses */
    }

    get stemDirection() {
        return this._stemDirection;
    }

    set stemDirection(direction) {
        if (direction === undefined) {
            direction = 'unspecified';
        } else if (direction === 'none') {
            direction = 'noStem';
        } else if (!stemDirectionNames.includes(direction)) {
            throw new NotRestException(`not a valid stem direction name: ${direction}`);
        }
        this._stemDirection = direction;
    }

}

/* ------- Note ----------- */
/**
 * A very, very important class! music21.note.Note objects combine a {@link music21.pitch.Pitch}
 * object to describe pitch (highness/lowness) with a {@link music21.duration.Duration} object
 * that defines length, with additional features for drawing the Note, playing it back, etc.
 *
 * Together with {@link Stream} one of the two most important
 * classes in `music21`.
 *
 * See {@link NotRest}, {@link GeneralNote},
 * {@link base.Music21Object}
 * and {@link prebase.ProtoM21Object} (or in general, the **extends** list below) for other
 * things you can do with a `Note` object.
 *
 * Missing from music21p: `transpose(), fullName`.  Transpose cannot be added because of circular imports
 *
 * @class Note
 * @memberof music21.note
 */
export class Note extends NotRest {
    static get className() { return 'music21.note.Note'; }

    // added rjp9
    private mymetadata: any;

    // noinspection JSUnusedGlobalSymbols
    isNote: boolean = true;
    isRest: boolean = false;
    pitch: pitch.Pitch;

    /**
     *
     * @param {(string|music21.pitch.Pitch|undefined)} [nn='C4'] - pitch
     *     name ("C", "D#", "E-") w/ or w/o octave ("C#4"), or a pitch.Pitch object
     * @param {(number|undefined)} [ql=1.0] - length in quarter notes
     * @property {boolean} [isNote=true] - is it a Note? Yes!
     * @property {boolean} [isRest=false] - is it a Rest? No!
     * @property {music21.pitch.Pitch} pitch - the {@link music21.pitch.Pitch} associated with the Note.
     * @property {string} name - shortcut to `.pitch.name`
     * @property {string} nameWithOctave - shortcut to `.pitch.nameWithOctave`
     * @property {string} step - shortcut to `.pitch.step`
     * @property {number} octave - shortcut to `.pitch.octave`
     */
    constructor(nn: string|pitch.Pitch = 'C4', ql: number=1.0) {
        super(ql);
        if (nn instanceof pitch.Pitch) {
            this.pitch = nn;
        } else {
            this.pitch = new pitch.Pitch(nn);
        }
    }

    /**
     *
     * @returns {string}
     */
    stringInfo() {
        return this.name;
    }

    /**
     *
     * @type {string}
     */
    get name() {
        return this.pitch.name;
    }

    set name(nn) {
        this.pitch.name = nn;
    }

    /**
     *
     * @type {string}
     */
    get nameWithOctave() {
        return this.pitch.nameWithOctave;
    }

    set nameWithOctave(nn) {
        this.pitch.nameWithOctave = nn;
    }

    /**
     *
     * @type {string}
     */
    get step() {
        return this.pitch.step;
    }

    set step(nn) {
        this.pitch.step = nn;
    }

    /**
     *
     * @type {number}
     */
    get octave() {
        return this.pitch.octave;
    }

    set octave(nn) {
        this.pitch.octave = nn;
    }

    /**
     *
     * @returns {music21.pitch.Pitch[]}
     */
    get pitches() {
        return [this.pitch];
    }

    set pitches(value) {
        this.pitch = value[0];
        // TODO: raise NoteException on index error.
    }


    /* TODO: transpose, fullName */


    /**
     * Change stem direction according to clef.
     *
     * @param {music21.clef.Clef} [clef] - clef to set the stem direction of.
     * @returns {this} Original object, for chaining methods
     */
    setStemDirectionFromClef(clef) {
        if (clef !== undefined) {
            this.stemDirection = this.getStemDirectionFromClef(clef);
        }
        return this;
    }

    /**
     * Same as setStemDirectionFromClef, but do not set the note, just return it.
     */
    getStemDirectionFromClef(clef) {
        if (clef === undefined) {
            return undefined;
        }
        const midLine = clef.lowestLine + 4;
        const DNNFromCenter = this.pitch.diatonicNoteNum - midLine;
        // console.log(DNNFromCenter, this.pitch.nameWithOctave);
        if (DNNFromCenter >= 0) {
            return 'down';
        } else {
            return 'up';
        }
    }

    vexflowAccidentalsAndDisplay(vfn, { stave=undefined, clef=undefined }={}) {
        super.vexflowAccidentalsAndDisplay(vfn, { stave, clef });
        if (debug) {
            console.log(this.stemDirection);
        }
        if (this.stemDirection === 'noStem') {
            vfn.glyph.stem = false;
            // vfn.render_options.stem_height = 0;
        } else {
            // correct VexFlow stem length for notes far from the center line;
            let staveDNNSpacing = 5;
            if (stave !== undefined) {
                staveDNNSpacing = Math.floor(
                    stave.options.spacing_between_lines_px / 2
                );
            }
            if (clef !== undefined && this.pitch !== undefined) {
                const midLine = clef.lowestLine + 4;
                // console.log(midLine);
                const absDNNFromCenter = Math.abs(
                    this.pitch.diatonicNoteNum - midLine
                );
                const absOverOctave = absDNNFromCenter - 7;
                // console.log(absOverOctave);
                if (absOverOctave > 0 && vfn.getStemLength !== undefined) {
                    const stemHeight
                        = absOverOctave * staveDNNSpacing + vfn.getStemLength();
                    vfn.setStemLength(stemHeight);
                }
            }
        }
    }

    /**
     * Returns a `Vex.Flow.StaveNote` that approximates this note.
     *
     * @param {Object} [options={}] - `{clef: {@link music21.clef.Clef} }`
     * clef to set the stem direction of.
     * @returns {Vex.Flow.StaveNote}
     */
    vexflowNote({ clef=undefined }={}) {
        let useStemDirection = this.stemDirection;

        // fixup stem direction -- must happen before Vex.Flow.Note is created...
        if ([undefined, 'unspecified'].includes(this.stemDirection)
                && clef !== undefined) {
            useStemDirection = this.getStemDirectionFromClef(clef);
        }

        const vfd = this.duration.vexflowDuration;
        if (vfd === undefined) {
            return undefined;
        }
        const vexflowKey = this.pitch.vexflowName(clef);

        // Not supported: Double;  None is done elsewhere?
        const vfnStemDirection
            = useStemDirection === 'down'
                ? Vex.Flow.StaveNote.STEM_DOWN
                : Vex.Flow.StaveNote.STEM_UP;

        const vfn = new Vex.Flow.StaveNote({
            keys: [vexflowKey],
            duration: vfd,
            stem_direction: vfnStemDirection,
        });
        // added rjp
        vfn.mymetadata = this.mymetadata;
        this.vexflowAccidentalsAndDisplay(vfn, { clef }); // clean up stuff...
        if (this.pitch.accidental !== undefined) {
            if (
                this.pitch.accidental.vexflowModifier !== 'n'
                && this.pitch.accidental.displayStatus !== false
            ) {
                vfn.addAccidental(
                    0,
                    new Vex.Flow.Accidental(
                        this.pitch.accidental.vexflowModifier
                    )
                );
            } else if (
                this.pitch.accidental.displayType === 'always'
                || this.pitch.accidental.displayStatus === true
            ) {
                vfn.addAccidental(
                    0,
                    new Vex.Flow.Accidental(
                        this.pitch.accidental.vexflowModifier
                    )
                );
            }
        }

        if (this.articulations[0] !== undefined) {
            for (let i = 0; i < this.articulations.length; i++) {
                const art = this.articulations[i];
                // 0 refers to the first pitch (for chords etc.)...
                vfn.addArticulation(0, art.vexflow());
            }
        }
        if (this.expressions[0] !== undefined) {
            for (let j = 0; j < this.expressions.length; j++) {
                const exp = this.expressions[j];
                // 0 refers to the first pitch (for chords etc.)...
                vfn.addArticulation(0, exp.vexflow());
            }
        }
        if (this.noteheadColor !== undefined) {
            vfn.setStyle({ fillStyle: this.noteheadColor, strokeStyle: this.noteheadColor });
        }
        this.activeVexflowNote = vfn;
        return vfn;
    }

    playMidi(
        tempo=120,
        nextElement=undefined,
        {
            instrument=undefined,
            channel=undefined,
            playLegato=true,
        }={}
    ): number {
        const milliseconds = super.playMidi(tempo, nextElement, { instrument, channel });
        if (channel === undefined) {
            channel = this.activeChannel();
        }
        const volume = this.midiVolume;

        // Note, not rest
        const midNum = this.pitch.midi;
        let stopTime = milliseconds / 1000;
        if (nextElement instanceof Note) {
            if (nextElement.pitch.midi !== this.pitch.midi && playLegato) {
                stopTime += 60 * 0.25 / tempo; // legato -- play 16th note longer
            } else if (
                this.tie !== undefined
                && (this.tie.type === 'start' || this.tie.type === 'continue')
            ) {
                stopTime += 60 * nextElement.duration.quarterLength / tempo;
                // this does not take into account 3 or more notes tied.
                // TODO: look ahead at next nexts, etc.
            }
        } else if (nextElement === undefined && playLegato) {
            // let last note ring an extra beat...
            stopTime += 60 / tempo;
        }
        // console.log(stopTime);
        // console.log(this.tie);
        if (this.tie === undefined || this.tie.type === 'start') {
            // console.log(volume);
            try {
                MIDI.noteOn(channel, midNum, volume, 0);
                MIDI.noteOff(channel, midNum, stopTime);
            } catch (e) {
                // do nothing -- might not have an output channel because of audio not connected
            }
        } // else { console.log ('not going to play ', this.nameWithOctave); }
        return milliseconds;
    }
}

/* ------ TODO: Unpitched ------ */

/* ------ Rest ------ */

/**
 * Represents a musical rest.
 *
 * @class Rest
 * @memberof music21.note
 * @param {number} [ql=1.0] - length in number of quarterNotes
 * @property {Boolean} [isNote=false]
 * @property {Boolean} [isRest=true]
 * @property {string} [name='rest']
 * @property {number} [lineShift=undefined] - number of lines to shift up or down from default
 * @property {string|undefined} [color='black'] - color of the rest
 */
export class Rest extends GeneralNote {
    static get className() { return 'music21.note.Rest'; }

    // noinspection JSUnusedGlobalSymbols
    isNote: boolean = false;
    isRest: boolean = true;
    name: string = 'rest';
    lineShift: number = 0;
    color: string = 'black';

    // this dummy constructor is here for JetBrains typescript linter
    // which otherwise complains that Rests have no durations, etc.
    constructor(ql=1.0) {
        super(ql);
        this.name = 'rest';
    }

    /**
     *
     * @returns {string}
     */
    stringInfo() {
        return this.duration.quarterLength.toString();
    }


    /**
     * Returns a `Vex.Flow.StaveNote` that approximates this rest.
     * Corrects for bug in VexFlow that renders a whole rest too low.
     *
     * @param {Object} options -- vexflow options
     * @returns {Vex.Flow.StaveNote}
     */
    vexflowNote(options) {
        let keyLine = 'b/4';
        if (this.duration.type === 'whole') {
            if (
                this.activeSite !== undefined
                && this.activeSite.renderOptions.staffLines !== 1
            ) {
                keyLine = 'd/5';
            }
        }
        if (this.lineShift !== undefined) {
            const p = new pitch.Pitch('B4');
            let ls = this.lineShift;
            if (this.duration.type === 'whole') {
                ls += 2;
            }
            p.diatonicNoteNum += ls;
            keyLine = p.vexflowName(undefined);
        }

        const vfn = new Vex.Flow.StaveNote({
            keys: [keyLine],
            duration: this.duration.vexflowDuration + 'r',
        });
        if (this.duration.dots > 0) {
            for (let i = 0; i < this.duration.dots; i++) {
                vfn.addDotToAll();
            }
        }
        if (this.color !== undefined) {
            vfn.setStyle({ fillStyle: this.color, strokeStyle: this.color });
        }
        this.activeVexflowNote = vfn;
        return vfn;
    }
}

/* ------ TODO(msc): SpacerRest  or remove from music21p ------ */
