package com.heatshield.agri.data.model

/**
 * WBGT (Wet-Bulb Globe Temperature) calculation result
 */
data class WbgtResult(
    val wbgt: Double,
    val riskLevel: RiskLevel,
    val recommendation: String,
    val color: Long
)

/**
 * Risk levels based on ISO 7243
 */
enum class RiskLevel(val displayName: String, val color: Long) {
    LOW("Low", 0xFF22C55E),
    MODERATE("Moderate", 0xFFEAB308),
    HIGH("High", 0xFFF97316),
    VERY_HIGH("Very High", 0xFFEF4444),
    EXTREME("Extreme", 0xFF7C2D12)
}

/**
 * Hourly forecast data
 */
data class HourlyForecast(
    val hour: Int,
    val time: String = "",
    val wbgt: Double,
    val temperature: Double,
    val humidity: Int = 0,
    val windSpeed: Double,
    val solarRadiation: Double,
    val riskLevel: RiskLevel = RiskLevel.LOW
)

/**
 * Complete weather data from API
 */
data class WeatherData(
    val latitude: Double,
    val longitude: Double,
    val timezone: String,
    val currentTime: String,
    val temperature: Double,
    val humidity: Int,
    val windSpeed: Double,
    val solarRadiation: Double,
    val weatherCode: Int,
    val wbgtResult: WbgtResult,
    val hourlyForecasts: List<HourlyForecast>
)

/**
 * Optimized work schedule
 */
data class WorkSchedule(
    val safeHours: List<Int>,
    val totalSafeHours: Int,
    val recommendedStart: Int,
    val recommendedEnd: Int,
    val breakSchedule: String,
    val productivityScore: Double
)

/**
 * District information
 */
data class District(
    val id: Int,
    val name: String,
    val region: String,
    val lat: Double,
    val lon: Double
)

/**
 * Location data
 */
data class Location(
    val lat: Double,
    val lon: Double,
    val name: String? = null
)

/**
 * Weather conditions
 */
data class WeatherConditions(
    val temperature: Double,
    val humidity: Double,
    val windSpeed: Double,
    val solarRadiation: Double
)

/**
 * Alert subscription
 */
data class AlertSubscription(
    val id: Long = 0,
    val phoneNumber: String,
    val locationLat: Double,
    val locationLon: Double,
    val locationName: String?,
    val threshold: Double,
    val isEnabled: Boolean,
    val language: String
)

/**
 * Alert history item
 */
data class AlertHistoryItem(
    val id: Long,
    val timestamp: Long,
    val location: String,
    val wbgt: Double,
    val riskLevel: RiskLevel,
    val message: String,
    val sent: Boolean
)
