import * as electron from 'electron';
const { dialog } = electron.remote;
import * as path from 'path';
import * as fs from 'fs';

const { app, remote } = electron;

/**
 * File system library.
 * 
 * @todo - When importing module bug is fixed make a single library to be included in all files that needs it
 */

type Data = {
  baseDir: string,
  create: Function,
  read: Function,
  update: Function
}
const lib = <Data>{};

// Getting path to persist data. Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
const userDataPath = (app || remote.app).getPath('userData');

// Base directory of the data folder
lib.baseDir = path.join(userDataPath, '/');

// Write data to the file
lib.create = (dir, file, data): Promise<object> => {
  return new Promise((resolve, reject) => {
    // Open the file for writing
    fs.open(`${lib.baseDir + dir}/${file}.json`, 'wx', (error, fileDescriptor) => {
      if(!error && fileDescriptor) {
        // Convert the data to a string
        const stringData = JSON.stringify(data);
  
        // Write to file and close it
        fs.writeFile(fileDescriptor, stringData, (error) => {
          if(error) {
            reject({ error: 'Error writing to file' });
          }
  
          fs.close(fileDescriptor, (error) => {
            if(error) {
              reject({ error: 'Error closing new file' });
            }
            resolve({ success: 'The user has been created' });
          });
        });
      } else {
        reject({ error:'Could not create new file, it may already exist' });
      }
    });
  });
}

// Read data from a file
lib.read = (dir, file): Promise<object> => {
  return new Promise((resolve, reject) => {
    fs.readFile(`${lib.baseDir + dir}/${file}.json`, 'utf-8', (error, data) => {
      if(!error && data) {
        const parsedData = JSON.parse(data);
        resolve({ parsedData });
      } else {
        reject({ error });
      }
    });
  });
}

// Update data from an existing file
lib.update = (dir, file, data): Promise<object> => {
  return new Promise((resolve, reject) => {
    // Open the file for writing
    fs.open(`${lib.baseDir + dir}/${file}.json`, 'r+', (error, fileDescriptor) => {
      if(!error && fileDescriptor) {
        // Convert data to a string
        const stringData = JSON.stringify(data);

        // Truncate the contents of the file
        fs.ftruncate(fileDescriptor, (error) => {
          if(error) {
            reject({ error: 'Error truncating file' });
          }

          // Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, (error) => {
            if(error) {
              reject({ error: 'Error writing to existing file' });
            }

            fs.close(fileDescriptor, (error) => {
              if(error) {
                reject({ error: 'Error with closing existing file' });
              }
              resolve({ success: 'File has been updated' });
            });
          });
        });
      } else {
        reject({ error: 'Could not open the file for writing, it may not exist yet' })
      }
    });
  });
}

// Functions to be performed as soon as the window content is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Select the data path input and read from the settings.json file inside .data
  const saveDataPathInput: HTMLInputElement = document.querySelector('#saveDataPath');
  const adminAccess: HTMLInputElement = document.querySelector('#adminAccess');

  // If the settings file does not exist
  if(!fs.existsSync(lib.baseDir + 'settings.json')) {
    lib.create('', 'settings', { restrictAdminAccess: 'true' });
  }

  const saveDataPath = await lib.read('', 'settings');
  const path = saveDataPath.parsedData;

  // Set the input to the saved data path
  saveDataPathInput.value = path.saveDataPath;
  path.restrictAdminAccess === 'true' ? adminAccess.checked = true : adminAccess.checked = false;
  
  // Select the path label and display or hide it depending on the value
  const pathLabel: HTMLElement = document.querySelector('.pathLabel');
  if(saveDataPathInput.value === '') {
    pathLabel.style.display = 'inline-block';
  }
});

// Function to choose the path for where data will be saved
async function chooseSaveDataPath(): Promise<void> {
  const saveDataPathInput: HTMLInputElement = document.querySelector('#saveDataPath');
  // Create a settings object to update the settings.json file
  const currentSetting = await lib.read('', 'settings');
  const settingsObject = currentSetting.parsedData;

  // Open the select directory dialog
  const path: Array<string> = dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  // Set the input and settingsObject with the new selected directory path
  saveDataPathInput.value = path[0];
  settingsObject.saveDataPath = path[0];

  // Update the settings.json file
  lib.update('', 'settings', settingsObject);
}

// Toggle on and off
async function toggleSwitch(element) {
  element.checked ? element.value = true : element.value = false;

  const currentSetting = await lib.read('', 'settings');
  const parsedSetting = currentSetting.parsedData;

  parsedSetting['restrictAdminAccess'] = element.value;

  await lib.update('', 'settings', parsedSetting);
}
