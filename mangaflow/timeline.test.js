'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {buildTimeline} = require('./timeline');
const {fromLegacyCsvRows} = require('./schema');
test('overlaps are accounted for in composition duration', () => {
  const board = fromLegacyCsvRows([{id:'a',text:'one',image:'a.jpg',durationSeconds:2},{id:'b',text:'two',image:'b.jpg',durationSeconds:3}]);
  const result = buildTimeline(board,30,10);
  assert.equal(result.durationInFrames,140);
  assert.equal(result.shots[1].startFrame,50);
});
test('very short shots do not create negative duration', () => {
  const board = fromLegacyCsvRows([{id:'a',image:'a.jpg',durationSeconds:0.04},{id:'b',image:'b.jpg',durationSeconds:0.04}]);
  const result = buildTimeline(board,30,10);
  assert.equal(result.durationInFrames,2);
});
test('duplicate shot ids are rejected', () => {
  assert.throws(()=>fromLegacyCsvRows([{id:'x',image:'a.jpg'},{id:'x',image:'b.jpg'}]),/duplicate/);
});
