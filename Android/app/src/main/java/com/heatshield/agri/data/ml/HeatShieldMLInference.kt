package com.heatshield.agri.data.ml

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.nio.FloatBuffer
import java.util.Calendar
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.*

/**
 * HeatShield ML Inference Engine for Android
 *
 * Runs Random Forest ONNX models via ONNX Runtime's native C++ backend (JNI).
 * Predicts temperature, humidity, wind speed → computes WBGT.
 *
 * 17-feature engineering matches the Python training pipeline exactly:
 * 8 lag + 4 cyclical time + 3 rolling stats + 2 delta features
 */
@Singleton
class HeatShieldMLInference @Inject constructor() {

    private var ortEnv: OrtEnvironment? = null
    private var sessions: MutableMap<String, OrtSession> = mutableMapOf()
    private var _isLoaded = false
    private val mutex = Mutex()

    val isLoaded: Boolean get() = _isLoaded

    companion object {
        private const val REQUIRED_HISTORY = 73 // max lag (72) + 1
        private val MODEL_NAMES = listOf("temperature", "humidity", "windspeed")
        private const val WBGT_LOW = 26.0
        private const val WBGT_MODERATE = 28.0
        private const val WBGT_HIGH = 30.0
        private const val WBGT_VERY_HIGH = 32.0
    }

    suspend fun loadModels(
        context: Context,
        onProgress: ((loaded: Int, total: Int, name: String) -> Unit)? = null
    ) {
        if (_isLoaded) return
        mutex.withLock {
            if (_isLoaded) return
            withContext(Dispatchers.IO) {
                val env = OrtEnvironment.getEnvironment()
                ortEnv = env

                MODEL_NAMES.forEachIndexed { index, name ->
                    onProgress?.invoke(index, MODEL_NAMES.size, name)
                    val modelBytes = context.assets.open("models/${name}_model.onnx").use {
                        it.readBytes()
                    }
                    val opts = OrtSession.SessionOptions().apply {
                        setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
                    }
                    sessions[name] = env.createSession(modelBytes, opts)
                }
                onProgress?.invoke(MODEL_NAMES.size, MODEL_NAMES.size, "done")
                _isLoaded = true
            }
        }
    }

    private suspend fun predict1(name: String, features: FloatArray): Float {
        return mutex.withLock {
            withContext(Dispatchers.IO) {
                val env = ortEnv!!
                val session = sessions[name]!!
                val inputName = session.inputNames.first()

                val tensor = OnnxTensor.createTensor(
                    env,
                    FloatBuffer.wrap(features),
                    longArrayOf(1, features.size.toLong())
                )

                tensor.use { t ->
                    session.run(mapOf(inputName to t)).use { result ->
                        val output = result.get(0).value
                        when (output) {
                                    is Array<*> -> {
                                        when (inner) {
                                            is FloatArray -> inner[0]
                                            is DoubleArray -> inner[0].toFloat()
                                            is LongArray -> inner[0].toFloat()
                                            else -> (inner as Number).toFloat()
                                        }
                                    }
                        }
                    }
                }
            }
        }
    }

    // ---- Feature Engineering (must match Python training pipeline exactly) ----
    //   hour_sin, hour_cos, doy_sin, doy_cos,
    //   rolling_mean_24h, rolling_mean_72h, rolling_std_24h,
    //   delta_1h, delta_24h

    private fun createFeatureVector(
        history: List<Double>,
        currentHour: Int,
        dayOfYear: Int
    ): FloatArray {
        val n = history.size
        val f = FloatArray(17)

        f[0] = history[n - 1].toFloat()
        f[1] = history[n - 2].toFloat()
        f[2] = history[n - 3].toFloat()
        f[3] = history[n - 6].toFloat()
        f[4] = history[n - 12].toFloat()
        f[5] = history[n - 24].toFloat()
        f[6] = history[n - 48].toFloat()
        f[7] = history[n - 72].toFloat()

        f[8] = sin(2 * PI * currentHour / 24.0).toFloat()
        f[9] = cos(2 * PI * currentHour / 24.0).toFloat()
        f[10] = sin(2 * PI * dayOfYear / 365.25).toFloat()
        f[11] = cos(2 * PI * dayOfYear / 365.25).toFloat()

        val last24 = history.subList(n - 24, n)
        val last72 = history.subList(n - 72, n)
        val mean24 = last24.average()
        f[12] = mean24.toFloat()
        f[13] = last72.average().toFloat()
        f[14] = sqrt(last24.sumOf { (it - mean24).pow(2) } / 24.0).toFloat()

        f[15] = (history[n - 1] - history[n - 2]).toFloat()
        f[16] = (history[n - 1] - history[n - 24]).toFloat()

        return f
    }

    private fun calculateWBGT(tempC: Double, humPct: Double): Double {
        val t = tempC
        val rh = humPct
        val tnwb = t * atan(0.151977 * sqrt(rh + 8.313659)) +
                atan(t + rh) - atan(rh - 1.676331) +
                0.00391838 * rh.pow(1.5) * atan(0.023101 * rh) - 4.686035
        return (0.7 * tnwb + 0.2 * tg + 0.1 * t).let { (it * 10).roundToInt() / 10.0 }
    }

            wbgt < WBGT_LOW -> "Low"
            wbgt < WBGT_MODERATE -> "Moderate"
            wbgt < WBGT_HIGH -> "High"
            wbgt < WBGT_VERY_HIGH -> "Very High"
            else -> "Extreme"
        }

    suspend fun predictWBGT(
        temps: List<Double>,
        hums: List<Double>,
        winds: List<Double>,
        hour: Int,
        dayOfYear: Int
    ): WBGTForecast {
        check(_isLoaded) { "Call loadModels() first" }

        val t = predict1("temperature", createFeatureVector(temps, hour, dayOfYear))
        val h = predict1("humidity", createFeatureVector(hums, hour, dayOfYear))
        val w = predict1("windspeed", createFeatureVector(winds, hour, dayOfYear))

        val ct = t.toDouble().coerceIn(-10.0, 50.0)
        val ch = h.toDouble().coerceIn(0.0, 100.0)
        val cw = w.toDouble().coerceIn(0.0, 30.0)
        val wbgt = calculateWBGT(ct, ch)

        return WBGTForecast(
            temperature = (ct * 10).roundToInt() / 10.0,
            humidity = (ch * 10).roundToInt() / 10.0,
            windSpeed = (cw * 10).roundToInt() / 10.0,
            wbgt = wbgt,
        )
    }

    suspend fun predictMultiStep(
        temps: List<Double>,
        hums: List<Double>,
        winds: List<Double>,
        steps: Int = 24,
        startTime: Calendar = Calendar.getInstance()
    ): List<WBGTForecast> {
        check(_isLoaded) { "Call loadModels() first" }

        val ts = temps.toMutableList()
        val hs = hums.toMutableList()
        val ws = winds.toMutableList()
        val forecasts = mutableListOf<WBGTForecast>()

        for (s in 0 until minOf(steps, 72)) {
            val ft = (startTime.clone() as Calendar).apply {
                add(Calendar.HOUR_OF_DAY, s + 1)
            }
            val hr = ft.get(Calendar.HOUR_OF_DAY)
            val dy = ft.get(Calendar.DAY_OF_YEAR)

            val fc = predictWBGT(
                ts.takeLast(REQUIRED_HISTORY),
                hs.takeLast(REQUIRED_HISTORY),
                ws.takeLast(REQUIRED_HISTORY),
                hr, dy
            )

            forecasts.add(fc.copy(hour = hr))
            ts.add(fc.temperature)
            hs.add(fc.humidity)
            ws.add(fc.windSpeed)
        }

        return forecasts
    }

    fun dispose() {
        sessions.values.forEach { it.close() }
        sessions.clear()
        ortEnv?.close()
        ortEnv = null
        _isLoaded = false
    }
}

data class WBGTForecast(
    val temperature: Double,
    val humidity: Double,
    val windSpeed: Double,
    val wbgt: Double,
    val riskLevel: String,
    val hour: Int = 0
)
