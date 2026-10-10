import java.util.Properties

val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) load(file.inputStream())
}

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.sqldelight)
    id("kotlin-parcelize")
}

android {
    namespace = "io.eventhub.scanner"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.eventhub.scanner"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "SUPABASE_URL", "\"https://bthpeqgafgxomaqhjfrc.supabase.co\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"sb_publishable_n8txh3BqiMKQXt9KM1AnXQ_Re4yr4Fl\"")
        buildConfigField("String", "API_BASE_URL", "\"${System.getenv("API_BASE_URL") ?: "https://api.eventhub.io/api/v1"}\"")
    }

    signingConfigs {
        create("release") {
            val keystorePath = keystoreProperties.getProperty("storeFile")
            if (keystorePath != null && file(keystorePath).exists()) {
                storeFile = file(keystorePath)
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystoreProperties.getProperty("storeFile")?.let { file(it).exists() } == true) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    flavorDimensions += "environment"
    productFlavors {
        create("staging") {
            applicationIdSuffix = ".staging"
            buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.66:3001/api/v1\"")
        }
        create("production") {
            buildConfigField("String", "API_BASE_URL", "\"https://api.eventhub.io/api/v1\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api",
            "-opt-in=androidx.compose.foundation.ExperimentalFoundationApi",
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

sqldelight {
    databases {
        create("ScannerDatabase") {
            packageName.set("io.eventhub.scanner.data.local.db")
        }
    }
}

dependencies {
    // Core
    implementation(libs.core.ktx)
    implementation(libs.activity.compose)
    implementation(libs.startup.runtime)
    implementation(libs.bundles.lifecycle)

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.bundles.compose)
    debugImplementation(libs.compose.ui.tooling)
    androidTestImplementation(libs.compose.ui.test)
    debugImplementation(libs.compose.ui.test.manifest)

    // Circuit (Slack MVI)
    implementation(libs.bundles.circuit)

    // Ktor (Network)
    implementation(libs.bundles.ktor)

    // Coil (Image loading)
    implementation(libs.bundles.coil)

    // Hilt (DI)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation)

    // Supabase (Auth)
    implementation(libs.supabase.auth)

    // DataStore
    implementation(libs.datastore.preferences)

    // SQLDelight (Encrypted offline DB)
    implementation(libs.sqldelight.android)
    implementation(libs.sqldelight.coroutines)
    implementation(libs.sqlcipher)

    // CameraX
    implementation(libs.bundles.camerax)

    // ML Kit Barcode
    implementation(libs.mlkit.barcode)

    // Google Tink (Cryptography for bootstrap dataset)
    implementation(libs.tink.android)

    // WorkManager (Background sync)
    implementation(libs.workmanager.ktx)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    // Firebase (Push)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)

    // Testing
    testImplementation(libs.junit5)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.ktor.client.mock)
    testImplementation(libs.circuit.test)
}
