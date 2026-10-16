import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

// Typed spec for the PeyaraSocket TurboModule (pinned-TLS transport).
// Codegen turns this into the native interfaces both platforms implement
// (see codegenConfig in package.json). Events flow through NativeEventEmitter
// on top of this module, so addListener/removeListeners are part of the spec.

export interface Spec extends TurboModule {
  verify(fingerprintHex: string, baseUrl: string): Promise<string>;
  connect(fingerprintHex: string, baseUrl: string, pairCode: string): Promise<void>;
  disconnect(): void;
  send(message: string): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PeyaraSocket');
