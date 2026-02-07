/**
 * OWM Clouds Layer for OpenHamClock Uses open Weather API
 * Added for USRadioguy.com - Real-time global cloud overlay
 */
const OWMClouds = {
  id: 'owm-clouds',
  name: 'Global Clouds (OWM)',
  type: 'tile',
  // Standard OWM Tiled URL format using the key from your .env
  url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${process.env.OPENWEATHER_API_KEY}`,
  defaultEnabled: false,
  defaultOpacity: 0.5,
  attribution: '© OpenWeatherMap',
  zIndex: 1000, // Stays above the base MODIS/Dark layers
  maxZoom: 18,
  minZoom: 1
};

export default OWMClouds;
