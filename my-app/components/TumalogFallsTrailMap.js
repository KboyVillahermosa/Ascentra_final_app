import React from 'react';
import TrailMapComponent from './TrailMapComponent';

const routes = [
  {
    id: 1,
    name: 'Main Trail',
    difficulty: 'Easy' as const,
    duration: '1-2 hours',
    distance: '2 km',
    description:
      'Easy trail to Tumalog Falls with beautiful curtain-like waterfall.',
    highlights: ['Curtain waterfall', 'Swimming area', 'Photo opportunities'],
  },
];

interface TumalogFallsTrailMapProps {
  onRouteSelect?: (route: any) => void;
  selectedRoute?: any;
}

const TumalogFallsTrailMap: React.FC<TumalogFallsTrailMapProps> = ({ 
  onRouteSelect, 
  selectedRoute 
}) => {
  return (
    <TrailMapComponent
      title="Tumalog Falls Trail Map"
      location="Oslob, Cebu"
      icon="🏞️"
      routes={routes}
      onRouteSelect={onRouteSelect}
      selectedRoute={selectedRoute}
    />
  );
};

export default TumalogFallsTrailMap;
