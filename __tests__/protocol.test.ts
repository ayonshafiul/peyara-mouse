import {buildWsUrl, parseServerMessage} from '../src/utils/protocol';

describe('native WebSocket protocol (server v2.0.0)', () => {
  test('builds ws url from http discovery url', () => {
    expect(buildWsUrl('http://192.168.1.5:1313')).toBe(
      'ws://192.168.1.5:1313/ws',
    );
  });

  test('strips trailing slashes before appending /ws', () => {
    expect(buildWsUrl('http://192.168.1.5:1313/')).toBe(
      'ws://192.168.1.5:1313/ws',
    );
  });

  test('upgrades https to wss', () => {
    expect(buildWsUrl('https://example.com:1313')).toBe(
      'wss://example.com:1313/ws',
    );
  });

  test('leaves existing ws urls alone', () => {
    expect(buildWsUrl('ws://192.168.1.5:1313/ws')).toBe(
      'ws://192.168.1.5:1313/ws',
    );
  });

  test('parses text-mobile frames', () => {
    expect(
      parseServerMessage('{"type":"text-mobile","text":"hello"}'),
    ).toEqual({type: 'text-mobile', text: 'hello'});
  });

  test('rejects invalid JSON', () => {
    expect(parseServerMessage('not json')).toBeNull();
  });

  test('rejects messages without a type', () => {
    expect(parseServerMessage('{"text":"hello"}')).toBeNull();
  });

  test('rejects binary (non-string) frames', () => {
    expect(parseServerMessage(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
