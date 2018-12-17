/**
 * @overview: This module controls everything that has to do with the user,
 * We also include a library for storing and editing data.
 * 
 * @todo:
 *  1) Importing and exporting cutom modules not working. Try to find a fix so we can have the library in it's own file.
 *  2) When adding a new row the format checker does not work
 *  3) Weird bug where when you add a new data row in user and delete it, it will delete multiple rows (This has to do with the array index)
 *  4) When you mark edit as complete with another edit open, it also removes the add notes button for the still in edit mode row
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
          <button class="ui green tiny button get-data" onclick="getData(this)">Get Data</button>
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

// Format the dates for HTML date input
function formatDateForInput(date) {
  const split = date.split('-');
  const newDate = `${split[2]}-${split[0]}-${split[1]}`;
  return newDate;
}

// Function to get the specified users data from list button
async function getData(element): Promise<void> {
  // Grab the entire row which the button was clicked on
  const userRow: HTMLElement = element.parentElement.parentElement;
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
    // Collect each sessions time to add it all up
    const collectTime: Array<string> = [];

    // Loop through users data
    for(const session of user.data) {
      // Get `inDate`, `clockIn`, `clockOut`, `notes` for `session`
      const { inDate, outDate, clockIn, clockOut, notes }: any = session;
      const rowIndex = user.data.indexOf(session);
      
      // Get the total hours worked for a specific session
      const hours: string = getTimeForSession(inDate, clockIn, outDate, clockOut);
      collectTime.push(hours);

      // Map the notes object based on it's time and note
      const note: string = session['notes'].map((notes, index) => {
        return `
          <span class="ui transparent input">
            <input type="text" id="time" name="notes" onchange="restrictInputFormat(this, 'time')" data-value="${index}" value="${notes.time}" disabled>
            <input type="text" id="note" name="notes" value="${notes.note}" disabled>
            <span class="display-none"><button class="ui icon mini basic button" onclick="removeNotes(this)"><i class="minus red icon"></i></button></span>
          </span>
        `;
      }).join(' ');

      // Format date for HTML Input - @todo This is currently not in use
      const newInDate = formatDateForInput(inDate);
      const newOutDate = formatDateForInput(outDate);

      // Insert the users data into the table for the body
      const content: string = `
        <tr class="insert" data-value="${rowIndex}">
          <td class="one wide">
            <div class="ui transparent input">
              <input type="text" name="inDate" onchange="restrictInputFormat(this, 'date')" value="${inDate}" disabled>
            </div>
            <div class="ui transparent input">
              <input type="text" name="outDate" onchange="restrictInputFormat(this, 'date')" value="${outDate}" disabled>
            </div>
          </td>
          <td class="one wide" data-value="${clockIn}">
            <div class="ui transparent input">
              <input type="text" name="clockIn" onchange="restrictInputFormat(this, 'time')" value="${clockIn}" disabled>
            </div>
          </td>
          <td class="one wide" data-value="${clockOut}">
            <div class="ui transparent input">
              <input type="text" name="clockOut" onchange="restrictInputFormat(this, 'time')" value="${clockOut}" disabled>
            </div>
          </td>
          <td class="one wide">
            <span class="hours" data-value="${hours}">${hours}</span>
          </td>
          <td class="three wide notes">
            ${note}
          </td>
          <td class="one wide center aligned add-notes-cell" style="display:none;">
            <button class="ui icon mini basic button display-none" onclick="addNotes(this)" style="display:none;"><i class="plus green icon"></i></button>
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
    // Collect each sessions time to add it all up
    const collectTime: Array<string> = [];

    // Loop through users data
    for(const session of user.data) {
      // Get `inDate`, `clockIn`, `clockOut`, `notes` for `session`
      const { inDate, outDate, clockIn, clockOut, notes }: any = session;
      const rowIndex = user.data.indexOf(session);

      // Turn the dates into a JavaScript date and get the time to compare and filter the data
      const formattedStartDate = new Date(formatDate(startDate)).getTime();
      const formattedEndDate = new Date (formatDate(endDate)).getTime() || new Date().getTime();
      const formattedUserDate = new Date(inDate).getTime();

      if(formattedUserDate >= formattedStartDate && formattedUserDate <= formattedEndDate) {
        // Get the total hours worked for a specific session
        const hours: string = getTimeForSession(inDate, clockIn, outDate, clockOut);
        collectTime.push(hours);

        // Map the notes object based on it's time and note
        const note: string = notes.map((notes, index) => {
          return `
            <span class="ui transparent input">
              <input type="text" id="time" name="notes" onchange="restrictInputFormat(this, 'time')" data-value="${index}" value="${notes.time}" disabled>
              <input type="text" id="note" name="notes" value="${notes.note}" disabled>
              <span class="display-none"><button class="ui icon mini basic button" onclick="removeNotes(this)"><i class="minus red icon"></i></button></span>
            </span>
          `;
        }).join(' ');

        // Format date for HTML Input - @todo This is currently not in use
        const newInDate = formatDateForInput(inDate);
        const newOutDate = formatDateForInput(outDate);
  
        // Insert the users data into the table for the body
        const content: string = `
          <tr class="insert" data-value="${rowIndex}">
            <td class="one wide">
              <div class="ui transparent input">
                <input type="text" name="inDate" onchange="restrictInputFormat(this, 'date')" value="${inDate}" disabled>
              </div>
              <div class="ui transparent input">
                <input type="text" name="outDate" onchange="restrictInputFormat(this, 'date')" value="${outDate}" disabled>
              </div>
            </td>
            <td class="one wide" data-value="${clockIn}">
              <div class="ui transparent input">
                <input type="text" name="clockIn" onchange="restrictInputFormat(this, 'time')" value="${clockIn}" disabled>
              </div>
            </td>
            <td class="one wide" data-value="${clockOut}">
              <div class="ui transparent input">
                <input type="text" name="clockOut" onchange="restrictInputFormat(this, 'time')" value="${clockOut}" disabled>
              </div>
            </td>
            <td class="one wide">
              <span class="hours" data-value="${hours}">${hours}</span>
            </td>
            <td class="three wide notes">
              ${note}
            </td>
            <td class="one wide center aligned add-notes-cell" style="display:none;">
              <button class="ui icon mini basic button display-none" onclick="addNotes(this)" style="display:none;"><i class="plus green icon"></i></button>
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

async function restrictInputFormat(element: HTMLInputElement, type: string): Promise<void> {
  // Get current users saved data
  const modal = element.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
  const sessionIndex = element.parentElement.parentElement.parentElement.getAttribute('data-value');
  const userID = modal.querySelector('.modal-header').querySelector('h3').getAttribute('data-value');
  const persistedData = await lib.read('users', userID);
  const userSession = persistedData.parsedData.data[sessionIndex];

  if(type === 'date') {
    // Regexp for how the date should always be formatted
    const dateFormat = /^(\w{2})-(\w{2})-(\w{4})$/;
    const testFormat = dateFormat.test(element.value);

    if(!testFormat) {
      element.value = userSession[element.name];
      // Notification box for success
      const notifyData = {
        type: 'error',
        header: 'Format Error', 
        message: 'Please make sure to format the date correctly (mm-dd-yyyy)'
      };
      displayNotifications(notifyData);
    }
  } else if(type === 'time') {
    // Regexp for how the time should always be formatted
    const timeFormat = /^(\w{1,2}):(\w{2}):(\w{2})\s\w{2}$/;
    const testFormat = timeFormat.test(element.value);

    if(!testFormat) {
      // If the input is notes we need to get the index of the notes array
      if(element.name === 'notes') {
        const noteIndex = element.getAttribute('data-value');
        element.value = userSession[element.name][noteIndex].time;
      } else {
        element.value = userSession[element.name];
      }
      // Notification box for success
      const notifyData = {
        type: 'error',
        header: 'Format Error', 
        message: 'Please make sure to format the time correctly (hh:mm:ss am)'
      };
      displayNotifications(notifyData);
    }
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
  let milliIn: number;
  let milliOut: number;

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
    const formatDate: Array<string> = date.split('-');

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

  // Function to turn milliseconds into hours & minutes
  function msToTime(millisec): string {
    // Get hours from milliseconds
    const hours: number = millisec / (1000*60*60);
    const absoluteHours: number = Math.floor(hours);
    const h: string = (absoluteHours > 9 ? absoluteHours : '0' + absoluteHours).toString();

    // Get remainder from hours and convert to minutes
    const minutes: number = (hours - absoluteHours) * 60;
    const absoluteMinutes: number = Math.floor(minutes);
    const m: string = (absoluteMinutes > 9 ? absoluteMinutes : '0' +  absoluteMinutes).toString();

    // Return hours and minutes
    return h + ':' + m;
  }

  // If the time in pm, set the milliseconds for in time
  if(pm.test(inTime)) {
    milliIn = convertToJSTime(inDate, prepareTimes(inTime, pm)).getTime();
  };

  if(pm.test(outTime)) {
    milliOut = convertToJSTime(outDate, prepareTimes(outTime, pm)).getTime();
  }
  
  // If the time in am, set the milliseconds for out time
  if(am.test(inTime)) {
    milliIn = convertToJSTime(inDate, prepareTimes(inTime, am)).getTime();
  }

  if(am.test(outTime)) {
    milliOut = convertToJSTime(outDate, prepareTimes(outTime, am)).getTime();
  }

  // Calculate and return the total time
  return msToTime(milliOut - milliIn);
}

// Function to clean the user modal before opening it
function cleanUserModal(date: boolean = false): void {
  const inserts: NodeListOf<HTMLElement> = document.querySelectorAll('.insert');
  const hiddens: NodeListOf<HTMLElement> = document.querySelectorAll('.display-none');

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

  // Hide all elements that were originally hidden
  for(const hidden of hiddens) {
    hidden.style.display = 'none';
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
function createTableRow(element): void {
  const usersDataTable: HTMLElement = document.querySelector('.list-users-data');
  const userID = element.parentElement.parentElement.parentElement.querySelector('.modal-header').querySelector('h3').getAttribute('data-value');

  // Remove the no data row if it exists
  const noDataRow: HTMLElement = document.querySelector('.no-data');
  if(noDataRow) {
    noDataRow.remove();
  };

  // Select the hidden add notes column and display it, while display the cells of other rows
  const addNotesColumn: HTMLElement = document.querySelector('.add-notes-column');
  const addNotesCells: NodeListOf<HTMLElement> = element.parentElement.parentElement.querySelectorAll('.add-notes-cell');

  addNotesColumn.style.display = 'table-cell';
  for(const cell of addNotesCells) {
    cell.style.display = 'table-cell';
  }

  // Insert the users data into the table for the body
  const content: string = `
    <tr class="insert">
      <td class="one wide">
        <div class="ui transparent input">
          <input type="text" name="inDate" onchange="restrictInputFormat(this, 'date')">
        </div>
        <div class="ui transparent input">
          <input type="text" name="outDate" onchange="restrictInputFormat(this, 'date')">
        </div>
      </td>
      <td class="one wide">
        <div class="ui transparent input">
          <input type="text" name="clockIn" onchange="restrictInputFormat(this, 'time')">
        </div>
      </td>
      <td class="one wide">
        <div class="ui transparent input">
          <input type="text" name="clockOut" onchange="restrictInputFormat(this, 'time')">
        </div>
      </td>
      <td class="one wide">
        <span class="hours"></span>
      </td>
      <td class="three wide notes">
        <span class="ui transparent input">
          <input type="text" id="time" name="notes" onchange="restrictInputFormat(this, 'time')">
          <input type="text" id="note" name="notes">
          <span class="display-none"><button class="ui icon mini basic button" onclick="removeNotes(this)"><i class="minus red icon"></i></button></span>
        </span>
      </td>
      <td class="one wide center aligned add-notes-cell">
        <button class="ui icon mini basic button display-none" onclick="addNotes(this)"><i class="plus green icon"></i></button>
      </td>
      <td class="one wide center aligned">
        <button class="ui icon tiny green button" onclick="editTableRow(this, ${userID})">
          <i class="check icon"></i>
        </button>
        <button class="ui icon tiny red button" onclick="deleteTableRow(this, ${userID})">
          <i class="trash icon"></i>
        </button>
      </td>
    </tr>
  `;
  usersDataTable.insertAdjacentHTML('afterbegin', content);
}

// Function to add more notes
function addNotes(element) {
  // Select the notes container box element
  const noteBox = element.parentElement.parentElement.querySelector('.notes');

  const note = `
    <span class="ui transparent input">
      <input type="text" id="time" name="notes" onchange="restrictInputFormat(this, 'time')">
      <input type="text" id="note" name="notes">
      <span class="display-none" style="display:inline-block;"><button class="ui icon mini basic button" onclick="removeNotes(this)"><i class="minus red icon"></i></button></span>
    </span>
  `;
  noteBox.insertAdjacentHTML('afterbegin', note);
}

// Function to remove notes
function removeNotes(element) {
  // Select the note and remove
  const note = element.parentElement.parentElement;
  note.remove();
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
  const addNotesColumn: HTMLElement = document.querySelector('.add-notes-column');
  const hiddenElements: NodeListOf<HTMLElement> = row.querySelectorAll('.display-none');
  const addNotesCells: NodeListOf<HTMLElement> = row.parentElement.parentElement.parentElement.querySelectorAll('.add-notes-cell');
  const inputs: NodeListOf<HTMLInputElement> = row.querySelectorAll('input');
  const editIcon: HTMLElement = element.querySelector('i');

  // If edit mode is off
  if(element.classList.contains('blue')) {
    // Turn edit mode on
    editIcon.className = 'check icon';
    element.classList.add('green');
    element.classList.remove('blue');
    
    // Display all hidden elements for notes
    addNotesColumn.style.display = 'table-cell';
    for(const hidden of hiddenElements) {
      hidden.style.display = 'table-cell';
    }

    // Display all cells without the add button
    for(const cell of addNotesCells) {
      cell.style.display = 'table-cell';
    }

    // Loop through the inputs in the row and enable them
    for(const input of inputs) {
      input.disabled = false;
    }
  } else {
    // Turn edit mode off and save the data
    editIcon.className = 'edit icon';
    element.classList.remove('green');
    element.classList.add('blue');

    // Hide hidden elements for notes
    addNotesColumn.style.display = 'none';
    for(const hidden of hiddenElements) {
      hidden.style.display = 'none';
    }

    // Display all cells without the add button
    for(const cell of addNotesCells) {
      cell.style.display = 'none';
    }

    // Create the user object to update the users data
    const rowID = row.getAttribute('data-value');
    const user = await lib.read('users', userID);
    const userObject: { parsedData: object, data: Array<object> } = user.parsedData;

    // Creating the notes object for notes key inside userObject
    let notesObject: { note: string, time: string } = {
      note: '',
      time: ''
    };

    // If there is a rowID we are editing the row
    if(rowID) {
      /* Editing existing row */

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
    } else {
      /* Adding a new row */

      // Create newDataRow object to gather the data from inputs
      const newDataRow = {};
      newDataRow['notes'] = [];

      for(const input of inputs) {
        // Handle all object properties based on their inputs name
        if(input.name === 'notes') {
          // Handle notes during inputs loop
          if(input.id === 'time') {
            notesObject.time = input.value;
          } else {
            notesObject.note = input.value;
          }

          // Once the notesObject.note has been set for a specific note we push the data and empty the notesObject for the next note
          if(notesObject.note !== '' && notesObject.time !== '') {
            newDataRow[input.name].push(notesObject);
            notesObject = {
              note: '',
              time: ''
            }
          }
        } else {
          newDataRow[input.name] = input.value;
        }

        input.disabled = true;
      }
      userObject.data.push(newDataRow);
    }

    const updateUser: { success } | { error } = await lib.update('users', userID, userObject);
  }
}

// Function to delete a table row
async function deleteTableRow(element, userID): Promise<void> {
  const doubleCheck: boolean = confirm('Are you sure you want to delete this row?');

  if(doubleCheck) {
    const user = await lib.read('users', userID);
    const userObject = user.parsedData;
    const rowIndex = element.parentElement.parentElement.getAttribute('data-value');

    userObject.data.splice(rowIndex, 1);
    const updateUser: { success } | { error } = await lib.update('users', userID, userObject);
    element.parentElement.parentElement.remove();

    // Select the outer user elements
    const outerUserRows = document.querySelectorAll('.get-data');

    cleanUserModal();
    
    // Loop through until you find the correct user row based on the paramenter userID
    for(const button of outerUserRows) {
      const rowID = button.parentElement.parentElement.querySelector('td').getAttribute('data-value');
      
      // Once found get the data and break out of the loop
      if(parseInt(userID) === parseInt(rowID)) {
        getData(button);
        break;
      }
    }
  }
}

// Function to save data to a file
async function exportToExcel(element: HTMLElement): Promise<void> {
  // Check for admin access
  if(!adminControl) {
    // Open the admin-confirm modal to set adminAccess to true
    openUserModal('.admin-confirm');
    return;
  }
  
  try {
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
    await lib.createExcelFile('admin', formatUserDataForExcel, totalHours, fileName);

    // Notification box for success
    const notifyData = {
      type: 'success',
      header: 'Export Successful', 
      message: 'The users data has been exported successfully'
    };
    displayNotifications(notifyData);
  } catch(e) {
    console.log(e);
    // Notification box for errors
    const notifyData = {
      type: 'error',
      header: 'Export Failure', 
      message: 'The users data has been failed to export'
    };
    displayNotifications(notifyData); 
  }
}
