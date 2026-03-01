package com.heatshield.agri.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// HeatShield Agri Brand Colors
val HeatShieldGreen = Color(0xFF16A34A)
val HeatShieldGreenDark = Color(0xFF15803D)
val HeatShieldGreenLight = Color(0xFF22C55E)

// Risk Level Colors
val RiskLow = Color(0xFF22C55E)
val RiskModerate = Color(0xFFEAB308)
val RiskHigh = Color(0xFFF97316)
val RiskVeryHigh = Color(0xFFEF4444)
val RiskExtreme = Color(0xFF7C2D12)

private val DarkColorScheme = darkColorScheme(
    primary = HeatShieldGreenLight,
    onPrimary = Color.White,
    primaryContainer = HeatShieldGreenDark,
    onPrimaryContainer = Color.White,
    secondary = Color(0xFF4ADE80),
    onSecondary = Color.Black,
    tertiary = Color(0xFFFBBF24),
    onTertiary = Color.Black,
    background = Color(0xFF121212),
    onBackground = Color.White,
    surface = Color(0xFF1E1E1E),
    onSurface = Color.White,
    error = RiskVeryHigh,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = HeatShieldGreen,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCFCE7),
    onPrimaryContainer = HeatShieldGreenDark,
    secondary = HeatShieldGreenLight,
    onSecondary = Color.White,
    tertiary = Color(0xFFF59E0B),
    onTertiary = Color.White,
    background = Color(0xFFFAFAFA),
    onBackground = Color(0xFF1A1A1A),
    surface = Color.White,
    onSurface = Color(0xFF1A1A1A),
    surfaceVariant = Color(0xFFF5F5F5),
    onSurfaceVariant = Color(0xFF666666),
    error = RiskVeryHigh,
    onError = Color.White
)

@Composable
fun HeatShieldAgriTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
