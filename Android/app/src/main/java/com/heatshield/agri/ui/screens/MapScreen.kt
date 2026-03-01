package com.heatshield.agri.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.District
import kotlin.random.Random

data class GridCell(
    val lat: Double,
    val lon: Double,
    val wbgt: Double,
    val color: Color
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen() {
    val districts = remember { WbgtCalculator.getUgandaDistricts() }
    var selectedDistrict by remember { mutableStateOf<District?>(null) }

    // Generate heat grid
    val gridCells = remember {
        generateHeatGrid()
    }

    // Calculate stats
    val lowRiskCount = gridCells.count { it.wbgt < 26 }
    val moderateRiskCount = gridCells.count { it.wbgt in 26.0..28.0 }
    val highRiskCount = gridCells.count { it.wbgt in 28.0..30.0 }
    val veryHighRiskCount = gridCells.count { it.wbgt >= 30 }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Heat Risk Map", fontWeight = FontWeight.Bold)
                        Text(
                            "5km resolution across Uganda",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Map View
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
                    .padding(16.dp)
            ) {
                Card(
                    modifier = Modifier.fillMaxSize(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF8FAFC)
                    )
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        // Heat Grid
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val cellWidth = size.width / 20
                            val cellHeight = size.height / 20

                            gridCells.forEachIndexed { index, cell ->
                                val x = (index % 20) * cellWidth
                                val y = (index / 20) * cellHeight

                                drawRect(
                                    color = cell.color.copy(alpha = 0.7f),
                                    topLeft = Offset(x, y),
                                    size = Size(cellWidth, cellHeight)
                                )
                            }
                        }

                        // District markers
                        districts.forEach { district ->
                            val x = ((district.lon - 29.5) / 5.5 * 280 + 10).dp
                            val y = ((4.3 - district.lat) / 5.8 * 280 + 10).dp

                            Box(
                                modifier = Modifier
                                    .offset(x = x, y = y)
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (selectedDistrict?.id == district.id)
                                            MaterialTheme.colorScheme.primary
                                        else
                                            Color.DarkGray
                                    )
                                    .clickable { selectedDistrict = district }
                            )
                        }

                        // Legend
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(8.dp)
                                .background(
                                    Color.White.copy(alpha = 0.9f),
                                    RoundedCornerShape(8.dp)
                                )
                                .padding(8.dp)
                        ) {
                            Text(
                                "WBGT Risk",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            LegendItem(color = Color(0xFF22C55E), label = "Low")
                            LegendItem(color = Color(0xFFEAB308), label = "Moderate")
                            LegendItem(color = Color(0xFFF97316), label = "High")
                            LegendItem(color = Color(0xFFEF4444), label = "Very High")
                        }
                    }
                }
            }

            // Quick Stats
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatChip(
                    modifier = Modifier.weight(1f),
                    count = lowRiskCount,
                    label = "Low",
                    color = Color(0xFF22C55E)
                )
                StatChip(
                    modifier = Modifier.weight(1f),
                    count = moderateRiskCount,
                    label = "Moderate",
                    color = Color(0xFFEAB308)
                )
                StatChip(
                    modifier = Modifier.weight(1f),
                    count = highRiskCount,
                    label = "High",
                    color = Color(0xFFF97316)
                )
                StatChip(
                    modifier = Modifier.weight(1f),
                    count = veryHighRiskCount,
                    label = "V.High",
                    color = Color(0xFFEF4444)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Selected District Info
            if (selectedDistrict != null) {
                SelectedDistrictCard(district = selectedDistrict!!)
            }

            // District List
            Text(
                "Districts",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 16.dp)
            ) {
                items(districts) { district ->
                    DistrictListItem(
                        district = district,
                        isSelected = selectedDistrict?.id == district.id,
                        onClick = { selectedDistrict = district }
                    )
                }
            }
        }
    }
}

@Composable
fun LegendItem(color: Color, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(color, RoundedCornerShape(2.dp))
        )
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
fun StatChip(
    modifier: Modifier = Modifier,
    count: Int,
    label: String,
    color: Color
) {
    Surface(
        modifier = modifier,
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "$count",
                style = MaterialTheme.typography.titleMedium,
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
fun SelectedDistrictCard(district: District) {
    val wbgt = remember(district) {
        val baseTemp = 30.0 + district.lat * 0.5
        val humidity = 65.0
        WbgtCalculator.calculateWbgt(baseTemp, humidity, 2.5, 700.0)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(wbgt.color).copy(alpha = 0.1f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        district.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        district.region,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "${String.format("%.1f", wbgt.wbgt)}°C",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(wbgt.color)
                    )
                    Text(
                        wbgt.riskLevel.displayName,
                        style = MaterialTheme.typography.labelMedium,
                        color = Color(wbgt.color)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                wbgt.recommendation,
                style = MaterialTheme.typography.bodySmall,
                color = Color(wbgt.color).copy(alpha = 0.9f)
            )
        }
    }
}

@Composable
fun DistrictListItem(
    district: District,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                MaterialTheme.colorScheme.primaryContainer
            else
                MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = if (isSelected)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    district.name,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                )
            }
            Text(
                district.region,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun generateHeatGrid(): List<GridCell> {
    val cells = mutableListOf<GridCell>()
    val random = Random(42) // Consistent seed for demo

    repeat(400) { index ->
        val row = index / 20
        val col = index % 20

        val lat = 4.3 - (row * 5.8 / 20)
        val lon = 29.5 + (col * 5.5 / 20)

        val baseWbgt = 26.0 + random.nextDouble() * 6
        val latEffect = (lat - 1.5).let { kotlin.math.abs(it) * 0.5 }
        val wbgt = baseWbgt - latEffect

        val color = when {
            wbgt < 26 -> Color(0xFF22C55E)
            wbgt < 28 -> Color(0xFFEAB308)
            wbgt < 30 -> Color(0xFFF97316)
            else -> Color(0xFFEF4444)
        }

        cells.add(GridCell(lat, lon, wbgt, color))
    }

    return cells
}
