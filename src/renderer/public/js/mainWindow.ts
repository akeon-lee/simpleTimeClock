// Import dependencies
import * as fs from 'fs';
import * as path from 'path';
import * as electron from 'electron';

const { app, remote } = electron;

type Data = {
  baseDir: string,
  create: Function,
  read: Function,
  update: Function,
  delete: Function,
  list: Function
}
const lib = <Data>{};

// Getting path to persist data. Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
const userDataPath = (app || remote.app).getPath('userData');

// Base directory of the data folder
lib.baseDir = path.join(userDataPath, '/');
// Read data from a file
lib.read = (dir, file): Promise<object> => {
  return new Promise((resolve, reject) => {
    fs.readFile(`${lib.baseDir + dir}/${file}.json`, 'utf-8', (error, data) => {
      if(!error && data) {
        const parsedData = JSON.parse(data);
        resolve(parsedData);
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
    fs.open(`${lib.baseDir + dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
      if(!err && fileDescriptor) {
        // Convert data to a string
        const stringData = JSON.stringify(data);

        // Truncate the contents of the file
        fs.ftruncate(fileDescriptor, (err) => {
          if(err) {
            reject({ error: 'Error truncating file' });
          }

          // Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, (err) => {
            if(err) {
              reject({ error: 'Error writing to existing file' });
            }

            fs.close(fileDescriptor, (err) => {
              if(err) {
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

/**
 * Function to display notifications
 * 
 * @param data - The data such as type (success, info, warning or error), header and message being passed in as an object
 * 
 */
function displayNotifications(data) {
  const notificationBox = document.querySelector('.notification-container');
  interface Notification {
    class: string,
    header: string,
    message: string
  }
  const notify = <Notification>{};

  let notifyClass;
  if(data.type === 'error') {
    notifyClass = 'negative';
  } else if(data.type === 'success') {
    notifyClass = 'success';
  }

  // Contruct the notification box depending on the type passed in
  const notificationElement = `
    <div class="ui ${notifyClass} message">
      <i class="close icon"></i>
      <div class="header">
        ${data.header}
      </div>
      <p>
        ${data.message}
      </p>
    </div>
    <div class="ui divider"></div>
  `;
  
  // Insert notification element into html each time it is called
  notificationBox.innerHTML = notificationElement;

  const messageBox = notificationBox.querySelector('.message');
  const divider = notificationBox.querySelector('.divider');

  // Remove notification when x (close) is pressed
  notificationBox.querySelector('.close').addEventListener('click', () => {
    messageBox.remove();
    divider.remove();
  });

  // Remove notifiaction on double click
  document.addEventListener('dblclick', () => {
    if(messageBox) {
      messageBox.remove();
      divider.remove();
    }
  });
}

/**
 * Main Window
 * @overview: All the log that has to do with the main window.
 * 
 */

// The element to load the clock in
const loadClock: HTMLElement = document.querySelector('.loadClock');

/** 
 * The function to create the clock and display it
 * @param: `ele` - The element you want to display the clock
 *         `timestamp` - A boolean value whether to return current time or not.
 * 
 */
function timeClock(ele: HTMLElement, timestamp: boolean = false): string | void {
  const today: Date = new Date();
  const ampm: string = today.getHours() < 12 ? 'am' : 'pm';
  let h: number = today.getHours() % 12 || 12;
  let m: number = today.getMinutes();
  let s: number = today.getSeconds();
  m = checkNum(m);
  s = checkNum(s);
  if(timestamp) {
    return `${h}:${m}:${s} ${ampm}`;
  } else {
    ele.innerHTML = `${h}:${m}:<span class="seconds">${s} ${ampm}</span>`;
    const t = setTimeout(timeClock.bind(this, ele), 500);
  }
}

// Function to add 0 to decimals less than 10
function checkNum(i): number { if(i < 10) { i = '0' + i; } return i; };
timeClock((<HTMLElement>loadClock));

// Grab the clock in and out buttons
const clockIn: HTMLElement = document.querySelector('.clockIn');
const clockOut: HTMLElement = document.querySelector('.clockOut');
const userID: HTMLInputElement = document.querySelector('.userID');

// Add the session to the user. Input clocked in time & date
clockIn.addEventListener('click', (e) => {
  lib.read('users', userID.value)
    .then(user => {
      // Build todays date
      const date: Date = new Date();
      let m: number = date.getMonth() + 1, d: number = date.getDate(), y: number = date.getFullYear();
      const today: string = m.toString() + '-' + checkNum(d).toString() + '-' + y.toString();
      // Check to see if the user is clocked in
      if(user.session.status) {
        const notifyData = {
          type: 'error',
          header: 'Clock In Error', 
          message: 'A session is currently active, please rememeber to clock out.' 
        };
        displayNotifications(notifyData);
        return { error: 'A session is currently active, please rememeber to clock out.' };
      }
      // Push a new session to the data array and set the session status to true
      user.data.push({
          inDate: today,
          clockIn: timeClock(null, true),
          outDate: '',
          clockOut: '',
          notes: []
        });
      user.session.status = true;
      
      // Notification box
      const notifyData = {
        type: 'success',
        header: 'Clock In Success', 
        message: 'You are now clocked in.' 
      };
      displayNotifications(notifyData);

      return lib.update('users', userID.value, user);
    })
    .then(result => {
      console.log(result);
    })
  .catch(e => {
    // Notification box
    const notifyData = {
      type: 'error',
      header: 'File System Error', 
      message: e.error
    };
    displayNotifications(notifyData);

    console.error(e)
  });
});

// Add the session to the user. Input clocked out time & date
clockOut.addEventListener('click', (e) => {
  lib.read('users', userID.value)
    .then(user => {
      // Build todays date
      const date: Date = new Date();
      let m: number = date.getMonth() + 1, d: number = date.getDate(), y: number = date.getFullYear();
      const today: string = m.toString() + '-' + checkNum(d).toString() + '-' + y.toString();
      // Check to see if the user is clocked in
      if(!user.session.status) {
        // Notification box for errors
        const notifyData = {
          type: 'error',
          header: 'Clock Out Error', 
          message: 'There is no session active, please rememeber to clock in.' 
        };
        displayNotifications(notifyData);
        return { error: 'There is no session active, please rememeber to clock in.' };
      }
      // Loop through the data array to see which session does not have a clockout
      for(const data of user.data) {
        if(data.outDate === '' && data.clockOut === '') {
          data.outDate = today;
          data.clockOut = timeClock(null, true);
        }
      }
      user.session.status = false;

      // Notification box for success
      const notifyData = {
        type: 'success',
        header: 'Clock Out Success', 
        message: 'You are now clocked out.' 
      };
      displayNotifications(notifyData);

      return lib.update('users', userID.value, user);
    })
    .then(result => {
      console.log(result);
    })
  .catch(e => {
    // Notification box
    const notifyData = {
      type: 'error',
      header: 'File System Error', 
      message: e.error 
    };
    displayNotifications(notifyData);
    
    console.error(e)
  });
});

// Grab the form that holds the input and grab the input as well
const notes: HTMLFormElement = document.querySelector('.notes');
const addNotes: HTMLInputElement = document.querySelector('.addNotes');

notes.addEventListener('submit', (e) => {
  e.preventDefault();
  lib.read('users', userID.value)
    .then(user => {
      if(!user.session.status) {
        // Notification box for error
        const notifyData = {
          type: 'error',
          header: 'Notes Error', 
          message: 'Can not add note because there is no session active, please rememeber to clock in.' 
        };
        displayNotifications(notifyData);
        return { error: 'Can not add notes because there is no session active, please rememeber to clock in.' };
      }

      // Loop through the data array to find the current active session to put in the notes
      for(const data of user.data) {
        if(data.outDate === '' && data.clockOut === '') {
          data.notes.push({
            note: addNotes.value,
            time: timeClock(null, true)
          });
        }
      }
      // Notification box for error
      const notifyData = {
        type: 'success',
        header: 'Notes Success', 
        message: 'Your note has been added to your session.' 
      };
      displayNotifications(notifyData);
      return lib.update('users', userID.value, user);
    })
    .then(result => {
      console.log(result);
      addNotes.value = '';
    })
  .catch(e => {
    // Notification box
    const notifyData = {
      type: 'error',
      header: 'File System Error', 
      message: e.error 
    };
    displayNotifications(notifyData);

    console.error(e);
  });
});
