import '@fontsource-variable/fraunces';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import './styles.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
