/**
 * @overview: This module controls everything that has to do with the user,
 * We also include a library for storing and editing data.
 * 
 * @todo:
 *  1) Importing and exporting cutom modules not working. Try to find a fix so we can have the library in it's own file.
 *  2) Time calculation does not work if a user clockin and clockout are on different days
 *  4) We need to make it so time, date and notes format can only be formatted the way it is stored.
 *  5) When adding a new row for user's data only one input shows inside notes, also adding new row does not save
 *  6) If a user edits a row from user's data and it has no notes only one input shows inside notes
 * 
 */

// Dependencies
import * as path from 'path';
import * as fs from 'fs';
import { User } from '../../models/user';
import * as Excel from 'exceljs';

type Data = {
  baseDir: string,
  create: Function,
  read: Function,
  getFiles: Function,
  update: Function,
  delete: Function,
  list: Function,
  createExcelFile: Function
}
const lib = <Data>{};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '../../.data/');

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

// Get all data from folder
lib.getFiles = (dir): Promise<object> => {
  return new Promise((resolve, reject) => {
    fs.readdir(`${lib.baseDir + dir}`, (error, files) => {
      if(!error && files) {
        const fileNames = [];
        // Loop through and read each file
        for(const file of files) {
          // Remove .json ending
          const fileName = file.replace('.json', '');
          fileNames.push(fileName);
        }
        resolve({ fileNames });
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

// Delete a file
lib.delete = (dir, file): Promise<object> => {
  return new Promise((resolve, reject) => {
    // Unlink the file
    fs.unlink(`${lib.baseDir + dir}/${file}.json`, (error) => {
      if(error) {
        reject({ error });
      }
      resolve({ success: 'File has been deleted' });
    });
  });
}

// List all the items in a directory
lib.list = (dir): Promise<object> => {
  return new Promise((resolve, reject) => {
    fs.readdir(`${lib.baseDir + dir}`, (error, data) => {
      if(!error && data && data.length > 0) {
        const trimmedFileNames = [];
        for(const fileName of data) {
          trimmedFileNames.push(fileName.replace('.json', ''));
        }
        resolve({ trimmedFileNames });
      } else {
        reject({ error });
      }
    });
  });
}

/**
 * Create an excel file
 * 
 * @param
 *  `executor`   - The person who is creating or modifying a file
 *  `rows`       - The users data
 *  `totalHours` - The total hours worked in current user view based on the date range
 *  `fileName`   - The name of the file that is to be created
 * 
 */
lib.createExcelFile = async (executor: string, rows: Array<object>, totalHours: string, fileName: string) => {
  // A new excel workbook
  const workbook = new Excel.Workbook();
  // Some information about the excel workbook
  workbook.creator = executor;
  workbook.lastModifiedBy = executor;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();

  // Create a sheet
  const sheet = workbook.addWorksheet('Timeclock');
  // Table headers
  sheet.columns = [
    { header: 'In Date', key: 'inDate' },
    { header: 'Out Date', key: 'outDate' },
    { header: 'Clock In', key: 'clockIn' },
    { header: 'Clock Out', key: 'clockOut' },
    { header: 'Hours', key: 'hours' },
    { header: 'Notes', key: 'notes' },
    { header: 'Total Hours', key: 'totalHours' },
  ]

  // Add rows in the above header
  for(const row of rows) {
    sheet.addRow({ 
      inDate: row['inDate'], 
      outDate: row['outDate'], 
      clockIn: row['clockIn'], 
      clockOut: row['clockOut'], 
      hours: row['hours'], 
      notes: row['notes'] 
    });
  }
  sheet.addRow({
    totalHours: totalHours
  });

  // Grab each column from the excel file to make custom modifications
  const inDateCol = sheet.getColumn('inDate');
  const outDateCol = sheet.getColumn('outDate');
  const clockInCol = sheet.getColumn('clockIn');
  const clockOutCol = sheet.getColumn('clockOut');
  const hoursCol = sheet.getColumn('hours');
  const notesCol = sheet.getColumn('notes');
  const totalHoursCol = sheet.getColumn('totalHours');

  // Make notes column collapsable
  notesCol.outlineLevel = 1;

  // Set the width of specified columns
  inDateCol.width = 15;
  outDateCol.width = 15;
  hoursCol.width = 10;
  totalHoursCol.width = 20;
  clockInCol.width = 20;
  clockOutCol.width = 20;

  // Read and get data from settings.json then prepend the file path to writeFile
  const saveDataPath = await lib.read('', 'settings');
  const path = saveDataPath.parsedData;

  // Save Excel on Hard Disk
  workbook.xlsx.writeFile(`${path.saveDataPath}/${fileName}.xlsx`)
    .then(() => {
      console.log(`${fileName}.xlsx has been saved to ${path.saveDataPath}`);
    })
  .catch(error => console.error({ error }));
}

/**
 * Function to display notifications
 * 
 * @param data - The data such as type (success, info, warning or error), header and message being passed in as an object
 * 
 * @todo - Currently there seems to be no use for this display notification in manage users area.
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

  // Remove notification when x (close) is pressed
  notificationBox.querySelector('.close').addEventListener('click', () => {
    notificationBox.querySelector('.message').remove();
    notificationBox.querySelector('.divider').remove();
  });

  // Remove notifiaction on double click
  document.addEventListener('dblclick', () => {
    notificationBox.querySelector('.message').remove();
    notificationBox.querySelector('.divider').remove();
  });
}

/**
 * Manage Users Window
 * @overview: Start main window section
 * 
 */

// Global admin control variable
let adminControl: boolean = false;

// Genereate 5 random numbers for id
function generateRandomNumbers(): number {
  const numbers: Array<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let randomNumber: string = '';

  for(let i = 0; i < 5; i++) {
    const index: number = Math.floor(Math.random() * 10);
    randomNumber += numbers[index];
  }
  return Number(randomNumber);
}

// Function to confirm an admin before performing an action
async function confirmAdminStatus(form): Promise<void> {
  const container: HTMLElement = form.parentElement.parentElement.parentElement;
  const input: HTMLInputElement = form.querySelector('.admin-id');
  const id: string | number = input.value;

  try {
    // Get the user object
    const user = await lib.read('users', id);
    const parsed = user.parsedData;
  
    // If the user entered is an admin proceed
    if(parsed.level === 'admin') {
      // Notification box for success
      const notifyData = {
        type: 'success',
        header: 'Admin Access', 
        message: 'Admin privilages has been granted'
      };
      displayNotifications(notifyData);
  
      container.style.display = 'none';
      // Set the global admin variable to true
      adminControl = true;
    } else {
      // Notification box for error
      const notifyData = {
        type: 'error',
        header: 'Admin Access', 
        message: 'Admin privilages has been denied'
      };
      displayNotifications(notifyData);
  
      console.error('An invalid admin ID has been entered');
    }
  } catch(e) {
    // Notification box for error when there is no input or a user id that does not exist
    const notifyData = {
      type: 'error',
      header: 'Admin Access', 
      message: e.error
    };
    displayNotifications(notifyData);
  }
}

// Function to add a new employee or admin
async function addUser(form): Promise<void> {
  if(!adminControl) {
    // Open the admin-confirm modal to set adminAccess to true
    openUserModal('.admin-confirm');
    return;
  }

  // Get the form data
  const formData: FormData = new FormData(form);

  // Generate id from random number
  let id: number = generateRandomNumbers();

  // Loop through every user, if new id already exists generate random number until it does not
  const users: { fileNames } = await lib.getFiles('users');
  for(const user of users.fileNames) {
    while(user == id) {
      id = generateRandomNumbers();
    }
  }

  // Create the user object
  const userData = <User>{};
  for (const [key, value] of formData.entries()) {
    userData.id = id;
    userData[key] = <string>value;
    userData.session = {
      status: false
    };
    userData.data = [];
  }
  
  // Create the user
  const newUser: { success } | { error } = await lib.create('users', userData.id, userData);
  // Clear the user data table in main window
  const userRowTable = document.querySelector('.list-users');
  userRowTable.innerHTML = '';

  // Reload the user data
  loadUserData();
}

// Function to edit a user
function editUser() {
  if(!adminControl) {
    // Open the admin-confirm modal to set adminAccess to true
    openUserModal('.admin-confirm');
    return;
  }
}

// Function to delete a user
function deleteUser(element: HTMLElement): void {
  if(!adminControl) {
    // Open the admin-confirm modal to set adminAccess to true
    openUserModal('.admin-confirm');
    return;
  }
  // Select the rows first td cell to get the user id
  const row: HTMLElement = element.parentElement.parentElement;
  const id: string = row.querySelector('td').getAttribute('data-value');
  const doubleCheck: boolean = confirm('Are you sure you want to delete this user?');

  if(doubleCheck) {
    // Delete the user
    row.remove();
    lib.delete('users', id);
  }
}

// Get all users data
async function loadUserData() {
  const usersTable: HTMLElement = document.querySelector('.list-users');
  const files = await lib.getFiles('users');

  // Loop through each file and read the data
  for(const file of files.fileNames) {
    const users = await lib.read('users', file);

    // Create the elements and push them into the array
    const tableRow: string = `
      <tr class="user-row">
        <td data-value="${users.parsedData.id}">
          ${users.parsedData.id}
        </td>
        <td data-value="${users.parsedData.firstName} ${users.parsedData.lastName}">
          ${users.parsedData.firstName} ${users.parsedData.lastName}
        </td>
        <td data-value="${users.parsedData.level}">
          ${users.parsedData.level}
        </td>
        <td class="three wide center aligned">
          <button class="ui green tiny button" onclick="getData(this)">Get Data</button>
        </td>
        <td class="two wide center aligned">
          <button class="ui icon tiny blue button" onclick="editUser(this)">
            <i class="edit icon"></i>
          </button>
          <button class="ui icon tiny red button" onclick="deleteUser(this)">
            <i class="trash icon"></i>
          </button>
        </td>
      </tr>
    `;
    usersTable.insertAdjacentHTML('afterbegin', tableRow);
  }
}
// Invoke this function to load all users data when the manage users window is opened
loadUserData();

// Function to get the specified users data from list button
async function getData(element): Promise<void> {
  // Grab the entire row which the button was clicked on
  const userRow: HTMLElement = element.parentNode.parentNode;
  const id: string | number = userRow.querySelector('td').getAttribute('data-value');

  // Clean the modal before opening a different user
  cleanUserModal(true);

  const data: { parsedData } = await lib.read('users', id);
  const user: User = data.parsedData;
  const header: HTMLElement = document.querySelector('.modal-header');
  const usersDataTable: HTMLElement = document.querySelector('.list-users-data');

  // Insert the users name and id for the title
  const title: string = `<h3 class="insert user-header" data-value="${user.id}">${user.firstName} ${user.lastName} - ${user.id}</h3>`;
  header.insertAdjacentHTML('afterbegin', title);

  // If there is user data insert the rows
  if(user.data.length > 0) {
    // The row number that relates to the array index from users data
    let i = 0;

    // Collect each sessions time to add it all up
    const collectTime: Array<string> = [];

    // Loop through users data
    for(const session of user.data) {
      // Get `inDate`, `clockIn`, `clockOut`, `notes` for `session`
      const { inDate, outDate, clockIn, clockOut, notes }: any = session;
      
      // Get the total hours worked for a specific session
      const hours: string = getTimeForSession(inDate, clockIn, outDate, clockOut);
      collectTime.push(hours);

      // Map the notes object based on it's time and note
      const note: string = session['notes'].map(notes => {
        return `
          <span class="ui transparent input">
            <input type="text" id="time" name="notes" value="${notes.time}" disabled>
            <input type="text" id="note" name="notes" value="${notes.note}" disabled>
          </span>
        `;
      }).join(' ');

      // Insert the users data into the table for the body
      const content: string = `
        <tr class="insert" data-value="${i}">
          <td class="one wide">
            <div class="ui transparent input">
              <input type="text" name="inDate" value="${inDate}" disabled>
            </div>
            <div class="ui transparent input">
              <input type="text" name="outDate" value="${outDate}" disabled>
            </div>
          </td>
          <td class="one wide" data-value="${clockIn}">
            <div class="ui transparent input">
              <input type="text" name="clockIn" value="${clockIn}" disabled>
            </div>
          </td>
          <td class="one wide" data-value="${clockOut}">
            <div class="ui transparent input">
              <input type="text" name="clockOut" value="${clockOut}" disabled>
            </div>
          </td>
          <td class="one wide">
            <span class="hours" data-value="${hours}">${hours}</span>
          </td>
          <td class="three wide notes">
            ${note}
          </td>
          <td class="one wide center aligned">
            <button class="ui icon tiny blue button" onclick="editTableRow(this, ${user.id})">
              <i class="edit icon"></i>
            </button>
            <button class="ui icon tiny red button" onclick="deleteTableRow(this, ${user.id})">
              <i class="trash icon"></i>
            </button>
          </td>
        </tr>
      `;
      usersDataTable.insertAdjacentHTML('afterbegin', content);
      i++;
    }
    
    // Format the total hours based on the collectTime being displayed
    let totalHours: number = 0;
    let totalMinutes: number = 0;
    // Loop through collectTime and split it into an array. Then add to totalHours and totalMinutes
    for(const time of collectTime) {
      const splitTime: Array<string> = time.split(':');
      totalHours += parseInt(splitTime[0]);
      totalMinutes += parseInt(splitTime[1]);
    }

    // If total minutes is greater than or equal to 60 then we add 1 to hour and subtract 60 from minutes
    while(totalMinutes >= 60) {
      totalHours += 1;
      totalMinutes -= 60;
    }

    const totalWorkTime: string = totalHours.toString() + 'hrs ' + totalMinutes.toString() + 'min';
    const modalBody: HTMLElement = document.querySelector('.modal-body');
    
    const totalWorkTimeElement: string = `
      <div class="ui visible message insert">
        <p>Total Hours Worked: <span id="totalHours" class="hours" data-value="${totalWorkTime}"><b>${totalWorkTime}</b></span></p>
      </div>
    `;
    modalBody.insertAdjacentHTML('afterbegin', totalWorkTimeElement);
  } else {
    // Insert a row showing that there is no data to display
    const content: string = `
      <tr class="insert no-data">
        <td class="ui medium orange header">There is no data to be displayed for this user.</td>
      </tr>
    `;
    usersDataTable.insertAdjacentHTML('afterbegin', content);
  }

  // Open the modal with users data
  openUserModal('.user-modal');
}

// Get the data with a date range.
async function getDataWithDate(startDate: string, endDate: string): Promise<void> {
  const preserveTitle: HTMLElement = document.querySelector('.user-header');
  const header: HTMLElement = document.querySelector('.modal-header');
  const id: string | number = preserveTitle.getAttribute('data-value');
  const usersDataTable: HTMLElement = document.querySelector('.list-users-data');
  const data: { parsedData } = await lib.read('users', id);
  const user: User = data.parsedData;

  // Clean the user modal
  cleanUserModal();

  // Append the preserved header for the specific user
  header.append(preserveTitle);

  // If there is user data insert the rows
  if(user.data.length > 0) {
    // The row number that relates to the array index from users data
    let i: number = 0;

    // Collect each sessions time to add it all up
    const collectTime: Array<string> = [];

    // Loop through users data
    for(const session of user.data) {
      // Get `inDate`, `clockIn`, `clockOut`, `notes` for `session`
      const { inDate, outDate, clockIn, clockOut, notes }: any = session;

      // Turn the dates into a JavaScript date and get the time to compare and filter the data
      const formattedStartDate = new Date(formatDate(startDate)).getTime();
      const formattedEndDate = new Date (formatDate(endDate)).getTime() || new Date().getTime();
      const formattedUserDate = new Date(inDate).getTime();

      if(formattedUserDate >= formattedStartDate && formattedUserDate <= formattedEndDate) {
        // Get the total hours worked for a specific session
        const hours: string = getTimeForSession(inDate, clockIn, outDate, clockOut);
        collectTime.push(hours);

        // Map the notes object based on it's time and note
        const note: string = notes.map(notes => {
          return `
            <span class="ui transparent input">
              <input type="text" id="time" name="notes" value="${notes.time}" disabled>
              <input type="text" id="note" name="notes" value="${notes.note}" disabled>
            </span>
          `;
        }).join(' ');
  
        // Insert the users data into the table for the body
        const content: string = `
          <tr class="insert" data-value="${i}">
            <td class="one wide">
              <div class="ui transparent input">
                <input type="text" name="inDate" value="${inDate}" disabled>
              </div>
              <div class="ui transparent input">
                <input type="text" name="outDate" value="${outDate}" disabled>
              </div>
            </td>
            <td class="one wide" data-value="${clockIn}">
              <div class="ui transparent input">
                <input type="text" name="clockIn" value="${clockIn}" disabled>
              </div>
            </td>
            <td class="one wide" data-value="${clockOut}">
              <div class="ui transparent input">
                <input type="text" name="clockOut" value="${clockOut}" disabled>
              </div>
            </td>
            <td class="one wide">
              <span class="hours">${hours}</span>
            </td>
            <td class="three wide notes">
              ${note}
            </td>
            <td class="one wide center aligned">
              <button class="ui icon tiny blue button" onclick="editTableRow(this, ${user.id})">
                <i class="edit icon"></i>
              </button>
              <button class="ui icon tiny red button" onclick="deleteTableRow(this, ${user.id})">
                <i class="trash icon"></i>
              </button>
            </td>
          </tr>
        `;
        usersDataTable.insertAdjacentHTML('afterbegin', content);
        i++;
      }
    }
    // Format the total hours based on the collectTime being displayed
    let totalHours: number = 0;
    let totalMinutes: number = 0;
    // Loop through collectTime and split it into an array. Then add to totalHours and totalMinutes
    for(const time of collectTime) {
      const splitTime: Array<string> = time.split(':');
      totalHours += parseInt(splitTime[0]);
      totalMinutes += parseInt(splitTime[1]);
    }

    // If total minutes is greater than or equal to 60 then we add 1 to hour and subtract 60 from minutes
    while(totalMinutes >= 60) {
      totalHours += 1;
      totalMinutes -= 60;
    }

    const totalWorkTime: string = totalHours.toString() + 'hrs ' + totalMinutes.toString() + 'min';
    const modalBody: HTMLElement = document.querySelector('.modal-body');
    
    const totalWorkTimeElement: string = `
      <div class="ui visible message insert">
        <p>Total Hours Worked: <span id="totalHours" class="hours" data-value="${totalWorkTime}"><b>${totalWorkTime}</b></span></p>
      </div>
    `;
    modalBody.insertAdjacentHTML('afterbegin', totalWorkTimeElement);
  }
}

// Function to format the date from input date
function formatDate(date): string {
  const newDate: string = date[5] + date[6] + '-' + date[8] + date[9] + '-' + date[0] + date[1] + date[2] + date[3];
  return newDate;
}

// Function to calculate the total time for a specific session
function getTimeForSession(inDate: string, inTime: string, outDate: string, outTime: string): string {
  // Regex for am and pm
  const pm: RegExp = /\spm/;
  const am: RegExp = /\sam/;
  let splitInTime: Array<string> = [];
  let splitOutTime: Array<string> = [];

  // Format the time based on the time and state
  function prepareTimes(time, state): Array<string> {
    // Remove the pm text and split hour, minute, seconds into an array
    time = time.replace(state, '');
    time = time.split(':');

    // Add 12 to the hour
    if(state === pm && time[0] !== '12'){
      time[0] = (parseInt(time[0]) + 12).toString();
    }

    // Change hour to 00
    if(state === am && time[0] === '12') {
      time[0] = (parseInt(time[0]) + 12).toString();
    }

    return time;
  }

  // Function to format date and hours into JS readable object
  function convertToJSTime(date: string, time: Array<string>): Date {
    // Split the date into an array
    const formatDate = date.split('-');

    // Convert to JS readable date
    const jsTime = new Date(
      parseInt(formatDate[2]), 
      parseInt(formatDate[0]) - 1,
      parseInt(formatDate[1]), 
      parseInt(time[0]), 
      parseInt(time[1]), 
      parseInt(time[2])
    );
    return jsTime;
  }

  /**
   * @todo - left off here. We need to convert the milliseconds into hours:minutes:seconds
   */

  // If the time in pm
  if(pm.test(inTime)) {
    const milisecondTime = convertToJSTime(inDate, prepareTimes(inTime, pm));
    console.log(milisecondTime);

    splitInTime = prepareTimes(inTime, pm);
  };

  if(pm.test(outTime)) {
    const milisecondTime = convertToJSTime(outDate, prepareTimes(outTime, pm));
    console.log(milisecondTime);

    splitOutTime = prepareTimes(outTime, pm);
  }
  
  // If the time in am
  if(am.test(inTime)) {
    const milisecondTime = convertToJSTime(inDate, prepareTimes(inTime, am));
    console.log(milisecondTime);

    splitInTime = prepareTimes(inTime, am);
  }

  if(am.test(outTime)) {
    const milisecondTime = convertToJSTime(outDate, prepareTimes(outTime, am));
    console.log(milisecondTime);

    splitOutTime = prepareTimes(outTime, am);
  }

  /**
   * Formula to calculate total hours
   */
  let totalTime: string | number;
  // If the hours are equal to each other
  if(splitInTime[0] === splitOutTime[0]) {
    // We subract the minutes only
    totalTime = parseInt(splitOutTime[1]) - parseInt(splitInTime[1]);
    // If the minutes is less than 10 we prepend 0 to minutes
    if(totalTime < 10) {
      totalTime = '00:0' + totalTime;
    } else {
      totalTime = '00:' + totalTime;
    }

  } else {
    // Subract 60 from in minutes
    const roundInTime: string | number = 60 - parseInt(splitInTime[1]);

    // Add 1 to in hours
    const addAfterRound: string | number = parseInt(splitInTime[0]) + 1;

    // Subract out hours with in hours
    let getHours: string | number = parseInt(splitOutTime[0]) - addAfterRound;

    // Add out minutes
    let getMinutes: string | number = parseInt(splitOutTime[1]) + roundInTime;

    // If the hours or minutes is NaN default to 0
    if(isNaN(getHours)) {
      getHours = 0;
    }

    if(isNaN(getMinutes)) {
      getMinutes = 0;
    }

    // If the minutes is larger than 60 then add 1 to hour and subract 60 from minutes
    if(getMinutes >= 60) {
      getHours += 1;
      getMinutes -= 60;
    }

    // Format the total time by hrs and minutes. If getHours is less than 10 we prepend a 0, same logic with minutes
    if(getHours < 10) {
      getHours = '0' + getHours.toString();
    }

    if(getMinutes < 10) {
      getMinutes = '0' + getMinutes.toString();
    }

    // Assemble the total time
    totalTime = getHours.toString() + ':' + getMinutes.toString();
  }

  return totalTime.toString();
}

// Function to clean the user modal before opening it
function cleanUserModal(date: boolean = false): void {
  const inserts: NodeListOf<Element> = document.querySelectorAll('.insert');

  // If date needs to be cleaned
  if(date) {
    const startDate: HTMLInputElement = document.querySelector('#startDate');
    const endDate: HTMLInputElement = document.querySelector('#endDate');
    startDate.value = '';
    endDate.value = '';
  }

  // Remove previous data with the className insert
  for(const insert of inserts) {
    insert.remove();
  }
}

// Function to open the user modal.
function openUserModal(modalClass: string): void {
  // Get the elements needed to open and close modal
  const modal: HTMLElement = document.querySelector(modalClass);
  const close: HTMLElement = modal.querySelector('.close');
  
  modal.style.display = 'block';
  
  // When the user clicks on <span> (x), close the modal
  close.onclick = () => {
    modal.style.display = 'none';
  }
}

// Create a new table row
function createTableRow(): void {
  const usersDataTable: HTMLElement = document.querySelector('.list-users-data');

  // Remove the no data row if it exists
  const noDataRow: HTMLElement = document.querySelector('.no-data');
  if(noDataRow) {
    noDataRow.remove();
  };

  // Insert the users data into the table for the body
  const content: string = `
    <tr class="insert">
      <td class="one wide" data-value="">
        <div class="ui transparent input">
          <input type="text" value="">
        </div>
      </td>
      <td class="one wide" data-value="">
        <div class="ui transparent input">
          <input type="text" value="">
        </div>
      </td>
      <td class="one wide" data-value="">
        <div class="ui transparent input">
          <input type="text" value="">
        </div>
      </td>
      <td class="one wide"></td>
      <td class="three wide" data-value="">
        <div class="ui transparent input">
          <input type="text" value="">
        </div>
      </td>
      <td class="one wide center aligned">
        <button class="ui icon tiny green button" onclick="editTableRow(this)">
          <i class="check icon"></i>
        </button>
        <button class="ui icon tiny red button" onclick="deleteTableRow(this)">
          <i class="trash icon"></i>
        </button>
      </td>
    </tr>
  `;
  usersDataTable.insertAdjacentHTML('afterbegin', content);
}

/**
 * Event functions to display the data according to the dates chosen
 */
const startDate: HTMLInputElement = document.querySelector('#startDate');
const endDate: HTMLInputElement = document.querySelector('#endDate');

startDate.addEventListener('change', () => {
  getDataWithDate(startDate.value, endDate.value);
});

endDate.addEventListener('change', () => {
  getDataWithDate(startDate.value, endDate.value);
});

/**
 * Function to edit a table row
 * 
 * @param element - The button that was clicked
 * @param userID - The user id of the row that was clicked
 */
async function editTableRow(element, userID): Promise<void> {
  // If adminControl is set to false
  if(!adminControl) {
    // Open the admin-confirm modal to set adminAccess to true
    openUserModal('.admin-confirm');
    return;
  }
  
  const row: HTMLElement = element.parentNode.parentNode;
  const inputs: NodeListOf<HTMLInputElement> = row.querySelectorAll('input');
  const editIcon: HTMLElement = element.querySelector('i');

  // If edit mode is off
  if(element.classList.contains('blue')) {
    // Turn edit mode on
    editIcon.className = 'check icon';
    element.classList.add('green');
    element.classList.remove('blue');

    // Loop through the inputs in the row and enable them
    for(const input of inputs) {
      input.disabled = false;
    }
  } else {
    // Turn edit mode off and save the data
    editIcon.className = 'edit icon';
    element.classList.remove('green');
    element.classList.add('blue');

    // Create the user object to update the users data
    const rowID = row.getAttribute('data-value');
    const user = await lib.read('users', userID);
    const userObject: { parsedData: object, data: object } = user.parsedData;

    // Creating the notes object for notes key inside userObject
    let notesObject: { note: string, time: string } = {
      note: '',
      time: ''
    };

    // Empty the notes array if there are notes in it
    if(userObject.data[rowID]['notes'].length > 0) {
      userObject.data[rowID]['notes'] = [];
    }

    // Loop through the inputs in the row and disable them
    for(const input of inputs) {

      // Update based on the rowID for index inside the data array
      if(input.name === 'notes') {
        // The loop goes through once in time then once in note. After it repeats the process depending on how many notes there are.
        if(input.id === 'time') {
          notesObject.time = input.value;
        } else {
          notesObject.note = input.value;
        }

        // Once the notesObject.note has been set for a specific note we push the data and empty the notesObject for the next note
        if(notesObject.note !== '' && notesObject.time !== '') {
          userObject.data[rowID][input.name].push(notesObject);
          notesObject = {
            note: '',
            time: ''
          }
        }

      } else {
        // Set the new value
        userObject.data[rowID][input.name] = input.value;

      }
      input.disabled = true;
    }

    const updateUser: { success } | { error } = await lib.update('users', userID, userObject);
  }
}

// Function to delete a table row
function deleteTableRow(element): void {
  const doubleCheck: boolean = confirm('Are you sure you want to delete this row?');

  if(doubleCheck) {
    element.parentNode.parentNode.remove();
  }
  return;
}

// Function to save data to a file
function exportToExcel(element: HTMLElement): void {
  // Gather all the neccessary elements and data
  const userDataModal: HTMLElement = element.parentElement.parentElement.parentElement;
  let fileName = <any>userDataModal.querySelector('.user-header');
  fileName = fileName.innerText;
  const rows: NodeListOf<HTMLElement> = userDataModal.querySelectorAll('tr');
  const totalHours = userDataModal.querySelector('#totalHours').getAttribute('data-value');
  
  // Create an object for each session to be pushed into formatUserDataForExcel[]
  const formatUserDataForExcel: Array<object> = [];
  let session: any = {
    inDate: '',
    outDate: '',
    clockIn: '',
    clockOut: '',
    hours: '',
    notes: ''
  };

  // Loop through rows and collect the inputs. According to the inputs fill in session{}
  for(const row of rows) {
    const inputs: NodeListOf<HTMLInputElement> = row.querySelectorAll('input');
    for(const input of inputs) {
      if(input.name === 'inDate') {
        session.inDate = input.value;
      } else if(input.name === 'outDate') {
        session.outDate = input.value;
      } else if(input.name === 'clockIn') {
        session.clockIn = input.value;
      } else if(input.name === 'clockOut') {
        session.clockOut = input.value;
      }

      // If the sessions object dates, clockIn and clockOut has been filled move onto the next step
      if(session.inDate !== '' && session.outDate !== '' && session.clockIn !== '' && session.clockOut !== '') {
        // Set session hours and notes
        session.hours = row.querySelector('.hours').getAttribute('data-value');
        const notes: NodeListOf<HTMLInputElement> = row.querySelector('.notes').querySelectorAll('input');
        // The flag so that the last note printed does not contain seperator
        let flag: number = 0;
        for(const note of notes) {
          if(note.id === 'time') {
            session.notes += note.value + ' - ';
          } else {
            if(flag !== notes.length - 1) {
              session.notes += note.value + ' || ';
            } else {
              session.notes += note.value;
            }
          }
          flag++;
        }

        // Push the session object into formatUserDataForExcel[] and clear the session object
        formatUserDataForExcel.push(session);
        session = {
          inDate: '',
          outDate: '',
          clockIn: '',
          clockOut: '',
          hours: '',
          notes: ''
        };
      }
    }
  }

  // Execute createExcelFile() with the gathered parameters
  lib.createExcelFile('admin', formatUserDataForExcel, totalHours, fileName)
    .then(() => {
      // Notification box for success
      const notifyData = {
        type: 'success',
        header: 'Export Successful', 
        message: 'The users data has been exported successfully'
      };
      displayNotifications(notifyData);
    })
  .catch(error => {
      // Notification box for errors
      const notifyData = {
        type: 'error',
        header: 'Export Failure', 
        message: error.error
      };
      displayNotifications(notifyData);
  });
}
