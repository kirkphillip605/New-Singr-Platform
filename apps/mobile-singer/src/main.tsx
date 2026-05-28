import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

// Import Framework7 React plugin and bundle styles
import Framework7 from 'framework7/lite-bundle';
import Framework7React from 'framework7-react';
import 'framework7/css/bundle';

// Import shared styles
import '@singr/ui/styles';
import './css/app.css';

// Initialize Framework7 React plugin
Framework7.use(Framework7React);

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
