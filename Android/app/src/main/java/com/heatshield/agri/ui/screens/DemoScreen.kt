package com.heatshield.agri.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DemoScreen() {
    var temperature by remember { mutableFloatStateOf(32f) }
    var humidity by remember { mutableFloatStateOf(65f) }
    var windSpeed by remember { mutableFloatStateOf(2.5f) }
    var solarRadiation by remember { mutableFloatStateOf(750f) }

    val wbgtResult = remember(temperature, humidity, windSpeed, solarRadiation) {
        WbgtCalculator.calculateWbgt(
            temperature.toDouble(),
            humidity.toDouble(),
            windSpeed.toDouble(),
            solarRadiation.toDouble()
        )
    }

    val wetBulb = remember(temperature, humidity) {
        WbgtCalculator.calculateWetBulb(temperature.toDouble(), humidity.toDouble())
    }

    val heatIndex = remember(temperature, humidity) {
        WbgtCalculator.calculateHeatIndex(temperature.toDouble(), humidity.toDouble())
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Interactive Demo", fontWeight = FontWeight.Bold)
                        Text(
                            "WBGT Calculator",
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

            // Result Card
            item {
                WbgtResultCard(wbgtResult = wbgtResult)
            }

            // Secondary Metrics
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetricCard(
                        modifier = Modifier.weight(1f),
                        label = "Wet-Bulb Temp",
                        value = "${String.format("%.1f", wetBulb)}°C",
                        color = Color(0xFF3B82F6)
                    )
                    MetricCard(
                        modifier = Modifier.weight(1f),
                        label = "Heat Index",
                        value = "${String.format("%.1f", heatIndex)}°C",
                        color = Color(0xFFF97316)
                    )
                }
            }

            // Input Sliders
            item {
                Text(
                    "Adjust Conditions",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            item {
                InputSlider(
                    icon = Icons.Default.Thermostat,
                    label = "Air Temperature",
                    value = temperature,
                    onValueChange = { temperature = it },
                    valueRange = 15f..50f,
                    unit = "°C"
                )
            }

            item {
                InputSlider(
                    icon = Icons.Default.WaterDrop,
                    label = "Relative Humidity",
                    value = humidity,
                    onValueChange = { humidity = it },
                    valueRange = 10f..100f,
                    unit = "%"
                )
            }

            item {
                InputSlider(
                    icon = Icons.Default.Air,
                    label = "Wind Speed",
                    value = windSpeed,
                    onValueChange = { windSpeed = it },
                    valueRange = 0f..15f,
                    unit = "m/s"
                )
            }

            item {
                InputSlider(
                    icon = Icons.Default.WbSunny,
                    label = "Solar Radiation",
                    value = solarRadiation,
                    onValueChange = { solarRadiation = it },
                    valueRange = 0f..1200f,
                    unit = "W/m²"
                )
            }

            // About Section
            item {
                AboutDemoCard()
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
fun WbgtResultCard(wbgtResult: com.heatshield.agri.data.model.WbgtResult) {
    val riskColor = Color(wbgtResult.color)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = riskColor.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "WBGT (Wet-Bulb Globe Temperature)",
                style = MaterialTheme.typography.labelLarge,
                color = riskColor.copy(alpha = 0.8f)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                "${String.format("%.1f", wbgtResult.wbgt)}°C",
                style = MaterialTheme.typography.displayLarge,
                fontWeight = FontWeight.Bold,
                color = riskColor
            )

            Spacer(modifier = Modifier.height(8.dp))

            Surface(
                color = riskColor,
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(
                    "${wbgtResult.riskLevel.displayName} Risk",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.labelLarge,
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
fun MetricCard(
    modifier: Modifier = Modifier,
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
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = color.copy(alpha = 0.8f)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun InputSlider(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: Float,
    onValueChange: (Float) -> Unit,
    valueRange: ClosedFloatingPointRange<Float>,
    unit: String
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        label,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                }
                Text(
                    "${String.format("%.1f", value)} $unit",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Slider(
                value = value,
                onValueChange = onValueChange,
                valueRange = valueRange,
                modifier = Modifier.fillMaxWidth()
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "${valueRange.start.toInt()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    "${valueRange.endInclusive.toInt()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun AboutDemoCard() {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    "About This Demo",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                "This demo showcases HeatShield Agri's WBGT calculation engine. " +
                        "The Wet-Bulb Globe Temperature (WBGT) is a measure of heat stress in direct sunlight, " +
                        "taking into account temperature, humidity, wind speed, and solar radiation.\n\n" +
                        "Adjust the sliders to see how different weather conditions affect the heat stress risk level " +
                        "and the recommended actions for agricultural workers.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
