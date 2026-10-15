import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSlotsByZone, lastSevenDays, weekChange, weekdayOf } from './dashboardDates.js';

test('fills the 7 days up to today, oldest first', () => {
  const days = lastSevenDays([{ date: '2026-10-14', sales: 500, orders: 2 }], '2026-10-15');
  assert.deepEqual(days.map((day) => day.date), ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']);
  assert.deepEqual(days.map((day) => day.sales), [0, 0, 0, 0, 0, 500, 0]);
  assert.equal(weekdayOf('2026-10-15'), 'Thu');
});

test('compares with the week before only when it had sales', () => {
  assert.equal(weekChange(1180, 1000), 18);
  assert.equal(weekChange(900, 1000), -10);
  assert.equal(weekChange(900, 0), null);
});

test('groups slots by zone and keeps zones without delivery tomorrow', () => {
  const groups = groupSlotsByZone([
    { zoneId: 1, zoneName: 'A', slotId: 10 }, { zoneId: 2, zoneName: 'B', slotId: null }, { zoneId: 1, zoneName: 'A', slotId: 11 },
  ]);
  assert.deepEqual(groups.map((zone) => [zone.zoneName, zone.slots.map((slot) => slot.slotId)]), [['A', [10, 11]], ['B', []]]);
});
