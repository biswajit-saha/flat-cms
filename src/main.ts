import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

if (!window.location.hash || window.location.hash === '#') {
    // Replace the current history entry with the hash root
    history.replaceState(null, '', '#/');
}

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
