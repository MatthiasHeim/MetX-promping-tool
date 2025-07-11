import { EvaluationTestCaseService } from './EvaluationTestCaseService'
import type { EvaluationTestCaseInsert, EvaluationTestCase } from '../../types/database'

export class TestCaseImportService {
  /**
   * Extract layers from MetX dashboard JSON and create evaluation test cases
   */
  static async importTestCasesFromDashboards(userId: string): Promise<EvaluationTestCase[]> {
    const testCases: EvaluationTestCaseInsert[] = []

    // Basic user prompts with corresponding extracted layers
    const basicTestCases = [
      {
        name: "Temperature Map Germany",
        description: "Basic temperature visualization for Germany",
        user_prompt: "Show me today's temperature map over Germany.",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topographique",
              opacity: 1,
              show: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix",
              parameter_unit: "t_2m:C",
              opacity: 0.7,
              show: true,
              legend_visible: true
            }
          ],
          viewport: {
            center_lng: 10.165474507107604,
            center_lat: 50.63485243720632,
            zoom: 5.712956426852413
          },
          title: "Temperature Germany"
        }
      },
      {
        name: "Rain Forecast Switzerland",
        description: "Precipitation forecast for Switzerland",
        user_prompt: "I want to see the rain forecast for Switzerland.",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topographique",
              opacity: 1,
              show: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix",
              parameter_unit: "precip_1h:mm",
              opacity: 0.7,
              show: true,
              legend_visible: true
            }
          ],
          viewport: {
            center_lng: 8.315788241219025,
            center_lat: 46.88539076335263,
            zoom: 7.061319205878983
          },
          title: "Rain - Switzerland"
        }
      },
      {
        name: "Wind Speed Europe",
        description: "Wind speed visualization over Europe",
        user_prompt: "Display wind speed over Europe.",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topographique",
              opacity: 1,
              show: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix",
              parameter_unit: "wind_speed_10m:ms",
              opacity: 0.51,
              show: true,
              legend_visible: true
            }
          ],
          viewport: {
            center_lng: 5.27383450365727,
            center_lat: 47.8273478389502,
            zoom: 4.2283755958581875
          },
          title: "Wind speed EU"
        }
      },
      {
        name: "Cloud Coverage US",
        description: "Cloud cover visualization for United States",
        user_prompt: "Can I see the cloud coverage over the us?",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topographique",
              opacity: 1,
              show: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix",
              parameter_unit: "low_cloud_cover:octas",
              opacity: 0.7,
              show: true,
              legend_visible: true
            }
          ],
          viewport: {
            center_lng: -103.02080638013317,
            center_lat: 38.57823300523677,
            zoom: 3.9258665127984624
          },
          title: "Cloud coverage US"
        }
      },
      {
        name: "UV Index Spain",
        description: "UV index map for Spain",
        user_prompt: "Display a map of UV index in Spain.",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topographique",
              opacity: 1,
              show: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix",
              parameter_unit: "uv:idx",
              opacity: 0.7,
              show: true,
              legend_visible: true
            }
          ],
          viewport: {
            center_lng: -4.052276681318062,
            center_lat: 39.785995657495846,
            zoom: 5.750283566331533
          },
          title: "UV Index - Spain"
        }
      }
    ]

    // Professional meteorologist prompts with more complex layers
    const professionalTestCases = [
      {
        name: "850 hPa Temperature Central Europe",
        description: "Professional meteorologist setup with multiple atmospheric layers",
        user_prompt: "Set up a dashboard showing 1 map: 850 hPa temperature, mean sea level pressure, and total cloud cover over Central Europe now.",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topo",
              opacity: 0.7,
              show: true
            },
            {
              kind: "BackgroundMapDescription",
              style: "3958f66e-04a7-48e9-a088-a3b3c617c617",
              opacity: 1,
              show: true,
              custom_options: {
                line_color: "#030303",
                show_state_border: false,
                map_label_language: "en"
              }
            },
            {
              kind: "WmsLayerDescription",
              model: "mm-euro1k",
              parameter_unit: "t_850hPa:C",
              opacity: 0.7,
              show: true,
              legend_visible: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mm-euro1k",
              parameter_unit: "total_cloud_cover:octas",
              opacity: 0.7,
              show: true,
              legend_visible: true
            },
            {
              kind: "IsoLinesLayerDescription",
              model: "mm-euro1k",
              parameter_unit: "msl_pressure:hPa",
              opacity: 0.7,
              show: true,
              line_width: 2,
              line_color: "#000000",
              text_size: 16,
              text_color: "#000000"
            }
          ],
          viewport: {
            center_lng: 5.065019637590808,
            center_lat: 47.78459941588753,
            zoom: 4.33422916324128
          },
          title: "EU Overview"
        }
      },
      {
        name: "Convective Forecasting Southern France",
        description: "CAPE, lifted index, and wind shear for convection analysis",
        user_prompt: "I need a map with CAPE, lifted index, and wind shear overlaid for convective forecasting across Southern France.",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topographique",
              opacity: 1,
              show: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix",
              parameter_unit: "cape:Jkg",
              opacity: 0.7,
              show: true,
              legend_visible: true
            },
            {
              kind: "BackgroundMapDescription",
              style: "3958f66e-04a7-48e9-a088-a3b3c617c617",
              opacity: 0.7,
              show: true,
              custom_options: {
                line_color: "#f3eded",
                show_state_border: false,
                map_label_language: "en"
              }
            },
            {
              kind: "IsoLinesLayerDescription",
              model: "mix",
              parameter_unit: "wind_shear_mean_10m_6000m_1h:ms",
              opacity: 0.7,
              show: true,
              line_width: 2,
              line_color: "#000000",
              text_size: 16,
              text_color: "#000000",
              value_range: "0,50,5"
            },
            {
              kind: "GridLayerDescription",
              model: "mix",
              parameter_unit: "lifted_index:K",
              opacity: 0.7,
              show: true,
              step: 35,
              text_size: 16,
              text_color: "#bf0303"
            }
          ],
          viewport: {
            center_lng: 4.064688994352622,
            center_lat: 43.833992246106874,
            zoom: 7.034051528492816
          },
          title: "South France"
        }
      },
      {
        name: "Model Comparison Precipitation Italy",
        description: "ECMWF vs ICON model comparison for precipitation",
        user_prompt: "Build a tab comparing ECMWF and ICON (EU / D2) models total amount of precipitation for Northern Italy over the next 24 hours.",
        expected_json: {
          maps: [
            {
              title: "ECMWF-IFS",
              layers: [
                {
                  kind: "BackgroundMapDescription",
                  style: "topographique",
                  opacity: 1,
                  show: true
                },
                {
                  kind: "WmsLayerDescription",
                  model: "ecmwf-ifs",
                  parameter_unit: "precip_24h:mm",
                  opacity: 0.7,
                  show: true,
                  legend_visible: true
                },
                {
                  kind: "BackgroundMapDescription",
                  style: "3958f66e-04a7-48e9-a088-a3b3c617c617",
                  opacity: 0.7,
                  show: true
                },
                {
                  kind: "GridLayerDescription",
                  model: "ecmwf-ifs",
                  parameter_unit: "precip_24h:mm",
                  opacity: 0.7,
                  show: true,
                  step: 35,
                  text_size: 16,
                  text_color: "#000000"
                }
              ]
            },
            {
              title: "DWD IconD2",
              layers: [
                {
                  kind: "BackgroundMapDescription",
                  style: "topographique",
                  opacity: 1,
                  show: true
                },
                {
                  kind: "WmsLayerDescription",
                  model: "dwd-icon-d2",
                  parameter_unit: "precip_24h:mm",
                  opacity: 0.7,
                  show: true,
                  legend_visible: true
                },
                {
                  kind: "BackgroundMapDescription",
                  style: "3958f66e-04a7-48e9-a088-a3b3c617c617",
                  opacity: 0.7,
                  show: true
                },
                {
                  kind: "GridLayerDescription",
                  model: "dwd-icon-d2",
                  parameter_unit: "precip_24h:mm",
                  opacity: 0.7,
                  show: true,
                  step: 35,
                  text_size: 16,
                  text_color: "#000000"
                }
              ]
            }
          ],
          viewport: {
            center_lng: 10.059156213377463,
            center_lat: 45.58230374630682,
            zoom: 6.501124693275339
          },
          title: "Precipitation Italy"
        }
      },
      {
        name: "Weather Overview Western Europe",
        description: "Comprehensive weather panel with satellite, radar, and lightning",
        user_prompt: "Set up a weather overview panel with pressure satellite infrared imagery, and radar composite with lightning strikes over Western Europe.",
        expected_json: {
          layers: [
            {
              kind: "BackgroundMapDescription",
              style: "topographique",
              opacity: 1,
              show: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix",
              parameter_unit: "sat_ir_108:F",
              opacity: 0.7,
              show: true,
              vertical_interpolation: "downscale",
              legend_visible: true
            },
            {
              kind: "WmsLayerDescription",
              model: "mix-radar",
              parameter_unit: "precip_1h:mm",
              opacity: 0.7,
              show: true,
              legend_visible: true
            },
            {
              kind: "LightningLayerDescription",
              parameter_unit: "lightnings_60",
              opacity: 1,
              show: true,
              text_size: 28,
              text_color: "yellow",
              legend_visible: true
            },
            {
              kind: "BackgroundMapDescription",
              style: "3958f66e-04a7-48e9-a088-a3b3c617c617",
              opacity: 0.7,
              show: true
            }
          ],
          viewport: {
            center_lng: 18.4461089428753,
            center_lat: 50.34517847577635,
            zoom: 5.581323352087165
          },
          title: "Weather overview East EU"
        }
      }
    ]

    // Combine all test cases
    testCases.push(
      ...basicTestCases.map(tc => ({
        ...tc,
        created_by: userId,
        is_active: true
      })),
      ...professionalTestCases.map(tc => ({
        ...tc,
        created_by: userId,
        is_active: true
      }))
    )

    try {
      console.log(`Importing ${testCases.length} test cases...`)
      
      const importedCases = await EvaluationTestCaseService.bulkCreateTestCases(testCases)
      
      console.log(`Successfully imported ${importedCases.length} test cases:`)
      importedCases.forEach((testCase, index) => {
        console.log(`${index + 1}. ${testCase.name}`)
      })

      return importedCases
    } catch (error) {
      console.error('Error importing test cases:', error)
      throw error
    }
  }

  /**
   * Helper method to extract clean layer structure from complex JSON
   */
  static extractLayersFromMetXTab(tab: any): any[] {
    if (!tab.maps || tab.maps.length === 0) return []

    const extractedLayers = []
    
    for (const map of tab.maps) {
      if (map.layers && map.layers.length > 0) {
        const cleanLayers = map.layers.map((layer: any) => {
          // Extract only the essential layer properties for evaluation
          const cleanLayer: any = {
            kind: layer.kind,
            opacity: layer.opacity,
            show: layer.show
          }

          // Add specific properties based on layer type
          if (layer.kind === "WmsLayerDescription") {
            cleanLayer.model = layer.model
            cleanLayer.parameter_unit = layer.parameter_unit
            cleanLayer.legend_visible = layer.legend_visible
            if (layer.vertical_interpolation) {
              cleanLayer.vertical_interpolation = layer.vertical_interpolation
            }
          } else if (layer.kind === "BackgroundMapDescription") {
            cleanLayer.style = layer.style
            if (layer.custom_options) {
              cleanLayer.custom_options = layer.custom_options
            }
          } else if (layer.kind === "IsoLinesLayerDescription") {
            cleanLayer.model = layer.model
            cleanLayer.parameter_unit = layer.parameter_unit
            cleanLayer.line_width = layer.line_width
            cleanLayer.line_color = layer.line_color
            cleanLayer.text_size = layer.text_size
            cleanLayer.text_color = layer.text_color
            if (layer.value_range) {
              cleanLayer.value_range = layer.value_range
            }
          } else if (layer.kind === "GridLayerDescription") {
            cleanLayer.model = layer.model
            cleanLayer.parameter_unit = layer.parameter_unit
            cleanLayer.step = layer.step
            cleanLayer.text_size = layer.text_size
            cleanLayer.text_color = layer.text_color
          } else if (layer.kind === "LightningLayerDescription") {
            cleanLayer.parameter_unit = layer.parameter_unit
            cleanLayer.text_size = layer.text_size
            cleanLayer.text_color = layer.text_color
            cleanLayer.legend_visible = layer.legend_visible
          }

          return cleanLayer
        })

        extractedLayers.push(...cleanLayers)
      }
    }

    return extractedLayers
  }

  /**
   * Get current test case count
   */
  static async getTestCaseCount(): Promise<number> {
    return await EvaluationTestCaseService.getTestCaseCount()
  }

  /**
   * Clear all test cases (for testing purposes)
   */
  static async clearAllTestCases(): Promise<void> {
    try {
      const testCases = await EvaluationTestCaseService.fetchTestCases(true) // Include inactive
      
      for (const testCase of testCases) {
        await EvaluationTestCaseService.hardDeleteTestCase(testCase.id)
      }
      
      console.log(`Cleared ${testCases.length} test cases`)
    } catch (error) {
      console.error('Error clearing test cases:', error)
      throw error
    }
  }
}