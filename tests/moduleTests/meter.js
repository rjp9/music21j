import * as QUnit from 'qunit';
import * as music21 from '../../src/music21_modules';

const { test } = QUnit;


export default function tests() {
    test('music21.meter.TimeSignature', assert => {
        const m = new music21.meter.TimeSignature('4/4');

        assert.equal(m.ratioString, '4/4', 'ratioString matches');
        assert.equal(m.barDuration.quarterLength, 4.0, 'bar lasts 4.0 ql');
        assert.deepEqual(m.beatGroups, [[2, 8]], 'beatGroups check out');
        assert.equal(m.beatCount, 4, 'beat count is 4');
        assert.equal(
            m.beatDuration.type,
            'quarter',
            'beatDuration type is quarter'
        );
        assert.equal(m.beatDuration.dots, 0, 'beatDuration has not dots');
    });

    test('music21.meter.TimeSignature beams', assert => {
        const m = new music21.meter.TimeSignature('4/4');
        const [start, end] = m.offsetToSpan(3.2);
        assert.equal(start, 3.0, 'beat starts at 3');
        assert.equal(end, 4.0, 'beat ends at 4');

    });

    test('music21.meter.TimeSignature getBeams', assert => {
        const m = new music21.stream.Measure();
        m.append(new music21.note.Note('C', 1.5));
        m.append(new music21.note.Note('C', 0.5));
        m.append(new music21.note.Note('C', 0.5));
        m.append(new music21.note.Note('C', 0.5));

        const ts = new music21.meter.TimeSignature('3/4');
        const beamsList = ts.getBeams(m);

        assert.strictEqual(typeof beamsList[0], 'undefined');
        assert.strictEqual(typeof beamsList[1], 'undefined');
        assert.ok(beamsList[2] instanceof music21.beam.Beams);
        assert.ok(beamsList[3] instanceof music21.beam.Beams);

        assert.strictEqual(beamsList[2].beamsList[0].type, 'start');
        assert.strictEqual(beamsList[3].beamsList[0].type, 'stop');
    });

    test('music21.meter.TimeSignature getBeams 3/8', assert => {
        const m = new music21.stream.Measure();
        m.append(new music21.note.Note('C', 0.5));
        m.append(new music21.note.Note('C', 0.75));
        m.append(new music21.note.Note('C', 0.25));

        const ts = new music21.meter.TimeSignature('3/8');
        const beamsList = ts.getBeams(m);

        for (const beam of beamsList) {
            assert.strictEqual(
                typeof beam,
                'undefined',
                '8th notes should not get beams when the 8th note gets the beat'
            );
        }
    });

    test('music21.meter.TimeSignature getBeams incomplete measure', assert => {
        const m = new music21.stream.Measure();

        // incomplete measure in 2/4
        m.append(new music21.note.Note('C', 0.5));
        m.append(new music21.note.Note('C', 0.5));
        m.append(new music21.note.Note('C', 0.5));

        const ts = new music21.meter.TimeSignature('2/4');
        const beamsList = ts.getBeams(m);

        assert.ok(beamsList[0] instanceof music21.beam.Beams);
        assert.ok(beamsList[1] instanceof music21.beam.Beams);
        assert.strictEqual(typeof beamsList[2], 'undefined');

        assert.strictEqual(beamsList[0].beamsList[0].type, 'start');
        assert.strictEqual(beamsList[1].beamsList[0].type, 'stop');
    });

    test('music21.meter.TimeSignature compound', assert => {
        const m = new music21.meter.TimeSignature('6/8');

        assert.equal(m.ratioString, '6/8', 'ratioString matches');
        assert.equal(m.barDuration.quarterLength, 3.0, 'bar lasts 3.0 ql');
        assert.deepEqual(
            m.beatGroups,
            [[3, 8], [3, 8]],
            'beatGroups check out'
        );
        assert.equal(m.beatCount, 2, 'beat count is 2');
        assert.equal(
            m.beatDuration.type,
            'quarter',
            'beatDuration type is quarter'
        );
        assert.equal(m.beatDuration.dots, 1, 'beatDuration has dot');
    });
}
