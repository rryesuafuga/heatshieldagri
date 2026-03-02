package com.heatshield.agri.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.HourlyForecast
import com.heatshield.agri.ui.viewmodel.ScheduleViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    viewModel: ScheduleViewModel = hiltViewModel()
) {
    val forecast by viewModel.forecast.collectAsState()
    val schedule by viewModel.schedule.collectAsState()
    val dataSource by viewModel.dataSource.collectAsState()
    val rfDeviation by viewModel.rfDeviation.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val mlLoadProgress by viewModel.mlLoadProgress.collectAsState()
    val selectedDistrict by viewModel.selectedDistrict.collectAsState()
    val workHoursNeeded by viewModel.workHoursNeeded.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Work Schedule", fontWeight = FontWeight.Bold)
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
                        else "Loading weather data...",
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
                    ScheduleDistrictSelector(
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

                // Work Hours Selector
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "Hours Needed",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf(4, 6, 8, 10).forEach { hours ->
                                    FilterChip(
                                        selected = workHoursNeeded == hours,
                                        onClick = { viewModel.setWorkHours(hours) },
                                        label = { Text("$hours hrs") },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }
                }

                // Summary Cards
                if (schedule != null) {
                    val sched = schedule!!

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ScheduleSummaryCard(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.Schedule,
                                label = "Safe Hours",
                                value = "${sched.totalSafeHours}",
                                color = MaterialTheme.colorScheme.primary
                            )
                            ScheduleSummaryCard(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.WbSunny,
                                label = "Start Time",
                                value = "${sched.recommendedStart}:00",
                                color = Color(0xFFF97316)
                            )
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ScheduleSummaryCard(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.Coffee,
                                label = "End Time",
                                value = "${sched.recommendedEnd}:00",
                                color = Color(0xFF3B82F6)
                            )
                            ProductivityCard(
                                modifier = Modifier.weight(1f),
                                score = sched.productivityScore
                            )
                        }
                    }

                    // Hourly Breakdown (daylight hours only)
                    item {
                        Text(
                            "Hourly Breakdown (6:00 - 18:00)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    item {
                        DaylightHourGrid(
                            forecast = forecast,
                            safeHours = sched.safeHours
                        )
                    }

                    // Recommended Schedule
                    item {
                        Text(
                            "Recommended Daily Schedule",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    item {
                        RecommendedScheduleCard(schedule = sched)
                    }

                    // Break Schedule
                    item {
                        BreakScheduleSection(breakSchedule = sched.breakSchedule)
                    }
                }

                // Warning Signs
                item {
                    WarningSignsCard()
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScheduleDistrictSelector(
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
fun ScheduleSummaryCard(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
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
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = color.copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
fun ProductivityCard(
    modifier: Modifier = Modifier,
    score: Double
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
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = { (score / 100).toFloat() },
                    modifier = Modifier.size(60.dp),
                    strokeWidth = 6.dp,
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                )
                Text(
                    "${score.toInt()}%",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Productivity",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun DaylightHourGrid(
    forecast: List<HourlyForecast>,
    safeHours: List<Int>
) {
    val daylightHours = forecast.filter { it.hour in 6 until 18 }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Morning hours (6-11)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            items(daylightHours.filter { it.hour < 12 }) { hour ->
                HourChip(
                    hour = hour.hour,
                    wbgt = hour.wbgt,
                    isRecommended = safeHours.contains(hour.hour)
                )
            }
        }

        // Afternoon hours (12-17)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            items(daylightHours.filter { it.hour >= 12 }) { hour ->
                HourChip(
                    hour = hour.hour,
                    wbgt = hour.wbgt,
                    isRecommended = safeHours.contains(hour.hour)
                )
            }
        }
    }
}

@Composable
fun HourChip(
    hour: Int,
    wbgt: Double,
    isRecommended: Boolean
) {
    val result = WbgtCalculator.classifyRisk(wbgt)
    val riskColor = Color(result.color)

    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (isRecommended) Color(0xFF22C55E).copy(alpha = 0.2f)
                else Color(0xFF9CA3AF).copy(alpha = 0.1f)
            )
            .then(
                if (isRecommended) Modifier.border(
                    2.dp,
                    Color(0xFF22C55E),
                    RoundedCornerShape(8.dp)
                )
                else Modifier
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "$hour",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                "${wbgt.toInt()}°",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = if (isRecommended) Color(0xFF22C55E) else riskColor
            )
        }
    }
}

@Composable
fun RecommendedScheduleCard(
    schedule: com.heatshield.agri.data.model.WorkSchedule
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (schedule.recommendedStart < 11) {
                WorkSessionRow(
                    icon = Icons.Default.WbSunny,
                    title = "Morning Work",
                    timeRange = "${schedule.recommendedStart}:00 - ${minOf(11, schedule.recommendedEnd)}:00",
                    color = Color(0xFF22C55E)
                )
            }

            WorkSessionRow(
                icon = Icons.Default.Hotel,
                title = "Midday Rest",
                timeRange = "11:00 - 15:00",
                color = Color(0xFF9CA3AF)
            )

            if (schedule.recommendedEnd > 15) {
                WorkSessionRow(
                    icon = Icons.Default.WbTwilight,
                    title = "Afternoon Work",
                    timeRange = "${maxOf(15, schedule.recommendedStart)}:00 - ${schedule.recommendedEnd}:00",
                    color = Color(0xFF3B82F6)
                )
            }
        }
    }
}

@Composable
fun WorkSessionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    timeRange: String,
    color: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = color)
            Text(title, fontWeight = FontWeight.Medium, color = color)
        }
        Text(
            timeRange,
            style = MaterialTheme.typography.bodyMedium,
            color = color.copy(alpha = 0.8f)
        )
    }
}

@Composable
fun BreakScheduleSection(breakSchedule: String) {
    Card(
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
                    "Break & Hydration Schedule",
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

@Composable
fun WarningSignsCard() {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF97316).copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                Icons.Default.Warning,
                contentDescription = null,
                tint = Color(0xFFF97316)
            )
            Column {
                Text(
                    "Heat Illness Warning Signs",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFC2410C)
                )
                Spacer(modifier = Modifier.height(8.dp))
                val symptoms = listOf(
                    "Headache or dizziness",
                    "Heavy sweating or no sweating",
                    "Nausea or confusion",
                    "Rapid heartbeat"
                )
                symptoms.forEach { symptom ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(4.dp)
                                .background(Color(0xFFF97316), CircleShape)
                        )
                        Text(
                            symptom,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFF97316)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "If symptoms appear: Stop work, move to shade, drink water.",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFC2410C)
                )
            }
        }
    }
}
