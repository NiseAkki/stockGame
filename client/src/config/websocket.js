const WS_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'ws://localhost:8080'
    : `ws://${window.location.hostname}:8080`
};

export default WS_CONFIG; 