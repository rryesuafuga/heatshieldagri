//! Location service for managing user locations and geocoding

use crate::error::AppError;
use crate::models::user::District;

/// Get all Uganda districts
pub fn get_districts() -> Vec<District> {
    vec![
        District::new(1, "Kampala", "Central", 0.3476, 32.5825),
        District::new(2, "Wakiso", "Central", 0.4044, 32.4594),
        District::new(3, "Mukono", "Central", 0.3533, 32.7553),
        District::new(4, "Jinja", "Eastern", 0.4244, 33.2041),
        District::new(5, "Mbale", "Eastern", 1.0647, 34.1797),
        District::new(6, "Gulu", "Northern", 2.7747, 32.2990),
        District::new(7, "Lira", "Northern", 2.2499, 32.8998),
        District::new(8, "Mbarara", "Western", -0.6072, 30.6545),
        District::new(9, "Kabale", "Western", -1.2508, 29.9894),
        District::new(10, "Fort Portal", "Western", 0.6710, 30.2750),
        District::new(11, "Masaka", "Central", -0.3136, 31.7350),
        District::new(12, "Arua", "Northern", 3.0203, 30.9107),
        District::new(13, "Soroti", "Eastern", 1.7147, 33.6111),
        District::new(14, "Tororo", "Eastern", 0.6929, 34.1812),
        District::new(15, "Kasese", "Western", 0.1833, 30.0833),
        District::new(16, "Kitgum", "Northern", 3.2783, 32.8822),
    ]
}

/// Get districts by region
pub fn get_districts_by_region(region: &str) -> Vec<District> {
    get_districts()
        .into_iter()
        .filter(|d| d.region.eq_ignore_ascii_case(region))
        .collect()
}

/// Get district by ID
pub fn get_district_by_id(id: i32) -> Option<District> {
    get_districts().into_iter().find(|d| d.id == id)
}

/// Get district by name
pub fn get_district_by_name(name: &str) -> Option<District> {
    get_districts()
        .into_iter()
        .find(|d| d.name.eq_ignore_ascii_case(name))
}

/// Get available regions
pub fn get_regions() -> Vec<&'static str> {
    vec!["Central", "Eastern", "Northern", "Western"]
}

/// Geocode a location name to coordinates
pub async fn geocode_location(name: &str) -> Result<(f64, f64), AppError> {
    // Try to match with known districts first
    if let Some(district) = get_district_by_name(name) {
        return Ok((district.lat, district.lon));
    }

    // In production, this would call a geocoding API
    Err(AppError::InvalidInput(format!("Unknown location: {}", name)))
}

/// Get nearest district to coordinates
pub fn get_nearest_district(lat: f64, lon: f64) -> District {
    get_districts()
        .into_iter()
        .min_by(|a, b| {
            let dist_a = haversine_distance(lat, lon, a.lat, a.lon);
            let dist_b = haversine_distance(lat, lon, b.lat, b.lon);
            dist_a.partial_cmp(&dist_b).unwrap()
        })
        .unwrap_or_else(|| District::new(1, "Kampala", "Central", 0.3476, 32.5825))
}

/// Calculate haversine distance between two points (km)
fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371.0; // Earth's radius in km

    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let delta_lat = (lat2 - lat1).to_radians();
    let delta_lon = (lon2 - lon1).to_radians();

    let a = (delta_lat / 2.0).sin().powi(2)
        + lat1_rad.cos() * lat2_rad.cos() * (delta_lon / 2.0).sin().powi(2);

    let c = 2.0 * a.sqrt().asin();

    r * c
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_districts() {
        let districts = get_districts();
        assert!(districts.len() >= 12);
    }

    #[test]
    fn test_get_districts_by_region() {
        let central = get_districts_by_region("Central");
        assert!(central.iter().all(|d| d.region == "Central"));
    }

    #[test]
    fn test_get_district_by_name() {
        let kampala = get_district_by_name("Kampala");
        assert!(kampala.is_some());
        assert_eq!(kampala.unwrap().name, "Kampala");
    }

    #[test]
    fn test_haversine() {
        // Kampala to Jinja (approx 80km)
        let dist = haversine_distance(0.3476, 32.5825, 0.4244, 33.2041);
        assert!(dist > 60.0 && dist < 100.0);
    }
}
