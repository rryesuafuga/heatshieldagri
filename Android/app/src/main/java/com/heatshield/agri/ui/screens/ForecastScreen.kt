package com.heatshield.agri.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.HourlyForecast

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForecastScreen() {
    var selectedDay by remember { mutableStateOf(0) }
    val days = listOf("Today", "Tomorrow", "Day 3")

    val forecast = remember {
        val baseTemp = 31.0
        val humidity = 65.0
        // Generate 72-hour forecast
        (0 until 72).map { i ->
            val hour = i % 24
            val day = i / 24
            val dayOffset = (day - 1) * 1.5
            val tempBase = baseTemp + dayOffset

            val hourFactor = kotlin.math.abs(kotlin.math.abs(hour - 14.0) / 12.0 - 1.0)
            val temp = tempBase - 8.0 + hourFactor * 12.0

            val solar = if (hour in 6..18) {
                val solarHour = kotlin.math.abs(hour - 12.0)
                (1.0 - solarHour / 6.0) * 900.0
            } else {
                0.0
            }

            val wind = if (hour in 8..18) 3.0 else 1.5
            val result = WbgtCalculator.calculateWbgt(temp, humidity, wind, solar)

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

    val dayForecast = forecast.drop(selectedDay * 24).take(24)
    val maxWbgt = dayForecast.maxOfOrNull { it.wbgt } ?: 0.0
    val minWbgt = dayForecast.minOfOrNull { it.wbgt } ?: 0.0
    val avgWbgt = dayForecast.map { it.wbgt }.average()
    val safeHours = dayForecast.count { it.wbgt < 28 }
    val peakHour = dayForecast.maxByOrNull { it.wbgt }?.hour ?: 0
    val overallRisk = WbgtCalculator.classifyRisk(maxWbgt)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("72-Hour Forecast", fontWeight = FontWeight.Bold)
                        Text(
                            "WBGT predictions",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            // Day Selector
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    days.forEachIndexed { index, day ->
                        FilterChip(
                            selected = selectedDay == index,
                            onClick = { selectedDay = index },
                            label = { Text(day) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Summary Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SummaryCard(
                        modifier = Modifier.weight(1f),
                        label = "Peak WBGT",
                        value = "${String.format("%.1f", maxWbgt)}°C",
                        sublabel = "at ${peakHour}:00",
                        color = Color(overallRisk.color)
                    )
                    SummaryCard(
                        modifier = Modifier.weight(1f),
                        label = "Minimum",
                        value = "${String.format("%.1f", minWbgt)}°C",
                        sublabel = "early morning",
                        color = Color(0xFF22C55E)
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SummaryCard(
                        modifier = Modifier.weight(1f),
                        label = "Average",
                        value = "${String.format("%.1f", avgWbgt)}°C",
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    SummaryCard(
                        modifier = Modifier.weight(1f),
                        label = "Safe Hours",
                        value = "$safeHours",
                        sublabel = "below 28°C",
                        color = Color(0xFF3B82F6)
                    )
                }
            }

            // Hourly Breakdown Title
            item {
                Text(
                    "Hourly Breakdown",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Hourly Cards
            items(dayForecast) { hour ->
                HourlyForecastCard(forecast = hour)
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
fun SummaryCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    sublabel: String? = null,
    color: Color
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = color.copy(alpha = 0.8f)
            )
            Text(
                value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
            if (sublabel != null) {
                Text(
                    sublabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = color.copy(alpha = 0.6f)
                )
            }
        }
    }
}

@Composable
fun HourlyForecastCard(forecast: HourlyForecast) {
    val result = WbgtCalculator.classifyRisk(forecast.wbgt)
    val riskColor = Color(result.color)

    val workStatus = when (result.riskLevel) {
        com.heatshield.agri.data.model.RiskLevel.LOW,
        com.heatshield.agri.data.model.RiskLevel.MODERATE -> "Safe"
        com.heatshield.agri.data.model.RiskLevel.HIGH -> "Limited"
        else -> "Rest"
    }

    val workStatusColor = when (workStatus) {
        "Safe" -> Color(0xFF22C55E)
        "Limited" -> Color(0xFFF97316)
        else -> Color(0xFFEF4444)
    }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Hour
            Text(
                "${String.format("%02d", forecast.hour)}:00",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(60.dp)
            )

            // WBGT
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "${String.format("%.1f", forecast.wbgt)}°C",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = riskColor
                )
                Text(
                    "WBGT",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Risk Badge
            Surface(
                color = riskColor.copy(alpha = 0.1f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    result.riskLevel.displayName,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = riskColor
                )
            }

            // Temperature
            Text(
                "${String.format("%.1f", forecast.temperature)}°C",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Work Status
            Text(
                workStatus,
                style = MaterialTheme.typography.labelMedium,
                color = workStatusColor,
                fontWeight = FontWeight.Medium
            )
        }
    }
}
