import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { District } from './wasm';

interface Location {
  lat: number;
  lon: number;
  name?: string;
}

interface AppState {
  // User preferences
  language: 'en' | 'lg' | 'rny' | 'ach' | 'sw';
  setLanguage: (lang: 'en' | 'lg' | 'rny' | 'ach' | 'sw') => void;

  // Location
  currentLocation: Location | null;
  setCurrentLocation: (location: Location | null) => void;

  selectedDistrict: District | null;
  setSelectedDistrict: (district: District | null) => void;

  // Saved locations
  savedLocations: Location[];
  addSavedLocation: (location: Location) => void;
  removeSavedLocation: (index: number) => void;

  // Alert subscriptions
  alertPhone: string | null;
  setAlertPhone: (phone: string | null) => void;

  alertsEnabled: boolean;
  setAlertsEnabled: (enabled: boolean) => void;

  alertThreshold: number;
  setAlertThreshold: (threshold: number) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Demo mode
  isDemoMode: boolean;
  setDemoMode: (demo: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Language defaults to English
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      // Location
      currentLocation: null,
      setCurrentLocation: (location) => set({ currentLocation: location }),

      selectedDistrict: null,
      setSelectedDistrict: (district) =>
        set({
          selectedDistrict: district,
          currentLocation: district
            ? { lat: district.lat, lon: district.lon, name: district.name }
            : null,
        }),

      // Saved locations
      savedLocations: [],
      addSavedLocation: (location) =>
        set((state) => ({
          savedLocations: [...state.savedLocations, location],
        })),
      removeSavedLocation: (index) =>
        set((state) => ({
          savedLocations: state.savedLocations.filter((_, i) => i !== index),
        })),

      // Alerts
      alertPhone: null,
      setAlertPhone: (phone) => set({ alertPhone: phone }),

      alertsEnabled: false,
      setAlertsEnabled: (enabled) => set({ alertsEnabled: enabled }),

      alertThreshold: 28,
      setAlertThreshold: (threshold) => set({ alertThreshold: threshold }),

      // UI
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Demo mode
      isDemoMode: true,
      setDemoMode: (demo) => set({ isDemoMode: demo }),
    }),
    {
      name: 'heatshield-storage',
      partialize: (state) => ({
        language: state.language,
        savedLocations: state.savedLocations,
        alertPhone: state.alertPhone,
        alertsEnabled: state.alertsEnabled,
        alertThreshold: state.alertThreshold,
      }),
    }
  )
);

// Translations
export const translations = {
  en: {
    dashboard: 'Dashboard',
    forecast: 'Forecast',
    heatMap: 'Heat Map',
    schedule: 'Work Schedule',
    alerts: 'Alerts',
    currentConditions: 'Current Conditions',
    temperature: 'Temperature',
    humidity: 'Humidity',
    windSpeed: 'Wind Speed',
    solarRadiation: 'Solar Radiation',
    riskLevel: 'Risk Level',
    recommendation: 'Recommendation',
    lowRisk: 'Low Risk',
    moderateRisk: 'Moderate Risk',
    highRisk: 'High Risk',
    veryHighRisk: 'Very High Risk',
    extremeRisk: 'Extreme Risk',
    safeWorkHours: 'Safe Work Hours',
    waterIntake: 'Water Intake',
    breakSchedule: 'Break Schedule',
  },
  lg: {
    dashboard: 'Ekifo eky\'okulaba',
    forecast: 'Obubonero',
    heatMap: 'Maapu y\'ebbugumu',
    schedule: 'Enteekateeka y\'emirimu',
    alerts: 'Eby\'okulabula',
    currentConditions: 'Embeera y\'obutiti',
    temperature: 'Ebbugumu',
    humidity: 'Omusulo',
    windSpeed: 'Amaanyi g\'empewo',
    solarRadiation: 'Emisana',
    riskLevel: 'Omutindo gw\'akabi',
    recommendation: 'Eky\'okukolwa',
    lowRisk: 'Akabi akatono',
    moderateRisk: 'Akabi akatareewo',
    highRisk: 'Akabi akanene',
    veryHighRisk: 'Akabi akanene nnyo',
    extremeRisk: 'Akabi akasingayo',
    safeWorkHours: 'Essaawa ez\'okukola',
    waterIntake: 'Amazzi ag\'okunywa',
    breakSchedule: 'Enteekateeka y\'okuwummula',
  },
  rny: {
    dashboard: 'Aha kurora',
    forecast: 'Ebirikwija',
    heatMap: 'Maapu y\'ekyeya',
    schedule: 'Enteekateeka y\'emirimo',
    alerts: 'Okuraburira',
    currentConditions: 'Embeera y\'ohati',
    temperature: 'Ekyeya',
    humidity: 'Omushurengo',
    windSpeed: 'Amaani g\'embeera',
    solarRadiation: 'Eizooba',
    riskLevel: 'Omutindo gw\'akabi',
    recommendation: 'Ebirikushemeza',
    lowRisk: 'Akabi katono',
    moderateRisk: 'Akabi karikukura',
    highRisk: 'Akabi kanene',
    veryHighRisk: 'Akabi kanene muno',
    extremeRisk: 'Akabi kasingira',
    safeWorkHours: 'Eshaaha z\'okukora',
    waterIntake: 'Amaizi g\'okungywa',
    breakSchedule: 'Enteekateeka y\'okuhwera',
  },
  ach: {
    dashboard: 'Kabedo me neno',
    forecast: 'Lok me kare',
    heatMap: 'Map me lyeto',
    schedule: 'Cik me tic',
    alerts: 'Jami me ciko',
    currentConditions: 'Kit ma tye',
    temperature: 'Lyeto',
    humidity: 'Pii i yamo',
    windSpeed: 'Teko me yamo',
    solarRadiation: 'Ceng',
    riskLevel: 'Kit me bal',
    recommendation: 'Lok me timo',
    lowRisk: 'Bal matidi',
    moderateRisk: 'Bal ma pe dit',
    highRisk: 'Bal madit',
    veryHighRisk: 'Bal madit tutwal',
    extremeRisk: 'Bal makato',
    safeWorkHours: 'Cawa me tic',
    waterIntake: 'Pii me mato',
    breakSchedule: 'Cawa me yweyo',
  },
  sw: {
    dashboard: 'Dashibodi',
    forecast: 'Utabiri',
    heatMap: 'Ramani ya joto',
    schedule: 'Ratiba ya kazi',
    alerts: 'Tahadhari',
    currentConditions: 'Hali ya sasa',
    temperature: 'Joto',
    humidity: 'Unyevu',
    windSpeed: 'Kasi ya upepo',
    solarRadiation: 'Mionzi ya jua',
    riskLevel: 'Kiwango cha hatari',
    recommendation: 'Mapendekezo',
    lowRisk: 'Hatari ndogo',
    moderateRisk: 'Hatari ya wastani',
    highRisk: 'Hatari kubwa',
    veryHighRisk: 'Hatari kubwa sana',
    extremeRisk: 'Hatari kali',
    safeWorkHours: 'Masaa salama ya kazi',
    waterIntake: 'Unywaji wa maji',
    breakSchedule: 'Ratiba ya mapumziko',
  },
};

export type TranslationKey = keyof typeof translations.en;

export function useTranslation() {
  const language = useAppStore((state) => state.language);
  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  return { t, language };
}
