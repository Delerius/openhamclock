/**
 * OpenHamClock Server
 * 
 * Express server that:
 * 1. Serves the static web application
 * 2. Proxies API requests to avoid CORS issues
 * 3. Provides WebSocket support for future real-time features
 * 
 * Usage:
 *   node server.js
 *   PORT=8080 node server.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// API PROXY ENDPOINTS
// ============================================

// NOAA Space Weather - Solar Flux
app.get('/api/noaa/flux', async (req, res) => {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/json/f107_cm_flux.json');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('NOAA Flux API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch solar flux data' });
  }
});

// NOAA Space Weather - K-Index
app.get('/api/noaa/kindex', async (req, res) => {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('NOAA K-Index API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch K-index data' });
  }
});

// NOAA Space Weather - Sunspots
app.get('/api/noaa/sunspots', async (req, res) => {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('NOAA Sunspots API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch sunspot data' });
  }
});

// NOAA Space Weather - X-Ray Flux
app.get('/api/noaa/xray', async (req, res) => {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('NOAA X-Ray API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch X-ray data' });
  }
});

// POTA Spots
app.get('/api/pota/spots', async (req, res) => {
  try {
    const response = await fetch('https://api.pota.app/spot/activator');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('POTA API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch POTA spots' });
  }
});

// SOTA Spots
app.get('/api/sota/spots', async (req, res) => {
  try {
    const response = await fetch('https://api2.sota.org.uk/api/spots/50/all');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('SOTA API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch SOTA spots' });
  }
});

// HamQSL Band Conditions
app.get('/api/hamqsl/conditions', async (req, res) => {
  try {
    const response = await fetch('https://www.hamqsl.com/solarxml.php');
    const text = await response.text();
    res.set('Content-Type', 'application/xml');
    res.send(text);
  } catch (error) {
    console.error('HamQSL API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch band conditions' });
  }
});

// DX Cluster proxy - fetches from multiple sources with detailed logging
app.get('/api/dxcluster/spots', async (req, res) => {
  console.log('[DX Cluster] ========== Fetching spots ==========');

  // Source 1: HamQTH (uses ^ delimiter!)
  try {
    console.log('[DX Cluster] Trying HamQTH...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://www.hamqth.com/dxc_csv.php', {
      headers: { 'User-Agent': 'OpenHamClock/3.3' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    console.log('[DX Cluster] HamQTH status:', response.status);
    if (response.ok) {
      const text = await response.text();
      console.log('[DX Cluster] HamQTH response length:', text.length);
      
      const lines = text.trim().split('\n').filter(line => line.trim() && !line.startsWith('#'));
      console.log('[DX Cluster] HamQTH lines count:', lines.length);
      
      if (lines.length > 0) {
        const spots = [];
        for (const line of lines.slice(0, 25)) {
          // HamQTH format uses ^ delimiter:
          // spotter^freq^dx_call^comment^time date^^^continent^band^country^id
          // Example: F5PAC^7022.0^KP5/NP3VI^Up 2^0610 2026-01-30^^^NA^40M^Desecheo Island^43
          const parts = line.split('^');
          
          if (parts.length >= 5) {
            const spotter = parts[0] || '';
            const freqKhz = parts[1] || '';
            const dxCall = parts[2] || '';
            const comment = parts[3] || '';
            const timeDate = parts[4] || ''; // "0610 2026-01-30"
            const band = parts[9] || '';
            
            // Parse frequency (already in kHz, convert to MHz)
            const freqNum = parseFloat(freqKhz);
            if (!isNaN(freqNum) && freqNum > 0 && dxCall) {
              // Convert kHz to MHz for display (7022.0 -> 7.022)
              const freqMhz = (freqNum / 1000).toFixed(3);
              
              // Extract time from "0610 2026-01-30" -> "06:10z"
              let time = '';
              if (timeDate && timeDate.length >= 4) {
                const timeStr = timeDate.substring(0, 4);
                time = timeStr.substring(0, 2) + ':' + timeStr.substring(2, 4) + 'z';
              }
              
              spots.push({
                freq: freqMhz,
                call: dxCall,
                comment: comment + (band ? ' ' + band : ''),
                time: time,
                spotter: spotter
              });
            }
          }
        }
        
        console.log('[DX Cluster] HamQTH parsed spots:', spots.length);
        if (spots.length > 0) {
          console.log('[DX Cluster] HamQTH first spot:', JSON.stringify(spots[0]));
          console.log('[DX Cluster] HamQTH SUCCESS:', spots.length, 'spots');
          return res.json(spots);
        }
      }
    }
  } catch (error) {
    console.error('[DX Cluster] HamQTH error:', error.name, error.message);
  }

  // Source 2: DX Summit
  try {
    console.log('[DX Cluster] Trying DX Summit...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://www.dxsummit.fi/api/v1/spots?limit=25', {
      headers: { 
        'User-Agent': 'OpenHamClock/3.3 (Amateur Radio Dashboard)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    console.log('[DX Cluster] DX Summit status:', response.status);
    if (response.ok) {
      const text = await response.text();
      console.log('[DX Cluster] DX Summit response preview:', text.substring(0, 300));
      
      try {
        const data = JSON.parse(text);
        console.log('[DX Cluster] DX Summit data type:', typeof data, Array.isArray(data) ? 'array len=' + data.length : 'object');
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('[DX Cluster] DX Summit first item:', JSON.stringify(data[0]));
          const spots = data.slice(0, 20).map(spot => ({
            freq: spot.frequency ? String(spot.frequency) : '0.000',
            call: spot.dx_call || spot.dxcall || spot.callsign || 'UNKNOWN',
            comment: spot.info || spot.comment || '',
            time: spot.time ? String(spot.time).substring(0, 5) + 'z' : '',
            spotter: spot.spotter || spot.de || ''
          }));
          console.log('[DX Cluster] DX Summit SUCCESS:', spots.length, 'spots');
          return res.json(spots);
        }
      } catch (parseErr) {
        console.log('[DX Cluster] DX Summit parse error:', parseErr.message);
      }
    }
  } catch (error) {
    console.error('[DX Cluster] DX Summit error:', error.name, error.message);
  }

  // Source 3: DXHeat (backup)
  try {
    console.log('[DX Cluster] Trying DXHeat...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://dxheat.com/dxc/data.php', {
      headers: { 
        'User-Agent': 'OpenHamClock/3.3',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    console.log('[DX Cluster] DXHeat status:', response.status);
    if (response.ok) {
      const text = await response.text();
      console.log('[DX Cluster] DXHeat response preview:', text.substring(0, 300));
      
      try {
        const data = JSON.parse(text);
        const spots = data.spots || data;
        
        if (Array.isArray(spots) && spots.length > 0) {
          const mapped = spots.slice(0, 20).map(spot => ({
            freq: spot.f || spot.frequency || '0.000',
            call: spot.c || spot.dx || spot.callsign || 'UNKNOWN',
            comment: spot.i || spot.info || '',
            time: spot.t ? String(spot.t).substring(11, 16) + 'z' : '',
            spotter: spot.s || spot.spotter || ''
          }));
          console.log('[DX Cluster] DXHeat SUCCESS:', mapped.length, 'spots');
          return res.json(mapped);
        }
      } catch (parseErr) {
        console.log('[DX Cluster] DXHeat parse error:', parseErr.message);
      }
    }
  } catch (error) {
    console.error('[DX Cluster] DXHeat error:', error.name, error.message);
  }

  console.log('[DX Cluster] ========== ALL SOURCES FAILED ==========');
  res.json([]);
});

// ============================================
// CALLSIGN LOOKUP API (for getting location from callsign)
// ============================================

// Simple callsign to grid/location lookup using HamQTH
app.get('/api/callsign/:call', async (req, res) => {
  const callsign = req.params.call.toUpperCase();
  console.log('[Callsign Lookup] Looking up:', callsign);
  
  try {
    // Try HamQTH XML API (no auth needed for basic lookup)
    const response = await fetch(`https://www.hamqth.com/dxcc.php?callsign=${callsign}`);
    if (response.ok) {
      const text = await response.text();
      
      // Parse basic info from response
      const latMatch = text.match(/<lat>([^<]+)<\/lat>/);
      const lonMatch = text.match(/<lng>([^<]+)<\/lng>/);
      const countryMatch = text.match(/<name>([^<]+)<\/name>/);
      const cqMatch = text.match(/<cq>([^<]+)<\/cq>/);
      const ituMatch = text.match(/<itu>([^<]+)<\/itu>/);
      
      if (latMatch && lonMatch) {
        const result = {
          callsign,
          lat: parseFloat(latMatch[1]),
          lon: parseFloat(lonMatch[1]),
          country: countryMatch ? countryMatch[1] : 'Unknown',
          cqZone: cqMatch ? cqMatch[1] : '',
          ituZone: ituMatch ? ituMatch[1] : ''
        };
        console.log('[Callsign Lookup] Found:', result);
        return res.json(result);
      }
    }
    
    // Fallback: estimate location from callsign prefix
    const estimated = estimateLocationFromPrefix(callsign);
    if (estimated) {
      console.log('[Callsign Lookup] Estimated from prefix:', estimated);
      return res.json(estimated);
    }
    
    res.status(404).json({ error: 'Callsign not found' });
  } catch (error) {
    console.error('[Callsign Lookup] Error:', error.message);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// Estimate location from callsign prefix (fallback)
function estimateLocationFromPrefix(callsign) {
  const prefixLocations = {
    'K': { lat: 39.8, lon: -98.5, country: 'USA' },
    'W': { lat: 39.8, lon: -98.5, country: 'USA' },
    'N': { lat: 39.8, lon: -98.5, country: 'USA' },
    'AA': { lat: 39.8, lon: -98.5, country: 'USA' },
    'AB': { lat: 39.8, lon: -98.5, country: 'USA' },
    'VE': { lat: 56.1, lon: -106.3, country: 'Canada' },
    'VA': { lat: 56.1, lon: -106.3, country: 'Canada' },
    'G': { lat: 52.4, lon: -1.5, country: 'England' },
    'M': { lat: 52.4, lon: -1.5, country: 'England' },
    'F': { lat: 46.2, lon: 2.2, country: 'France' },
    'DL': { lat: 51.2, lon: 10.4, country: 'Germany' },
    'DJ': { lat: 51.2, lon: 10.4, country: 'Germany' },
    'DK': { lat: 51.2, lon: 10.4, country: 'Germany' },
    'I': { lat: 41.9, lon: 12.6, country: 'Italy' },
    'JA': { lat: 36.2, lon: 138.3, country: 'Japan' },
    'JH': { lat: 36.2, lon: 138.3, country: 'Japan' },
    'JR': { lat: 36.2, lon: 138.3, country: 'Japan' },
    'VK': { lat: -25.3, lon: 133.8, country: 'Australia' },
    'ZL': { lat: -40.9, lon: 174.9, country: 'New Zealand' },
    'ZS': { lat: -30.6, lon: 22.9, country: 'South Africa' },
    'LU': { lat: -38.4, lon: -63.6, country: 'Argentina' },
    'PY': { lat: -14.2, lon: -51.9, country: 'Brazil' },
    'EA': { lat: 40.5, lon: -3.7, country: 'Spain' },
    'CT': { lat: 39.4, lon: -8.2, country: 'Portugal' },
    'PA': { lat: 52.1, lon: 5.3, country: 'Netherlands' },
    'ON': { lat: 50.5, lon: 4.5, country: 'Belgium' },
    'OZ': { lat: 56.3, lon: 9.5, country: 'Denmark' },
    'SM': { lat: 60.1, lon: 18.6, country: 'Sweden' },
    'LA': { lat: 60.5, lon: 8.5, country: 'Norway' },
    'OH': { lat: 61.9, lon: 25.7, country: 'Finland' },
    'UA': { lat: 61.5, lon: 105.3, country: 'Russia' },
    'RU': { lat: 61.5, lon: 105.3, country: 'Russia' },
    'RA': { lat: 61.5, lon: 105.3, country: 'Russia' },
    'BY': { lat: 35.9, lon: 104.2, country: 'China' },
    'BV': { lat: 23.7, lon: 121.0, country: 'Taiwan' },
    'HL': { lat: 35.9, lon: 127.8, country: 'South Korea' },
    'VU': { lat: 20.6, lon: 79.0, country: 'India' },
    'HS': { lat: 15.9, lon: 100.9, country: 'Thailand' },
    'DU': { lat: 12.9, lon: 121.8, country: 'Philippines' },
    'YB': { lat: -0.8, lon: 113.9, country: 'Indonesia' },
    '9V': { lat: 1.4, lon: 103.8, country: 'Singapore' },
    '9M': { lat: 4.2, lon: 101.9, country: 'Malaysia' }
  };
  
  // Try 2-char prefix first, then 1-char
  const prefix2 = callsign.substring(0, 2);
  const prefix1 = callsign.substring(0, 1);
  
  if (prefixLocations[prefix2]) {
    return { callsign, ...prefixLocations[prefix2], estimated: true };
  }
  if (prefixLocations[prefix1]) {
    return { callsign, ...prefixLocations[prefix1], estimated: true };
  }
  
  return null;
}

// ============================================
// MY SPOTS API - Get spots involving a specific callsign
// ============================================

app.get('/api/myspots/:callsign', async (req, res) => {
  const callsign = req.params.callsign.toUpperCase();
  console.log('[My Spots] Searching for callsign:', callsign);
  
  const mySpots = [];
  
  try {
    // Try HamQTH for spots involving this callsign
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `https://www.hamqth.com/dxc_csv.php?limit=100`,
      {
        headers: { 'User-Agent': 'OpenHamClock/3.3' },
        signal: controller.signal
      }
    );
    clearTimeout(timeout);
    
    if (response.ok) {
      const text = await response.text();
      const lines = text.trim().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('^');
        if (parts.length < 3) continue;
        
        const spotter = parts[0]?.trim().toUpperCase();
        const dxCall = parts[2]?.trim().toUpperCase();
        const freq = parts[1]?.trim();
        const comment = parts[3]?.trim() || '';
        const timeStr = parts[4]?.trim() || '';
        
        // Check if our callsign is involved (as spotter or spotted)
        if (spotter === callsign || dxCall === callsign || 
            spotter.includes(callsign) || dxCall.includes(callsign)) {
          mySpots.push({
            spotter,
            dxCall,
            freq: freq ? (parseFloat(freq) / 1000).toFixed(3) : '0.000',
            comment,
            time: timeStr ? timeStr.substring(0, 5) + 'z' : '',
            isMySpot: spotter.includes(callsign),
            isSpottedMe: dxCall.includes(callsign)
          });
        }
      }
    }
    
    console.log('[My Spots] Found', mySpots.length, 'spots involving', callsign);
    
    // Now try to get locations for each unique callsign
    const uniqueCalls = [...new Set(mySpots.map(s => s.isMySpot ? s.dxCall : s.spotter))];
    const locations = {};
    
    for (const call of uniqueCalls.slice(0, 10)) { // Limit to 10 lookups
      try {
        const loc = estimateLocationFromPrefix(call);
        if (loc) {
          locations[call] = { lat: loc.lat, lon: loc.lon, country: loc.country };
        }
      } catch (e) {
        // Ignore lookup errors
      }
    }
    
    // Add locations to spots
    const spotsWithLocations = mySpots.map(spot => {
      const targetCall = spot.isMySpot ? spot.dxCall : spot.spotter;
      const loc = locations[targetCall];
      return {
        ...spot,
        targetCall,
        lat: loc?.lat,
        lon: loc?.lon,
        country: loc?.country
      };
    }).filter(s => s.lat && s.lon); // Only return spots with valid locations
    
    res.json(spotsWithLocations);
  } catch (error) {
    console.error('[My Spots] Error:', error.message);
    res.json([]);
  }
});

// ============================================
// VOACAP / HF PROPAGATION PREDICTION API
// ============================================

app.get('/api/propagation', async (req, res) => {
  const { deLat, deLon, dxLat, dxLon } = req.query;
  
  console.log('[Propagation] Calculating for DE:', deLat, deLon, 'to DX:', dxLat, dxLon);
  
  try {
    // Get current space weather data for calculations
    let sfi = 150, ssn = 100, kIndex = 2; // Defaults
    
    try {
      const [fluxRes, kRes] = await Promise.allSettled([
        fetch('https://services.swpc.noaa.gov/json/f107_cm_flux.json'),
        fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
      ]);
      
      if (fluxRes.status === 'fulfilled' && fluxRes.value.ok) {
        const data = await fluxRes.value.json();
        if (data?.length) sfi = Math.round(data[data.length - 1].flux || 150);
      }
      if (kRes.status === 'fulfilled' && kRes.value.ok) {
        const data = await kRes.value.json();
        if (data?.length > 1) kIndex = parseInt(data[data.length - 1][1]) || 2;
      }
      // Estimate SSN from SFI: SSN ≈ (SFI - 67) / 0.97
      ssn = Math.max(0, Math.round((sfi - 67) / 0.97));
    } catch (e) {
      console.log('[Propagation] Using default solar values');
    }
    
    console.log('[Propagation] Solar data - SFI:', sfi, 'SSN:', ssn, 'K:', kIndex);
    
    // Calculate distance and bearing
    const de = { lat: parseFloat(deLat) || 40, lon: parseFloat(deLon) || -75 };
    const dx = { lat: parseFloat(dxLat) || 35, lon: parseFloat(dxLon) || 139 };
    
    const distance = calculateDistance(de.lat, de.lon, dx.lat, dx.lon);
    const midLat = (de.lat + dx.lat) / 2;
    
    console.log('[Propagation] Distance:', Math.round(distance), 'km, MidLat:', midLat.toFixed(1));
    
    // Calculate propagation for each band at each hour
    const bands = ['160m', '80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m'];
    const bandFreqs = [1.8, 3.5, 7, 10, 14, 18, 21, 24, 28, 50]; // MHz
    const currentHour = new Date().getUTCHours();
    
    // Generate 24-hour predictions
    const predictions = {};
    
    bands.forEach((band, idx) => {
      const freq = bandFreqs[idx];
      predictions[band] = [];
      
      for (let hour = 0; hour < 24; hour++) {
        const reliability = calculateBandReliability(
          freq, distance, midLat, hour, sfi, ssn, kIndex, de, dx
        );
        predictions[band].push({
          hour,
          reliability: Math.round(reliability),
          snr: calculateSNR(reliability)
        });
      }
    });
    
    // Get current best bands
    const currentBands = bands.map((band, idx) => ({
      band,
      freq: bandFreqs[idx],
      reliability: predictions[band][currentHour].reliability,
      snr: predictions[band][currentHour].snr,
      status: getStatus(predictions[band][currentHour].reliability)
    })).sort((a, b) => b.reliability - a.reliability);
    
    res.json({
      solarData: { sfi, ssn, kIndex },
      distance: Math.round(distance),
      currentHour,
      currentBands,
      hourlyPredictions: predictions
    });
    
  } catch (error) {
    console.error('[Propagation] Error:', error.message);
    res.status(500).json({ error: 'Failed to calculate propagation' });
  }
});

// Calculate great circle distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Calculate band reliability percentage (simplified VOACAP-style)
function calculateBandReliability(freq, distance, midLat, hour, sfi, ssn, kIndex, de, dx) {
  // Maximum Usable Frequency estimation
  // MUF ≈ criticalFreq * secant(zenith angle) * sqrt(1 + distance/4000)
  
  // Critical frequency varies with solar activity and time
  // foF2 ≈ 0.85 * sqrt(ssn + 12) * (1 + 0.3 * cos(hour * PI / 12))
  const hourFactor = 1 + 0.4 * Math.cos((hour - 12) * Math.PI / 12);
  const foF2 = 0.9 * Math.sqrt(ssn + 15) * hourFactor;
  
  // Distance factor (longer paths need lower angles, higher MUF)
  const distFactor = Math.sqrt(1 + distance / 3500);
  
  // Latitude factor (higher latitudes = more absorption, lower MUF)
  const latFactor = 1 - Math.abs(midLat) / 200;
  
  // Estimated MUF
  const muf = foF2 * distFactor * latFactor * 3.5;
  
  // Lowest Usable Frequency (absorption limit)
  // LUF increases with solar activity and during daytime
  const dayNight = isDaytime(hour, (de.lon + dx.lon) / 2) ? 1.5 : 0.5;
  const luf = 2 + (sfi / 100) * dayNight + kIndex * 0.5;
  
  // Calculate reliability based on frequency vs MUF/LUF
  let reliability = 0;
  
  if (freq > muf) {
    // Frequency above MUF - poor propagation
    reliability = Math.max(0, 50 - (freq - muf) * 10);
  } else if (freq < luf) {
    // Frequency below LUF - too much absorption
    reliability = Math.max(0, 50 - (luf - freq) * 15);
  } else {
    // Frequency in usable range
    const midFreq = (muf + luf) / 2;
    const optimalness = 1 - Math.abs(freq - midFreq) / (muf - luf);
    reliability = 50 + optimalness * 45;
  }
  
  // K-index degradation (geomagnetic storms)
  if (kIndex >= 5) reliability *= 0.3;
  else if (kIndex >= 4) reliability *= 0.6;
  else if (kIndex >= 3) reliability *= 0.8;
  
  // Distance adjustment - very long paths are harder
  if (distance > 15000) reliability *= 0.7;
  else if (distance > 10000) reliability *= 0.85;
  
  // High bands need higher solar activity
  if (freq >= 21 && sfi < 100) reliability *= (sfi / 100);
  if (freq >= 28 && sfi < 120) reliability *= (sfi / 120);
  
  return Math.min(99, Math.max(0, reliability));
}

// Check if it's daytime at given longitude
function isDaytime(utcHour, longitude) {
  const localHour = (utcHour + longitude / 15 + 24) % 24;
  return localHour >= 6 && localHour <= 18;
}

// Convert reliability to estimated SNR
function calculateSNR(reliability) {
  if (reliability >= 80) return '+20dB';
  if (reliability >= 60) return '+10dB';
  if (reliability >= 40) return '0dB';
  if (reliability >= 20) return '-10dB';
  return '-20dB';
}

// Get status label from reliability
function getStatus(reliability) {
  if (reliability >= 70) return 'EXCELLENT';
  if (reliability >= 50) return 'GOOD';
  if (reliability >= 30) return 'FAIR';
  if (reliability >= 15) return 'POOR';
  return 'CLOSED';
}

// QRZ Callsign lookup (requires API key)
app.get('/api/qrz/lookup/:callsign', async (req, res) => {
  const { callsign } = req.params;
  // Note: QRZ requires an API key - this is a placeholder
  res.json({ 
    message: 'QRZ lookup requires API key configuration',
    callsign: callsign.toUpperCase()
  });
});

// ============================================
// CONTEST CALENDAR API
// ============================================

app.get('/api/contests', async (req, res) => {
  console.log('[Contests] Fetching contest calendar...');
  
  // Try WA7BNM Contest Calendar API
  try {
    const response = await fetch('https://www.contestcalendar.com/contestcal.json', {
      headers: { 
        'User-Agent': 'OpenHamClock/3.3',
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Contests] WA7BNM returned', data.length, 'contests');
      
      const now = new Date();
      const contests = data
        .filter(c => new Date(c.end) > now) // Only future/active
        .slice(0, 20)
        .map(c => {
          const startDate = new Date(c.start);
          const endDate = new Date(c.end);
          let status = 'upcoming';
          if (now >= startDate && now <= endDate) {
            status = 'active';
          }
          
          return {
            name: c.name || c.contest,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            mode: c.mode || 'Mixed',
            status: status,
            url: c.url || null
          };
        });
      
      return res.json(contests);
    }
  } catch (error) {
    console.error('[Contests] WA7BNM error:', error.message);
  }

  // Fallback: Calculate known recurring contests
  try {
    const contests = calculateUpcomingContests();
    console.log('[Contests] Using calculated contests:', contests.length);
    return res.json(contests);
  } catch (error) {
    console.error('[Contests] Calculation error:', error.message);
  }

  res.json([]);
});

// Helper function to calculate upcoming contests
function calculateUpcomingContests() {
  const now = new Date();
  const contests = [];
  
  // Major contest definitions with typical schedules
  const majorContests = [
    { name: 'CQ WW DX CW', month: 10, weekend: -1, duration: 48, mode: 'CW' }, // Last full weekend Nov
    { name: 'CQ WW DX SSB', month: 9, weekend: -1, duration: 48, mode: 'SSB' }, // Last full weekend Oct
    { name: 'ARRL DX CW', month: 1, weekend: 3, duration: 48, mode: 'CW' }, // 3rd full weekend Feb
    { name: 'ARRL DX SSB', month: 2, weekend: 1, duration: 48, mode: 'SSB' }, // 1st full weekend Mar
    { name: 'CQ WPX SSB', month: 2, weekend: -1, duration: 48, mode: 'SSB' }, // Last full weekend Mar
    { name: 'CQ WPX CW', month: 4, weekend: -1, duration: 48, mode: 'CW' }, // Last full weekend May
    { name: 'IARU HF Championship', month: 6, weekend: 2, duration: 24, mode: 'Mixed' }, // 2nd full weekend Jul
    { name: 'ARRL Field Day', month: 5, weekend: 4, duration: 27, mode: 'Mixed' }, // 4th full weekend Jun
    { name: 'ARRL Sweepstakes CW', month: 10, weekend: 1, duration: 24, mode: 'CW' }, // 1st full weekend Nov
    { name: 'ARRL Sweepstakes SSB', month: 10, weekend: 3, duration: 24, mode: 'SSB' }, // 3rd full weekend Nov
    { name: 'ARRL 10m Contest', month: 11, weekend: 2, duration: 48, mode: 'Mixed' }, // 2nd full weekend Dec
    { name: 'ARRL RTTY Roundup', month: 0, weekend: 1, duration: 24, mode: 'RTTY' }, // 1st full weekend Jan
    { name: 'NA QSO Party CW', month: 0, weekend: 2, duration: 12, mode: 'CW' },
    { name: 'NA QSO Party SSB', month: 0, weekend: 3, duration: 12, mode: 'SSB' },
    { name: 'CQ 160m CW', month: 0, weekend: -1, duration: 42, mode: 'CW' },
    { name: 'CQ WW RTTY', month: 8, weekend: -1, duration: 48, mode: 'RTTY' },
    { name: 'JIDX CW', month: 3, weekend: 2, duration: 48, mode: 'CW' },
    { name: 'JIDX SSB', month: 10, weekend: 2, duration: 48, mode: 'SSB' },
  ];

  // Weekly mini-contests (CWT, SST, etc.)
  const weeklyContests = [
    { name: 'CWT 1300z', dayOfWeek: 3, hour: 13, duration: 1, mode: 'CW' },
    { name: 'CWT 1900z', dayOfWeek: 3, hour: 19, duration: 1, mode: 'CW' },
    { name: 'CWT 0300z', dayOfWeek: 4, hour: 3, duration: 1, mode: 'CW' },
    { name: 'NCCC Sprint', dayOfWeek: 5, hour: 3, minute: 30, duration: 0.5, mode: 'CW' },
    { name: 'K1USN SST', dayOfWeek: 0, hour: 0, duration: 1, mode: 'CW' },
    { name: 'ICWC MST', dayOfWeek: 1, hour: 13, duration: 1, mode: 'CW' },
  ];

  // Calculate next occurrences of weekly contests
  weeklyContests.forEach(contest => {
    const next = new Date(now);
    const currentDay = now.getUTCDay();
    let daysUntil = contest.dayOfWeek - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    if (daysUntil === 0) {
      // Check if it's today but already passed
      const todayStart = new Date(now);
      todayStart.setUTCHours(contest.hour, contest.minute || 0, 0, 0);
      if (now > todayStart) daysUntil = 7;
    }
    
    next.setUTCDate(now.getUTCDate() + daysUntil);
    next.setUTCHours(contest.hour, contest.minute || 0, 0, 0);
    
    const endTime = new Date(next.getTime() + contest.duration * 3600000);
    
    contests.push({
      name: contest.name,
      start: next.toISOString(),
      end: endTime.toISOString(),
      mode: contest.mode,
      status: (now >= next && now <= endTime) ? 'active' : 'upcoming'
    });
  });

  // Calculate next occurrences of major contests
  const year = now.getFullYear();
  majorContests.forEach(contest => {
    for (let y = year; y <= year + 1; y++) {
      let startDate;
      
      if (contest.weekend === -1) {
        // Last weekend of month
        startDate = getLastWeekendOfMonth(y, contest.month);
      } else {
        // Nth weekend of month
        startDate = getNthWeekendOfMonth(y, contest.month, contest.weekend);
      }
      
      // Most contests start at 00:00 UTC Saturday
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(startDate.getTime() + contest.duration * 3600000);
      
      if (endDate > now) {
        const status = (now >= startDate && now <= endDate) ? 'active' : 'upcoming';
        contests.push({
          name: contest.name,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          mode: contest.mode,
          status: status
        });
        break; // Only add next occurrence
      }
    }
  });

  // Sort by start date
  contests.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  return contests.slice(0, 15);
}

function getNthWeekendOfMonth(year, month, n) {
  const date = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  let weekendCount = 0;
  
  while (date.getUTCMonth() === month) {
    if (date.getUTCDay() === 6) { // Saturday
      weekendCount++;
      if (weekendCount === n) return new Date(date);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  
  return date;
}

function getLastWeekendOfMonth(year, month) {
  // Start from last day of month and work backwards
  const date = new Date(Date.UTC(year, month + 1, 0)); // Last day of month
  
  while (date.getUTCDay() !== 6) { // Find last Saturday
    date.setUTCDate(date.getUTCDate() - 1);
  }
  
  return date;
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.3.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// CONFIGURATION ENDPOINT
// ============================================

app.get('/api/config', (req, res) => {
  res.json({
    version: '3.0.0',
    features: {
      spaceWeather: true,
      pota: true,
      sota: true,
      dxCluster: true,
      satellites: false, // Coming soon
      contests: false    // Coming soon
    },
    refreshIntervals: {
      spaceWeather: 300000,
      pota: 60000,
      sota: 60000,
      dxCluster: 30000
    }
  });
});

// ============================================
// CATCH-ALL FOR SPA
// ============================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   ██████╗ ██████╗ ███████╗███╗   ██╗                  ║');
  console.log('║  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║                  ║');
  console.log('║  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║                  ║');
  console.log('║  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║                  ║');
  console.log('║  ╚██████╔╝██║     ███████╗██║ ╚████║                  ║');
  console.log('║   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝                  ║');
  console.log('║                                                       ║');
  console.log('║  ██╗  ██╗ █████╗ ███╗   ███╗ ██████╗██╗      ██╗  ██╗ ║');
  console.log('║  ██║  ██║██╔══██╗████╗ ████║██╔════╝██║      ██║ ██╔╝ ║');
  console.log('║  ███████║███████║██╔████╔██║██║     ██║      █████╔╝  ║');
  console.log('║  ██╔══██║██╔══██║██║╚██╔╝██║██║     ██║      ██╔═██╗  ║');
  console.log('║  ██║  ██║██║  ██║██║ ╚═╝ ██║╚██████╗███████╗██║  ██╗ ║');
  console.log('║  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  🌐 Server running at http://localhost:${PORT}`);
  console.log('  📡 API proxy enabled for NOAA, POTA, SOTA, DX Cluster');
  console.log('  🖥️  Open your browser to start using OpenHamClock');
  console.log('');
  console.log('  In memory of Elwood Downey, WB0OEW');
  console.log('  73 de OpenHamClock contributors');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
