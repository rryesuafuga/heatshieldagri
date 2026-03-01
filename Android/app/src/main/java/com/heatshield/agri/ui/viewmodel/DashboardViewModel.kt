package com.heatshield.agri.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.District
import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.data.model.WeatherData
import com.heatshield.agri.data.model.WorkSchedule
import com.heatshield.agri.data.repository.WeatherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class WeatherUiState {
    object Loading : WeatherUiState()
    data class Success(val data: WeatherData) : WeatherUiState()
    data class Error(val message: String) : WeatherUiState()
}

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val weatherRepository: WeatherRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<WeatherUiState>(WeatherUiState.Loading)
    val uiState: StateFlow<WeatherUiState> = _uiState.asStateFlow()

    private val _selectedDistrict = MutableStateFlow(WeatherRepository.UGANDA_DISTRICTS.first())
    val selectedDistrict: StateFlow<District> = _selectedDistrict.asStateFlow()

    private val _workSchedule = MutableStateFlow<WorkSchedule?>(null)
    val workSchedule: StateFlow<WorkSchedule?> = _workSchedule.asStateFlow()

    val districts = WeatherRepository.UGANDA_DISTRICTS

    init {
        loadWeatherData()
    }

    fun selectDistrict(district: District) {
        _selectedDistrict.value = district
        loadWeatherData()
    }

    fun refresh() {
        loadWeatherData()
    }

    private fun loadWeatherData() {
        viewModelScope.launch {
            _uiState.value = WeatherUiState.Loading

            val result = weatherRepository.getWeatherForDistrict(_selectedDistrict.value)

            result.fold(
                onSuccess = { weatherData ->
                    _uiState.value = WeatherUiState.Success(weatherData)
                    // Calculate work schedule from hourly forecasts
                    val todayForecasts = weatherData.hourlyForecasts.take(24)
                    _workSchedule.value = calculateWorkSchedule(todayForecasts)
                },
                onFailure = { error ->
                    _uiState.value = WeatherUiState.Error(error.message ?: "Unknown error")
                }
            )
        }
    }

    private fun calculateWorkSchedule(forecasts: List<HourlyForecast>): WorkSchedule {
        val hourScores = forecasts.mapIndexed { index, forecast ->
            index to forecast.wbgt
        }.sortedBy { it.second }

        val workHoursNeeded = 8
        val safeHours = hourScores
            .take(minOf(workHoursNeeded, 12))
            .map { it.first }
            .sorted()

        val avgWbgt = hourScores
            .take(workHoursNeeded)
            .map { it.second }
            .average()

        val productivityScore = maxOf(0.0, minOf(100.0, ((40 - avgWbgt) / 40) * 100))

        val breakSchedule = when {
            avgWbgt < 26 -> "Take a 10-minute break every 2 hours. Drink water during breaks."
            avgWbgt < 28 -> "Take a 15-minute break every hour. Stay in shade during breaks."
            avgWbgt < 30 -> "Take a 20-minute break every 45 minutes. Rest in coolest available area."
            else -> "Take a 30-minute break every 30 minutes. Only essential work. Monitor for heat illness."
        }

        return WorkSchedule(
            safeHours = safeHours,
            totalSafeHours = safeHours.size,
            recommendedStart = safeHours.firstOrNull() ?: 6,
            recommendedEnd = safeHours.lastOrNull() ?: 17,
            breakSchedule = breakSchedule,
            productivityScore = productivityScore
        )
    }
}
