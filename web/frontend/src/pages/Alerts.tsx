import React, { useState } from 'react';
import {
  Bell,
  Phone,
  MapPin,
  Clock,
  Check,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Settings,
} from 'lucide-react';
import { useAppStore } from '../store';
import { getUgandaDistricts, classifyRisk } from '../wasm';

interface AlertHistory {
  id: number;
  timestamp: Date;
  location: string;
  wbgt: number;
  risk_level: string;
  message: string;
  sent: boolean;
}

function PhoneRegistration() {
  const { alertPhone, setAlertPhone, alertsEnabled, setAlertsEnabled } = useAppStore();
  const [phoneInput, setPhoneInput] = useState(alertPhone || '');
  const [isEditing, setIsEditing] = useState(!alertPhone);

  const handleSave = () => {
    if (phoneInput.match(/^\+?256\d{9}$/) || phoneInput.match(/^0\d{9}$/)) {
      setAlertPhone(phoneInput);
      setIsEditing(false);
    } else {
      alert('Please enter a valid Uganda phone number (e.g., +256700123456)');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">SMS Alert Registration</h3>
        <Bell className={`h-5 w-5 ${alertsEnabled ? 'text-green-600' : 'text-gray-400'}`} />
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="flex space-x-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+256700123456"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <button onClick={handleSave} className="btn-primary">
                <Check className="h-5 w-5" />
              </button>
              {alertPhone && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Enter your Uganda mobile number to receive heat alerts via SMS
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="font-medium">{alertPhone}</span>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              Change
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable SMS Alerts</p>
              <p className="text-sm text-gray-500">
                Receive alerts when heat risk is high
              </p>
            </div>
            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                alertsEnabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  alertsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertThresholdSettings() {
  const { alertThreshold, setAlertThreshold } = useAppStore();

  const thresholds = [
    { value: 26, label: 'Moderate (26°C)', description: 'Get alerts from moderate risk' },
    { value: 28, label: 'High (28°C)', description: 'Get alerts from high risk' },
    { value: 30, label: 'Very High (30°C)', description: 'Only extreme warnings' },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Alert Threshold</h3>
        <Settings className="h-5 w-5 text-gray-400" />
      </div>
      <div className="space-y-3">
        {thresholds.map((t) => (
          <button
            key={t.value}
            onClick={() => setAlertThreshold(t.value)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              alertThreshold === t.value
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t.label}</p>
                <p className="text-sm text-gray-500">{t.description}</p>
              </div>
              {alertThreshold === t.value && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationSubscriptions() {
  const { savedLocations, addSavedLocation, removeSavedLocation, selectedDistrict } =
    useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

  const districts = getUgandaDistricts();

  const handleAddLocation = () => {
    const district = districts.find((d) => d.id === selectedDistrictId);
    if (district) {
      addSavedLocation({
        lat: district.lat,
        lon: district.lon,
        name: district.name,
      });
      setShowAddModal(false);
      setSelectedDistrictId(null);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Monitored Locations</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1 text-green-600 hover:text-green-700"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Add</span>
        </button>
      </div>

      {savedLocations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No locations added yet</p>
          <p className="text-sm">Add locations to receive targeted alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {savedLocations.map((loc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{loc.name || 'Custom Location'}</span>
              </div>
              <button
                onClick={() => removeSavedLocation(idx)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Location</h3>
            <select
              value={selectedDistrictId || ''}
              onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
            >
              <option value="">Select a district...</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.region})
                </option>
              ))}
            </select>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                disabled={!selectedDistrictId}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Add Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertHistory() {
  // Demo alert history
  const alerts: AlertHistory[] = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      location: 'Kampala',
      wbgt: 31.2,
      risk_level: 'Very High',
      message: 'Very High heat risk. Work 6-10am only.',
      sent: true,
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      location: 'Jinja',
      wbgt: 29.5,
      risk_level: 'High',
      message: 'High heat risk. Take 30-min breaks.',
      sent: true,
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      location: 'Mbarara',
      wbgt: 28.3,
      risk_level: 'High',
      message: 'High heat risk expected tomorrow.',
      sent: true,
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      location: 'Gulu',
      wbgt: 32.8,
      risk_level: 'Extreme',
      message: 'EXTREME heat - suspend outdoor work!',
      sent: true,
    },
  ];

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
      <div className="space-y-4">
        {alerts.map((alert) => {
          const risk = classifyRisk(alert.wbgt);
          return (
            <div
              key={alert.id}
              className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
            >
              <div
                className="w-2 h-2 rounded-full mt-2"
                style={{ backgroundColor: risk.color }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{alert.location}</span>
                  <span className="text-sm text-gray-500">{formatTime(alert.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${risk.color}20`,
                      color: risk.color,
                    }}
                  >
                    {alert.wbgt.toFixed(1)}°C - {alert.risk_level}
                  </span>
                  {alert.sent && (
                    <span className="text-xs text-green-600 flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Sent
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Alerts() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Alert Management</h1>
        <p className="text-gray-500 mt-1">
          Configure SMS alerts for heat stress warnings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <PhoneRegistration />
          <AlertThresholdSettings />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <LocationSubscriptions />
          <AlertHistory />
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900">About SMS Alerts</h4>
            <p className="text-blue-700 mt-1 text-sm">
              Alerts are sent via Africa's Talking gateway and work on all networks (MTN,
              Airtel) in Uganda. Messages are sent in your preferred language and include
              the WBGT reading, risk level, and recommended actions. Standard SMS rates
              apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
