package com.heatshield.agri.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.heatshield.agri.ui.screens.AlertsScreen
import com.heatshield.agri.ui.screens.DashboardScreen
import com.heatshield.agri.ui.screens.DemoScreen
import com.heatshield.agri.ui.screens.ForecastScreen
import com.heatshield.agri.ui.screens.MapScreen
import com.heatshield.agri.ui.screens.ScheduleScreen

/**
 * Navigation destinations
 */
sealed class Screen(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    data object Dashboard : Screen(
        "dashboard",
        "Home",
        Icons.Filled.Home,
        Icons.Outlined.Home
    )

    data object Forecast : Screen(
        "forecast",
        "Forecast",
        Icons.Filled.CalendarMonth,
        Icons.Outlined.CalendarMonth
    )

    data object Map : Screen(
        "map",
        "Map",
        Icons.Filled.Map,
        Icons.Outlined.Map
    )

    data object Schedule : Screen(
        "schedule",
        "Schedule",
        Icons.Filled.Schedule,
        Icons.Outlined.Schedule
    )

    data object Alerts : Screen(
        "alerts",
        "Alerts",
        Icons.Filled.Notifications,
        Icons.Outlined.Notifications
    )

    data object Demo : Screen(
        "demo",
        "Demo",
        Icons.Filled.PlayArrow,
        Icons.Outlined.PlayArrow
    )
}

private val bottomNavItems = listOf(
    Screen.Dashboard,
    Screen.Forecast,
    Screen.Map,
    Screen.Schedule,
    Screen.Demo
)

/**
 * Main app composable with navigation
 */
@Composable
fun HeatShieldApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar {
                bottomNavItems.forEach { screen ->
                    val selected = currentDestination?.hierarchy?.any {
                        it.route == screen.route
                    } == true

                    NavigationBarItem(
                        icon = {
                            Icon(
                                imageVector = if (selected) screen.selectedIcon else screen.unselectedIcon,
                                contentDescription = screen.title
                            )
                        },
                        label = { Text(screen.title) },
                        selected = selected,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) {
                DashboardScreen()
            }
            composable(Screen.Forecast.route) {
                ForecastScreen()
            }
            composable(Screen.Map.route) {
                MapScreen()
            }
            composable(Screen.Schedule.route) {
                ScheduleScreen()
            }
            composable(Screen.Alerts.route) {
                AlertsScreen()
            }
            composable(Screen.Demo.route) {
                DemoScreen()
            }
        }
    }
}
