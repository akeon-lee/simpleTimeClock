/**
 *  Preload.js script to load all neccessary imports before the renderer is loaded.
 *  We add global modules from the main processes to which the renderer can access,
 *  such as `ipcRenderer` and Class variations. We can also add global variables.
 */

import { test } from '../lib/data';

window.main = {
    test: test
}
