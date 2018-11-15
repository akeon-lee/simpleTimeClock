// Import dependencies
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
  const loadClock: HTMLElement = document.querySelector('.loadClock');
  // Build todays date
  const date: Date = new Date();
  let m: number = date.getMonth() + 1, d: number = date.getDate(), y: number = date.getFullYear();
  const today: string = m.toString() + checkNum(d).toString() + y.toString().substr(-2);

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

  /**
   * @todo: Delete this when not needed 
   */
  // lib.read('users', 11101841)
  //   .then(data => {
  //     console.log(data);
  //   });

  // Add the session to the user. Input clocked in time & date
  clockIn.addEventListener('click', (e) => {
    lib.read('users', userID.value)
      .then(user => {
        // Check to see if the user is clocked in
        if(user.session.status) {
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
        return lib.update('users', userID.value, user);
      })
      .then(result => {
        console.log(result);
      })
    .catch(e => console.error(e));
  });

  // Add the session to the user. Input clocked out time & date
  clockOut.addEventListener('click', (e) => {
    lib.read('users', userID.value)
      .then(user => {
        // Check to see if the user is clocked in
        if(!user.session.status) {
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
        return lib.update('users', userID.value, user);
      })
      .then(result => {
        console.log(result);
      })
    .catch(e => console.error(e));
  });

  // Grab the form that holds the input and grab the input as well
  const notes: HTMLFormElement = document.querySelector('.notes');
  const addNotes: HTMLInputElement = document.querySelector('.addNotes');

  notes.addEventListener('submit', (e) => {
    e.preventDefault();
    lib.read('users', userID.value)
      .then(user => {
        if(!user.session.status) {
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
        return lib.update('users', userID.value, user);
      })
      .then(result => {
        console.log(result);
      })
    .catch(e => console.error(e));
  });
}
