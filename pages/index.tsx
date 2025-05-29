import React from 'react';
import MapAtCurrentLocation from '../components/mapCurrentLocation';

const HomePage: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapAtCurrentLocation />
    </div>
  );
};

export default HomePage;