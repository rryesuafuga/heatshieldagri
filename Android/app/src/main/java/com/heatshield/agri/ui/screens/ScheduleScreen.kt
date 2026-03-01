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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.HourlyForecast

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen() {
    var workHoursNeeded by remember { mutableStateOf(8) }

    val forecast = remember {
        WbgtCalculator.generateDemoForecast(32.0, 65.0)
    }

    val schedule = remember(workHoursNeeded) {
        WbgtCalculator.optimizeWorkSchedule(forecast, workHoursNeeded)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Work Schedule", fontWeight = FontWeight.Bold)
                        Text(
                            "AI-optimized safe work windows",
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
                                    onClick = { workHoursNeeded = hours },
                                    label = { Text("$hours hrs") },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }

            // Summary Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ScheduleSummaryCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Schedule,
                        label = "Safe Hours",
                        value = "${schedule.totalSafeHours}",
                        color = MaterialTheme.colorScheme.primary
                    )
                    ScheduleSummaryCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.WbSunny,
                        label = "Start Time",
                        value = "${schedule.recommendedStart}:00",
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
                        value = "${schedule.recommendedEnd}:00",
                        color = Color(0xFF3B82F6)
                    )
                    ProductivityCard(
                        modifier = Modifier.weight(1f),
                        score = schedule.productivityScore
                    )
                }
            }

            // Hour Grid
            item {
                Text(
                    "Hourly Breakdown",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                HourGrid(
                    forecast = forecast,
                    safeHours = schedule.safeHours
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
                RecommendedScheduleCard(schedule = schedule)
            }

            // Break Schedule
            item {
                BreakScheduleSection(breakSchedule = schedule.breakSchedule)
            }

            // Warning Signs
            item {
                WarningSignsCard()
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
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
fun HourGrid(
    forecast: List<HourlyForecast>,
    safeHours: List<Int>
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Morning hours (0-11)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            items(forecast.take(12)) { hour ->
                HourChip(
                    hour = hour.hour,
                    wbgt = hour.wbgt,
                    isRecommended = safeHours.contains(hour.hour)
                )
            }
        }

        // Afternoon hours (12-23)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            items(forecast.drop(12)) { hour ->
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
                if (isRecommended) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                else riskColor.copy(alpha = 0.1f)
            )
            .then(
                if (isRecommended) Modifier.border(
                    2.dp,
                    MaterialTheme.colorScheme.primary,
                    RoundedCornerShape(8.dp)
                )
                else Modifier
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "${hour}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                "${wbgt.toInt()}°",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = if (isRecommended)
                    MaterialTheme.colorScheme.primary
                else
                    riskColor
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
            // Morning session
            if (schedule.recommendedStart < 10) {
                WorkSessionRow(
                    icon = Icons.Default.WbSunny,
                    title = "Morning Work",
                    timeRange = "${schedule.recommendedStart}:00 - ${minOf(10, schedule.recommendedEnd)}:00",
                    color = Color(0xFF22C55E)
                )
            }

            // Midday rest
            WorkSessionRow(
                icon = Icons.Default.Hotel,
                title = "Midday Rest",
                timeRange = "11:00 - 15:00",
                color = Color(0xFF9CA3AF)
            )

            // Evening session
            if (schedule.recommendedEnd > 15) {
                WorkSessionRow(
                    icon = Icons.Default.WbTwilight,
                    title = "Evening Work",
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
            Text(
                title,
                fontWeight = FontWeight.Medium,
                color = color
            )
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
