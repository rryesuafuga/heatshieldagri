package com.heatshield.agri

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.heatshield.agri.ui.HeatShieldApp
import com.heatshield.agri.ui.theme.HeatShieldAgriTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main Activity for HeatShield Agri
 *
 * Entry point for the Android application using Jetpack Compose.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            HeatShieldAgriTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    HeatShieldApp()
                }
            }
        }
    }
}
