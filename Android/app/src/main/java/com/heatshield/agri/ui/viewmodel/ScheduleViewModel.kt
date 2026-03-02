package com.heatshield.agri.ui.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.ml.HeatShieldMLInference
import com.heatshield.agri.data.model.District
import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.data.model.WorkSchedule
import com.heatshield.agri.data.repository.WeatherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Physics-first architecture with Random Forest validation.
 *
 * 1. Fetch real Open-Meteo NWP forecast (with solar radiation) → compute physics WBGT
 * 2. If RF models are loaded and history is available, run RF predictions
 * 3. Compare RF vs physics (MAE threshold) → blend only if RF is within 2°C
 * 4. Optimize work schedule for daylight hours (06:00-18:00)
 */
@HiltViewModel
class ScheduleViewModel @Inject constructor(
    application: Application,
    private val weatherRepository: WeatherRepository,
    private val mlInference: HeatShieldMLInference
) : AndroidViewModel(application) {

    companion object {
        private const val TAG = "ScheduleVM"
        private const val RF_DEVIATION_THRESHOLD = 2.0 // °C max MAE before rejecting RF
        private const val PHYSICS_WEIGHT = 0.7
        private const val RF_WEIGHT = 0.3
    }

    // UI State
    private val _forecast = MutableStateFlow<List<HourlyForecast>>(emptyList())
    val forecast: StateFlow<List<HourlyForecast>> = _forecast.asStateFlow()

    private val _schedule = MutableStateFlow<WorkSchedule?>(null)
    val schedule: StateFlow<WorkSchedule?> = _schedule.asStateFlow()

    private val _dataSource = MutableStateFlow("loading")
    val dataSource: StateFlow<String> = _dataSource.asStateFlow()

    private val _rfDeviation = MutableStateFlow<Double?>(null)
    val rfDeviation: StateFlow<Double?> = _rfDeviation.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _mlLoadProgress = MutableStateFlow("")
    val mlLoadProgress: StateFlow<String> = _mlLoadProgress.asStateFlow()

    private val _selectedDistrict = MutableStateFlow(WeatherRepository.UGANDA_DISTRICTS.first())
    val selectedDistrict: StateFlow<District> = _selectedDistrict.asStateFlow()

    private val _workHoursNeeded = MutableStateFlow(8)
    val workHoursNeeded: StateFlow<Int> = _workHoursNeeded.asStateFlow()

    val districts = WeatherRepository.UGANDA_DISTRICTS

    private var _isFetching = false

    init {
        // Load ML models in background
        viewModelScope.launch {
            try {
                _mlLoadProgress.value = "Loading RF models..."
                mlInference.loadModels(getApplication()) { loaded, total, name ->
                    _mlLoadProgress.value = if (name == "done") "Models ready"
                    else "Loading $name ($loaded/$total)"
                }
                Log.d(TAG, "ONNX models loaded successfully")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load ONNX models: ${e.message}")
                _mlLoadProgress.value = "ML unavailable"
            }
        }

        // Fetch initial data
        loadData()
    }

    fun selectDistrict(district: District) {
        _selectedDistrict.value = district
        loadData()
    }

    fun setWorkHours(hours: Int) {
        _workHoursNeeded.value = hours
        // Recompute schedule with existing forecast
        val currentForecast = _forecast.value
        if (currentForecast.isNotEmpty()) {
            _schedule.value = WbgtCalculator.optimizeWorkSchedule(currentForecast, hours)
        }
    }

    fun refresh() {
        loadData()
    }

    private fun loadData() {
        if (_isFetching) return
        _isFetching = true

        viewModelScope.launch {
            _isLoading.value = true
            _dataSource.value = "loading"

            val district = _selectedDistrict.value

            try {
                // Step 1: Fetch weather with history
                val result = weatherRepository.getWeatherWithHistory(district.lat, district.lon)

                result.fold(
                    onSuccess = { data ->
                        val physicsForecast = data.physicsForecast

                        if (physicsForecast.isEmpty()) {
                            Log.w(TAG, "Empty physics forecast")
                            _isLoading.value = false
                            _isFetching = false
                            return@launch
                        }

                        // Step 2: Try RF enhancement
                        var finalForecast = physicsForecast
                        var source = "physics"

                        if (mlInference.isLoaded &&
                            data.historyTemps.size >= 73 &&
                            data.historyHums.size >= 73 &&
                            data.historyWinds.size >= 73
                        ) {
                            try {
                                val rfForecasts = mlInference.predictMultiStep(
                                    temps = data.historyTemps,
                                    hums = data.historyHums,
                                    winds = data.historyWinds,
                                    steps = 24
                                )

                                // Step 3: Compare RF vs physics (MAE)
                                val comparableHours = minOf(physicsForecast.size, rfForecasts.size)
                                if (comparableHours > 0) {
                                    val mae = (0 until comparableHours).sumOf { i ->
                                        abs(rfForecasts[i].wbgt - physicsForecast[i].wbgt)
                                    } / comparableHours

                                    _rfDeviation.value = mae
                                    Log.d(TAG, "RF vs Physics MAE: %.2f°C".format(mae))

                                    if (mae <= RF_DEVIATION_THRESHOLD) {
                                        // Blend: 70% physics + 30% RF
                                        finalForecast = physicsForecast.mapIndexed { i, pf ->
                                            if (i < rfForecasts.size) {
                                                val blendedWbgt = PHYSICS_WEIGHT * pf.wbgt +
                                                        RF_WEIGHT * rfForecasts[i].wbgt
                                                val blendedResult = WbgtCalculator.classifyRisk(blendedWbgt)
                                                pf.copy(
                                                    wbgt = blendedWbgt,
                                                    riskLevel = blendedResult.riskLevel
                                                )
                                            } else pf
                                        }
                                        source = "rf-enhanced"
                                        Log.d(TAG, "RF enhancement applied (MAE=${"%.2f".format(mae)}°C)")
                                    } else {
                                        Log.w(TAG, "RF rejected: MAE ${"%.2f".format(mae)}°C > threshold ${RF_DEVIATION_THRESHOLD}°C")
                                    }
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "RF inference failed: ${e.message}")
                            }
                        }

                        // Step 4: Update state
                        _forecast.value = finalForecast
                        _dataSource.value = source
                        _schedule.value = WbgtCalculator.optimizeWorkSchedule(
                            finalForecast, _workHoursNeeded.value
                        )
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Weather fetch failed: ${error.message}")
                        _dataSource.value = "error"
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error: ${e.message}")
                _dataSource.value = "error"
            } finally {
                _isLoading.value = false
                _isFetching = false
            }
        }
    }
}
