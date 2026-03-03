package com.heatshield.agri.ui.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.ml.HeatShieldMLInference
import com.heatshield.agri.data.model.District
import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.data.repository.WeatherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.abs

/**
 * Forecast tab ViewModel — always runs BOTH physics and RF models,
 * exposing both sets of predictions so the UI can display them side by side.
 */
@HiltViewModel
class ForecastViewModel @Inject constructor(
    application: Application,
    private val weatherRepository: WeatherRepository,
    private val mlInference: HeatShieldMLInference
) : AndroidViewModel(application) {

    companion object {
        private const val TAG = "ForecastVM"
    }

    private val _physicsForecast = MutableStateFlow<List<HourlyForecast>>(emptyList())
    val physicsForecast: StateFlow<List<HourlyForecast>> = _physicsForecast.asStateFlow()

    private val _rfForecast = MutableStateFlow<List<HourlyForecast>>(emptyList())
    val rfForecast: StateFlow<List<HourlyForecast>> = _rfForecast.asStateFlow()

    private val _rfAvailable = MutableStateFlow(false)
    val rfAvailable: StateFlow<Boolean> = _rfAvailable.asStateFlow()

    private val _rfDeviation = MutableStateFlow<Double?>(null)
    val rfDeviation: StateFlow<Double?> = _rfDeviation.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _mlLoadProgress = MutableStateFlow("")
    val mlLoadProgress: StateFlow<String> = _mlLoadProgress.asStateFlow()

    private val _selectedDistrict = MutableStateFlow(WeatherRepository.UGANDA_DISTRICTS.first())
    val selectedDistrict: StateFlow<District> = _selectedDistrict.asStateFlow()

    val districts = WeatherRepository.UGANDA_DISTRICTS

    private var _isFetching = false

    init {
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
        loadData()
    }

    fun selectDistrict(district: District) {
        _selectedDistrict.value = district
        loadData()
    }

    fun refresh() {
        loadData()
    }

    private fun loadData() {
        if (_isFetching) return
        _isFetching = true

        viewModelScope.launch {
            _isLoading.value = true

            val district = _selectedDistrict.value

            try {
                val result = weatherRepository.getWeatherWithHistory(district.lat, district.lon)

                result.fold(
                    onSuccess = { data ->
                        val physicsForecast = data.physicsForecast

                        if (physicsForecast.isEmpty()) {
                            _isLoading.value = false
                            _isFetching = false
                            return@launch
                        }

                        _physicsForecast.value = physicsForecast

                        // Always attempt RF inference
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
                                    steps = minOf(48, physicsForecast.size)
                                )

                                // Convert WBGTForecast to HourlyForecast for UI
                                val rfHourly = rfForecasts.mapIndexed { i, rf ->
                                    val pf = if (i < physicsForecast.size) physicsForecast[i] else null
                                    val rfRisk = WbgtCalculator.classifyRisk(rf.wbgt)
                                    HourlyForecast(
                                        hour = rf.hour,
                                        time = pf?.time ?: "",
                                        temperature = rf.temperature,
                                        humidity = (rf.humidity).toInt(),
                                        windSpeed = rf.windSpeed,
                                        solarRadiation = pf?.solarRadiation ?: 0.0,
                                        wbgt = rf.wbgt,
                                        riskLevel = rfRisk.riskLevel
                                    )
                                }

                                _rfForecast.value = rfHourly
                                _rfAvailable.value = true

                                // Compute MAE for informational display
                                val comparableHours = minOf(physicsForecast.size, rfHourly.size)
                                if (comparableHours > 0) {
                                    val mae = (0 until comparableHours).sumOf { i ->
                                        abs(rfHourly[i].wbgt - physicsForecast[i].wbgt)
                                    } / comparableHours
                                    _rfDeviation.value = mae
                                    Log.d(TAG, "RF vs Physics MAE: %.2f°C".format(mae))
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "RF inference failed: ${e.message}")
                                _rfAvailable.value = false
                            }
                        } else {
                            _rfAvailable.value = false
                            Log.d(TAG, "RF not available: loaded=${mlInference.isLoaded}, history=${data.historyTemps.size}")
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Weather fetch failed: ${error.message}")
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error: ${e.message}")
            } finally {
                _isLoading.value = false
                _isFetching = false
            }
        }
    }
}
