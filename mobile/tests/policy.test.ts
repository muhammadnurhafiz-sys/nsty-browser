import test from 'node:test';
import assert from 'node:assert/strict';
import { address, isHost, restoreSession, serializeSession, blockedRequest } from '../src/policy.ts';

test('normalizes addresses, search and rejects executable or credential URLs', () => {
  assert.equal(address('example.org'), 'https://example.org');
  assert.equal(address('two words'), 'https://www.google.com/search?q=two%20words');
  for (const input of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test', 'https://u:p@example.org']) assert.equal(address(input), null);
});
test('matches only actual host and subdomains', () => {
  assert.equal(isHost('https://m.youtube.com/watch?v=1', 'youtube.com'), true);
  for (const url of ['https://youtube.com.evil.org', 'https://notyoutube.com', 'https://youtube.com@evil.org']) assert.equal(isHost(url, 'youtube.com'), false);
});
test('session restores active tab and discards unsafe URLs', () => {
  const state = { tabs: [{ id: 'a', url: 'https://one.org', title: 'One' }, { id: 'b', url: 'https://two.org', title: 'Two' }], activeId: 'b' };
  assert.deepEqual(restoreSession(serializeSession(state)), state);
  const restored = restoreSession('{"tabs":[{"id":"x","url":"javascript:alert(1)","title":"Bad"}],"activeId":"x"}');
  assert.equal(restored.tabs.length, 1);
  assert.equal(restored.tabs[0].url, '');
  assert.equal(restored.activeId, restored.tabs[0].id);
});
test('shield filter respects setting and safe boundaries', () => {
  assert.equal(blockedRequest('https://ad.doubleclick.net/a', true), true);
  assert.equal(blockedRequest('https://doubleclick.net.evil.org/a', true), false);
  assert.equal(blockedRequest('https://ad.doubleclick.net/a', false), false);
});

test('displayHost shows the registrable host without scheme, www or path', async () => {
  const { displayHost } = await import('../src/policy.ts');
  assert.equal(displayHost('https://www.nasty.worldwide/journal?x=1'), 'nasty.worldwide');
  assert.equal(displayHost('http://localhost:3000/'), 'localhost:3000');
  assert.equal(displayHost(''), '');
});
test('topSites ranks hosts by visit count and keeps the latest title', async () => {
  const { topSites } = await import('../src/policy.ts');
  const history = [
    { url: 'https://a.test/1', title: 'A one', date: 1 }, { url: 'https://b.test/', title: 'B', date: 2 },
    { url: 'https://a.test/2', title: 'A two', date: 3 }, { url: 'https://c.test/', title: 'C', date: 4 }, { url: 'https://a.test/3', title: 'A three', date: 5 },
  ];
  const sites = topSites(history, 2);
  assert.deepEqual(sites.map(s => s.host), ['a.test', 'c.test']);
  assert.equal(sites[0]!.title, 'A three');
  assert.equal(sites[0]!.url, 'https://a.test/3');
});
test('private tabs never enter the serialized session or history', async () => {
  const { serializeSession, newTab, recordVisit } = await import('../src/policy.ts');
  const open = newTab(); open.url = 'https://public.test/';
  const secret = newTab(true); secret.url = 'https://secret.test/';
  const saved = JSON.parse(serializeSession({ tabs: [open, secret], activeId: secret.id }));
  assert.deepEqual(saved.tabs.map((t: { url: string }) => t.url), ['https://public.test/']);
  assert.equal(saved.activeId, open.id);
  assert.deepEqual(recordVisit([], secret, 'T'), []);
  assert.equal(recordVisit([], open, 'T').length, 1);
});
