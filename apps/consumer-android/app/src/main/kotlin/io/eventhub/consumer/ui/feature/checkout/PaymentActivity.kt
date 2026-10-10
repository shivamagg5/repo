package io.eventhub.consumer.ui.feature.checkout

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import org.json.JSONObject

class PaymentActivity : ComponentActivity(), PaymentResultListener {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Checkout.preload(applicationContext)

        val orderId = intent.getStringExtra("orderId") ?: run {
            finishWithError("Missing order ID")
            return
        }
        val amount = intent.getIntExtra("amount", 0)
        val currency = intent.getStringExtra("currency") ?: "INR"
        val key = intent.getStringExtra("key") ?: ""
        val eventName = intent.getStringExtra("eventName") ?: "Event Ticket"

        startPayment(orderId, amount, currency, key, eventName)
    }

    private fun startPayment(
        orderId: String,
        amount: Int,
        currency: String,
        key: String,
        eventName: String
    ) {
        val checkout = Checkout()
        if (key.isNotEmpty()) {
            checkout.setKeyID(key)
        }

        try {
            val options = JSONObject().apply {
                put("name", "EventHub")
                put("description", eventName)
                put("currency", currency)
                put("amount", amount * 100) // Razorpay expects amount in paise
                put("order_id", orderId)
                put("theme.color", "#6C63FF")
            }
            checkout.open(this, options)
        } catch (e: Exception) {
            finishWithError("Error initiating payment: ${e.localizedMessage}")
        }
    }

    override fun onPaymentSuccess(razorpayPaymentId: String?) {
        val result = Intent().apply {
            putExtra("paymentId", razorpayPaymentId)
        }
        setResult(Activity.RESULT_OK, result)
        finish()
    }

    override fun onPaymentError(code: Int, response: String?) {
        finishWithError("Payment failed (code $code): $response")
    }

    private fun finishWithError(msg: String) {
        val result = Intent().apply {
            putExtra("error", msg)
        }
        setResult(Activity.RESULT_CANCELED, result)
        finish()
    }
}
