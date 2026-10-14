#import <React/RCTEventEmitter.h>
#import <PeyaraSocketSpec/PeyaraSocketSpec.h>

// Implements the Codegen-generated NativePeyaraSocketSpec (see
// specs/NativePeyaraSocket.ts + codegenConfig in package.json).
// RCTEventEmitter supplies the event side (NativeEventEmitter calls the
// spec's addListener/removeListeners, which forward to super so listener
// tracking keeps working); the SpecJSI object dispatches the methods.
@interface PeyaraSocket : RCTEventEmitter <NativePeyaraSocketSpec>

@end
