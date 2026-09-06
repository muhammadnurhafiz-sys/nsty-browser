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
