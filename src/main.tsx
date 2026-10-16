import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/vietnamese-400.css';
import '@fontsource/inter/vietnamese-600.css';
import '@fontsource/roboto-mono/500.css';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
