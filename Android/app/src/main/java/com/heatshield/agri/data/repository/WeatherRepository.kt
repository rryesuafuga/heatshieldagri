package com.heatshield.agri.data.repository

import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.api.HistoricalWeatherResponse
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

    /**
     * Fetch weather with 4 days of history for ML feature engineering.
     * Returns physics-based forecast (today + tomorrow) + history arrays for RF models.
     */
    suspend fun getWeatherWithHistory(
        lat: Double,
        lon: Double
    ): Result<WeatherHistoryData> {
        return withContext(Dispatchers.IO) {
            try {
                val response = weatherApiService.getWeatherWithHistory(lat, lon)
                val data = transformHistoricalResponse(response)
                Result.success(data)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    private fun transformHistoricalResponse(response: HistoricalWeatherResponse): WeatherHistoryData {
        val times = response.hourly.time
        val temps = response.hourly.temperature_2m
        val hums = response.hourly.relative_humidity_2m
        val winds = response.hourly.wind_speed_10m
        val solars = response.hourly.shortwave_radiation

        // past_days=4 → 96 hours of history, forecast_days=2 → 48 hours of forecast
        val totalHours = times.size
        val todayStartIndex = 96 // 4 days * 24 hours

        // Build physics-based forecast for today + tomorrow (48 hours)
        val forecastHours = minOf(48, totalHours - todayStartIndex)
        val physicsForecast = (0 until forecastHours).mapNotNull { i ->
            val idx = todayStartIndex + i
            if (idx >= totalHours) return@mapNotNull null

            val h = i % 24
            val windMs = winds[idx] / 3.6
            val solar = solars?.getOrNull(idx) ?: estimateSolarRadiationForHour(h)

            val wbgtResult = WbgtCalculator.calculateWbgt(
                temperature = temps[idx],
                humidity = hums[idx].toDouble(),
                windSpeed = windMs,
                solarRadiation = solar
            )

            HourlyForecast(
                hour = h,
                time = times[idx],
                temperature = temps[idx],
                humidity = hums[idx],
                windSpeed = windMs,
                solarRadiation = solar,
                wbgt = wbgtResult.wbgt,
                riskLevel = wbgtResult.riskLevel
            )
        }

        // Build ML history arrays (past data)
        val historyTemps = temps.take(todayStartIndex).map { it }
        val historyHums = hums.take(todayStartIndex).map { it.toDouble() }
        val historyWinds = winds.take(todayStartIndex).map { it / 3.6 }

        return WeatherHistoryData(
            physicsForecast = physicsForecast,
            historyTemps = historyTemps,
            historyHums = historyHums,
            historyWinds = historyWinds
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

data class WeatherHistoryData(
    val physicsForecast: List<HourlyForecast>,
    val historyTemps: List<Double>,
    val historyHums: List<Double>,
    val historyWinds: List<Double>
)
