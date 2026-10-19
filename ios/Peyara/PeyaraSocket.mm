#import "PeyaraSocket.h"
#import <CommonCrypto/CommonCrypto.h>

static NSString *const kStatusEvent = @"PeyaraSocketStatus";
static NSString *const kMessageEvent = @"PeyaraSocketMessage";
static const NSInteger kMaxAttempts = 8;
static const NSTimeInterval kMaxDelaySeconds = 30.0;
static const NSTimeInterval kRequestTimeoutSeconds = 10.0;

// Constant-time comparison for the certificate fingerprint.
static BOOL PeyaraConstantTimeEqual(NSData *a, NSData *b) {
  if (a.length != b.length) {
    return NO;
  }
  const uint8_t *x = (const uint8_t *)a.bytes;
  const uint8_t *y = (const uint8_t *)b.bytes;
  uint8_t diff = 0;
  for (NSUInteger i = 0; i < a.length; i++) {
    diff |= x[i] ^ y[i];
  }
  return diff == 0;
}

@interface PeyaraSocket () <NSURLSessionDelegate>

@property (nonatomic, strong, nullable) NSURLSession *session;
@property (nonatomic, strong, nullable) NSURLSessionWebSocketTask *socketTask;
@property (nonatomic, strong, nullable) NSData *fingerprint;
@property (nonatomic, copy, nullable) NSString *baseUrl;
@property (nonatomic, copy, nullable) NSString *pairCode;
@property (nonatomic, assign) BOOL manualDisconnect;
@property (nonatomic, assign) NSInteger attempts;
@property (nonatomic, assign) NSInteger generation;
@property (nonatomic, assign) NSTimeInterval openedAt;
@property (nonatomic, assign) BOOL hasListeners;
@property (nonatomic, copy, nullable) dispatch_block_t pendingReconnect;

@end

@implementation PeyaraSocket

// Hooks this class into the TurboModule runtime via the Codegen spec.
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativePeyaraSocketSpecJSI>(params);
}

+ (NSString *)moduleName {
  return @"PeyaraSocket";
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[ kStatusEvent, kMessageEvent ];
}

- (void)startObserving {
  self.hasListeners = YES;
}

- (void)stopObserving {
  self.hasListeners = NO;
}

#pragma mark - Events

- (void)sendStatus:(NSString *)status {
  if (self.hasListeners) {
    [self sendEventWithName:kStatusEvent body:@{@"status" : status}];
  }
}

- (void)sendMessageText:(NSString *)text {
  if (self.hasListeners) {
    [self sendEventWithName:kMessageEvent body:@{@"data" : text}];
  }
}

#pragma mark - Helpers

// Parses the QR fingerprint field: 64 lowercase hex chars (sha256: prefix
// optional). Returns nil when malformed.
- (nullable NSData *)dataFromHex:(NSString *)hex {
  if (!hex) {
    return nil;
  }
  NSString *clean = [[hex stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] lowercaseString];
  if ([clean hasPrefix:@"sha256:"]) {
    clean = [clean substringFromIndex:7];
  }
  if (clean.length != 64) {
    return nil;
  }
  NSCharacterSet *hexSet = [NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdef"];
  if ([[clean stringByTrimmingCharactersInSet:hexSet] length] != 0) {
    return nil;
  }
  NSMutableData *data = [NSMutableData dataWithCapacity:32];
  for (NSUInteger i = 0; i < 64; i += 2) {
    unsigned int byte = 0;
    [[NSScanner scannerWithString:[clean substringWithRange:NSMakeRange(i, 2)]] scanHexInt:&byte];
    uint8_t b = (uint8_t)byte;
    [data appendBytes:&b length:1];
  }
  return data;
}

- (NSString *)trimmedBaseUrl:(NSString *)url {
  NSString *base = [url stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
  while ([base hasSuffix:@"/"] && base.length > 0) {
    base = [base substringToIndex:base.length - 1];
  }
  return base;
}

// Derives wss://<host>:1313/ws from the https:// base URL.
- (nullable NSString *)socketURLString {
  NSString *base = self.baseUrl;
  if (!base) {
    return nil;
  }
  NSString *lower = [base lowercaseString];
  NSString *ws = nil;
  if ([lower hasPrefix:@"https://"]) {
    ws = [@"wss://" stringByAppendingString:[base substringFromIndex:8]];
  } else if ([lower hasPrefix:@"http://"]) {
    ws = [@"ws://" stringByAppendingString:[base substringFromIndex:7]];
  } else {
    ws = base;
  }
  if (![ws hasSuffix:@"/ws"]) {
    ws = [ws stringByAppendingString:@"/ws"];
  }
  return ws;
}

#pragma mark - TLS pinning (NSURLSessionDelegate)

// Pins the exact server certificate: SHA-256 over the presented leaf
// certificate (DER) must match the QR fingerprint. Anything else aborts
// the handshake. No system-CA trust is used.
- (void)URLSession:(NSURLSession *)session
    didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
      completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential *_Nullable))completionHandler {
  if (![challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
    completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, nil);
    return;
  }
  SecTrustRef trust = challenge.protectionSpace.serverTrust;
  if (self.fingerprint && trust && SecTrustGetCertificateCount(trust) > 0) {
    SecCertificateRef leaf = SecTrustGetCertificateAtIndex(trust, 0);
    NSData *der = (__bridge_transfer NSData *)SecCertificateCopyData(leaf);
    unsigned char digest[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(der.bytes, (CC_LONG)der.length, digest);
    NSData *actual = [NSData dataWithBytes:digest length:sizeof(digest)];
    if (PeyaraConstantTimeEqual(actual, self.fingerprint)) {
      // Fingerprint matches. Additionally verify the hostname normally:
      // anchor only the leaf certificate and evaluate an SSL policy for
      // the host, so the IP SANs are checked instead of blindly trusting.
      SecPolicyRef sslPolicy = SecPolicyCreateSSL(true, (__bridge CFStringRef)challenge.protectionSpace.host);
      SecTrustSetPolicies(trust, sslPolicy);
      CFRelease(sslPolicy);
      SecTrustSetAnchorCertificates(trust, (__bridge CFArrayRef)@[(__bridge id)leaf]);
      SecTrustSetAnchorCertificatesOnly(trust, true);
      CFErrorRef evalError = NULL;
      if (SecTrustEvaluateWithError(trust, &evalError)) {
        NSURLCredential *credential = [NSURLCredential credentialForTrust:trust];
        completionHandler(NSURLSessionAuthChallengeUseCredential, credential);
        return;
      }
    }
  }
  completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, nil);
}

#pragma mark - Connection lifecycle

- (void)cancelReconnect {
  if (self.pendingReconnect) {
    dispatch_block_cancel(self.pendingReconnect);
    self.pendingReconnect = nil;
  }
}

- (void)scheduleReconnect {
  if (self.manualDisconnect) {
    return;
  }
  [self cancelReconnect];
  if (self.attempts >= kMaxAttempts) {
    // Pinning probably broke (cert regenerated) — ask the user to rescan.
    [self sendStatus:@"unrecoverable"];
    return;
  }
  NSInteger attempt = self.attempts++;
  NSTimeInterval delay = MIN((NSTimeInterval)(1 << attempt), kMaxDelaySeconds) +
      ((NSTimeInterval)arc4random_uniform(500) / 1000.0);
  NSInteger gen = self.generation;
  __weak __typeof__(self) weakSelf = self;
  // Flags must be explicitly cast: in ObjC++ the literal 0 (int) won't
  // implicitly convert to the enum-typed dispatch_block_flags_t.
  dispatch_block_t block = dispatch_block_create((dispatch_block_flags_t)0, ^{
    __strong __typeof__(self) strongSelf = weakSelf;
    if (!strongSelf || strongSelf.manualDisconnect || gen != strongSelf.generation) {
      return;
    }
    [strongSelf startConnection];
  });
  self.pendingReconnect = block;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delay * NSEC_PER_SEC)), dispatch_get_main_queue(), block);
}

- (void)handleDisconnect {
  NSTimeInterval opened = self.openedAt;
  self.openedAt = 0;
  if (opened != 0 && [[NSDate date] timeIntervalSince1970] - opened < 1.5) {
    // Closed right after open: the server rejected the pairing code
    // (wrong/stale). Never retry-loop a dead code — prompt a re-scan.
    [self sendStatus:@"pairing-rejected"];
    return;
  }
  [self sendStatus:@"disconnected"];
  [self scheduleReconnect];
}

// Verifies the pin with a pinned GET / (must return JSON "peyara"), then
// opens the socket. Every (re)connect goes through verification so a
// regenerated certificate is detected instead of silently failing.
- (void)startConnection {
  if (self.manualDisconnect || !self.baseUrl) {
    return;
  }
  NSInteger gen = self.generation;
  NSString *verifyURLString = [self.baseUrl stringByAppendingString:@"/"];
  NSURL *verifyURL = [NSURL URLWithString:verifyURLString];
  if (!verifyURL) {
    [self handleDisconnect];
    return;
  }
  __weak __typeof__(self) weakSelf = self;
  [[self.session dataTaskWithURL:verifyURL
               completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
                 __strong __typeof__(self) strongSelf = weakSelf;
                 if (!strongSelf || gen != strongSelf.generation) {
                   return;
                 }
                 BOOL ok = NO;
                 if (!error && [response isKindOfClass:[NSHTTPURLResponse class]]) {
                   NSInteger code = ((NSHTTPURLResponse *)response).statusCode;
                   NSString *body = [[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]
                       stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
                   // The server answers discovery with JSON `"peyara"`.
                   ok = code >= 200 && code < 300 && [body isEqualToString:@"\"peyara\""];
                 }
                 if (ok) {
                   [strongSelf openSocketWithGeneration:gen];
                 } else {
                   [strongSelf handleDisconnect];
                 }
               }] resume];
}

- (void)openSocketWithGeneration:(NSInteger)gen {
  NSString *urlString = [self socketURLString];
  NSURL *url = [NSURL URLWithString:urlString ?: @""];
  if (!url) {
    [self handleDisconnect];
    return;
  }
  NSURLSessionWebSocketTask *task = [self.session webSocketTaskWithURL:url];
  self.socketTask = task;
  self.openedAt = [[NSDate date] timeIntervalSince1970];
  // Pairing handshake first: hello precedes every other frame. The code is a
  // validated 8-hex string, so interpolation is safe. Sends before the
  // handshake completes are buffered by the task, preserving order.
  NSString *hello = [NSString stringWithFormat:@"{\"type\":\"hello\",\"pair\":\"%@\"}", self.pairCode ?: @""];
  NSURLSessionWebSocketMessage *helloMessage = [[NSURLSessionWebSocketMessage alloc] initWithString:hello];
  [task sendMessage:helloMessage
    completionHandler:^(NSError *_Nullable error) {
      // fire-and-forget; close handler reports state
    }];
  [self sendStatus:@"connected"];
  [task resume];
  [self receiveNextWithGeneration:gen];
}

- (void)receiveNextWithGeneration:(NSInteger)gen {
  NSURLSessionWebSocketTask *task = self.socketTask;
  if (!task) {
    return;
  }
  __weak __typeof__(self) weakSelf = self;
  [task receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *_Nullable message, NSError *_Nullable error) {
    __strong __typeof__(self) strongSelf = weakSelf;
    if (!strongSelf || gen != strongSelf.generation) {
      return;
    }
    if (error) {
      [strongSelf handleDisconnect];
      return;
    }
    if (message.type == NSURLSessionWebSocketMessageTypeString && message.string) {
      [strongSelf sendMessageText:message.string];
    }
    [strongSelf receiveNextWithGeneration:gen];
  }];
}

- (void)teardownSocket {
  NSURLSessionWebSocketTask *task = self.socketTask;
  self.socketTask = nil;
  [task cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
}

// Listener hooks required by the spec. They forward to RCTEventEmitter so
// its listener tracking (startObserving/stopObserving) keeps working.
- (void)addListener:(NSString *)eventName {
  [super addListener:eventName];
}

- (void)removeListeners:(double)count {
  [super removeListeners:count];
}

#pragma mark - Spec methods

// Pinned HTTPS verification: GET <baseUrl>/ must return JSON "peyara".
// Used when scanning a QR code to pick a working candidate URL.
- (void)verify:(NSString *)fingerprintHex
       baseUrl:(NSString *)baseUrl
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject {
  NSData *fp = [self dataFromHex:fingerprintHex];
  if (!fp) {
    reject(@"E_BAD_FINGERPRINT", @"fingerprint must be 64 hex chars", nil);
    return;
  }
  NSString *base = [self trimmedBaseUrl:baseUrl ?: @""];
  if (![[base lowercaseString] hasPrefix:@"https://"]) {
    reject(@"E_BAD_URL", @"url must use the https:// scheme", nil);
    return;
  }
  self.fingerprint = fp;
  NSURLSessionConfiguration *config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
  config.timeoutIntervalForRequest = kRequestTimeoutSeconds;
  NSURLSession *session = [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:nil];
  NSURL *verifyURL = [NSURL URLWithString:[base stringByAppendingString:@"/"]];
  if (!verifyURL) {
    reject(@"E_BAD_URL", @"url is malformed", nil);
    return;
  }
  [[session dataTaskWithURL:verifyURL
          completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
            [session finishTasksAndInvalidate];
            if (error) {
              reject(@"E_VERIFY", error.localizedDescription, error);
              return;
            }
            BOOL statusOk = [response isKindOfClass:[NSHTTPURLResponse class]] &&
                ((NSHTTPURLResponse *)response).statusCode >= 200 &&
                ((NSHTTPURLResponse *)response).statusCode < 300;
            NSString *body = [[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]
                stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
            if (statusOk && [body isEqualToString:@"\"peyara\""]) {
              resolve(body);
            } else {
              reject(@"E_VERIFY", [NSString stringWithFormat:@"unexpected response: %@", body], nil);
            }
          }] resume];
}

// Starts the managed connection: verifies the pin, opens wss://…/ws and
// reconnects with backoff on drops. Resolves once started; connection
// progress arrives via status events.
- (void)connect:(NSString *)fingerprintHex
        baseUrl:(NSString *)baseUrl
       pairCode:(NSString *)pairCode
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  NSData *fp = [self dataFromHex:fingerprintHex];
  if (!fp) {
    reject(@"E_BAD_FINGERPRINT", @"fingerprint must be 64 hex chars", nil);
    return;
  }
  NSString *base = [self trimmedBaseUrl:baseUrl ?: @""];
  if (![[base lowercaseString] hasPrefix:@"https://"]) {
    reject(@"E_BAD_URL", @"url must use the https:// scheme", nil);
    return;
  }
  NSString *code = [pairCode stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
  NSCharacterSet *nonHex = [[NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdefABCDEF"] invertedSet];
  if (!code || code.length != 8 || [code rangeOfCharacterFromSet:nonHex].location != NSNotFound) {
    reject(@"E_BAD_PAIR", @"pairing code must be 8 hex chars", nil);
    return;
  }
  [self cancelReconnect];
  [self teardownSocket];
  if (self.session) {
    [self.session invalidateAndCancel];
  }
  self.fingerprint = fp;
  self.baseUrl = base;
  self.pairCode = code;
  self.manualDisconnect = NO;
  self.attempts = 0;
  self.openedAt = 0;
  self.generation += 1;
  NSURLSessionConfiguration *config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
  self.session = [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:nil];
  [self startConnection];
  resolve(nil);
}

- (void)disconnect {
  self.manualDisconnect = YES;
  [self cancelReconnect];
  self.generation += 1;
  self.openedAt = 0;
  [self teardownSocket];
  if (self.session) {
    [self.session invalidateAndCancel];
    self.session = nil;
  }
}

// Fire-and-forget JSON send; drops frames while the socket isn't open.
- (void)send:(NSString *)message {
  NSURLSessionWebSocketTask *task = self.socketTask;
  if (!task || !message) {
    return;
  }
  NSURLSessionWebSocketMessage *wsMessage = [[NSURLSessionWebSocketMessage alloc] initWithString:message];
  [task sendMessage:wsMessage
    completionHandler:^(NSError *_Nullable error) {
      // fire-and-forget; close handler reports state
    }];
}

- (void)dealloc {
  [self cancelReconnect];
  [self.session invalidateAndCancel];
}

@end
