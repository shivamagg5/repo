package io.eventhub.consumer.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.delete
import io.ktor.client.request.patch
import kotlinx.serialization.Serializable

// ─── API Envelope (matches backend: { data: T, meta: {} }) ─────────────────
@Serializable
data class ApiEnvelope<T>(
    val data: T,
    val meta: ApiMeta? = null,
)

@Serializable
data class ApiListEnvelope<T>(
    val data: List<T>,
    val meta: PaginationMeta? = null,
)

@Serializable
data class PaginatedFeedEnvelope<T>(
    val data: PaginatedDataDto<T>,
    val meta: ApiMeta? = null,
)

@Serializable
data class PaginatedDataDto<T>(
    val items: List<T> = emptyList(),
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
)

@Serializable
data class ApiMeta(val requestId: String? = null)

@Serializable
data class PaginationMeta(
    val page: Int = 1,
    val pageSize: Int = 25,
    val total: Int = 0,
    val requestId: String? = null,
)

// ─── Convenience extensions ─────────────────────────────────────────────────
@PublishedApi
internal fun formatPath(path: String): String = path.removePrefix("/")

suspend inline fun <reified T> HttpClient.apiGet(path: String): T =
    get(formatPath(path)).body<ApiEnvelope<T>>().data

suspend inline fun <reified T> HttpClient.apiGetList(path: String): List<T> = try {
    get(formatPath(path)).body<ApiListEnvelope<T>>().data
} catch (e: Exception) {
    try {
        get(formatPath(path)).body<PaginatedFeedEnvelope<T>>().data.items
    } catch (_: Exception) {
        throw e
    }
}

suspend inline fun <reified T> HttpClient.apiPost(path: String, body: Any? = null): T =
    post(formatPath(path)) { if (body != null) setBody(body) }.body<ApiEnvelope<T>>().data

suspend inline fun <reified T> HttpClient.apiPatch(path: String, body: Any): T =
    patch(formatPath(path)) { setBody(body) }.body<ApiEnvelope<T>>().data

suspend fun HttpClient.apiDelete(path: String) = delete(formatPath(path))

