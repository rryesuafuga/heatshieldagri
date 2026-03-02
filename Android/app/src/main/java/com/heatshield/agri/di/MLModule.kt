package com.heatshield.agri.di

import com.heatshield.agri.data.ml.HeatShieldMLInference
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object MLModule {

    @Provides
    @Singleton
    fun provideHeatShieldMLInference(): HeatShieldMLInference {
        return HeatShieldMLInference()
    }
}
