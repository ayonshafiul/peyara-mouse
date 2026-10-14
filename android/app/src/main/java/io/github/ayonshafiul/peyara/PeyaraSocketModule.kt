package io.github.ayonshafiul.peyara

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.peyarasocket.NativePeyaraSocketSpec
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.io.IOException
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.X509TrustManager

/**
 * Pinned-TLS transport for the Peyara desktop server (protocol v2).
 *
 * The server mints a fresh self-signed certificate per launch; the phone
 * pins that exact certificate by SHA-256 fingerprint (from the QR code).
 * No system-CA trust is used. Hostname verification is bypassed because
 * the pin itself is the authentication.
 *
 * Owns the full networking lifecycle: pinned HTTPS verification (GET /),
 * the wss://…/ws socket, fire-and-forget JSON sends, and reconnect with
 * exponential backoff + jitter. Emits status/message events to JS.
 *
 * Implements the Codegen-generated NativePeyaraSocketSpec (see
 * specs/NativePeyaraSocket.ts + codegenConfig in package.json).
 */
class PeyaraSocketModule(reactContext: ReactApplicationContext) :
  NativePeyaraSocketSpec(reactContext) {

  companion object {
    const val NAME = "PeyaraSocket"
    const val EVENT_STATUS = "PeyaraSocketStatus"
    const val EVENT_MESSAGE = "PeyaraSocketMessage"
    const val STATUS_CONNECTED = "connected"
    const val STATUS_DISCONNECTED = "disconnected"
    const val STATUS_UNRECOVERABLE = "unrecoverable"
    const val MAX_ATTEMPTS = 8
    const val MAX_DELAY_MS = 30000L
  }

  private val scheduler = Executors.newSingleThreadScheduledExecutor()
  private val random = SecureRandom()

  @Volatile private var httpClient: OkHttpClient? = null
  @Volatile private var webSocket: WebSocket? = null
  @Volatile private var fingerprint: ByteArray? = null
  @Volatile private var baseUrl: String? = null
  @Volatile private var manualDisconnect = false
  @Volatile private var attempts = 0
  @Volatile private var generation = 0
  private var reconnectTask: ScheduledFuture<*>? = null

  override fun getName() = NAME

  // Required stubs for the RN event-emitter pattern.
  override fun addListener(eventName: String) {
  }

  override fun removeListeners(count: Double) {
  }

  private fun emitStatus(status: String) {
    val params = Arguments.createMap()
    params.putString("status", status)
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_STATUS, params)
  }

  private fun emitMessage(data: String) {
    val params = Arguments.createMap()
    params.putString("data", data)
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_MESSAGE, params)
  }

  private fun parseFingerprint(hex: String): ByteArray? {
    val clean = hex.trim().removePrefix("sha256:")
    if (!clean.matches(Regex("[0-9a-fA-F]{64}"))) {
      return null
    }
    return ByteArray(32) { i ->
      clean.substring(i * 2, i * 2 + 2).toInt(16).toByte()
    }
  }

  private fun pinnedClient(fp: ByteArray): OkHttpClient {
    val trustManager = FingerprintTrustManager(fp)
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf(trustManager), SecureRandom())
    return OkHttpClient.Builder()
      .sslSocketFactory(sslContext.socketFactory, trustManager)
      // Pinning replaces hostname verification (LAN IPs, self-signed cert).
      .hostnameVerifier { _, _ -> true }
      .connectTimeout(5, TimeUnit.SECONDS)
      .readTimeout(5, TimeUnit.SECONDS)
      .build()
  }

  private fun wssUrl(): String? {
    val base = baseUrl?.trim()?.trimEnd('/') ?: return null
    val ws = when {
      base.startsWith("https://", ignoreCase = true) -> "wss://" + base.substring(8)
      base.startsWith("http://", ignoreCase = true) -> "ws://" + base.substring(7)
      else -> base
    }
    return if (ws.endsWith("/ws")) ws else "$ws/ws"
  }

  /**
   * Pinned HTTPS verification: GET <baseUrl>/ must return JSON "peyara".
   * Used when scanning a QR code to pick a working candidate URL.
   */
  override fun verify(fingerprintHex: String, url: String, promise: Promise) {
    val fp = parseFingerprint(fingerprintHex)
    if (fp == null) {
      promise.reject("E_BAD_FINGERPRINT", "fingerprint must be 64 hex chars")
      return
    }
    val base = url.trim().trimEnd('/')
    if (!base.startsWith("https://", ignoreCase = true)) {
      promise.reject("E_BAD_URL", "url must use the https:// scheme")
      return
    }
    val client = try {
      pinnedClient(fp)
    } catch (e: Exception) {
      promise.reject("E_TLS", e.message)
      return
    }
    val request = Request.Builder().url("$base/").get().build()
    client.newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        promise.reject("E_VERIFY", e.message)
      }

      override fun onResponse(call: Call, response: Response) {
        response.use {
          val body = (it.body?.string() ?: "").trim()
          // The server answers discovery with JSON `"peyara"`.
          val ok = try {
            org.json.JSONTokener(body).nextValue() == "peyara"
          } catch (_: Exception) {
            false
          }
          if (it.isSuccessful && ok) {
            promise.resolve(body)
          } else {
            promise.reject("E_VERIFY", "unexpected response: $body")
          }
        }
      }
    })
  }

  /**
   * Starts the managed connection: verifies the pin, opens wss://…/ws and
   * reconnects with backoff on drops. Resolves once started; connection
   * progress arrives via status events.
   */
  override fun connect(fingerprintHex: String, url: String, promise: Promise) {
    val fp = parseFingerprint(fingerprintHex)
    if (fp == null) {
      promise.reject("E_BAD_FINGERPRINT", "fingerprint must be 64 hex chars")
      return
    }
    val base = url.trim().trimEnd('/')
    if (!base.startsWith("https://", ignoreCase = true)) {
      promise.reject("E_BAD_URL", "url must use the https:// scheme")
      return
    }
    cancelReconnect()
    closeSilently()
    fingerprint = fp
    baseUrl = base
    manualDisconnect = false
    attempts = 0
    generation++
    httpClient = try {
      pinnedClient(fp)
    } catch (e: Exception) {
      promise.reject("E_TLS", e.message)
      return
    }
    openSocket()
    promise.resolve(null)
  }

  override fun disconnect() {
    manualDisconnect = true
    cancelReconnect()
    generation++
    closeSilently()
    httpClient?.dispatcher?.executorService?.shutdown()
    httpClient = null
  }

  /** Fire-and-forget JSON send; drops frames while the socket isn't open. */
  override fun send(message: String) {
    try {
      webSocket?.send(message)
    } catch (_: Exception) {
      // connection is gone; the close handler reports state
    }
  }

  private fun openSocket() {
    val client = httpClient ?: return
    val target = wssUrl() ?: return
    val gen = generation
    val request = Request.Builder().url(target).build()
    webSocket = client.newWebSocket(request, object : WebSocketListener() {
      override fun onOpen(webSocket: WebSocket, response: Response) {
        if (gen != generation) {
          return
        }
        attempts = 0
        emitStatus(STATUS_CONNECTED)
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        if (gen != generation) {
          return
        }
        emitMessage(text)
      }

      override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
        webSocket.close(1000, null)
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        handleClose(gen)
      }

      override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        handleClose(gen)
      }
    })
  }

  private fun handleClose(gen: Int) {
    // Ignore stale sockets superseded by a newer connection.
    if (gen != generation) {
      return
    }
    webSocket = null
    emitStatus(STATUS_DISCONNECTED)
    scheduleReconnect()
  }

  private fun scheduleReconnect() {
    if (manualDisconnect) {
      return
    }
    cancelReconnect()
    if (attempts >= MAX_ATTEMPTS) {
      // Pinning probably broke (cert regenerated) — ask the user to rescan.
      emitStatus(STATUS_UNRECOVERABLE)
      return
    }
    val expDelay = 1000L * (1L shl attempts.coerceAtMost(10))
    val delay = minOf(expDelay, MAX_DELAY_MS) + random.nextInt(500)
    attempts++
    reconnectTask = scheduler.schedule({
      if (!manualDisconnect) {
        openSocket()
      }
    }, delay, TimeUnit.MILLISECONDS)
  }

  private fun cancelReconnect() {
    reconnectTask?.cancel(false)
    reconnectTask = null
  }

  private fun closeSilently() {
    val ws = webSocket
    webSocket = null
    try {
      ws?.close(1000, "client disconnect")
    } catch (_: Exception) {
      // already closed
    }
  }

  override fun onCatalystInstanceDestroy() {
    manualDisconnect = true
    cancelReconnect()
    closeSilently()
    scheduler.shutdownNow()
  }
}

/**
 * TrustManager that pins the exact server certificate: it computes SHA-256
 * over the presented leaf certificate (DER) and compares — constant-time —
 * against the QR fingerprint. Anything else aborts the handshake.
 */
private class FingerprintTrustManager(
  private val fingerprint: ByteArray,
) : X509TrustManager {

  override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {
  }

  override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
    if (chain.isEmpty()) {
      throw CertificateException("empty certificate chain")
    }
    val digest = MessageDigest.getInstance("SHA-256").digest(chain[0].encoded)
    if (!MessageDigest.isEqual(digest, fingerprint)) {
      throw CertificateException("certificate pin mismatch")
    }
  }

  override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
}
