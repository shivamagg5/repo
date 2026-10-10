# Consumer Android Proguard Rules

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

# Razorpay
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Coil 3
-keep class coil3.** { *; }

# Supabase
-keep class io.github.jan.supabase.** { *; }
