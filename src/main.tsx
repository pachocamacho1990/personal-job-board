import React from 'react';
import { createRoot } from 'react-dom/client';

// Carbon token engine. Imported here, before ./App, so it lands first in the
// bundled CSS and the page stylesheets pulled in by App can override it.
// This is the only place it should ever be imported.
import './styles/theme.css';

import { App } from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
