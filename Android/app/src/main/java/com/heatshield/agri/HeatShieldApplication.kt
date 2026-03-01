package com.heatshield.agri

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * HeatShield Agri Application
 *
 * Agricultural Worker Heat Stress Early Warning System
 * Protecting Uganda's 12.4 million agricultural workers from heat-related health risks.
 */
@HiltAndroidApp
class HeatShieldApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // Initialize any app-level dependencies here
    }
}
