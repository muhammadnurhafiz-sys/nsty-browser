import test from 'node:test';
import assert from 'node:assert/strict';
import { address, closeTabIn, linkAction, mountedTabs, newTab, sameKindCount } from '../src/policy.ts';

test('address accepts host:port and treats "word: text" as a search', () => {
  assert.equal(address('localhost:3000'), 'https://localhost:3000');
  assert.equal(address('example.com:8080/x'), 'https://example.com:8080/x');
  assert.equal(address('error: cannot find module'), 'https://www.google.com/search?q=error%3A%20cannot%20find%20module');
  assert.equal(address('time: 5pm'), 'https://www.google.com/search?q=time%3A%205pm');
  assert.equal(address('http://localhost:3000/'), 'http://localhost:3000/');
  for (const input of ['javascript:alert(1)', 'intent://x#Intent;end', 'market://details?id=a']) assert.equal(address(input), null);
});
test('linkAction classifies web, app and blocked schemes', () => {
  assert.equal(linkAction('https://a.test/'), 'web');
  assert.equal(linkAction('about:blank'), 'web');
  for (const url of ['mailto:a@b.c', 'tel:123', 'sms:123', 'intent://scan#Intent;scheme=zxing;end', 'market://details?id=x', 'whatsapp://send']) assert.equal(linkAction(url), 'app');
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'blob:https://a.test/1']) assert.equal(linkAction(url), 'blocked');
});
test('closeTabIn keeps the same kind active and reports leaving private browsing', () => {
  const a = newTab(), b = newTab(true), c = newTab(true);
  const closedC = closeTabIn({ tabs: [a, b, c], activeId: c.id }, c.id);
  assert.equal(closedC.session.activeId, b.id); assert.equal(closedC.leftPrivate, false);
  const closedB = closeTabIn(closedC.session, b.id);
  assert.equal(closedB.session.activeId, a.id); assert.equal(closedB.leftPrivate, true);
  const last = closeTabIn(closedB.session, a.id);
  assert.equal(last.session.tabs.length, 1); assert.equal(last.session.tabs[0]!.url, ''); assert.equal(last.leftPrivate, false);
  const inactive = closeTabIn({ tabs: [a, b], activeId: a.id }, b.id);
  assert.equal(inactive.session.activeId, a.id); assert.equal(inactive.leftPrivate, false);
});
test('mountedTabs keeps the active tab plus the most recent ones within the limit', () => {
  assert.deepEqual(mountedTabs(['c', 'b', 'a', 'd'], 'a', 3), new Set(['a', 'c', 'b']));
  assert.deepEqual(mountedTabs([], 'x', 3), new Set(['x']));
});
test('sameKindCount counts only tabs matching the active kind', () => {
  const a = newTab(), b = newTab(true), c = newTab(true);
  assert.equal(sameKindCount([a, b, c], a), 1);
  assert.equal(sameKindCount([a, b, c], b), 2);
});
