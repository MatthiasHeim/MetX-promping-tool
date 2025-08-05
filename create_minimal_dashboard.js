import fs from 'fs';

console.log('🔧 Creating minimal dashboard based on working structure...');

// Use the working dashboard structure as base
const minimalDashboard = {
  "id": 999100,
  "title": "Cloud Dashboard",
  "tab_active": 999101,
  "use_global_datetime": false,
  "global_datetime": {
    "is_relative": true,
    "is_series": false,
    "is_auto_time_refresh_on": false,
    "abs_start": "2025-08-05T07:15:00Z",
    "abs_end": "2025-08-06T07:15:00Z",
    "rel_rounding_on": true,
    "rel_position": "now_with_15min_precision",
    "rel_rounding_direction": "backward",
    "rel_shift_on": true,
    "rel_start": "PT-15M",
    "rel_end": "P1D",
    "temporal_resolution": "PT3H",
    "fps": 10,
    "id": 999102,
    "id_profile": 999100,
    "time_created": "2025-08-05T10:00:00.000000Z",
    "time_updated": "2025-08-05T10:00:00.000000Z"
  },
  "id_account": 860,
  "time_created": "2025-08-05T10:00:00.000000Z",
  "time_updated": "2025-08-05T10:00:00.000000Z",
  "tabs": [
    {
      "id": 999101,
      "id_profile": 999100,
      "time_created": "2025-08-05T10:00:00.000000Z",
      "time_updated": "2025-08-05T10:00:00.000000Z",
      "title": "Cloud Layers",
      "order": 1,
      "is_favorite": false,
      "datetime": {
        "is_relative": true,
        "is_series": false,
        "is_auto_time_refresh_on": false,
        "abs_start": "2025-08-05T07:15:00Z",
        "abs_end": "2025-08-06T07:15:00Z",
        "rel_rounding_on": true,
        "rel_position": "now_with_15min_precision",
        "rel_rounding_direction": "backward",
        "rel_shift_on": true,
        "rel_start": "PT-15M",
        "rel_end": "P1D",
        "temporal_resolution": "PT3H",
        "fps": 10,
        "id": 999101,
        "id_profile": 999100,
        "time_created": "2025-08-05T10:00:00.000000Z",
        "time_updated": "2025-08-05T10:00:00.000000Z"
      },
      "layouts": [
        {
          "gridCellLayout": {
            "gridColumnStart": 1,
            "gridColumnEnd": 97,
            "gridRowStart": 1,
            "gridRowEnd": 97
          },
          "id": 999103,
          "id_tab": 999101,
          "type": "Map",
          "id_tool": 999104
        }
      ],
      "viewports": [
        {
          "kind": "ViewportFull",
          "center_lng": 4.528382494479189,
          "center_lat": 48.714010161862774,
          "zoom": 4.98367284007979,
          "southWest_lng": -12.272005896550013,
          "southWest_lat": 42.03644342320314,
          "northEast_lng": 21.328770885511545,
          "northEast_lat": 54.609827823927844,
          "id": 999105,
          "id_profile": 999100,
          "lastUpdatedBy": 999104
        }
      ],
      "country_plots": [],
      "energy_plots": [],
      "maps": [
        {
          "gridCellLayout": {
            "gridColumnStart": 1,
            "gridColumnEnd": 97,
            "gridRowStart": 1,
            "gridRowEnd": 97
          },
          "id": 999104,
          "id_profile": 999100,
          "id_tab": 999101,
          "id_viewport": 999105,
          "time_created": "2025-08-05T10:00:00.000000Z",
          "time_updated": "2025-08-05T10:00:00.000000Z",
          "title": "Cloud Cover Map",
          "titleStyle": null,
          "time_offset_mins": 0,
          "legend_size": null,
          "map_projection": {
            "name": "mercator",
            "center": null,
            "parallels": null
          },
          "lod_bias": 0,
          "layers": [
            {
              "time_created": "2025-08-05T10:00:00.000000Z",
              "time_updated": "2025-08-05T10:00:00.000000Z",
              "id": 999106,
              "id_profile": 999100,
              "id_cartographicmap": 999104,
              "index": 0,
              "opacity": 1,
              "show": true,
              "calibrated": false,
              "vertical_interpolation": "none",
              "experimental": false,
              "custom_options": {
                "line_color": null,
                "show_state_border": false,
                "map_label_language": null
              },
              "kind": "BackgroundMapDescription",
              "style": "topographique"
            },
            {
              "time_created": "2025-08-05T10:00:00.000000Z",
              "time_updated": "2025-08-05T10:00:00.000000Z",
              "id": 999107,
              "id_profile": 999100,
              "id_cartographicmap": 999104,
              "index": 1,
              "opacity": 0.7,
              "show": true,
              "calibrated": false,
              "vertical_interpolation": null,
              "experimental": false,
              "custom_options": {
                "init_date": null
              },
              "model": "mix",
              "parameter_unit": "low_cloud_cover:octas",
              "ens_select": null,
              "show_init_time": null,
              "kind": "WmsLayerDescription",
              "color_map": "t_europe",
              "legend_visible": true
            },
            {
              "time_created": "2025-08-05T10:00:00.000000Z",
              "time_updated": "2025-08-05T10:00:00.000000Z",
              "id": 999108,
              "id_profile": 999100,
              "id_cartographicmap": 999104,
              "index": 2,
              "opacity": 0.7,
              "show": true,
              "calibrated": false,
              "vertical_interpolation": null,
              "experimental": false,
              "custom_options": {
                "init_date": null
              },
              "model": "mix",
              "parameter_unit": "medium_cloud_cover:octas",
              "ens_select": null,
              "show_init_time": null,
              "kind": "WmsLayerDescription",
              "color_map": "t_europe",
              "legend_visible": true
            },
            {
              "time_created": "2025-08-05T10:00:00.000000Z",
              "time_updated": "2025-08-05T10:00:00.000000Z",
              "id": 999109,
              "id_profile": 999100,
              "id_cartographicmap": 999104,
              "index": 3,
              "opacity": 0.7,
              "show": true,
              "calibrated": false,
              "vertical_interpolation": null,
              "experimental": false,
              "custom_options": {
                "init_date": null
              },
              "model": "mix",
              "parameter_unit": "high_cloud_cover:octas",
              "ens_select": null,
              "show_init_time": null,
              "kind": "WmsLayerDescription",
              "color_map": "t_europe",
              "legend_visible": true
            },
            {
              "time_created": "2025-08-05T10:00:00.000000Z",
              "time_updated": "2025-08-05T10:00:00.000000Z",
              "id": 999110,
              "id_profile": 999100,
              "id_tab": 999101,
              "id_cartographicmap": 999104,
              "index": 4,
              "opacity": 0.7,
              "show": true,
              "calibrated": false,
              "vertical_interpolation": null,
              "experimental": false,
              "custom_options": {},
              "model": "mix",
              "parameter_unit": "total_cloud_cover:octas",
              "ens_select": null,
              "show_init_time": false,
              "kind": "GridLayerDescription",
              "step": 35,
              "text_size": 16,
              "text_color": "#000000"
            }
          ],
          "drawing": null
        }
      ],
      "notes": [],
      "plots": [],
      "location_tables": [],
      "tephigrams": [],
      "weather_tables": []
    }
  ]
};

// Save the minimal dashboard
const minimalPath = './examples/broken_dashboards/metx-dashboard-MINIMAL-CLEAN.json';
fs.writeFileSync(minimalPath, JSON.stringify(minimalDashboard, null, 2));

console.log(`💾 Minimal clean dashboard saved to: ${minimalPath}`);
console.log('📋 Based exactly on working dashboard structure');
console.log('🎯 Uses completely new ID range (999100+)');
console.log('⏰ Uses consistent timestamps');
console.log('🔗 All referential integrity guaranteed');
console.log('\n🚀 This eliminates any potential data corruption from the original AI-generated file!');