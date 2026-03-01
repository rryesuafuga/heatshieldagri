//! Spatial Interpolation Module
//!
//! Provides interpolation methods for estimating values between grid points.

use wasm_bindgen::prelude::*;
use crate::GridPoint;

/// Inverse Distance Weighting (IDW) interpolation
///
/// Estimates a value at a target location based on nearby known values,
/// weighted by the inverse of distance.
///
/// # Arguments
/// * `points` - Array of known grid points with values
/// * `target_lat` - Latitude of target location
/// * `target_lon` - Longitude of target location
/// * `power` - Distance weighting power (typically 2)
///
/// # Returns
/// * Interpolated value at target location
#[wasm_bindgen]
pub fn interpolate_idw(
    points: Vec<GridPoint>,
    target_lat: f64,
    target_lon: f64,
    power: f64,
) -> f64 {
    if points.is_empty() {
        return 0.0;
    }

    let mut weighted_sum = 0.0;
    let mut weight_total = 0.0;

    for point in &points {
        let distance = haversine_distance(target_lat, target_lon, point.lat, point.lon);

        // Handle exact match
        if distance < 0.001 {
            return point.value;
        }

        let weight = 1.0 / distance.powf(power);
        weighted_sum += weight * point.value;
        weight_total += weight;
    }

    if weight_total > 0.0 {
        weighted_sum / weight_total
    } else {
        0.0
    }
}

/// Simplified interpolation using default power of 2
#[wasm_bindgen]
pub fn interpolate_grid(
    points: Vec<GridPoint>,
    target_lat: f64,
    target_lon: f64,
) -> f64 {
    interpolate_idw(points, target_lat, target_lon, 2.0)
}

/// Bilinear interpolation for regular grids
///
/// Fast interpolation method for data on a regular lat/lon grid.
///
/// # Arguments
/// * `values` - 2D array of values (flattened row-major)
/// * `min_lat` - Minimum latitude of grid
/// * `max_lat` - Maximum latitude of grid
/// * `min_lon` - Minimum longitude of grid
/// * `max_lon` - Maximum longitude of grid
/// * `rows` - Number of rows in grid
/// * `cols` - Number of columns in grid
/// * `target_lat` - Target latitude
/// * `target_lon` - Target longitude
#[wasm_bindgen]
pub fn interpolate_bilinear(
    values: Vec<f64>,
    min_lat: f64,
    max_lat: f64,
    min_lon: f64,
    max_lon: f64,
    rows: usize,
    cols: usize,
    target_lat: f64,
    target_lon: f64,
) -> f64 {
    // Normalize coordinates to grid indices
    let lat_step = (max_lat - min_lat) / (rows - 1) as f64;
    let lon_step = (max_lon - min_lon) / (cols - 1) as f64;

    let lat_idx = (target_lat - min_lat) / lat_step;
    let lon_idx = (target_lon - min_lon) / lon_step;

    // Get surrounding grid points
    let i0 = (lat_idx.floor() as usize).min(rows - 2);
    let i1 = i0 + 1;
    let j0 = (lon_idx.floor() as usize).min(cols - 2);
    let j1 = j0 + 1;

    // Get fractional positions
    let lat_frac = lat_idx - i0 as f64;
    let lon_frac = lon_idx - j0 as f64;

    // Get values at corners
    let v00 = values[i0 * cols + j0];
    let v01 = values[i0 * cols + j1];
    let v10 = values[i1 * cols + j0];
    let v11 = values[i1 * cols + j1];

    // Bilinear interpolation
    let v0 = v00 * (1.0 - lon_frac) + v01 * lon_frac;
    let v1 = v10 * (1.0 - lon_frac) + v11 * lon_frac;

    v0 * (1.0 - lat_frac) + v1 * lat_frac
}

/// Calculate haversine distance between two points in kilometers
#[wasm_bindgen]
pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
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

/// Find the N nearest points to a target location
#[wasm_bindgen]
pub fn find_nearest_points(
    points: Vec<GridPoint>,
    target_lat: f64,
    target_lon: f64,
    n: usize,
) -> Vec<GridPoint> {
    let mut points_with_dist: Vec<(GridPoint, f64)> = points
        .into_iter()
        .map(|p| {
            let dist = haversine_distance(target_lat, target_lon, p.lat, p.lon);
            (p, dist)
        })
        .collect();

    points_with_dist.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

    points_with_dist
        .into_iter()
        .take(n)
        .map(|(p, _)| p)
        .collect()
}

/// Calculate the centroid of a set of points
#[wasm_bindgen]
pub fn calculate_centroid(points: Vec<GridPoint>) -> GridPoint {
    if points.is_empty() {
        return GridPoint::new(0.0, 0.0, 0.0);
    }

    let n = points.len() as f64;
    let sum_lat: f64 = points.iter().map(|p| p.lat).sum();
    let sum_lon: f64 = points.iter().map(|p| p.lon).sum();
    let sum_val: f64 = points.iter().map(|p| p.value).sum();

    GridPoint::new(sum_lat / n, sum_lon / n, sum_val / n)
}

/// Generate a regular grid of points covering a bounding box
#[wasm_bindgen]
pub fn generate_grid(
    min_lat: f64,
    max_lat: f64,
    min_lon: f64,
    max_lon: f64,
    resolution_km: f64,
) -> Vec<GridPoint> {
    let mut points = Vec::new();

    // Convert km to approximate degrees
    let lat_step = resolution_km / 111.0; // ~111km per degree latitude
    let mid_lat = (min_lat + max_lat) / 2.0;
    let lon_step = resolution_km / (111.0 * mid_lat.to_radians().cos());

    let mut lat = min_lat;
    while lat <= max_lat {
        let mut lon = min_lon;
        while lon <= max_lon {
            points.push(GridPoint::new(lat, lon, 0.0));
            lon += lon_step;
        }
        lat += lat_step;
    }

    points
}

/// Generate Uganda's 5km grid for WBGT predictions
#[wasm_bindgen]
pub fn generate_uganda_grid() -> Vec<GridPoint> {
    // Uganda bounds (approximate)
    let min_lat = -1.5;
    let max_lat = 4.3;
    let min_lon = 29.5;
    let max_lon = 35.0;

    generate_grid(min_lat, max_lat, min_lon, max_lon, 5.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_haversine() {
        // Kampala to Jinja (approx 80km)
        let dist = haversine_distance(0.3476, 32.5825, 0.4244, 33.2041);
        assert!(dist > 60.0 && dist < 100.0);
    }

    #[test]
    fn test_idw() {
        let points = vec![
            GridPoint::new(0.0, 0.0, 30.0),
            GridPoint::new(0.1, 0.0, 32.0),
            GridPoint::new(0.0, 0.1, 28.0),
            GridPoint::new(0.1, 0.1, 31.0),
        ];

        let value = interpolate_idw(points, 0.05, 0.05, 2.0);
        assert!(value > 28.0 && value < 32.0);
    }
}
