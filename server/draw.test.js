import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRecipient } from './draw.js';

function runDraw(n) {
  const people = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, recipientId: null }));
  // dalyviai atplėšia laiškus atsitiktine tvarka
  const order = [...people].sort(() => Math.random() - 0.5);
  for (const p of order) {
    const r = pickRecipient(people, p.id);
    assert.ok(r, `dalyvis ${p.id} negavo gavėjo (n=${n})`);
    p.recipientId = r;
  }
  return people;
}

test('kiekvienas gauna lygiai vieną gavėją ir niekada savęs', () => {
  for (let n = 2; n <= 9; n++) {
    for (let round = 0; round < 300; round++) {
      const people = runDraw(n);
      assert.equal(new Set(people.map((p) => p.recipientId)).size, n);
      for (const p of people) assert.notEqual(p.recipientId, p.id);
    }
  }
});

test('vienas dalyvis gavėjo negauna', () => {
  assert.equal(pickRecipient([{ id: 'a', recipientId: null }], 'a'), null);
});
