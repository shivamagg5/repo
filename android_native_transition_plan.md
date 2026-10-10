# Android Native Transition Plan — FINAL
## Flutter → Native Android (Kotlin + Jetpack Compose)
### Event Booking Platform — Consumer Mobile + Scanner Mobile
### Tech: Ktor Client · Circuit (MVI) · SQLDelight · KMP-Ready from Day 1

---

> [!IMPORTANT]
> **Scope:** Two Flutter apps → Native Android. Backend, database, and all web apps are **untouched**.
> **iOS later:** Architecture is KMP-ready from day 1. When iOS comes, you add a SwiftUI layer — you do NOT rewrite network, database, or business logic.

---

## Final Technology Stack — Absolute Best (2026)

| Layer | Technology | Why This Specific Choice |
| :--- | :--- | :--- |
| **Language** | **Kotlin 2.x** | Value classes, sealed interfaces, context receivers, fastest JVM compile |
| **UI** | **Jetpack Compose (Material 3 Expressive)** | Declarative, 120fps GPU compositing, shared-element transitions |
| **Architecture** | **Circuit by Slack** | Production-tested MVI at Slack scale, KMP-compatible presenters |
| **Async** | **Kotlin Coroutines 1.9 + Flow** | Structured concurrency, cold/hot streams, no RxJava needed |
| **DI** | **Dagger Hilt (KSP2)** | Compile-time verified DI, zero runtime cost, `kapt` replaced with KSP2 |
| **Navigation** | **Circuit Navigator + Compose Navigation 2.8** | Type-safe routes `@Serializable`, integrated with Circuit presenter |
| **Networking** | **Ktor Client 3.x (OkHttp engine)** | 100% Kotlin/JetBrains, coroutine-native, **KMP-ready** (same code runs on iOS) |
| **Serialization** | **Kotlinx Serialization 1.7** | Built into Ktor, compile-time, no reflection |
| **Auth** | **Supabase Kotlin SDK (`supabase-kt 3.x`)** | Direct match to existing Supabase backend |
| **Google Sign-In** | **Credential Manager API** | Newest Google SSO, replaces deprecated `GoogleSignInClient` |
| **Image Loading** | **Coil 3 (AsyncImage)** | Fastest Android image loader, Compose-first, written in Kotlin |
| **Consumer Local Storage** | **Jetpack DataStore (Encrypted)** | Preferences + proto, replaces `SharedPreferences` |
| **Scanner Offline DB** | **SQLDelight 2.x + SQLCipher 4** | Type-safe SQL, compile-time verified, **KMP-ready** (same schema runs on iOS) |
| **Secure Key Storage** | **Android Keystore + EncryptedDataStore** | Hardware-backed, replaces `flutter_secure_storage` |
| **Camera + QR (Scanner)** | **CameraX 1.4 + ML Kit Barcode 18** | Maximum hardware access, Google-backed, fastest QR decode available |
| **QR Generation** | **ZXing Android Embedded** | Battle-tested, no Play Services dependency |
| **Payment** | **Razorpay Android Native SDK** | Direct native, handles UPI app switching (GPay, PhonePe) correctly |
| **Push Notifications** | **Firebase Cloud Messaging (FCM)** | Only viable push on Android |
| **Background Sync** | **WorkManager 2.10** | System-managed, battery-efficient, constraint-aware |
| **Crypto (Scanner)** | **Google Tink 1.15** | Google-audited, safe-by-default AES-256-GCM for dataset decryption |
| **Screenshot Tests** | **Paparazzi + Roborazzi** | Zero-emulator screenshot regression testing |
| **Performance** | **Baseline Profiles + Macrobenchmark** | Guaranteed < 400ms cold start via AOT |
| **Build System** | **Gradle 8.x (Kotlin DSL) + AGP 8.8 + KSP2** | `libs.versions.toml` catalog, R8 full mode, 2× faster annotation processing |
| **CI/CD** | **GitHub Actions → Fastlane → Play Internal** | Automated sign, build, deploy pipeline |

---

## The KMP Architecture Advantage — Why This Matters

```
TODAY (Android Native)              LATER (+ iOS, zero rewrite)
─────────────────────────           ──────────────────────────────────
shared-kmp-module/ (Kotlin)  ──►    shared-kmp-module/ (same code)
├── network/  (Ktor)                ├── network/  (Ktor — iOS too)
├── database/ (SQLDelight)          ├── database/ (SQLDelight — iOS too)
├── domain/   (UseCases)            ├── domain/   (UseCases — iOS too)
└── ui/       (Circuit Presenters)  └── ui/       (Presenters — iOS too)
                                                          ↓
android-app/ (Jetpack Compose)      ios-app/ (SwiftUI — adds in 2-3 weeks)
```

**Retrofit + Room would require a full rewrite for iOS. Ktor + SQLDelight means iOS is a UI layer only.**

---

## Project Structure

```
apps/
├── consumer-mobile/                    ← Replace Flutter project
│   ├── app/
│   │   └── src/main/kotlin/io/eventhub/consumer/
│   │       ├── di/                     ← Hilt modules
│   │       ├── data/
│   │       │   ├── remote/             ← Ktor API services + DTOs
│   │       │   ├── local/              ← DataStore preferences
│   │       │   └── repository/         ← Repository implementations
│   │       ├── domain/
│   │       │   ├── model/              ← Immutable domain models
│   │       │   └── usecase/            ← Single-responsibility use cases
│   │       └── ui/
│   │           ├── theme/              ← Color, Type, Shape, Motion tokens
│   │           ├── navigation/         ← Route definitions
│   │           └── feature/
│   │               ├── home/           ← HomeScreen + HomePresenter (Circuit)
│   │               ├── discover/
│   │               ├── event/          ← EventDetailScreen + MediaGallery
│   │               ├── checkout/       ← CheckoutScreen + RazorpaySheet
│   │               ├── tickets/        ← TicketsScreen + QRDisplay
│   │               ├── auth/           ← Login, Signup, OTP
│   │               └── profile/
│   └── gradle/libs.versions.toml
│
└── scanner-mobile/                     ← Replace Flutter project
    ├── app/
    │   └── src/main/kotlin/io/eventhub/scanner/
    │       ├── di/
    │       ├── data/
    │       │   ├── remote/             ← Ktor scanner API services
    │       │   ├── local/
    │       │   │   ├── db/             ← SQLDelight generated DAOs
    │       │   │   └── datastore/      ← Device credentials DataStore
    │       │   └── repository/
    │       ├── domain/
    │       │   ├── model/
    │       │   └── usecase/
    │       └── ui/
    │           ├── theme/
    │           ├── navigation/
    │           └── feature/
    │               ├── login/          ← LoginScreen + LoginPresenter
    │               ├── pairing/        ← PairingScreen + PairingPresenter
    │               ├── scan/           ← ScanScreen + CameraX + ML Kit
    │               ├── lookup/         ← AttendeeBottomSheet
    │               └── metrics/        ← GateMetricsSheet
    └── gradle/libs.versions.toml
```

---

## Phase 1 — Bootstrap & Core Infrastructure
**Week 1–2**

### 1.1 Gradle Version Catalog (`libs.versions.toml`)
```toml
[versions]
kotlin = "2.1.0"
compose-bom = "2025.04.01"
ktor = "3.1.0"
circuit = "0.26.0"
sqldelight = "2.0.2"
hilt = "2.53"
ksp = "2.1.0-1.0.29"
coil = "3.1.0"
supabase = "3.0.0"
room = "2.7.0"
cameraX = "1.4.1"
mlkit-barcode = "18.3.1"
tink = "1.15.0"
workmanager = "2.10.0"
firebase-bom = "33.7.0"
razorpay = "1.6.40"

[libraries]
# Compose
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-navigation = { group = "androidx.navigation", name = "navigation-compose", version = "2.8.5" }

# Circuit (Slack MVI)
circuit-core = { group = "com.slack.circuit", name = "circuit-core", version.ref = "circuit" }
circuit-foundation = { group = "com.slack.circuit", name = "circuit-foundation", version.ref = "circuit" }
circuit-overlay = { group = "com.slack.circuit", name = "circuit-overlay", version.ref = "circuit" }

# Ktor
ktor-client-core = { group = "io.ktor", name = "ktor-client-core", version.ref = "ktor" }
ktor-client-okhttp = { group = "io.ktor", name = "ktor-client-okhttp", version.ref = "ktor" }
ktor-client-content-negotiation = { group = "io.ktor", name = "ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-json = { group = "io.ktor", name = "ktor-serialization-kotlinx-json", version.ref = "ktor" }
ktor-client-auth = { group = "io.ktor", name = "ktor-client-auth", version.ref = "ktor" }
ktor-client-logging = { group = "io.ktor", name = "ktor-client-logging", version.ref = "ktor" }
ktor-client-mock = { group = "io.ktor", name = "ktor-client-mock", version.ref = "ktor" }

# SQLDelight
sqldelight-android = { group = "app.cash.sqldelight", name = "android-driver", version.ref = "sqldelight" }
sqldelight-coroutines = { group = "app.cash.sqldelight", name = "coroutines-extensions", version.ref = "sqldelight" }

# Hilt
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-compiler", version.ref = "hilt" }

# Coil
coil-compose = { group = "io.coil-kt.coil3", name = "coil-compose", version.ref = "coil" }
coil-network-okhttp = { group = "io.coil-kt.coil3", name = "coil-network-okhttp", version.ref = "coil" }

# Supabase
supabase-auth = { group = "io.github.jan-tennert.supabase", name = "auth-kt", version.ref = "supabase" }

# CameraX + ML Kit
camerax-core = { group = "androidx.camera", name = "camera-core", version.ref = "cameraX" }
camerax-camera2 = { group = "androidx.camera", name = "camera-camera2", version.ref = "cameraX" }
camerax-lifecycle = { group = "androidx.camera", name = "camera-lifecycle", version.ref = "cameraX" }
camerax-view = { group = "androidx.camera", name = "camera-view", version.ref = "cameraX" }
mlkit-barcode = { group = "com.google.mlkit", name = "barcode-scanning", version.ref = "mlkit-barcode" }

# Google Tink
tink-android = { group = "com.google.crypto.tink", name = "tink-android", version.ref = "tink" }

# WorkManager
workmanager-ktx = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "workmanager" }
hilt-work = { group = "androidx.hilt", name = "hilt-work", version = "1.2.0" }

# Razorpay
razorpay = { group = "com.razorpay", name = "checkout", version.ref = "razorpay" }
```

### 1.2 Ktor Client Setup (Replaces Retrofit + http package)
```kotlin
// NetworkModule.kt
@Provides @Singleton
fun provideHttpClient(
    authTokenProvider: AuthTokenProvider,
): HttpClient = HttpClient(OkHttp) {
    engine {
        config {
            connectTimeout(8, TimeUnit.SECONDS)
            readTimeout(8, TimeUnit.SECONDS)
        }
    }
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
        })
    }
    install(Auth) {
        bearer {
            loadTokens { BearerTokens(authTokenProvider.getToken() ?: "", "") }
            refreshTokens {
                // Auto-refresh via Supabase SDK on 401
                BearerTokens(authTokenProvider.refreshToken() ?: "", "")
            }
        }
    }
    install(HttpRequestRetry) {
        retryOnServerErrors(maxRetries = 2)
        exponentialDelay()
    }
    install(Logging) {
        level = if (BuildConfig.DEBUG) LogLevel.BODY else LogLevel.NONE
    }
    defaultRequest {
        url(BuildConfig.API_BASE_URL)
        header(HttpHeaders.ContentType, ContentType.Application.Json)
        // Auto-generate idempotency key for mutations
        if (method == HttpMethod.Post || method == HttpMethod.Patch) {
            header("Idempotency-Key", UUID.randomUUID().toString())
        }
    }
}
```

### 1.3 API Response Envelope (Matches existing backend contract)
```kotlin
// Matches { data: {}, meta: { requestId: "" } } from 07_API_SPECIFICATION.md
@Serializable
data class ApiEnvelope<T>(
    val data: T,
    val meta: MetaDto? = null,
)

@Serializable
data class ApiListEnvelope<T>(
    val data: List<T>,
    val meta: PaginationMeta? = null,
)

@Serializable
data class ApiError(
    val error: ErrorBody,
    val meta: MetaDto? = null,
)

// Extension — clean API calls
suspend inline fun <reified T> HttpClient.apiGet(path: String): T =
    get(path).body<ApiEnvelope<T>>().data

suspend inline fun <reified T> HttpClient.apiPost(path: String, body: Any): T =
    post(path) { setBody(body) }.body<ApiEnvelope<T>>().data
```

### 1.4 Circuit (Slack MVI) Setup
```kotlin
// CircuitModule.kt — Hilt provides Circuit
@Provides @Singleton
fun provideCircuit(
    presenters: Set<@JvmSuppressWildcards Presenter.Factory>,
    uiFactories: Set<@JvmSuppressWildcards Ui.Factory>,
): Circuit = Circuit.Builder()
    .addPresenterFactories(presenters)
    .addUiFactories(uiFactories)
    .build()
```

---

## Phase 2 — Consumer App: Design System + All Screens
**Week 2–4**

### 2.1 Design System (Material 3 + Custom Tokens)
```kotlin
// Color.kt
val BrandViolet = Color(0xFF6C63FF)
val AccentOrange = Color(0xFFFF6B35)
val SurfaceDark = Color(0xFF0F0F1A)
val BackgroundDark = Color(0xFF080811)
val OnSurfacePrimary = Color(0xFFF5F5FF)

// Typography.kt — Urbanist via Downloadable Fonts
val EventHubTypography = Typography(
    displayLarge = TextStyle(fontFamily = UrbanistFamily, fontWeight = FontWeight.Bold, fontSize = 57.sp),
    headlineMedium = TextStyle(fontFamily = UrbanistFamily, fontWeight = FontWeight.SemiBold, fontSize = 28.sp),
    bodyLarge = TextStyle(fontFamily = UrbanistFamily, fontWeight = FontWeight.Normal, fontSize = 16.sp),
)

// Motion — all durations use Material 3 motion tokens
object EventHubMotion {
    val EmphasizedDecelerate = tween<Float>(400, easing = FastOutSlowInEasing)
    val Standard = tween<Float>(300, easing = LinearOutSlowInEasing)
    val Quick = tween<Float>(200, easing = FastOutLinearInEasing)
}
```

### 2.2 Circuit Presenter Pattern (Every Screen)
```kotlin
// --- Route ---
@Parcelize
@Serializable
data class EventDetailScreen(val eventId: String) : Screen

// --- State + Events ---
@Parcelize
data class EventDetailState(
    val event: Event? = null,
    val ticketTypes: List<TicketType> = emptyList(),
    val isFavorited: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
    val eventSink: (EventDetailEvent) -> Unit,
) : CircuitUiState

sealed interface EventDetailEvent : CircuitUiEvent {
    data object FavoriteToggled : EventDetailEvent
    data class TicketTypeSelected(val ticketTypeId: String) : EventDetailEvent
    data object BuyTicketClicked : EventDetailEvent
    data object BackClicked : EventDetailEvent
}

// --- Presenter (KMP-compatible pure logic) ---
class EventDetailPresenter @AssistedInject constructor(
    @Assisted private val screen: EventDetailScreen,
    @Assisted private val navigator: Navigator,
    private val getEvent: GetEventUseCase,
    private val toggleFavorite: ToggleFavoriteUseCase,
) : Presenter<EventDetailState> {

    @Composable
    override fun present(): EventDetailState {
        var event by remember { mutableStateOf<Event?>(null) }
        var isFavorited by remember { mutableStateOf(false) }

        LaunchedEffect(screen.eventId) {
            event = getEvent(screen.eventId)
        }

        return EventDetailState(
            event = event,
            isFavorited = isFavorited,
            isLoading = event == null,
        ) { uiEvent ->
            when (uiEvent) {
                is EventDetailEvent.FavoriteToggled -> {
                    isFavorited = !isFavorited
                    // Fire-and-forget optimistic update
                }
                is EventDetailEvent.BuyTicketClicked -> {
                    navigator.goTo(CheckoutScreen(screen.eventId))
                }
                is EventDetailEvent.BackClicked -> navigator.pop()
            }
        }
    }
}

// --- Compose UI (Android-only, pure rendering) ---
@Composable
fun EventDetailUi(state: EventDetailState, modifier: Modifier = Modifier) {
    // Render state, send events to state.eventSink(...)
}
```

### 2.3 Screen-by-Screen Migration Map

| Flutter File | Android Native Equivalent |
| :--- | :--- |
| `home_screen.dart` (32KB) | `HomePresenter.kt` + `HomeScreen.kt` + `FeaturedEventCard.kt` |
| `screens/auth/` | `LoginPresenter.kt`, `SignupPresenter.kt`, `OtpPresenter.kt` |
| `screens/events/` | `EventDetailPresenter.kt`, `MediaGalleryPager.kt` (HorizontalPager) |
| `screens/checkout/` | `CheckoutPresenter.kt`, `CartSummary.kt`, `PaymentBottomSheet.kt` |
| `screens/tickets/` | `TicketsPresenter.kt`, `TicketCard.kt`, `QRDisplay.kt` (ZXing) |
| `screens/search/` | `SearchPresenter.kt`, `FilterSheet.kt` |
| `screens/profile/` | `ProfilePresenter.kt`, `NotificationPrefsScreen.kt` |
| `screens/onboarding/` | `OnboardingPresenter.kt`, `OnboardingPager.kt` |
| `screens/saved/` | `SavedPresenter.kt`, `SavedEventsGrid.kt` |
| `screens/notifications/` | `NotificationsPresenter.kt`, `NotificationItem.kt` |

### 2.4 Razorpay Native Integration
```kotlin
// CheckoutPresenter.kt handles payment intent creation
// PaymentActivity.kt handles the actual Razorpay SDK

class PaymentActivity : AppCompatActivity(), PaymentResultWithDataListener {
    @Inject lateinit var confirmOrder: ConfirmOrderUseCase

    override fun onPaymentSuccess(razorpayPaymentId: String, data: PaymentData) {
        lifecycleScope.launch {
            val orderId = intent.getStringExtra("orderId") ?: return@launch
            confirmOrder(orderId)
            setResult(RESULT_OK, Intent().putExtra("orderId", orderId))
            finish()
        }
    }

    override fun onPaymentError(code: Int, response: String?, data: PaymentData?) {
        // PAYMENT_CANCELLED (code=2) vs network errors
        setResult(RESULT_CANCELED)
        finish()
    }
}
```

### 2.5 Offline Ticket Display (No Network Required)
```kotlin
// Tickets cached to EncryptedDataStore on last successful fetch
// QR rendered locally using ZXing — no API call needed to display ticket
@Composable
fun QRDisplay(ticketToken: String, modifier: Modifier = Modifier) {
    val bitmap = remember(ticketToken) {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(ticketToken, BarcodeFormat.QR_CODE, 512, 512)
        val bitmap = Bitmap.createBitmap(512, 512, Bitmap.Config.RGB_565)
        for (x in 0 until 512) for (y in 0 until 512) {
            bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.Black.toArgb() else Color.White.toArgb())
        }
        bitmap
    }
    Image(bitmap = bitmap.asImageBitmap(), contentDescription = "Ticket QR", modifier = modifier)
}
```

---

## Phase 3 — Scanner App: Camera + Offline Engine
**Week 3–5**

### 3.1 CameraX + ML Kit (Replaces `mobile_scanner`)
```kotlin
// ScanScreen.kt — CameraX bound to Compose lifecycle
@Composable
fun CameraPreview(barcodeAnalyzer: BarcodeAnalyzer, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }

    LaunchedEffect(Unit) {
        val cameraProvider = ProcessCameraProvider.getInstance(context).await()

        val preview = Preview.Builder().build()
            .also { it.setSurfaceProvider(previewView.surfaceProvider) }

        val analysis = ImageAnalysis.Builder()
            .setTargetResolution(Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
            .also { it.setAnalyzer(Dispatchers.Default.asExecutor(), barcodeAnalyzer) }

        cameraProvider.bindToLifecycle(
            lifecycleOwner,
            CameraSelector.DEFAULT_BACK_CAMERA,
            preview, analysis
        )
    }

    AndroidView(factory = { previewView }, modifier = modifier)
}

// BarcodeAnalyzer — invokes presenter event on scan
class BarcodeAnalyzer(
    private val onScan: (String) -> Unit,
) : ImageAnalysis.Analyzer {
    private val scanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
    )
    private var lastScannedAt = 0L

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastScannedAt < 1500L) return imageProxy.close() // debounce 1.5s

        val mediaImage = imageProxy.image ?: return imageProxy.close()
        scanner.process(InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees))
            .addOnSuccessListener { barcodes ->
                barcodes.firstOrNull()?.rawValue?.let {
                    lastScannedAt = now
                    onScan(it)
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    }
}
```

### 3.2 SQLDelight Schema (Replaces `sqflite`)
```sql
-- scanner.sq — compile-time validated SQL

CREATE TABLE TicketCache (
    id TEXT NOT NULL PRIMARY KEY,
    token_hash TEXT NOT NULL,
    event_id TEXT NOT NULL,
    access_tier TEXT NOT NULL,
    holder_name TEXT,   -- only if policy allows
    status TEXT NOT NULL,  -- VALID | USED | CANCELLED | REFUNDED
    dataset_version INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE ScanQueue (
    sync_id TEXT NOT NULL PRIMARY KEY,
    device_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    ticket_id TEXT NOT NULL,
    local_timestamp INTEGER NOT NULL,
    dataset_version INTEGER NOT NULL,
    result TEXT NOT NULL,
    is_synced INTEGER NOT NULL DEFAULT 0
);

-- Type-safe generated queries
findByTokenHash:
SELECT * FROM TicketCache WHERE token_hash = :tokenHash AND expires_at > :now LIMIT 1;

markUsed:
UPDATE TicketCache SET status = 'USED' WHERE id = :ticketId;

pendingSyncs:
SELECT * FROM ScanQueue WHERE is_synced = 0 ORDER BY local_timestamp ASC;

markSynced:
UPDATE ScanQueue SET is_synced = 1 WHERE sync_id IN :syncIds;
```

```kotlin
// ScannerDatabaseModule.kt — Hilt
@Provides @Singleton
fun provideScannerDatabase(
    @ApplicationContext context: Context,
    keyProvider: TinkKeyProvider,
): ScannerDatabase {
    val factory = SupportFactory(keyProvider.getDatabaseKey()) // SQLCipher
    return ScannerDatabase(
        AndroidSqliteDriver(
            schema = ScannerDatabase.Schema,
            context = context,
            name = "scanner.db",
            factory = factory,
        )
    )
}
```

### 3.3 Offline Validation UseCase
```kotlin
class ValidateTicketUseCase @Inject constructor(
    private val ticketQueries: TicketCacheQueries,
    private val scanQueueQueries: ScanQueueQueries,
    private val remoteCheckin: RemoteCheckinRepository,
    private val networkMonitor: NetworkMonitor,
    private val crypto: TicketTokenVerifier,
) {
    suspend operator fun invoke(rawToken: String): ScanResult {
        // 1. Verify token signature (ECDSA via Tink)
        if (!crypto.verify(rawToken)) return ScanResult.Invalid("Signature invalid")

        val tokenHash = crypto.hash(rawToken)

        return if (networkMonitor.isOnline()) {
            // 2a. Online path — fully authoritative
            remoteCheckin.validateAndCheckin(rawToken)
        } else {
            // 2b. Offline path — local dataset
            val ticket = ticketQueries.findByTokenHash(tokenHash, Clock.System.now().epochSeconds)
                .executeAsOneOrNull() ?: return ScanResult.Invalid("Not in offline dataset")

            if (ticket.status == "USED") return ScanResult.AlreadyUsed(ticket.holder_name)
            if (ticket.status == "CANCELLED") return ScanResult.Cancelled
            if (ticket.status == "REFUNDED") return ScanResult.Refunded

            // Optimistic local check-in
            ticketQueries.markUsed(ticket.id)
            scanQueueQueries.enqueue(
                ScanQueue(
                    sync_id = UUID.randomUUID().toString(),
                    device_id = DeviceId.get(),
                    event_id = ticket.event_id,
                    ticket_id = ticket.id,
                    local_timestamp = Clock.System.now().epochSeconds,
                    dataset_version = ticket.dataset_version,
                    result = "ADMITTED",
                    is_synced = 0,
                )
            )
            ScanResult.Success(ticket.holder_name, offlineMode = true)
        }
    }
}
```

### 3.4 WorkManager Sync (Replaces Flutter manual sync)
```kotlin
@HiltWorker
class ScanSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val scanQueueQueries: ScanQueueQueries,
    private val scannerApi: ScannerApiService,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val pending = scanQueueQueries.pendingSyncs().executeAsList()
        if (pending.isEmpty()) return Result.success()

        return try {
            val response = scannerApi.batchSync(
                pending.map { it.toSyncRequest() }
            )
            scanQueueQueries.markSynced(response.processedIds)
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 4) Result.retry() else Result.failure()
        }
    }

    companion object {
        fun enqueue(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                "scan-sync",
                ExistingWorkPolicy.KEEP,
                OneTimeWorkRequestBuilder<ScanSyncWorker>()
                    .setConstraints(Constraints(NetworkType.CONNECTED))
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                    .build()
            )
        }
    }
}
```

### 3.5 Google Tink for Bootstrap Decryption
```kotlin
// Replaces pointycastle + cryptography + asn1lib
class TinkBootstrapDecryptor @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val aead: Aead by lazy {
        AndroidKeysetManager.Builder()
            .withSharedPref(context, "scanner_keyset", "scanner_prefs")
            .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
            .withMasterKeyUri("android-keystore://scanner-master-key")
            .build()
            .keysetHandle
            .getPrimitive(Aead::class.java)
    }

    fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray =
        aead.decrypt(ciphertext, associatedData)
}
```

### 3.6 Foreground Service for Active Scanning Sessions
```kotlin
// Prevents OS from killing the scanner app during high-traffic events
class ScannerForegroundService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, SCANNER_CHANNEL_ID)
            .setContentTitle("Scanner Active")
            .setContentText("Gate scanning in progress")
            .setSmallIcon(R.drawable.ic_scanner)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .build()
        startForeground(SCANNER_NOTIF_ID, notification)
        return START_STICKY
    }
}
```

---

## Phase 4 — Push Notifications + Deep Links
**Week 4–5**

### 4.1 Notification Channels (Map to `15_NOTIFICATION_ARCHITECTURE.md`)
```kotlin
// Created at app startup — required before Android 8
fun createNotificationChannels(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java)

    // TRANSACTIONAL — payment, ticket, refund alerts (cannot be silenced by user)
    manager.createNotificationChannel(NotificationChannel(
        "transactional", "Order & Tickets", NotificationManager.IMPORTANCE_HIGH
    ).apply { description = "Payment confirmations, tickets, refunds" })

    // MARKETING — event recommendations (user can silence)
    manager.createNotificationChannel(NotificationChannel(
        "marketing", "Event Recommendations", NotificationManager.IMPORTANCE_DEFAULT
    ))

    // SCANNER_ALERTS — offline warnings, sync status (scanner app only)
    manager.createNotificationChannel(NotificationChannel(
        "scanner_alerts", "Scanner Alerts", NotificationManager.IMPORTANCE_HIGH
    ))
}
```

### 4.2 FCM + Deep Link Integration
```kotlin
@AndroidEntryPoint
class EventHubMessagingService : FirebaseMessagingService() {

    @Inject lateinit var registerDeviceToken: RegisterDeviceTokenUseCase

    override fun onNewToken(token: String) {
        lifecycleScope.launch { registerDeviceToken(token) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val deepLink = message.data["deepLink"]
        // Maps to Compose Navigation type-safe routes:
        // eventhub://event/{id} → EventDetailScreen(id)
        // eventhub://tickets/{id} → TicketDetailScreen(id)
        // eventhub://orders/{id} → OrderDetailScreen(id)
        showNotification(message, deepLink)
    }
}
```

---

## Phase 5 — Performance, Testing & Polish
**Week 5–6**

### 5.1 Baseline Profiles (Guaranteed < 400ms Cold Start)
```kotlin
@RunWith(AndroidJUnit4::class)
class ConsumerBaselineProfileGenerator {
    @get:Rule val rule = BaselineProfileRule()

    @Test fun generate() = rule.collect("io.eventhub.consumer") {
        pressHome()
        startActivityAndWait()
        // Critical user paths
        device.findObject(By.text("Discover")).click()
        device.findObject(By.desc("Featured event")).click()
        device.waitForIdle()
    }
}
```

### 5.2 Compose Stability (Zero Unnecessary Recompositions)
```kotlin
// All domain models annotated @Stable or @Immutable
@Immutable
data class Event(
    val id: String,
    val name: String,
    val date: Instant,
    val coverImageUrl: String,
    val minPrice: Int,
)

// LazyList with stable keys
LazyColumn {
    items(events, key = { it.id }, contentType = { "event_card" }) { event ->
        EventCard(event = event)
    }
}
```

### 5.3 Screenshot Testing (Paparazzi — Zero Emulator)
```kotlin
class HomeScreenSnapshotTest {
    @get:Rule val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "Theme.EventHub",
    )

    @Test fun homeScreen_loaded() {
        paparazzi.snapshot {
            EventHubTheme {
                HomeScreen(state = HomeState.preview())
            }
        }
    }
}
```

### 5.4 Complete Testing Pyramid

| Layer | Tool | Target |
| :--- | :--- | :--- |
| **Unit — UseCases** | JUnit 5 + MockK + Turbine | 90%+ |
| **Unit — Presenters (Circuit)** | JUnit 5 + Molecule | 90%+ |
| **Integration — DB** | SQLDelight + in-memory driver | All queries |
| **Integration — Network** | Ktor MockEngine | All API paths |
| **UI Snapshot** | Paparazzi | All screens |
| **E2E** | Espresso + UiAutomator2 | Sign-in, checkout, scan |
| **Scanner Perf** | Macrobenchmark | Frame < 16ms, scan < 300ms |

---

## Phase 6 — CI/CD Pipeline
**Week 6**

```yaml
# .github/workflows/android.yml
name: Android CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin' }
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew test paparazziTest  # Unit + screenshot tests, no emulator

  build-consumer:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: ./gradlew :consumer-mobile:app:bundleProductionRelease
      - uses: r0adkll/sign-android-release@v1
      - uses: r0adkll/upload-google-play@v1
        with: { track: internal }

  build-scanner:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: ./gradlew :scanner-mobile:app:bundleProductionRelease
      - uses: r0adkll/sign-android-release@v1
      - uses: r0adkll/upload-google-play@v1
        with: { track: internal }
```

---

## 6-Week Execution Roadmap

```
         Week 1      Week 2      Week 3      Week 4      Week 5      Week 6
         ────────    ────────    ────────    ────────    ────────    ────────
Phase 1  ████████    ████
         Bootstrap & Infra
         Hilt, Ktor, Supabase Auth
         Build variants, R8

Phase 2              ████████    ████████    ████
                     Consumer App
                     Design system, Circuit
                     Home/Discover/Events
                     Checkout+Razorpay
                     Tickets+QR

Phase 3                          ████████    ████████
                                 Scanner App
                                 CameraX+MLKit
                                 SQLDelight+Tink
                                 Offline engine
                                 WorkManager sync

Phase 4                                      ████████
                                             Push+DeepLinks
                                             FCM channels
                                             App Links

Phase 5                                                  ████████
                                                         Performance
                                                         Baseline Profiles
                                                         Paparazzi tests
                                                         Full test suite

Phase 6                                                              ████████
                                                                     CI/CD
                                                                     GitHub Actions
                                                                     Play Internal
```

---

## API Contract — Zero Changes to Backend

All endpoints from [`07_API_SPECIFICATION.md`](file:///c:/Users/HP/Desktop/event%20booking%20app/07_API_SPECIFICATION.md) consumed with Ktor:

```kotlin
// EventApiService.kt — direct replacement for ApiService.dart
class EventApiService @Inject constructor(private val client: HttpClient) {

    suspend fun getFeatured(): List<Event> =
        client.get("/api/v1/events/featured").body<ApiListEnvelope<EventDto>>().data.map { it.toDomain() }

    suspend fun getEvent(id: String): Event =
        client.get("/api/v1/events/$id").body<ApiEnvelope<EventDto>>().data.toDomain()

    suspend fun createCheckoutSession(request: CheckoutRequest): CheckoutSession =
        client.post("/api/v1/checkout/sessions") { setBody(request) }
            .body<ApiEnvelope<CheckoutSessionDto>>().data.toDomain()

    suspend fun getUserTickets(): List<Ticket> =
        client.get("/api/v1/users/me/tickets").body<ApiListEnvelope<TicketDto>>().data.map { it.toDomain() }
}
```

**The `{ data: {}, meta: {} }` envelope format** is handled by `ApiEnvelope<T>` — exact match to existing backend contract.

---

## What Changes vs What Stays

### REPLACES 🔄
| Flutter | Android Native |
| :--- | :--- |
| `apps/consumer-mobile/` (entire Flutter project) | New Android Studio project (Kotlin) |
| `apps/scanner-mobile/` (entire Flutter project) | New Android Studio project (Kotlin) |
| `supabase_flutter` | `supabase-kt` |
| `http` package | Ktor Client |
| `go_router` + Riverpod | Circuit + Compose Navigation |
| `flutter_riverpod` | Dagger Hilt + Kotlin StateFlow |
| `sqflite` + 3 crypto packages | SQLDelight + SQLCipher + Tink |
| `mobile_scanner` | CameraX + ML Kit |
| `razorpay_flutter` | Razorpay Android Native SDK |
| `flutter_secure_storage` | Android Keystore + EncryptedDataStore |
| `cached_network_image` | Coil 3 |
| `qr_flutter` + `barcode_widget` | ZXing Android Embedded |

### UNTOUCHED ✅
- `backend/api/` — zero changes
- `packages/types/` — zero changes
- `apps/admin-web/`, `apps/organizer-web/`, `apps/consumer-web/` — zero changes
- `database/` schema — zero changes
- `backend/api/src/modules/notifications/providers/push-provider.service.ts` — zero changes (FCM server key stays same)
- All Docker + infrastructure configs — zero changes

---

> [!TIP]
> **iOS Path (When Ready):** Extract `network/`, `database/`, `domain/`, and Circuit `Presenters` into a `shared-kmp` module. iOS gets a SwiftUI layer on top. Because you used **Ktor + SQLDelight + Circuit**, this is a 2-3 week effort — not a 4-month rewrite. Retrofit + Room would have been a full rewrite.
