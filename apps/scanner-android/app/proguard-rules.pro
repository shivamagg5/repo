# Scanner Android Proguard Rules

# Kotlinx Serialization
-keepattributes *Annotation*,InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keepclassmembers class * {
    *** Companion;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}

# Ktor Client
-keep class io.ktor.** { *; }

# Circuit (Slack)
-keep class com.slack.circuit.** { *; }

# SQLDelight
-keep class app.cash.sqldelight.** { *; }
-keep class io.eventhub.scanner.data.local.db.** { *; }

# ML Kit Barcode
-keep class com.google.mlkit.** { *; }

# CameraX
-keep class androidx.camera.** { *; }
