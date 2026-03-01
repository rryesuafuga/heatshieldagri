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

    companion object {
        const val BASE_URL = "https://api.open-meteo.com/"
    }
}

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
