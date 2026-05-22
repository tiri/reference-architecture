// Module Federation requires an async boundary so shared dependencies (react, react-dom)
// are negotiated before the app mounts. Import bootstrap dynamically instead of rendering here.
import('./bootstrap');
