package com.heatshield.agri.data.repository

import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.api.WeatherApiService
import com.heatshield.agri.data.api.WeatherResponse
import com.heatshield.agri.data.model.District
import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.data.model.WeatherData
import com.heatshield.agri.data.model.WbgtResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs

@Singleton
class WeatherRepository @Inject constructor(
    private val weatherApiService: WeatherApiService
) {
    suspend fun getWeatherForLocation(lat: Double, lon: Double): Result<WeatherData> {
        return withContext(Dispatchers.IO) {
            try {
                val response = weatherApiService.getWeather(lat, lon)
                val weatherData = transformResponse(response)
                Result.success(weatherData)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getWeatherForDistrict(district: District): Result<WeatherData> {
        return getWeatherForLocation(district.lat, district.lon)
    }

    private fun transformResponse(response: WeatherResponse): WeatherData {
        // Convert wind speed from km/h to m/s
        val windSpeedMs = response.current.wind_speed_10m / 3.6
        val solarRadiation = response.current.shortwave_radiation ?: estimateSolarRadiation()

        // Calculate current WBGT
        val currentWbgt = WbgtCalculator.calculateWbgt(
            temperature = response.current.temperature_2m,
            humidity = response.current.relative_humidity_2m.toDouble(),
            windSpeed = windSpeedMs,
            solarRadiation = solarRadiation
        )

        // Transform hourly data
        val hourlyForecasts = response.hourly.time.mapIndexed { index, time ->
            val hourWindSpeed = response.hourly.wind_speed_10m[index] / 3.6
            val hourSolar = response.hourly.shortwave_radiation?.getOrNull(index)
                ?: estimateSolarRadiationForHour(index % 24)

            val hourWbgt = WbgtCalculator.calculateWbgt(
                temperature = response.hourly.temperature_2m[index],
                humidity = response.hourly.relative_humidity_2m[index].toDouble(),
                windSpeed = hourWindSpeed,
                solarRadiation = hourSolar
            )

            HourlyForecast(
                hour = index % 24,
                time = time,
                temperature = response.hourly.temperature_2m[index],
                humidity = response.hourly.relative_humidity_2m[index],
                windSpeed = hourWindSpeed,
                solarRadiation = hourSolar,
                wbgt = hourWbgt.wbgt,
                riskLevel = hourWbgt.riskLevel
            )
        }

        return WeatherData(
            latitude = response.latitude,
            longitude = response.longitude,
            timezone = response.timezone,
            currentTime = response.current.time,
            temperature = response.current.temperature_2m,
            humidity = response.current.relative_humidity_2m,
            windSpeed = windSpeedMs,
            solarRadiation = solarRadiation,
            weatherCode = response.current.weather_code,
            wbgtResult = currentWbgt,
            hourlyForecasts = hourlyForecasts
        )
    }

    private fun estimateSolarRadiation(): Double {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return estimateSolarRadiationForHour(hour)
    }

    private fun estimateSolarRadiationForHour(hour: Int): Double {
        // Night time - no solar radiation
        if (hour < 6 || hour > 18) return 0.0

        // Calculate based on solar angle (simplified)
        val hoursFromNoon = abs(hour - 12)
        val maxRadiation = 900.0 // W/m² typical max for equatorial regions

        return maxOf(0.0, maxRadiation * kotlin.math.cos((hoursFromNoon / 6.0) * (Math.PI / 2)))
    }

    companion object {
        val UGANDA_DISTRICTS = listOf(
            District(1, "Kampala", "Central", 0.3476, 32.5825),
            District(2, "Wakiso", "Central", 0.4044, 32.4594),
            District(3, "Mukono", "Central", 0.3533, 32.7553),
            District(4, "Jinja", "Eastern", 0.4244, 33.2041),
            District(5, "Mbale", "Eastern", 1.0647, 34.1797),
            District(6, "Gulu", "Northern", 2.7747, 32.299),
            District(7, "Lira", "Northern", 2.2499, 32.8998),
            District(8, "Mbarara", "Western", -0.6072, 30.6545),
            District(9, "Kabale", "Western", -1.2508, 29.9894),
            District(10, "Fort Portal", "Western", 0.671, 30.275),
            District(11, "Masaka", "Central", -0.3136, 31.735),
            District(12, "Arua", "Northern", 3.0203, 30.9107)
        )
    }
}
