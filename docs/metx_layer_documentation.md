# MetX JSON Layers Documentation for Junior Developers

This document provides a detailed, step-by-step guide for creating the `layers` array within a MetX dashboard's JSON configuration file. This is intended for developers who are new to the MetX platform.

## 1. Overall JSON Structure

The final JSON file for a MetX dashboard is a single, complete object. The `layers` array is nested within a `maps` object, which itself is inside a `tabs` object. Your task is to generate the content for the `layers` array. This content will be inserted between the provided `metx-prefix-template.txt` and `metx-suffix-template.txt` files to form the final, valid dashboard JSON.

The `layers` array contains a list of JSON objects, where each object represents one layer on the map. The order of these objects matters: layers are stacked from bottom to top. The first object in the array (index 0) will be the bottom-most layer.

## 2. General Layer Properties

Most layer objects share a set of common keys. Unless specified otherwise, these should be populated with the default values from the provided templates.

| Key | Instruction | Description |
| :--- | :--- | :--- |
| `id`, `id_profile`, `id_cartographicmap` | Use the default integer values from the templates. These are for internal linking. | `id`: 53xxxx, `id_profile`: 11994, etc. |
| `index` | Required. An integer that defines the stacking order, starting from 0 for the bottom layer. Increment for each subsequent layer. | The background map is typically 0. |
| `opacity` | Set to a float between 0.0 (fully transparent) and 1.0 (fully opaque). A good default is 0.7. | Controls the layer's transparency. |
| `show` | Set to `true` to make the layer visible by default, `false` to hide it. | Toggles the initial visibility of the layer. |
| `legend_visible` | Set to `true` to display the legend for this layer on the map by default. | Controls the legend's visibility. |
| `vertical_interpolation` | Can be set to `"none"` or `"downscale"`. | Controls how data is interpolated vertically. |

## 3. Detailed Layer Type Breakdown

The `"kind"` property defines the layer's function. When adding a layer in the MetX user interface, you select a "MODE". Here is how those modes map to the `"kind"` property in the JSON, along with a detailed explanation of each.

### 3.1. Cartographic Material (`BackgroundMapDescription`)

This layer is the cartographic base map and should almost always be your bottom layer (`index: 0`).

*   **`style`**: This string determines the appearance of the base map.
    *   **Common Values**: `"topographique"`, `"basic"`, `"hybrid"`, `"dark_blue_and_green"`, `"border"`, or a UUID for a custom style.
    *   **Usage**: Choose `"topographique"` for a standard map with terrain. Use `"border"` if you only want to show country outlines.
*   **`custom_options`**: An object for additional settings.
    *   **`map_label_language`**: Can be set to `"en"`, `"de"`, or `"fr"` to change the language of map labels.

**Complete Example (Topographic Base Layer):**

```json
{
    "time_created": "2025-06-18T08:54:11.060457Z",
    "time_updated": "2025-06-18T08:54:37.967990Z",
    "id": 530980,
    "id_profile": 11994,
    "id_cartographicmap": 111354,
    "index": 0,
    "opacity": 0.7,
    "show": true,
    "calibrated": false,
    "vertical_interpolation": null,
    "experimental": false,
    "custom_options": {
        "line_color": null,
        "show_state_border": null,
        "map_label_language": "en"
    },
    "kind": "BackgroundMapDescription",
    "style": "topographique"
}
```

### 3.2. Color Maps (`WmsLayerDescription`)

This is the most common layer for displaying weather data as a colored overlay.

*   **`model`**: The data source. Default to `"mix"`.
*   **`parameter_unit`**: (Required) A string that defines the weather parameter. This is the most complex field and is constructed as follows: `parameter_level:unit`.
    *   **`parameter`**: The name of the weather variable (e.g., `t` for temperature, `precip_1h` for 1-hour precipitation). A full list is in the Meteomatics API documentation.
    *   **`level`**: The vertical level (e.g., `2m`, `10m`, `100hPa`).
    *   **`unit`**: The unit of measurement (e.g., `C` for Celsius, `mm` for millimeters).
*   **`color_map`**: A string defining the color palette. Examples include `t_europe`, `precip_segmented`, `gray_transparent_dark`.
*   **`calibrated`**: A boolean. Default to `false`.

**Complete Example (2m Temperature):**

```json
{
    "time_created": "2025-06-18T08:52:13.960873Z",
    "time_updated": "2025-06-18T08:52:41.708448Z",
    "id": 530972,
    "id_profile": 11994,
    "id_cartographicmap": 111354,
    "index": 1,
    "opacity": 0.7,
    "show": true,
    "calibrated": false,
    "vertical_interpolation": null,
    "experimental": false,
    "custom_options": { "init_date": null },
    "model": "mix",
    "parameter_unit": "t_2m:C",
    "ens_select": null,
    "show_init_time": false,
    "kind": "WmsLayerDescription",
    "color_map": "t_europe",
    "legend_visible": true
}
```

### 3.3. Isolines (`IsolineLayerDescription`)

This layer draws lines of equal value (e.g., isobars for pressure).

*   **`parameter_unit`**: The parameter to be visualized with isolines (e.g., `msl_pressure:hPa`).
*   **`custom_options`**: This object holds styling for the isolines.
    *   **`range`**: A string defining the `min,max,step` for the lines (e.g., `"940,1060,4"`).
    *   **`line_color`**: Hex code for the line color.
    *   **`text_color`**: Hex code for the value labels on the lines.
    *   **`line_width`**: Integer for the line thickness.
    *   **`text_size`**: Integer for the font size of the labels.
    *   **`median_filter` / `gaussian_filter`**: Integers to apply smoothing to the lines.

**Complete Example (Mean Sea Level Pressure):**

```json
{
    "time_created": "2025-06-18T08:53:13.960873Z",
    "time_updated": "2025-06-18T08:53:41.708448Z",
    "id": 530975,
    "id_profile": 11994,
    "id_cartographicmap": 111354,
    "index": 2,
    "opacity": 1.0,
    "show": true,
    "calibrated": false,
    "vertical_interpolation": null,
    "experimental": false,
    "custom_options": {
        "range": "940,1060,4",
        "line_color": "#FF0000",
        "text_color": "#FF0000",
        "line_width": 1,
        "text_size": 15,
        "median_filter": 5,
        "gaussian_filter": 5
    },
    "model": "mix",
    "parameter_unit": "msl_pressure:hPa",
    "ens_select": null,
    "show_init_time": false,
    "kind": "IsolineLayerDescription",
    "legend_visible": false
}
```

### 3.4. Other Layer Types

Here are some other important layer types with their key properties:

*   **`WindAnimationLayerDescription`**: For wind animations.
    *   **`parameter_unit`**: Use a parameter like `"wind_speed_u_10m:ms"` and `"wind_speed_v_10m:ms"`.
    *   **`color_map`**: A colormap like `"gray_transparent"`.
*   **`SymbolLayerDescription`**: For weather symbols.
    *   **`parameter_unit`**: Use a parameter like `"weather_code_1h:idx"`.
    *   **`custom_options.layer_type`**: Should be `"WeatherSymbol"`.
*   **`LightningLayerDescription`**: For lightning strikes.
    *   **`parameter_unit`**: Use a parameter like `"lightnings_60"`.
    *   **`custom_options.text_color`**: A color like `"yellow"`.
*   **`PressureSystemLayerDescription`**: To show Highs ("H") and Lows ("L").
    *   **`parameter_unit`**: Should be `msl_pressure:hPa`.
    *   **`line_width`**, **`line_color`**, **`text_size`**, **`text_color`**: Styling for the "H" and "L" symbols and their labels.
    *   **`filter_median`**, **`filter_gauss`**: Smoothing options.
*   **`WeatherFrontsLayerDescription`**: To show weather fronts.
    *   **`model`**: The model to use for the fronts, e.g., `"ecmwf-ifs"`.
    *   **`line_width`**, **`text_size`**: Styling for the front lines and labels.
*   **`StationLayerDescription`**: To show data from weather stations.
    *   **`parameter_unit`**: The parameter to display from the stations (e.g., `t_2m:C`).
    *   **`text_size`**, **`text_color`**: Styling for the station data labels.
*   **`GridLayerDescription`**: To show data as a grid of numerical values.
    *   **`parameter_unit`**: The parameter to display in the grid (e.g., `lifted_index:K`).
    *   **`step`**: The grid spacing.
    *   **`text_size`**, **`text_color`**: Styling for the grid values.

## 4. Parameter Definition

The `parameter_unit` is a crucial property that defines the data to be displayed. It is a combination of the parameter name, its vertical level or interval, and the unit of measurement. The format is `parameter_level:unit` or `parameter_interval:unit`.

### 4.1. Common Parameters

Here is a list of common parameters found in the example files:

| Parameter | Description | Example `parameter_unit` |
| :--- | :--- | :--- |
| `t` | Temperature | `t_2m:C` (Temperature at 2 meters in Celsius) |
| `precip` | Precipitation | `precip_1h:mm` (Precipitation in the last hour in millimeters) |
| `msl_pressure` | Mean Sea Level Pressure | `msl_pressure:hPa` (Mean sea level pressure in hectopascals) |
| `wind_speed` | Wind Speed | `wind_speed_10m:ms` (Wind speed at 10 meters in meters per second) |
| `wind_speed_u` | Zonal Wind Speed (West-East) | `wind_speed_u_10m:ms` (Zonal wind speed at 10 meters in meters per second) |
| `wind_speed_v` | Meridional Wind Speed (South-North)| `wind_speed_v_10m:ms` (Meridional wind speed at 10 meters in meters per second) |
| `wind_gusts` | Wind Gusts | `wind_gusts_10m_1h:ms` (Wind gusts at 10 meters in the last hour in meters per second) |
| `wind_shear_mean` | Wind Shear | `wind_shear_mean_10m_6000m_1h:ms` (Mean wind shear between 10 and 6000 meters in the last hour in meters per second) |
| `weather_code` | Weather Code | `weather_code_1h:idx` (Weather code for the last hour) |
| `low_cloud_cover`| Low Cloud Cover | `low_cloud_cover:octas` (Low cloud cover in octas) |
| `medium_cloud_cover`| Medium Cloud Cover | `medium_cloud_cover:octas` (Medium cloud cover in octas) |
| `high_cloud_cover`| High Cloud Cover | `high_cloud_cover:octas` (High cloud cover in octas) |
| `total_cloud_cover`| Total Cloud Cover | `total_cloud_cover:octas` (Total cloud cover in octas) |
| `cape` | Convective Available Potential Energy | `cape:Jkg` (CAPE in Joules per kilogram) |
| `cin` | Convective Inhibition | `cin:Jkg` (CIN in Joules per kilogram) |
| `lifted_index` | Lifted Index | `lifted_index:K` (Lifted index in Kelvin) |
| `lightnings` | Lightning Strikes | `lightnings_60:` (Lightning strikes in the last 60 minutes) |
| `radar` | Weather Radar | `radar_5min:mm` (Radar precipitation in the last 5 minutes in millimeters) |
| `prob_tstorm` | Thunderstorm Probability | `prob_tstorm_1h:p` (Probability of a thunderstorm in the last hour) |
| `uv` | UV Index | `uv:idx` (UV Index) |
| `sat_ir` | Satellite Infrared | `sat_ir_108:F` (Satellite infrared at 10.8 micrometers in Fahrenheit) |

### 4.2. Levels and Intervals

*   **Levels**: Appended to the parameter name with an underscore (e.g., `_2m`, `_10m`, `_500hPa`). Common levels include `2m`, `10m`, `100m`, `500hPa`, `850hPa`.
*   **Intervals**: Appended to the parameter name with an underscore (e.g., `_1h`, `_24h`). Common intervals include `1h`, `3h`, `6h`, `12h`, `24h`.

### 4.3. Units

The unit is appended to the parameter and level/interval with a colon (e.g., `:C`, `:mm`, `:hPa`). Common units include:

*   **Temperature**: `C` (Celsius), `K` (Kelvin), `F` (Fahrenheit)
*   **Precipitation**: `mm` (millimeters)
*   **Pressure**: `hPa` (hectopascals), `Pa` (Pascals)
*   **Wind Speed**: `ms` (meters per second), `kmh` (kilometers per hour), `kn` (knots)
*   **Cloud Cover**: `octas`
*   **Energy**: `Jkg` (Joules per kilogram)
*   **Index**: `idx`
*   **Probability**: `p`

### 4.4. Models

The `model` property specifies the data source. Common models include:

*   `mix`: A mix of different models.
*   `ecmwf-ifs`: The Integrated Forecasting System from the European Centre for Medium-Range Weather Forecasts.
*   `dwd-icon-d2`: The ICON-D2 model from the German Weather Service.
*   `mm-euro1k`: A high-resolution European model from Meteomatics.
*   `mix-radar`: A mix of radar data.

For a complete and up-to-date list of all available parameters, levels, units, and models, please refer to the official [Meteomatics API Documentation](https://www.meteomatics.com/en/api/available-parameters/).
