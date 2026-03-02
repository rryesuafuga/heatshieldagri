package com.heatshield.agri.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.ui.viewmodel.ForecastViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForecastScreen(
    viewModel: ForecastViewModel = hiltViewModel()
) {
    val forecast by viewModel.forecast.collectAsState()
    val dataSource by viewModel.dataSource.collectAsState()
    val rfDeviation by viewModel.rfDeviation.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val mlLoadProgress by viewModel.mlLoadProgress.collectAsState()
    val selectedDistrict by viewModel.selectedDistrict.collectAsState()

    var selectedDay by remember { mutableStateOf(0) }
    val days = listOf("Today", "Tomorrow")

    // Split forecast into days (24h each)
    val dayForecast = if (forecast.isNotEmpty()) {
        forecast.drop(selectedDay * 24).take(24)
    } else emptyList()

    // Filter to daylight hours (6-18) for display
    val daylightForecast = dayForecast.filter { it.hour in 6 until 18 }

    val maxWbgt = daylightForecast.maxOfOrNull { it.wbgt } ?: 0.0
    val minWbgt = daylightForecast.minOfOrNull { it.wbgt } ?: 0.0
    val avgWbgt = if (daylightForecast.isNotEmpty()) daylightForecast.map { it.wbgt }.average() else 0.0
    val safeHours = daylightForecast.count { it.wbgt < 28 }
    val peakHour = daylightForecast.maxByOrNull { it.wbgt }?.hour ?: 12
    val overallRisk = WbgtCalculator.classifyRisk(maxWbgt)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("WBGT Forecast", fontWeight = FontWeight.Bold)
                        Text(
                            selectedDistrict.name + " — " + when (dataSource) {
                                "rf-enhanced" -> "RF-Enhanced"
                                "physics" -> "Physics Model"
                                "loading" -> "Loading..."
                                "error" -> "Offline"
                                else -> dataSource
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    val (badgeColor, badgeText) = when (dataSource) {
                        "rf-enhanced" -> Color(0xFF22C55E) to "RF"
                        "physics" -> Color(0xFF3B82F6) to "Physics"
                        "loading" -> Color(0xFF9CA3AF) to "..."
                        else -> Color(0xFFEF4444) to "!"
                    }
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = badgeColor.copy(alpha = 0.15f),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text(
                            badgeText,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = badgeColor
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading && forecast.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        if (mlLoadProgress.isNotEmpty()) mlLoadProgress
                        else "Fetching weather data...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { Spacer(modifier = Modifier.height(8.dp)) }

                // District Selector
                item {
                    ForecastDistrictSelector(
                        districts = viewModel.districts,
                        selected = selectedDistrict,
                        onSelect = { viewModel.selectDistrict(it) }
                    )
                }

                // ML Status Card
                if (dataSource == "rf-enhanced" && rfDeviation != null) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFF22C55E).copy(alpha = 0.08f)
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Psychology,
                                    contentDescription = null,
                                    tint = Color(0xFF22C55E),
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    "Random Forest ML enhanced — MAE: ${"%.1f".format(rfDeviation)}°C (70% physics + 30% RF)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF166534)
                                )
                            }
                        }
                    }
                } else if (dataSource == "physics") {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFF3B82F6).copy(alpha = 0.08f)
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Science,
                                    contentDescription = null,
                                    tint = Color(0xFF3B82F6),
                                    modifier = Modifier.size(20.dp)
                                )
                                val text = if (rfDeviation != null) {
                                    "Physics model (RF deviation ${"%.1f".format(rfDeviation)}°C exceeds 2.0°C threshold)"
                                } else {
                                    "Physics model — Open-Meteo NWP + ISO 7243 WBGT"
                                }
                                Text(
                                    text,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF1E40AF)
                                )
                            }
                        }
                    }
                }

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
                if (daylightForecast.isNotEmpty()) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            SummaryCard(
                                modifier = Modifier.weight(1f),
                                label = "Peak WBGT",
                                value = "${"%.1f".format(maxWbgt)}°C",
                                sublabel = "at ${peakHour}:00",
                                color = Color(overallRisk.color)
                            )
                            SummaryCard(
                                modifier = Modifier.weight(1f),
                                label = "Minimum",
                                value = "${"%.1f".format(minWbgt)}°C",
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
                                value = "${"%.1f".format(avgWbgt)}°C",
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            SummaryCard(
                                modifier = Modifier.weight(1f),
                                label = "Safe Hours",
                                value = "$safeHours",
                                sublabel = "below 28°C (6-18h)",
                                color = Color(0xFF3B82F6)
                            )
                        }
                    }
                }

                // Hourly Breakdown Title
                item {
                    Text(
                        "Hourly Breakdown (6:00 - 18:00)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Hourly Cards — daylight hours only
                items(daylightForecast) { hour ->
                    HourlyForecastCard(forecast = hour)
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ForecastDistrictSelector(
    districts: List<com.heatshield.agri.data.model.District>,
    selected: com.heatshield.agri.data.model.District,
    onSelect: (com.heatshield.agri.data.model.District) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = "${selected.name}, ${selected.region}",
            onValueChange = {},
            readOnly = true,
            label = { Text("District") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            districts.forEach { district ->
                DropdownMenuItem(
                    text = { Text("${district.name} (${district.region})") },
                    onClick = {
                        onSelect(district)
                        expanded = false
                    }
                )
            }
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
            Text(
                "${String.format("%02d", forecast.hour)}:00",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(60.dp)
            )

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "${"%.1f".format(forecast.wbgt)}°C",
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

            Text(
                "${"%.1f".format(forecast.temperature)}°C",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Text(
                workStatus,
                style = MaterialTheme.typography.labelMedium,
                color = workStatusColor,
                fontWeight = FontWeight.Medium
            )
        }
    }
}
