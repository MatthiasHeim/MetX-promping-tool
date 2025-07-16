import { describe, it, expect } from 'vitest'
import { validateAndFixDashboard, validateDashboardLayers } from './dashboardValidator'

describe('Dashboard Validator', () => {
  it('should fix missing required fields in generated dashboard layers', () => {
    const failedDashboard = {
      "id": 45883,
      "title": "Generated Dashboard",
      "tab_active": 69199,
      "tabs": [
        {
          "id": 69199,
          "title": "Main View",
          "maps": [
            {
              "id": 17673,
              "title": "Weather Map",
              "layers": [
                {
                  "kind": "BackgroundMapDescription",
                  "show": true,
                  "index": 0,
                  "style": "topographique",
                  "opacity": 1,
                  "id": 550000,
                  "id_profile": 45883,
                  "id_cartographicmap": 17673,
                  "time_created": "2025-07-13T18:52:51.128Z",
                  "time_updated": "2025-07-13T18:52:51.128Z"
                },
                {
                  "kind": "WmsLayerDescription",
                  "show": true,
                  "index": 1,
                  "model": "mix",
                  "opacity": 0.7,
                  "color_map": "prob_tstorm",
                  "legend_visible": true,
                  "parameter_unit": "prob_tstorm_1h:p",
                  "id": 550001,
                  "id_profile": 45883,
                  "id_cartographicmap": 17673,
                  "time_created": "2025-07-13T18:52:51.128Z",
                  "time_updated": "2025-07-13T18:52:51.128Z"
                }
              ],
              "id_profile": 45883,
              "id_tab": 69199,
              "id_viewport": 130000
            }
          ],
          "id_profile": 45883
        }
      ],
      "id_account": 317
    }

    // Validate original dashboard - should fail
    const originalValidation = validateDashboardLayers(failedDashboard)
    expect(originalValidation.isValid).toBe(false)
    expect(originalValidation.errors.length).toBeGreaterThan(0)

    // Apply fixes
    const result = validateAndFixDashboard(failedDashboard)
    
    // Should now be valid
    expect(result.validation.isValid).toBe(true)
    expect(result.validation.errors.length).toBe(0)

    // Check that required fields were added
    const backgroundLayer = result.dashboard.tabs[0].maps[0].layers[0]
    const wmsLayer = result.dashboard.tabs[0].maps[0].layers[1]

    // Universal required fields should be present
    expect(backgroundLayer.calibrated).toBe(null)
    expect(backgroundLayer.experimental).toBe(false)
    expect(backgroundLayer.vertical_interpolation).toBe('none')
    expect(backgroundLayer.custom_options).toBeDefined()
    expect(backgroundLayer.custom_options.map_label_language).toBe('en')

    expect(wmsLayer.calibrated).toBe(null)
    expect(wmsLayer.experimental).toBe(false)
    expect(wmsLayer.vertical_interpolation).toBe(null)
    expect(wmsLayer.custom_options).toBeDefined()
    expect(wmsLayer.custom_options.init_date).toBe(null)
    expect(wmsLayer.ens_select).toBe(null)
    expect(wmsLayer.show_init_time).toBe(false)
  })

  it('should fix missing required fields for PressureSystemLayerDescription and WeatherFrontsLayerDescription', () => {
    const failedDashboard = {
      "id": 28647,
      "title": "Generated Dashboard",
      "tab_active": 87876,
      "tabs": [
        {
          "id": 87876,
          "title": "Main View",
          "maps": [
            {
              "id": 86216,
              "title": "Weather Map",
              "layers": [
                {
                  "kind": "WeatherFrontsLayerDescription",
                  "show": true,
                  "index": 0,
                  "model": "ecmwf-ifs",
                  "opacity": 0.7,
                  "text_size": 16,
                  "line_width": 2,
                  "legend_visible": true,
                  "id": 550001,
                  "id_profile": 28647,
                  "id_cartographicmap": 86216,
                  "time_created": "2025-07-13T19:14:13.249Z",
                  "time_updated": "2025-07-13T19:14:13.249Z"
                },
                {
                  "kind": "PressureSystemLayerDescription",
                  "show": true,
                  "index": 1,
                  "model": "mix",
                  "opacity": 1,
                  "text_size": 20,
                  "line_color": "#000000",
                  "line_width": 1,
                  "text_color": "#000000",
                  "filter_gauss": 5,
                  "filter_median": 5,
                  "legend_visible": false,
                  "parameter_unit": "msl_pressure:hPa",
                  "id": 550002,
                  "id_profile": 28647,
                  "id_cartographicmap": 86216,
                  "time_created": "2025-07-13T19:14:13.249Z",
                  "time_updated": "2025-07-13T19:14:13.249Z"
                }
              ],
              "id_profile": 28647,
              "id_tab": 87876,
              "id_viewport": 130000
            }
          ],
          "id_profile": 28647
        }
      ],
      "id_account": 317
    }

    // Validate original dashboard - should fail due to missing fields
    const originalValidation = validateDashboardLayers(failedDashboard)
    expect(originalValidation.isValid).toBe(false)
    expect(originalValidation.errors.length).toBeGreaterThan(0)

    // Apply fixes
    const result = validateAndFixDashboard(failedDashboard)
    
    // Should now be valid
    expect(result.validation.isValid).toBe(true)
    expect(result.validation.errors.length).toBe(0)

    // Check that required fields were added
    const weatherFrontsLayer = result.dashboard.tabs[0].maps[0].layers[0]
    const pressureSystemLayer = result.dashboard.tabs[0].maps[0].layers[1]

    // WeatherFrontsLayerDescription should have all required fields
    expect(weatherFrontsLayer.calibrated).toBe(null)
    expect(weatherFrontsLayer.experimental).toBe(false)
    expect(weatherFrontsLayer.vertical_interpolation).toBe(null)
    expect(weatherFrontsLayer.custom_options).toBeDefined()
    expect(weatherFrontsLayer.ens_select).toBe(null)
    expect(weatherFrontsLayer.show_init_time).toBe(false)

    // PressureSystemLayerDescription should have all required fields including missing ones
    expect(pressureSystemLayer.calibrated).toBe(null)
    expect(pressureSystemLayer.experimental).toBe(false)
    expect(pressureSystemLayer.vertical_interpolation).toBe(null)
    expect(pressureSystemLayer.custom_options).toBeDefined()
    expect(pressureSystemLayer.ens_select).toBe(null)
    expect(pressureSystemLayer.show_init_time).toBe(false)
    expect(pressureSystemLayer.value_range).toBeDefined()
    expect(pressureSystemLayer.values).toBeDefined()
  })

  it('should handle layers with existing required fields', () => {
    const validDashboard = {
      "id": 2135,
      "title": "Generated Dashboard", 
      "tab_active": 19676,
      "tabs": [
        {
          "id": 19676,
          "title": "Main View",
          "maps": [
            {
              "id": 97046,
              "title": "Weather Map",
              "layers": [
                {
                  "id": 551414,
                  "kind": "BackgroundMapDescription",
                  "show": true,
                  "index": 0,
                  "style": "topographique",
                  "opacity": 1,
                  "calibrated": null,
                  "id_profile": 2135,
                  "experimental": false,
                  "time_created": "2025-07-13T19:00:54.443Z",
                  "time_updated": "2025-07-13T19:00:54.443Z",
                  "custom_options": {
                    "line_color": null,
                    "show_state_border": null,
                    "map_label_language": "en"
                  },
                  "id_cartographicmap": 97046,
                  "vertical_interpolation": "none"
                }
              ],
              "id_profile": 2135,
              "id_tab": 19676,
              "id_viewport": 130000
            }
          ],
          "id_profile": 2135
        }
      ],
      "id_account": 317
    }

    const result = validateAndFixDashboard(validDashboard)
    
    // Should remain valid and unchanged
    expect(result.validation.isValid).toBe(true)
    expect(result.validation.errors.length).toBe(0)
    
    const layer = result.dashboard.tabs[0].maps[0].layers[0]
    expect(layer.calibrated).toBe(null)
    expect(layer.experimental).toBe(false)
    expect(layer.vertical_interpolation).toBe('none')
    expect(layer.custom_options.map_label_language).toBe('en')
  })

  it('should fix the user reported failing dashboard', () => {
    const userReportedDashboard = {
      "id": 28647,
      "title": "Generated Dashboard",
      "tab_active": 87876,
      "use_global_datetime": false,
      "global_datetime": {
        "is_relative": true,
        "is_series": false,
        "is_auto_time_refresh_on": false,
        "abs_start": "2025-07-13T19:14:13.248Z",
        "abs_end": "2025-07-14T19:14:13.248Z",
        "rel_rounding_on": true,
        "rel_position": "now_with_15min_precision",
        "rel_rounding_direction": "backward",
        "rel_shift_on": true,
        "rel_start": "PT-15M",
        "rel_end": "P1D",
        "temporal_resolution": "PT3H",
        "fps": 10,
        "id": 12100,
        "id_profile": 28647,
        "time_created": "2025-07-13T19:14:13.249Z",
        "time_updated": "2025-07-13T19:14:13.249Z"
      },
      "tabs": [
        {
          "id": 87876,
          "title": "Main View",
          "order": 1,
          "is_favorite": false,
          "datetime": {
            "is_relative": true,
            "is_series": false,
            "is_auto_time_refresh_on": false,
            "abs_start": "2025-07-13T19:14:13.248Z",
            "abs_end": "2025-07-14T19:14:13.249Z",
            "rel_rounding_on": true,
            "rel_position": "now_with_15min_precision",
            "rel_rounding_direction": "backward",
            "rel_shift_on": true,
            "rel_start": "PT-15M",
            "rel_end": "P1D",
            "temporal_resolution": "PT3H",
            "fps": 10,
            "id": 87876,
            "id_profile": 28647,
            "time_created": "2025-07-13T19:14:13.249Z",
            "time_updated": "2025-07-13T19:14:13.249Z"
          },
          "layouts": [
            {
              "gridCellLayout": {
                "gridColumnStart": 1,
                "gridColumnEnd": 97,
                "gridRowStart": 1,
                "gridRowEnd": 97
              },
              "type": "Map",
              "id_tool": 86216,
              "id": 170000,
              "id_tab": 87876
            }
          ],
          "viewports": [
            {
              "kind": "ViewportFull",
              "center_lng": 8.5417,
              "center_lat": 47.3769,
              "zoom": 7,
              "southWest_lng": 5.9559,
              "southWest_lat": 45.818,
              "northEast_lng": 10.4921,
              "northEast_lat": 47.8084,
              "lastUpdatedBy": 86216,
              "id": 130000,
              "id_profile": 28647
            }
          ],
          "maps": [
            {
              "id": 86216,
              "title": "Weather Map",
              "titleStyle": null,
              "time_offset_mins": 0,
              "legend_size": null,
              "map_projection": null,
              "lod_bias": 0,
              "layers": [
                {
                  "kind": "BackgroundMapDescription",
                  "show": true,
                  "index": 0,
                  "style": "topographique",
                  "opacity": 1,
                  "id": 550000,
                  "id_profile": 28647,
                  "id_cartographicmap": 86216,
                  "time_created": "2025-07-13T19:14:13.249Z",
                  "time_updated": "2025-07-13T19:14:13.249Z",
                  "calibrated": null,
                  "experimental": false,
                  "vertical_interpolation": "none",
                  "custom_options": {
                    "line_color": null,
                    "show_state_border": null,
                    "map_label_language": "en"
                  }
                },
                {
                  "kind": "WeatherFrontsLayerDescription",
                  "show": true,
                  "index": 1,
                  "model": "ecmwf-ifs",
                  "opacity": 0.7,
                  "text_size": 16,
                  "line_width": 2,
                  "legend_visible": true,
                  "id": 550001,
                  "id_profile": 28647,
                  "id_cartographicmap": 86216,
                  "time_created": "2025-07-13T19:14:13.249Z",
                  "time_updated": "2025-07-13T19:14:13.249Z",
                  "calibrated": null,
                  "experimental": false,
                  "vertical_interpolation": null,
                  "custom_options": {},
                  "ens_select": null,
                  "show_init_time": false
                },
                {
                  "kind": "PressureSystemLayerDescription",
                  "show": true,
                  "index": 2,
                  "model": "mix",
                  "opacity": 1,
                  "text_size": 20,
                  "line_color": "#000000",
                  "line_width": 1,
                  "text_color": "#000000",
                  "filter_gauss": 5,
                  "filter_median": 5,
                  "legend_visible": false,
                  "parameter_unit": "msl_pressure:hPa",
                  "id": 550002,
                  "id_profile": 28647,
                  "id_cartographicmap": 86216,
                  "time_created": "2025-07-13T19:14:13.249Z",
                  "time_updated": "2025-07-13T19:14:13.249Z",
                  "calibrated": null,
                  "experimental": false,
                  "vertical_interpolation": null,
                  "custom_options": {},
                  "ens_select": null,
                  "show_init_time": false
                },
                {
                  "kind": "WmsLayerDescription",
                  "show": true,
                  "index": 3,
                  "model": "mix",
                  "opacity": 0.7,
                  "color_map": "t_europe",
                  "legend_visible": true,
                  "parameter_unit": "t_2m:C",
                  "id": 550003,
                  "id_profile": 28647,
                  "id_cartographicmap": 86216,
                  "time_created": "2025-07-13T19:14:13.249Z",
                  "time_updated": "2025-07-13T19:14:13.249Z",
                  "calibrated": null,
                  "experimental": false,
                  "vertical_interpolation": null,
                  "custom_options": {
                    "init_date": null
                  },
                  "ens_select": null,
                  "show_init_time": false
                }
              ],
              "drawing": null,
              "id_profile": 28647,
              "id_tab": 87876,
              "id_viewport": 130000,
              "time_created": "2025-07-13T19:14:13.249Z",
              "time_updated": "2025-07-13T19:14:13.249Z",
              "gridCellLayout": {
                "gridColumnStart": 1,
                "gridColumnEnd": 97,
                "gridRowStart": 1,
                "gridRowEnd": 97
              }
            }
          ],
          "country_plots": [],
          "energy_plots": [],
          "notes": [],
          "plots": [],
          "location_tables": [],
          "tephigrams": [],
          "weather_tables": [],
          "id_profile": 28647,
          "time_created": "2025-07-13T19:14:13.249Z",
          "time_updated": "2025-07-13T19:14:13.249Z"
        }
      ],
      "id_account": 317,
      "time_created": "2025-07-13T19:14:13.249Z",
      "time_updated": "2025-07-13T19:14:13.249Z"
    }

    // This dashboard already has most required fields but might be missing parameter_unit for WeatherFronts
    // and value_range/values for PressureSystem - let's test by removing them first
    const testDashboard = JSON.parse(JSON.stringify(userReportedDashboard))
    delete testDashboard.tabs[0].maps[0].layers[1].parameter_unit
    delete testDashboard.tabs[0].maps[0].layers[2].value_range
    delete testDashboard.tabs[0].maps[0].layers[2].values

    // Apply fixes
    const result = validateAndFixDashboard(testDashboard)
    
    // Should now be valid
    expect(result.validation.isValid).toBe(true)
    expect(result.validation.errors.length).toBe(0)

    // Check that the missing fields were added
    const weatherFrontsLayer = result.dashboard.tabs[0].maps[0].layers[1]
    const pressureSystemLayer = result.dashboard.tabs[0].maps[0].layers[2]

    expect(weatherFrontsLayer.parameter_unit).toBe("")
    expect(pressureSystemLayer.value_range).toBe("950,1050,4")
    expect(pressureSystemLayer.values).toBe(null)
  })

  it('should fix missing step field for SymbolLayerDescription', () => {
    const dashboardWithSymbolLayer = {
      "id": 44035,
      "title": "Generated Dashboard",
      "tab_active": 71065,
      "tabs": [
        {
          "id": 71065,
          "title": "Main View",
          "maps": [
            {
              "id": 76993,
              "title": "Weather Map",
              "layers": [
                {
                  "kind": "SymbolLayerDescription",
                  "show": true,
                  "index": 4,
                  "model": "mix",
                  "opacity": 1,
                  "layer_type": "WeatherSymbol",
                  "custom_options": {
                    "icon_size": 0.4,
                    "show_only_significant_weather": true
                  },
                  "parameter_unit": "weather_code_1h:idx",
                  "id": 550004,
                  "id_profile": 44035,
                  "id_cartographicmap": 76993,
                  "time_created": "2025-07-13T20:28:47.310Z",
                  "time_updated": "2025-07-13T20:28:47.310Z",
                  "calibrated": null,
                  "experimental": false,
                  "vertical_interpolation": null,
                  "ens_select": null,
                  "show_init_time": false
                }
              ],
              "id_profile": 44035,
              "id_tab": 71065,
              "id_viewport": 130000
            }
          ],
          "id_profile": 44035
        }
      ],
      "id_account": 317
    }

    // Remove the step field to test the fix
    const testDashboard = JSON.parse(JSON.stringify(dashboardWithSymbolLayer))
    delete testDashboard.tabs[0].maps[0].layers[0].step

    // Apply fixes
    const result = validateAndFixDashboard(testDashboard)
    
    // Should now be valid
    expect(result.validation.isValid).toBe(true)
    expect(result.validation.errors.length).toBe(0)

    // Check that the step field was added
    const symbolLayer = result.dashboard.tabs[0].maps[0].layers[0]
    expect(symbolLayer.step).toBe(25)
  })

  it('should fix IsolineLayerDescription to IsoLinesLayerDescription and custom_options structure', () => {
    const dashboard = {
      id: 56721,
      title: 'Generated Dashboard',
      tabs: [{
        id: 38209,
        maps: [{
          id: 6263,
          layers: [{
            kind: 'IsolineLayerDescription', // Wrong type name
            show: true,
            index: 3,
            model: 'mix',
            opacity: 1,
            calibrated: null,
            experimental: false,
            custom_options: {
              // These should be layer-level properties
              range: "940,1060,4",
              text_size: 15,
              line_color: "#FF0000",
              line_width: 1,
              text_color: "#FF0000",
              median_filter: 5,
              gaussian_filter: 5
            },
            legend_visible: false,
            parameter_unit: 'msl_pressure:hPa',
            vertical_interpolation: null,
            id: 550003,
            id_profile: 56721,
            id_cartographicmap: 6263,
            time_created: '2025-07-15T10:03:50.774Z',
            time_updated: '2025-07-15T10:03:50.774Z'
          }]
        }]
      }]
    }

    const result = validateAndFixDashboard(dashboard)
    
    // Check that the layer type was fixed
    expect(result.dashboard.tabs[0].maps[0].layers[0].kind).toBe('IsoLinesLayerDescription')
    
    // Check that custom_options fields were moved to layer level
    const layer = result.dashboard.tabs[0].maps[0].layers[0]
    expect(layer.value_range).toBe("940,1060,4")
    expect(layer.text_size).toBe(15)
    expect(layer.line_color).toBe("#FF0000")
    expect(layer.line_width).toBe(1)
    expect(layer.text_color).toBe("#FF0000")
    expect(layer.filter_median).toBe(5)
    expect(layer.filter_gauss).toBe(5)
    
    // Check that custom_options is now empty
    expect(layer.custom_options).toEqual({})
  })

  it('should fix LightningLayerDescription issues with text_color and parameter_unit', () => {
    const dashboard = {
      id: 38746,
      title: 'Generated Dashboard',
      tabs: [{
        id: 5366,
        maps: [{
          id: 9124,
          layers: [{
            kind: 'LightningLayerDescription',
            show: true,
            index: 3,
            model: 'mix',
            opacity: 1,
            custom_options: {
              text_color: '#FFFF00'  // Should be at layer level
            },
            legend_visible: true,
            parameter_unit: 'lightnings_60:', // Invalid trailing colon
            id: 550003,
            id_profile: 38746,
            id_cartographicmap: 9124,
            time_created: '2025-07-16T06:41:43.337Z',
            time_updated: '2025-07-16T06:41:43.337Z',
            calibrated: null,
            experimental: false,
            vertical_interpolation: null,
            ens_select: null,
            show_init_time: false
            // MISSING: text_size field
          }]
        }]
      }]
    }

    const result = validateAndFixDashboard(dashboard)
    
    // Check that text_color was moved from custom_options to layer level
    const layer = result.dashboard.tabs[0].maps[0].layers[0]
    expect(layer.text_color).toBe('#FFFF00')
    expect(layer.custom_options).toEqual({})
    
    // Check that parameter_unit was fixed
    expect(layer.parameter_unit).toBe('lightnings_60')
    
    // Check that text_size was added
    expect(layer.text_size).toBe(16)
  })

  it('should fix SymbolLayerDescription layer_type in custom_options', () => {
    const dashboard = {
      id: 89764,
      title: 'Generated Dashboard',
      tabs: [{
        id: 72137,
        maps: [{
          id: 68154,
          layers: [{
            kind: 'SymbolLayerDescription',
            show: true,
            index: 4,
            model: 'mix',
            opacity: 1,
            custom_options: {
              icon_size: 0.5,
              layer_type: 'WeatherSymbol',  // Should be at layer level
              show_only_significant_weather: true
            },
            parameter_unit: 'weather_code_1h:idx',
            id: 550004,
            id_profile: 89764,
            id_cartographicmap: 68154,
            time_created: '2025-07-16T07:36:23.776Z',
            time_updated: '2025-07-16T07:36:23.776Z',
            calibrated: null,
            experimental: false,
            vertical_interpolation: null,
            ens_select: null,
            show_init_time: false,
            step: 25
          }]
        }]
      }]
    }

    const result = validateAndFixDashboard(dashboard)
    
    // Check that layer_type was moved from custom_options to layer level
    const layer = result.dashboard.tabs[0].maps[0].layers[0]
    expect(layer.layer_type).toBe('WeatherSymbol')
    
    // Check that layer_type was removed from custom_options
    expect(layer.custom_options.layer_type).toBeUndefined()
    
    // Check that other custom_options fields remain
    expect(layer.custom_options.icon_size).toBe(0.5)
    expect(layer.custom_options.show_only_significant_weather).toBe(true)
  })
})