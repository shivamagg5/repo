package io.eventhub.consumer.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.delete
import io.ktor.client.request.patch
import io.ktor.client.statement.HttpResponse
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
data class ApiErrorResponse(
    val error: ApiErrorBody? = null,
    val message: String? = null,
)

@Serializable
data class ApiErrorBody(
    val code: String? = null,
    val message: String? = null,
)

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

@PublishedApi
internal suspend fun checkResponseStatus(response: HttpResponse) {
    if (response.status.value >= 400) {
        val errorText = try {
            val errObj = response.body<ApiErrorResponse>()
            errObj.error?.message ?: errObj.message ?: "Server error (${response.status.value})"
        } catch (_: Exception) {
            "Server error (${response.status.value})"
        }
        throw IllegalStateException(errorText)
    }
}

suspend inline fun <reified T> HttpClient.apiGet(path: String): T {
    val response = get(formatPath(path))
    checkResponseStatus(response)
    return response.body<ApiEnvelope<T>>().data
}

suspend inline fun <reified T> HttpClient.apiGetList(path: String): List<T> = try {
    val response = get(formatPath(path))
    checkResponseStatus(response)
    response.body<ApiListEnvelope<T>>().data
} catch (e: Exception) {
    try {
        val response = get(formatPath(path))
        checkResponseStatus(response)
        response.body<PaginatedFeedEnvelope<T>>().data.items
    } catch (_: Exception) {
        throw e
    }
}

suspend inline fun <reified T> HttpClient.apiPost(path: String, body: Any? = null): T {
    val response = post(formatPath(path)) { if (body != null) setBody(body) }
    checkResponseStatus(response)
    return response.body<ApiEnvelope<T>>().data
}

suspend inline fun <reified T> HttpClient.apiPatch(path: String, body: Any): T {
    val response = patch(formatPath(path)) { setBody(body) }
    checkResponseStatus(response)
    return response.body<ApiEnvelope<T>>().data
}

suspend fun HttpClient.apiDelete(path: String) {
    val response = delete(formatPath(path))
    checkResponseStatus(response)
}

