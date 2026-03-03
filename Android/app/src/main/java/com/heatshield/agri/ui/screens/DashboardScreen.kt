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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.data.model.WeatherData
import com.heatshield.agri.data.model.WbgtResult
import com.heatshield.agri.data.model.WorkSchedule
import com.heatshield.agri.ui.viewmodel.DashboardViewModel
import com.heatshield.agri.ui.viewmodel.WeatherUiState
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val selectedDistrict by viewModel.selectedDistrict.collectAsState()
    val workSchedule by viewModel.workSchedule.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("HeatShield Agri", fontWeight = FontWeight.Bold)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                selectedDistrict.name,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Surface(
                                color = Color(0xFF22C55E).copy(alpha = 0.2f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    "Live",
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF22C55E)
                                )
                            }
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            modifier = if (uiState is WeatherUiState.Loading) {
                                Modifier // Could add rotation animation here
                            } else Modifier
                        )
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is WeatherUiState.Loading -> {
                LoadingContent(modifier = Modifier.padding(padding))
            }
            is WeatherUiState.Error -> {
                ErrorContent(
                    message = state.message,
                    onRetry = { viewModel.refresh() },
                    modifier = Modifier.padding(padding)
                )
            }
            is WeatherUiState.Success -> {
                DashboardContent(
                    weatherData = state.data,
                    workSchedule = workSchedule,
                    modifier = Modifier.padding(padding)
                )
            }
        }
    }
}

@Composable
fun LoadingContent(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = Color(0xFF22C55E))
            Spacer(modifier = Modifier.height(16.dp))
            Text("Loading weather data...")
            Text(
                "Fetching from Open-Meteo",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun ErrorContent(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.CloudOff,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = Color(0xFFEF4444)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "Unable to load weather data",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Try Again")
            }
        }
    }
}

@Composable
fun DashboardContent(
    weatherData: WeatherData,
    workSchedule: WorkSchedule?,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { Spacer(modifier = Modifier.height(8.dp)) }

        // Risk Card
        item {
            RiskCard(wbgtResult = weatherData.wbgtResult)
        }

        // Weather Conditions
        item {
            Text(
                "Current Conditions",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
        }

        item {
            WeatherConditionsRow(
                temperature = weatherData.temperature,
                humidity = weatherData.humidity.toDouble(),
                windSpeed = weatherData.windSpeed,
                solarRadiation = weatherData.solarRadiation
            )
        }

        // Hourly Forecast
        item {
            Text(
                "Next 8 Hours",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
        }

        item {
            HourlyForecastRow(forecast = weatherData.hourlyForecasts)
        }

        // Work Schedule
        workSchedule?.let { schedule ->
            item {
                WorkScheduleCard(
                    recommendedStart = schedule.recommendedStart,
                    recommendedEnd = schedule.recommendedEnd,
                    totalSafeHours = schedule.totalSafeHours,
                    productivityScore = schedule.productivityScore
                )
            }

            item {
                BreakScheduleCard(breakSchedule = schedule.breakSchedule)
            }
        }

        // Attribution
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "Weather data from Open-Meteo.com • WBGT per ISO 7243",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Designed by Wayesu Community Research Organisation Ltd",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
fun RiskCard(wbgtResult: WbgtResult) {
    val riskColor = Color(wbgtResult.color)
    val backgroundColor = riskColor.copy(alpha = 0.1f)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Heat Stress Risk",
                    style = MaterialTheme.typography.titleMedium,
                    color = riskColor
                )
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    tint = riskColor
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "${String.format("%.1f", wbgtResult.wbgt)}°C",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = riskColor
            )

            Text(
                "WBGT",
                style = MaterialTheme.typography.bodySmall,
                color = riskColor.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Surface(
                color = riskColor,
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(
                    wbgtResult.riskLevel.displayName + " Risk",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    color = Color.White,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                wbgtResult.recommendation,
                style = MaterialTheme.typography.bodyMedium,
                color = riskColor.copy(alpha = 0.9f),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun WeatherConditionsRow(
    temperature: Double,
    humidity: Double,
    windSpeed: Double,
    solarRadiation: Double
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        WeatherCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.Thermostat,
            label = "Temp",
            value = "${String.format("%.1f", temperature)}°C"
        )
        WeatherCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.WaterDrop,
            label = "Humidity",
            value = "${String.format("%.0f", humidity)}%"
        )
        WeatherCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.Air,
            label = "Wind",
            value = "${String.format("%.1f", windSpeed)} m/s"
        )
        WeatherCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.WbSunny,
            label = "Solar",
            value = "${String.format("%.0f", solarRadiation)}"
        )
    }
}

@Composable
fun WeatherCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    value: String
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun HourlyForecastRow(forecast: List<HourlyForecast>) {
    val currentHour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val upcomingForecast = forecast.filter { it.hour >= currentHour }.take(8)
        .ifEmpty { forecast.take(8) }

    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(upcomingForecast) { hourForecast ->
            val result = WbgtCalculator.classifyRisk(hourForecast.wbgt)
            val riskColor = Color(result.color)

            Card(
                colors = CardDefaults.cardColors(
                    containerColor = riskColor.copy(alpha = 0.1f)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "${String.format("%02d", hourForecast.hour)}:00",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "${String.format("%.0f", hourForecast.wbgt)}°",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = riskColor
                    )
                }
            }
        }
    }
}

@Composable
fun WorkScheduleCard(
    recommendedStart: Int,
    recommendedEnd: Int,
    totalSafeHours: Int,
    productivityScore: Double
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Today's Safe Work Hours",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        "Recommended",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        "${String.format("%02d", recommendedStart)}:00 - ${String.format("%02d", recommendedEnd)}:00",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "Safe Hours",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        "$totalSafeHours hours",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "Productivity Score",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                LinearProgressIndicator(
                    progress = (productivityScore / 100).toFloat(),
                    modifier = Modifier
                        .weight(1f)
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = Color(0xFF22C55E),
                )
                Text(
                    "${String.format("%.0f", productivityScore)}%",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun BreakScheduleCard(breakSchedule: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF3B82F6).copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                Icons.Default.WaterDrop,
                contentDescription = null,
                tint = Color(0xFF3B82F6)
            )
            Column {
                Text(
                    "Break & Hydration",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1E40AF)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    breakSchedule,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF3B82F6)
                )
            }
        }
    }
}