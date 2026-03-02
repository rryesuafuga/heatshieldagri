package com.heatshield.agri.data.api

import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Open-Meteo API Service
 * Free weather API - no API key required
 */
interface WeatherApiService {

    @GET("v1/forecast")
    suspend fun getWeather(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("current") current: String = "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,shortwave_radiation",
        @Query("hourly") hourly: String = "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,shortwave_radiation",
        @Query("timezone") timezone: String = "Africa/Kampala",
        @Query("forecast_days") forecastDays: Int = 3
    ): WeatherResponse

    /**
     * Fetch weather with historical data for ML feature engineering.
     * past_days=4 provides 96+ hours of history (needed for 72-hour lag features).
     */
    @GET("v1/forecast")
    suspend fun getWeatherWithHistory(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("hourly") hourly: String = "temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation",
        @Query("past_days") pastDays: Int = 4,
        @Query("forecast_days") forecastDays: Int = 2,
        @Query("timezone") timezone: String = "Africa/Kampala"
    ): HistoricalWeatherResponse

    companion object {
        const val BASE_URL = "https://api.open-meteo.com/"
    }
}

/**
 * Response for historical + forecast weather data (ML features)
 */
data class HistoricalWeatherResponse(
    val latitude: Double,
    val longitude: Double,
    val timezone: String,
    val hourly: HistoricalHourlyWeather
)

data class HistoricalHourlyWeather(
    val time: List<String>,
    val temperature_2m: List<Double>,
    val relative_humidity_2m: List<Int>,
    val wind_speed_10m: List<Double>,
    val shortwave_radiation: List<Double?>?
)

data class WeatherResponse(
    val latitude: Double,
    val longitude: Double,
    val timezone: String,
    val current: CurrentWeather,
    val hourly: HourlyWeather
)

data class CurrentWeather(
    val time: String,
    val temperature_2m: Double,
    val relative_humidity_2m: Int,
    val wind_speed_10m: Double,
    val weather_code: Int,
    val shortwave_radiation: Double?
)

data class HourlyWeather(
    val time: List<String>,
    val temperature_2m: List<Double>,
    val relative_humidity_2m: List<Int>,
    val wind_speed_10m: List<Double>,
    val weather_code: List<Int>,
    val shortwave_radiation: List<Double?>?
)
