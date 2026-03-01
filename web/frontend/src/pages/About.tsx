import React from 'react';
import {
  Shield,
  Sun,
  Users,
  Phone,
  Globe,
  Cpu,
  Database,
  Cloud,
  AlertTriangle,
  Heart,
  ExternalLink,
} from 'lucide-react';

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="card">
      <Icon className="h-8 w-8 text-green-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StatCard({
  value,
  label,
  sublabel,
}: {
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="text-center p-6 bg-green-50 rounded-xl">
      <div className="text-4xl font-bold text-green-700 mb-2">{value}</div>
      <div className="text-gray-800 font-medium">{label}</div>
      {sublabel && <div className="text-sm text-gray-500 mt-1">{sublabel}</div>}
    </div>
  );
}

function TechStackItem({
  title,
  items,
}: {
  title: string;
  items: { name: string; description: string }[];
}) {
  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
            <div>
              <span className="font-medium text-gray-800">{item.name}</span>
              <span className="text-gray-500"> - {item.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center space-x-3 mb-4">
          <Shield className="h-12 w-12 text-green-600" />
          <div className="text-left">
            <h1 className="text-4xl font-bold text-gray-900">HeatShield Agri</h1>
            <p className="text-green-600 font-medium">Agricultural Worker Heat Stress Early Warning System</p>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-4">
          Protecting Uganda's 12.4 million agricultural workers from heat-related health
          risks through AI-powered WBGT predictions and multi-channel alert delivery.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        <StatCard value="12.4M" label="Agricultural Workers" sublabel="in Uganda" />
        <StatCard value="5km" label="Grid Resolution" sublabel="prediction accuracy" />
        <StatCard value="72h" label="Forecast Horizon" sublabel="advance warning" />
        <StatCard value="3" label="Access Channels" sublabel="Web, Mobile, USSD" />
      </div>

      {/* Problem & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="card bg-red-50 border-red-200">
          <AlertTriangle className="h-8 w-8 text-red-600 mb-4" />
          <h3 className="text-xl font-semibold text-red-900 mb-3">The Problem</h3>
          <p className="text-red-800 mb-4">
            Heat stress causes significant health risks and productivity losses for
            agricultural workers, especially in tropical climates. Without advance warning,
            workers continue laboring during dangerous heat conditions.
          </p>
          <ul className="space-y-2 text-red-700">
            <li>• Heat-related illness and deaths</li>
            <li>• 30-50% productivity loss during heat waves</li>
            <li>• No localized, actionable heat warnings</li>
            <li>• Limited reach to rural farmers</li>
          </ul>
        </div>

        <div className="card bg-green-50 border-green-200">
          <Heart className="h-8 w-8 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold text-green-900 mb-3">Our Solution</h3>
          <p className="text-green-800 mb-4">
            HeatShield Agri uses AI and satellite data to predict dangerous heat conditions
            72 hours in advance, delivering actionable warnings through multiple channels
            to reach all farmers.
          </p>
          <ul className="space-y-2 text-green-700">
            <li>• WBGT predictions at 5km resolution</li>
            <li>• 72-hour advance forecasts</li>
            <li>• SMS alerts in local languages</li>
            <li>• Optimized work schedules</li>
          </ul>
        </div>
      </div>

      {/* Features */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Sun}
            title="WBGT Predictions"
            description="Accurate Wet-Bulb Globe Temperature forecasts combining weather data, satellite imagery, and machine learning for 5km resolution predictions."
          />
          <FeatureCard
            icon={Phone}
            title="Multi-Channel Delivery"
            description="Reach all farmers through web dashboards, Android apps, and USSD for feature phones. SMS alerts in Luganda, Runyankole, Acholi, and English."
          />
          <FeatureCard
            icon={Users}
            title="Work Schedule Optimization"
            description="AI-generated safe work windows maximize productivity while protecting worker health. Personalized break schedules based on local conditions."
          />
        </div>
      </div>

      {/* Access Channels */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Three Ways to Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <Globe className="h-10 w-10 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Web Platform</h3>
            <p className="text-gray-600 mb-4">
              Full-featured dashboard with interactive maps, 72-hour forecasts, and
              extension worker tools. Powered by Rust/WebAssembly for performance.
            </p>
            <div className="text-sm text-gray-500">
              React + TypeScript + Rust/Wasm
            </div>
          </div>
          <div className="card text-center">
            <Phone className="h-10 w-10 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Android App</h3>
            <p className="text-gray-600 mb-4">
              Native mobile app with offline support for extension workers and
              tech-enabled farmers. Push notifications and offline map caching.
            </p>
            <div className="text-sm text-gray-500">
              Kotlin + Jetpack Compose
            </div>
          </div>
          <div className="card text-center">
            <Database className="h-10 w-10 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">USSD Access</h3>
            <p className="text-gray-600 mb-4">
              Feature phone access for farmers without smartphones. Dial *384*HEAT#
              for instant heat risk information and SMS alert registration.
            </p>
            <div className="text-sm text-gray-500">
              Rust + Africa's Talking
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="card mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Technology Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TechStackItem
            title="Frontend"
            items={[
              { name: 'React 18', description: 'UI framework' },
              { name: 'TypeScript', description: 'Type safety' },
              { name: 'Rust/Wasm', description: 'High-performance calculations' },
              { name: 'Tailwind CSS', description: 'Styling' },
            ]}
          />
          <TechStackItem
            title="Backend"
            items={[
              { name: 'Rust/Actix-web', description: 'API Gateway' },
              { name: 'Python/PyTorch', description: 'ML prediction engine' },
              { name: 'PostgreSQL', description: 'Primary database' },
              { name: 'Redis', description: 'Caching layer' },
            ]}
          />
          <TechStackItem
            title="Infrastructure"
            items={[
              { name: 'AWS', description: 'Cloud platform' },
              { name: "Africa's Talking", description: 'SMS/USSD gateway' },
              { name: 'Docker', description: 'Containerization' },
              { name: 'GitHub Actions', description: 'CI/CD' },
            ]}
          />
        </div>
      </div>

      {/* Data Sources */}
      <div className="card mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Sources</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <Cloud className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="font-medium text-blue-900">ICPAC</div>
            <div className="text-sm text-blue-700">Weather forecasts</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <Database className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="font-medium text-green-900">ERA5</div>
            <div className="text-sm text-green-700">Reanalysis data</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <Globe className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="font-medium text-purple-900">Sentinel</div>
            <div className="text-sm text-purple-700">Satellite imagery</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg text-center">
            <Cpu className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <div className="font-medium text-orange-900">SRTM</div>
            <div className="text-sm text-orange-700">Terrain data</div>
          </div>
        </div>
      </div>

      {/* Risk Levels */}
      <div className="card mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">WBGT Risk Levels</h2>
        <p className="text-gray-600 mb-6">
          Based on ISO 7243 occupational heat stress standards, adapted for agricultural work:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  WBGT Range
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Risk Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Recommended Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-4 text-sm">&lt; 26°C</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Low
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  Normal work schedule, stay hydrated
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-4 text-sm">26-28°C</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Moderate
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  15-min break per hour, increase water intake
                </td>
              </tr>
              <tr>
                <td className="px-4 py-4 text-sm">28-30°C</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                    High
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  Work 5-10am only, 30-min breaks, shaded tasks
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-4 text-sm">30-32°C</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    Very High
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  Work 6-10am only, monitor symptoms
                </td>
              </tr>
              <tr>
                <td className="px-4 py-4 text-sm">&gt; 32°C</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-red-900 text-white rounded-full text-sm">
                    Extreme
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  Suspend outdoor work, emergency protocols
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-2 text-gray-500 mb-4">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="font-medium text-gray-900">HeatShield Agri</span>
          <span>|</span>
          <span>Protecting farmers from dangerous heat</span>
        </div>
        <p className="text-sm text-gray-500">
          Built for the Activate AI: Economic Opportunity Challenge by data.org + Zoom
        </p>
        <p className="text-sm text-gray-400 mt-2">Version 1.0 | January 2026</p>
      </div>
    </div>
  );
}
