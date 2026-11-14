import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { keepBarsWithScheme } from './plugins/systemBars';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

// For the life of the app: the bar icons follow the phone's light or dark.
keepBarsWithScheme();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
