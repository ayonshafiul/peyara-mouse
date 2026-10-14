import {parseServerMessage} from '../src/utils/protocol';

describe('native WebSocket protocol (server v2.0.0)', () => {
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
