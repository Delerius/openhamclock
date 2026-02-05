/**
 * Lightning Widget Component
 * Displays lightning detection status in the header nav bar
 */
import React, { useState, useEffect } from 'react';

export const LightningWidget = ({ stationLat, stationLon }) => {
  const [lightningData, setLightningData] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [closestStrike, setClosestStrike] = useState(null);
  const [lastStrikeTime, setLastStrikeTime] = useState(null);
  const [timeSinceStrike, setTimeSinceStrike] = useState('0 min');
  
  const STRIKE_RADIUS_MILES = 25;
  const STRIKE_RADIUS_KM = STRIKE_RADIUS_MILES * 1.60934;
  
  // Poll for lightning data from global reference
  useEffect(() => {
    const pollData = () => {
      if (window.hamclockLightningData) {
        setLightningData(window.hamclockLightningData.data || []);
        setEnabled(window.hamclockLightningData.enabled || false);
      }
    };
    
    // Poll every second
    const interval = setInterval(pollData, 1000);
    pollData(); // Initial poll
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate distance in miles
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3963.1; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  // Format time since strike
  const formatTimeSince = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} min`;
    return '0 min';
  };
  
  // Find closest strike within radius
  useEffect(() => {
    if (!enabled || !stationLat || !stationLon || lightningData.length === 0) {
      return;
    }
    
    let closest = null;
    let minDistance = STRIKE_RADIUS_MILES;
    
    lightningData.forEach(strike => {
      const distance = calculateDistance(stationLat, stationLon, strike.lat, strike.lon);
      if (distance <= STRIKE_RADIUS_MILES && distance < minDistance) {
        minDistance = distance;
        closest = {
          distance: distance,
          timestamp: strike.timestamp,
          ...strike
        };
      }
    });
    
    if (closest) {
      setClosestStrike(closest);
      setLastStrikeTime(closest.timestamp);
    }
  }, [lightningData, stationLat, stationLon, enabled]);
  
  // Update timer every second
  useEffect(() => {
    if (!lastStrikeTime) return;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastStrikeTime;
      setTimeSinceStrike(formatTimeSince(elapsed));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lastStrikeTime]);
  
  if (!enabled) return null;
  
  const hasRecentStrike = closestStrike !== null;
  const displayDistance = hasRecentStrike 
    ? `${Math.round(closestStrike.distance)}` 
    : `${STRIKE_RADIUS_MILES}`;
  
  const boltColor = hasRecentStrike ? '#ff0000' : '#00ff00';
  const textColor = hasRecentStrike ? 'var(--accent-red)' : 'var(--accent-green)';
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        fontSize: '13px',
        fontFamily: 'JetBrains Mono, monospace',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
      title={hasRecentStrike 
        ? `Lightning strike ${Math.round(closestStrike.distance)} mi away, ${timeSinceStrike} ago`
        : `No strikes within ${STRIKE_RADIUS_MILES} miles`
      }
    >
      <span style={{ 
        fontSize: '16px',
        color: boltColor,
        filter: hasRecentStrike ? 'drop-shadow(0 0 3px rgba(255,0,0,0.8))' : 'drop-shadow(0 0 3px rgba(0,255,0,0.6))'
      }}>
        ⚡
      </span>
      <span style={{ 
        color: textColor,
        fontWeight: '700',
        fontSize: '13px'
      }}>
        {displayDistance}
      </span>
      <span style={{ 
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        mi
      </span>
      <span style={{ 
        fontSize: '11px',
        color: 'var(--text-muted)',
        marginLeft: '2px'
      }}>
        {timeSinceStrike}
      </span>
    </div>
  );
};

export default LightningWidget;
