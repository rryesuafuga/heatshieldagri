package com.heatshield.agri.data

import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.data.model.RiskLevel
import com.heatshield.agri.data.model.WbgtResult
import com.heatshield.agri.data.model.WorkSchedule
import kotlin.math.abs
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * WBGT (Wet-Bulb Globe Temperature) Calculator
 *
 * Implements ISO 7243 heat stress calculations for agricultural work.
 */
object WbgtCalculator {

    // Risk thresholds (°C)
    private const val WBGT_LOW = 26.0
    private const val WBGT_MODERATE = 28.0
    private const val WBGT_HIGH = 30.0
    private const val WBGT_VERY_HIGH = 32.0

    /**
     * Calculate WBGT from environmental factors
     */
    fun calculateWbgt(
        temperature: Double,
        humidity: Double,
        windSpeed: Double,
        solarRadiation: Double
    ): WbgtResult {
        val tw = calculateWetBulb(temperature, humidity)
        val tg = calculateGlobeTemperature(temperature, windSpeed, solarRadiation)

        // Outdoor WBGT formula
        val wbgt = 0.7 * tw + 0.2 * tg + 0.1 * temperature

        return classifyRisk(wbgt)
    }

    /**
     * Calculate wet-bulb temperature using Stull formula
     */
    fun calculateWetBulb(temperature: Double, humidity: Double): Double {
        val t = temperature
        val rh = humidity

        return t * atan(0.151977 * sqrt(rh + 8.313659)) +
                atan(t + rh) -
                atan(rh - 1.676331) +
                0.00391838 * rh.pow(1.5) * atan(0.023101 * rh) -
                4.686035
    }

    /**
     * Calculate globe temperature
     */
    fun calculateGlobeTemperature(
        temperature: Double,
        windSpeed: Double,
        solarRadiation: Double
    ): Double {
        val emissivity = 0.95
        val diameter = 0.15
        val stefanBoltzmann = 5.67e-8

        val hConv = if (windSpeed < 0.1) {
            1.4 * (abs(temperature) / diameter).pow(0.25)
        } else {
            6.3 * windSpeed.pow(0.6) / diameter.pow(0.4)
        }

        val qSolar = 0.95 * solarRadiation

        var tg = temperature + 10.0

        repeat(20) {
            val qRadOut = emissivity * stefanBoltzmann * (tg + 273.15).pow(4.0)
            val qRadIn = emissivity * stefanBoltzmann * (temperature + 273.15).pow(4.0)
            val qConv = hConv * (tg - temperature)

            val residual = qSolar + qRadIn - qRadOut - qConv
            val dqDtg = 4.0 * emissivity * stefanBoltzmann * (tg + 273.15).pow(3.0) + hConv
            tg += residual / dqDtg
        }

        return tg
    }

    /**
     * Classify WBGT into risk level
     */
    fun classifyRisk(wbgt: Double): WbgtResult {
        val (riskLevel, recommendation) = when {
            wbgt < WBGT_LOW -> RiskLevel.LOW to
                    "Normal work schedule. Stay hydrated with 250ml water every 30 minutes."
            wbgt < WBGT_MODERATE -> RiskLevel.MODERATE to
                    "Take 15-minute breaks every hour. Increase water intake to 500ml per hour."
            wbgt < WBGT_HIGH -> RiskLevel.HIGH to
                    "Work only during cooler hours (5-10am, 4-6pm). Take 30-minute breaks per hour."
            wbgt < WBGT_VERY_HIGH -> RiskLevel.VERY_HIGH to
                    "Limit outdoor work to 6-10am only. Monitor all workers for heat stress symptoms."
            else -> RiskLevel.EXTREME to
                    "SUSPEND all outdoor agricultural work. Emergency protocols active."
        }

        return WbgtResult(
            wbgt = wbgt,
            riskLevel = riskLevel,
            recommendation = recommendation,
            color = riskLevel.color
        )
    }

    /**
     * Generate demo 24-hour forecast
     */
    fun generateDemoForecast(baseTemp: Double, humidity: Double): List<HourlyForecast> {
        return (0 until 24).map { hour ->
            val hourFactor = abs(abs(hour - 14.0) / 12.0 - 1.0)
            val temp = baseTemp - 8.0 + hourFactor * 12.0

            val solar = if (hour in 6..18) {
                val solarHour = abs(hour - 12.0)
                (1.0 - solarHour / 6.0) * 900.0
            } else {
                0.0
            }

            val wind = if (hour in 8..18) 3.0 else 1.5

            val result = calculateWbgt(temp, humidity, wind, solar)

            HourlyForecast(
                hour = hour,
                wbgt = result.wbgt,
                temperature = temp,
                humidity = humidity.toInt(),
                windSpeed = wind,
                solarRadiation = solar
            )
        }
    }

    private const val WORK_HOUR_START = 6
    private const val WORK_HOUR_END = 18

    /**
     * Optimize work schedule — restricted to daylight hours (06:00-18:00)
     * for agricultural workers.
     */
    fun optimizeWorkSchedule(
        forecast: List<HourlyForecast>,
        workHoursNeeded: Int
    ): WorkSchedule {
        // Filter to daylight hours only (6 AM - 6 PM)
        val daylight = forecast
            .filter { it.hour in WORK_HOUR_START until WORK_HOUR_END }
            .map { it.hour to it.wbgt }

        val hourScores = daylight.sortedBy { it.second }

        val safeHours = hourScores
            .take(minOf(workHoursNeeded, daylight.size))
            .map { it.first }
            .sorted()

        val avgWbgt = if (hourScores.isNotEmpty()) {
            hourScores.take(minOf(workHoursNeeded, hourScores.size))
                .map { it.second }.average()
        } else 30.0

        val productivityScore = ((40.0 - avgWbgt) / 40.0 * 100.0).coerceIn(0.0, 100.0)

        val breakSchedule = when {
            avgWbgt < 26 -> "Take a 10-minute break every 2 hours. Drink water during breaks."
            avgWbgt < 28 -> "Take a 15-minute break every hour. Stay in shade during breaks."
            avgWbgt < 30 -> "Take a 20-minute break every 45 minutes. Rest in coolest area."
            else -> "Take a 30-minute break every 30 minutes. Monitor for heat illness."
        }

        return WorkSchedule(
            safeHours = safeHours,
            totalSafeHours = safeHours.size,
            recommendedStart = safeHours.firstOrNull() ?: WORK_HOUR_START,
            recommendedEnd = (safeHours.lastOrNull() ?: 17) + 1,
            breakSchedule = breakSchedule,
            productivityScore = productivityScore
        )
    }

    /**
     * Calculate heat index
     */
    fun calculateHeatIndex(temperature: Double, humidity: Double): Double {
        val t = temperature * 9.0 / 5.0 + 32.0
        val r = humidity

        if (t < 80) return temperature

        var hi = -42.379 +
                2.04901523 * t +
                10.14333127 * r -
                0.22475541 * t * r -
                0.00683783 * t * t -
                0.05481717 * r * r +
                0.00122874 * t * t * r +
                0.00085282 * t * r * r -
                0.00000199 * t * t * r * r

        hi = when {
            r < 13 && t in 80.0..112.0 ->
                hi - ((13 - r) / 4) * sqrt((17 - abs(t - 95)) / 17)
            r > 85 && t in 80.0..87.0 ->
                hi + ((r - 85) / 10) * ((87 - t) / 5)
            else -> hi
        }

        return (hi - 32) * 5 / 9
    }

    /**
     * Get Uganda districts
     */
    fun getUgandaDistricts() = listOf(
        com.heatshield.agri.data.model.District(1, "Kampala", "Central", 0.3476, 32.5825),
        com.heatshield.agri.data.model.District(2, "Wakiso", "Central", 0.4044, 32.4594),
        com.heatshield.agri.data.model.District(3, "Mukono", "Central", 0.3533, 32.7553),
        com.heatshield.agri.data.model.District(4, "Jinja", "Eastern", 0.4244, 33.2041),
        com.heatshield.agri.data.model.District(5, "Mbale", "Eastern", 1.0647, 34.1797),
        com.heatshield.agri.data.model.District(6, "Gulu", "Northern", 2.7747, 32.2990),
        com.heatshield.agri.data.model.District(7, "Lira", "Northern", 2.2499, 32.8998),
        com.heatshield.agri.data.model.District(8, "Mbarara", "Western", -0.6072, 30.6545),
        com.heatshield.agri.data.model.District(9, "Kabale", "Western", -1.2508, 29.9894),
        com.heatshield.agri.data.model.District(10, "Fort Portal", "Western", 0.6710, 30.2750),
        com.heatshield.agri.data.model.District(11, "Masaka", "Central", -0.3136, 31.7350),
        com.heatshield.agri.data.model.District(12, "Arua", "Northern", 3.0203, 30.9107)
    )
}
