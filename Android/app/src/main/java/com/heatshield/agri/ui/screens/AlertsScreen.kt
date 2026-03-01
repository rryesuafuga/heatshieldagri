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
import com.heatshield.agri.data.WbgtCalculator
import com.heatshield.agri.data.model.RiskLevel

data class AlertItem(
    val id: Long,
    val timestamp: String,
    val location: String,
    val wbgt: Double,
    val riskLevel: RiskLevel,
    val message: String,
    val sent: Boolean
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlertsScreen() {
    var phoneNumber by remember { mutableStateOf("+256700123456") }
    var alertsEnabled by remember { mutableStateOf(true) }
    var alertThreshold by remember { mutableStateOf(28.0) }
    var showEditDialog by remember { mutableStateOf(false) }

    val alertHistory = remember {
        listOf(
            AlertItem(1, "2h ago", "Kampala", 31.2, RiskLevel.VERY_HIGH, "Very High heat risk. Work 6-10am only.", true),
            AlertItem(2, "8h ago", "Jinja", 29.5, RiskLevel.HIGH, "High heat risk. Take 30-min breaks.", true),
            AlertItem(3, "1d ago", "Mbarara", 28.3, RiskLevel.HIGH, "High heat risk expected tomorrow.", true),
            AlertItem(4, "2d ago", "Gulu", 32.8, RiskLevel.EXTREME, "EXTREME heat - suspend outdoor work!", true)
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Alert Management", fontWeight = FontWeight.Bold)
                        Text(
                            "SMS heat stress warnings",
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

            // Phone Registration Card
            item {
                PhoneRegistrationCard(
                    phoneNumber = phoneNumber,
                    alertsEnabled = alertsEnabled,
                    onAlertsToggle = { alertsEnabled = it },
                    onEditClick = { showEditDialog = true }
                )
            }

            // Threshold Settings
            item {
                ThresholdCard(
                    threshold = alertThreshold,
                    onThresholdChange = { alertThreshold = it }
                )
            }

            // Alert History Title
            item {
                Text(
                    "Recent Alerts",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Alert History
            items(alertHistory) { alert ->
                AlertHistoryCard(alert = alert)
            }

            // Info Banner
            item {
                InfoBanner()
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }

    // Edit Phone Dialog
    if (showEditDialog) {
        var tempPhone by remember { mutableStateOf(phoneNumber) }

        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = { Text("Edit Phone Number") },
            text = {
                OutlinedTextField(
                    value = tempPhone,
                    onValueChange = { tempPhone = it },
                    label = { Text("Phone Number") },
                    placeholder = { Text("+256700123456") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    phoneNumber = tempPhone
                    showEditDialog = false
                }) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun PhoneRegistrationCard(
    phoneNumber: String,
    alertsEnabled: Boolean,
    onAlertsToggle: (Boolean) -> Unit,
    onEditClick: () -> Unit
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
                Text(
                    "SMS Alert Registration",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Icon(
                    Icons.Default.Notifications,
                    contentDescription = null,
                    tint = if (alertsEnabled)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Phone Number Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Phone,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        phoneNumber,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                }
                TextButton(onClick = onEditClick) {
                    Text("Change")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Enable Toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Enable SMS Alerts",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        "Receive alerts when heat risk is high",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Switch(
                    checked = alertsEnabled,
                    onCheckedChange = onAlertsToggle
                )
            }
        }
    }
}

@Composable
fun ThresholdCard(
    threshold: Double,
    onThresholdChange: (Double) -> Unit
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
                Text(
                    "Alert Threshold",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Icon(
                    Icons.Default.Settings,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            val thresholds = listOf(
                Triple(26.0, "Moderate (26°C)", "Alerts from moderate risk"),
                Triple(28.0, "High (28°C)", "Alerts from high risk"),
                Triple(30.0, "Very High (30°C)", "Only extreme warnings")
            )

            thresholds.forEach { (value, label, description) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            label,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    RadioButton(
                        selected = threshold == value,
                        onClick = { onThresholdChange(value) }
                    )
                }
            }
        }
    }
}

@Composable
fun AlertHistoryCard(alert: AlertItem) {
    val riskColor = Color(alert.riskLevel.color)

    Card(
        colors = CardDefaults.cardColors(
            containerColor = riskColor.copy(alpha = 0.05f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Risk Indicator
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .padding(top = 6.dp)
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = riskColor,
                    shape = RoundedCornerShape(4.dp)
                ) {}
            }

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        alert.location,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        alert.timestamp,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    alert.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = riskColor.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            "${String.format("%.1f", alert.wbgt)}°C - ${alert.riskLevel.displayName}",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = riskColor
                        )
                    }

                    if (alert.sent) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = Color(0xFF22C55E),
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                "Sent",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF22C55E)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun InfoBanner() {
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
                Icons.Default.Info,
                contentDescription = null,
                tint = Color(0xFF3B82F6)
            )
            Column {
                Text(
                    "About SMS Alerts",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1E40AF)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Alerts are sent via Africa's Talking gateway and work on all networks (MTN, Airtel) in Uganda. Messages are sent in your preferred language. Standard SMS rates apply.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF3B82F6)
                )
            }
        }
    }
}
