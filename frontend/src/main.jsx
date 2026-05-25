import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/variables.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/buttons.css';
import './styles/stats.css';
import './styles/routines.css';
import './styles/sessions.css';
import './styles/progress.css';
import './styles/exercises.css';
import './styles/athletes.css';
import './styles/planification.css';
import './styles/modals.css';
import './styles/forms.css';
import './styles/empty.css';
import './styles/toast.css';
import './styles/responsive.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
