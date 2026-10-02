import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCutoff, toCutoffChoice, toCutoffMinutesBefore } from './slotCutoff.js';

test('cutoffs convert between minutes and "time on a day"', () => {
  assert.deepEqual(toCutoffChoice('07:00', 540), { daysBefore: 1, time: '22:00' });
  assert.deepEqual(toCutoffChoice('18:00', 240), { daysBefore: 0, time: '14:00' });
  assert.equal(toCutoffMinutesBefore('07:00', { daysBefore: 1, time: '22:00' }), 540);
  assert.equal(toCutoffMinutesBefore('07:00', { daysBefore: 0, time: '08:00' }), null, 'after the slot starts');
  assert.equal(describeCutoff('10:00', 840), '8 PM, day before');
  assert.equal(describeCutoff('07:00', 0), '7 AM, same day');
});
