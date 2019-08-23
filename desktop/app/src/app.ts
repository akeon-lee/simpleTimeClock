// Import dependencies
import electron, { app, BrowserWindow, Menu } from 'electron';
import url from 'url';
import path from 'path';

// Set ENV - production || development
process.env.NODE_ENV = 'development';

// Create var for windows in app
let mainWindow: BrowserWindow;
let manageUsers: BrowserWindow;
let settings: BrowserWindow;

// Listen for the app to be ready
app.on('ready', () => {
    // Create new window
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            // nodeIntegration: false,
            // nodeIntegrationInWorker: false,
            preload: path.join(__dirname, './utils/preload.js'),
            // contextIsolation: false,
            // sandbox: false
        }
    });

    // Load the html file into the window
    (<any>mainWindow).loadURL(url.format({
        pathname: path.join(__dirname, '../views/timeclock.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Quit entire app when closed
    (<any>mainWindow).on('closed', () => {
        app.quit();
    });

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert the menu
    Menu.setApplicationMenu(mainMenu);
});

// Handle manage users window
function createManageUsersWindow() {
    // Create new window
    manageUsers = new BrowserWindow({
        width: 980,
        height: 600,
        title: 'Add A User'
    });
    // Load the html file into the window
    (<any>manageUsers).loadURL(url.format({
        pathname: path.join(__dirname, '../views/manageUsers.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Handle garbage collection
    (<any>manageUsers).on('closed', () => {
        manageUsers = null;
    });
}

// Handle settings window
function createSettingsWindow() {
    // Create new window
    settings = new BrowserWindow({
        width: 700,
        height: 500,
        title: 'Settings'
    });
    // Load the html file
    (<any>settings).loadURL(url.format({
        pathname: path.join(__dirname, '../views/settings.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Garbage collection
    (<any>settings).on('closed', () => {
        settings = null;
    });
}

// Create menu template
const mainMenuTemplate: Array<object> = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Manage Users',
                accelerator: process.platform === 'darwin' ? 'Command+Shift+A' : 'Ctrl+Shift+A',
                click() {
                    createManageUsersWindow();
                }
            },
            {
                label: 'Settings',
                accelerator: process.platform === 'darwin' ? 'Command+,' : 'Ctrl+,',
                click() {
                    createSettingsWindow();
                }
            },
            {
                label: 'Quit',
                accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click() {
                    app.quit();
                }
            },
        ]
    }
];

// If on mac then add empty object to menu
if (process.platform === 'darwin') {
    mainMenuTemplate.unshift({});
}

// Add dev tools if in dev env
if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Dev Tools',
        submenu: [
            {
                label: 'Toggle Dev Tools',
                accelerator: process.platform === 'darwin' ? 'Command+Shift+I' : 'Ctrl+Shift+I',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}
