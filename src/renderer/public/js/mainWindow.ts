// Import dependencies
import * as electron from 'electron';
import * as fs from 'fs';
import * as path from 'path';

type Data = {
  baseDir: string,
  create: Function,
  read: Function,
  update: Function,
  delete: Function,
  list: Function
}
const lib = <Data>{};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '../../.data/');
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

// When window has been loaded
window.onload = () => {
  /**
   * Main Window
   * @overview: All the log that has to do with the main window.
   * 
   */
  
  // The element to load the clock in
  const loadClock = document.querySelector('.loadClock');
  // Build todays date
  const date: Date = new Date();
  let m = date.getMonth() + 1, d = date.getDate(), y = date.getFullYear();
  d = checkTime(d);
  const today = m.toString() + d.toString() + y.toString().substr(-2);

  /** 
   * The function to create the clock and display it
   * @param: `ele` - The element you want to display the clock
   *         `timestamp` - A boolean value whether to return current time or not.
   * 
   */
  function timeClock(ele: HTMLElement, timestamp: boolean = false): string | void {
    const today: Date = new Date();
    let h: number = today.getHours() % 12 || 12;
    let m: number = today.getMinutes();
    let s = today.getSeconds();
    m = checkTime(m);
    s = checkTime(s);
    if(timestamp) {
      return `${h}:${m}:${s}`;
    } else {
      ele.innerHTML = `${h}:${m}:<span class="seconds">${s}</span>`;
      const t = setTimeout(timeClock.bind(this, ele), 500);
    }
  }

  // Function to add 0 to decimals less than 10
  function checkTime(i): number { if(i < 10) { i = '0' + i; } return i; };
  timeClock((<HTMLElement>loadClock));

  // Grab the clock in and out buttons
  const clockIn: HTMLElement = document.querySelector('.clockIn');
  const clockOut: HTMLElement = document.querySelector('.clockOut');
  const userID: HTMLInputElement = document.querySelector('.userID');
  let active: boolean = false;

  clockIn.addEventListener('click', (e) => {
    active = true;

    // Add the session to the user. Input clocked in time & date
    lib.read('users', userID.value)
      .then(user => {
        user.data[today] = {
          clockIn: timeClock(null, true),
        }
        return lib.update('users', userID.value, user);
      })
      .then(result => {
        console.log(result);
      })
    .catch(e => console.error(e));
  });

  clockOut.addEventListener('click', (e) => {
    active = false;

    // Add the session to the user. Input clocked out time & date
    lib.read('users', userID.value)
      .then(user => {
        user.data[today] = {
          clockOut: timeClock(null, true)
        }
        return lib.update('users', userID.value, user);
      })
      .then(result => {
        console.log(result);
      })
    .catch(e => console.error(e));
    console.log('Clock out:', timeClock(null, true));

  });

  // Grab the form that holds the input and grab the input as well
  const notes: HTMLFormElement = document.querySelector('.notes');
  const addNotes: HTMLInputElement = document.querySelector('.addNotes');

  notes.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log(addNotes.value);
  });
    
}
