package com.heatshield.agri.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.style.TextAlign
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
    val physicsForecast by viewModel.physicsForecast.collectAsState()
    val rfForecast by viewModel.rfForecast.collectAsState()
    val rfAvailable by viewModel.rfAvailable.collectAsState()
    val rfDeviation by viewModel.rfDeviation.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val mlLoadProgress by viewModel.mlLoadProgress.collectAsState()
    val selectedDistrict by viewModel.selectedDistrict.collectAsState()

    var selectedDay by remember { mutableStateOf(0) }
    val days = listOf("Today", "Tomorrow")

    // Split forecasts into days (24h each), filter to daylight (6-18)
    val physicsDay = if (physicsForecast.isNotEmpty()) {
        physicsForecast.drop(selectedDay * 24).take(24).filter { it.hour in 6..18 }
    } else emptyList()

    val rfDay = if (rfForecast.isNotEmpty()) {
        rfForecast.drop(selectedDay * 24).take(24).filter { it.hour in 6..18 }
    } else emptyList()

    // Build a map of RF WBGT by hour for quick lookup
    val rfByHour = rfDay.associateBy { it.hour }

    // Physics summary stats
    val physicsMax = physicsDay.maxOfOrNull { it.wbgt } ?: 0.0
    val physicsAvg = if (physicsDay.isNotEmpty()) physicsDay.map { it.wbgt }.average() else 0.0
    val peakHour = physicsDay.maxByOrNull { it.wbgt }?.hour ?: 12
    val overallRisk = WbgtCalculator.classifyRisk(physicsMax)

    // RF summary stats
    val rfMax = rfDay.maxOfOrNull { it.wbgt } ?: 0.0
    val rfAvg = if (rfDay.isNotEmpty()) rfDay.map { it.wbgt }.average() else 0.0

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("WBGT Forecast", fontWeight = FontWeight.Bold)
                        Text(
                            selectedDistrict.name,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    // Always show both model badges
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF3B82F6).copy(alpha = 0.15f),
                        modifier = Modifier.padding(end = 4.dp)
                    ) {
                        Text(
                            "Physics",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF3B82F6)
                        )
                    }
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (rfAvailable) Color(0xFF22C55E).copy(alpha = 0.15f)
                        else Color(0xFF9CA3AF).copy(alpha = 0.15f),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text(
                            "RF",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = if (rfAvailable) Color(0xFF22C55E) else Color(0xFF9CA3AF)
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading && physicsForecast.isEmpty()) {
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
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // District Selector
                item {
                    ForecastDistrictSelector(
                        districts = viewModel.districts,
                        selected = selectedDistrict,
                        onSelect = { viewModel.selectDistrict(it) }
                    )
                }

                // Model comparison info card
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.Science,
                                        contentDescription = null,
                                        tint = Color(0xFF3B82F6),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        "Physics",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF3B82F6)
                                    )
                                    Text(
                                        "Open-Meteo NWP + ISO 7243",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.Psychology,
                                        contentDescription = null,
                                        tint = if (rfAvailable) Color(0xFF22C55E) else Color(0xFF9CA3AF),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        "Random Forest",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = if (rfAvailable) Color(0xFF22C55E) else Color(0xFF9CA3AF)
                                    )
                                    if (rfAvailable && rfDeviation != null) {
                                        Text(
                                            "MAE: ${"%.1f".format(rfDeviation)}°C",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    } else if (!rfAvailable) {
                                        Text(
                                            "Loading...",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color(0xFF9CA3AF)
                                        )
                                    }
                                }
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

                // Summary Cards — side by side Physics vs RF
                if (physicsDay.isNotEmpty()) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Physics peak
                            SummaryCard(
                                modifier = Modifier.weight(1f),
                                label = "Physics Peak",
                                value = "${"%.1f".format(physicsMax)}°C",
                                sublabel = "at ${peakHour}:00",
                                color = Color(overallRisk.color)
                            )
                            // RF peak
                            if (rfAvailable && rfDay.isNotEmpty()) {
                                val rfOverallRisk = WbgtCalculator.classifyRisk(rfMax)
                                SummaryCard(
                                    modifier = Modifier.weight(1f),
                                    label = "RF Peak",
                                    value = "${"%.1f".format(rfMax)}°C",
                                    sublabel = "Random Forest",
                                    color = Color(rfOverallRisk.color)
                                )
                            } else {
                                SummaryCard(
                                    modifier = Modifier.weight(1f),
                                    label = "RF Peak",
                                    value = "—",
                                    sublabel = "loading",
                                    color = Color(0xFF9CA3AF)
                                )
                            }
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            SummaryCard(
                                modifier = Modifier.weight(1f),
                                label = "Physics Avg",
                                value = "${"%.1f".format(physicsAvg)}°C",
                                color = Color(0xFF3B82F6)
                            )
                            if (rfAvailable && rfDay.isNotEmpty()) {
                                SummaryCard(
                                    modifier = Modifier.weight(1f),
                                    label = "RF Avg",
                                    value = "${"%.1f".format(rfAvg)}°C",
                                    color = Color(0xFF22C55E)
                                )
                            } else {
                                SummaryCard(
                                    modifier = Modifier.weight(1f),
                                    label = "RF Avg",
                                    value = "—",
                                    color = Color(0xFF9CA3AF)
                                )
                            }
                        }
                    }
                }

                // Hourly Breakdown header with column labels
                item {
                    Text(
                        "Hourly Breakdown (6:00 - 18:00)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            "Hour",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.width(48.dp)
                        )
                        Text(
                            "Physics",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF3B82F6),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            "RF",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF22C55E),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            "Temp",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.width(48.dp)
                        )
                        Text(
                            "Status",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.End,
                            modifier = Modifier.width(52.dp)
                        )
                    }
                }

                // Hourly dual-model cards
                items(physicsDay) { physicsHour ->
                    val rfHour = rfByHour[physicsHour.hour]
                    DualModelHourlyCard(
                        physicsHour = physicsHour,
                        rfHour = rfHour
                    )
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
fun DualModelHourlyCard(
    physicsHour: HourlyForecast,
    rfHour: HourlyForecast?
) {
    val physicsResult = WbgtCalculator.classifyRisk(physicsHour.wbgt)
    val physicsColor = Color(physicsResult.color)

    val rfResult = rfHour?.let { WbgtCalculator.classifyRisk(it.wbgt) }
    val rfColor = rfResult?.let { Color(it.color) } ?: Color(0xFF9CA3AF)

    // Work status based on the worse of the two models (conservative)
    val worstWbgt = maxOf(physicsHour.wbgt, rfHour?.wbgt ?: physicsHour.wbgt)
    val worstResult = WbgtCalculator.classifyRisk(worstWbgt)
    val workStatus = when (worstResult.riskLevel) {
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
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Hour
            Text(
                "${String.format("%02d", physicsHour.hour)}:00",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(48.dp)
            )

            // Physics WBGT
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    "${"%.1f".format(physicsHour.wbgt)}°",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = physicsColor
                )
                Surface(
                    color = physicsColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        physicsResult.riskLevel.displayName,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = physicsColor
                    )
                }
            }

            // RF WBGT
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                if (rfHour != null && rfResult != null) {
                    Text(
                        "${"%.1f".format(rfHour.wbgt)}°",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = rfColor
                    )
                    Surface(
                        color = rfColor.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            rfResult.riskLevel.displayName,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = rfColor
                        )
                    }
                } else {
                    Text(
                        "—",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color(0xFF9CA3AF)
                    )
                }
            }

            // Temperature
            Text(
                "${"%.0f".format(physicsHour.temperature)}°C",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(48.dp)
            )

            // Work Status
            Text(
                workStatus,
                style = MaterialTheme.typography.labelMedium,
                color = workStatusColor,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.End,
                modifier = Modifier.width(52.dp)
            )
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
