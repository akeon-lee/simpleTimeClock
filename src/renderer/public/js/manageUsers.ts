/**
 * @overview: This module controls everything that has to do with the user,
 * We also include a library for storing and editing data.
 * 
 * @todo: Importing and exporting cutom modules not working. Try to find a fix so
 * we can have the library in it's own file.
 * 
 */

// Dependencies
import * as path from 'path';
import * as fs from 'fs';
import { User } from '../../models/user';

type Data = {
  baseDir: string,
  create: Function,
  read: Function,
  getFiles: Function,
  update: Function,
  delete: Function,
  list: Function
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
 * @overview: Start main window section
 */

// Function to react to form submission when adding a user
const form: HTMLFormElement = document.querySelector('form');

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

// When adding a user
form.addEventListener('submit', async (e) => {
  e.preventDefault();
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
  const newUser: { success } | { error } = await lib.create('users', userData.id, userData)
  console.log(newUser);
});

// Get all users data
lib.getFiles('users')
  .then(files => {
    const usersTable: HTMLElement = document.querySelector('.list-users');
    // Loop through each file and read the data
    for(const file of files.fileNames) {
      lib.read('users', file)
        .then(users => {
          // Create the elements and push them into the array
          const tableRow: string = `
            <tr>
              <td data-value="${users.parsedData.id}">
                ${users.parsedData.id}
              </td>
              <td data-value="${users.parsedData.firstName} ${users.parsedData.lastName}">
                ${users.parsedData.firstName} ${users.parsedData.lastName}
              </td>
              <td data-value="${users.parsedData.level}">
                ${users.parsedData.level}
              </td>
              <td class="three wide center aligned" data-value="Job">
                <button class="ui green tiny button" onclick="getData(this)">Get Data</button>
              </td>
            </tr>
          `;
          usersTable.insertAdjacentHTML('afterbegin', tableRow);
        })
      .catch(error => console.error(error));
    }
  })
.catch(error => console.error({ error }));

// Function to get the specified users data from list button
async function getData(element): Promise<void> {
  // Grab the entire row which the button was clicked on
  const userRow: HTMLElement = element.parentNode.parentNode;
  const id: string | number = userRow.querySelector('td').getAttribute('data-value');

  // Clean the modal before opening a different user
  cleanUserModal();

  const data: { parsedData } = await lib.read('users', id);
  const user: User = data.parsedData;
  const header: HTMLElement = document.querySelector('.modal-header');
  const usersDataTable: HTMLElement = document.querySelector('.list-users-data');

  // Insert the users name and id for the title
  const title: string = `<h3 class="insert">${user.firstName} ${user.lastName} - ${user.id}</h3>`;
  header.insertAdjacentHTML('afterbegin', title);

  // If there is user data insert the rows
  if(user.data.length > 0) {
    // The row number that relates to the array index from users data
    let i = 0;
    // Loop through users data
    for(const session of user.data) {
      const note = session['notes'].map(notes => notes.note);
      const noteTime = session['notes'].map(notes => notes.time);
      
      // Insert the users data into the table for the body
      const content: string = `
        <tr class="insert" data-value="${i}">
          <td class="one wide" data-value="${session['inDate']}">
            <div class="ui transparent input">
              <input type="text" name="inDate" value="${session['inDate']}" disabled></input>
            </div>
          </td>
          <td class="one wide" data-value="${session['clockIn']}">
            <div class="ui transparent input">
              <input type="text" name="clockIn" value="${session['clockIn']}" disabled></input>
            </div>
          </td>
          <td class="one wide" data-value="${session['clockOut']}">
            <div class="ui transparent input">
              <input type="text" name="clockOut" value="${session['clockOut']}" disabled></input>
            </div>
          </td>
          <td class="three wide" data-value="notes">
            <div class="ui transparent input">
              <input type="text" name="notes" value="${note}" disabled></input>
            </div>
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
  openUserModal();
}

// Function to clean the user modal before opening it
function cleanUserModal(): void {
  const inserts: NodeListOf<Element> = document.querySelectorAll('.insert');

  // Remove previous data with the className insert
  for(const insert of inserts) {
    insert.remove();
  }
}

// Function to open the user modal.
function openUserModal(): void {
  // Get the elements needed to open and close modal
  const modal: HTMLElement = document.querySelector('.user-modal');
  const span: HTMLElement = document.querySelector('.close');
  
  modal.style.display = 'block';
  
  // When the user clicks on <span> (x), close the modal
  span.onclick = () => {
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
          <input type="text" value=""></input>
        </div>
      </td>
      <td class="one wide" data-value="">
        <div class="ui transparent input">
          <input type="text" value=""></input>
        </div>
      </td>
      <td class="one wide" data-value="">
        <div class="ui transparent input">
          <input type="text" value=""></input>
        </div>
      </td>
      <td class="three wide" data-value="notes">
        <div class="ui transparent input">
          <input type="text" value=""></input>
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
 * Function to edit a table row
 * 
 * @param element - The button that was clicked
 * @param userID - The user id of the row that was clicked
 */
async function editTableRow(element, userID): Promise<void> {
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
    const userObject = user.parsedData;

    // Loop through the inputs in the row and disable them
    for(const input of inputs) {
      // Update based on the rowID for index inside the data array
      userObject.data[rowID][input.name] = input.value;
      input.disabled = true;
    }
    console.log(userObject);

    /**
     * @todo: Left off here. Still need to save the updated data correctly and fix `notes` section.
     */
    // const updateUser = await lib.update('users', userID, userObject);
    // console.log(updateUser);
  }
}

// Function to delete a table row
function deleteTableRow(element): void {
  const doubleCheck: boolean = confirm('Are you sure you want to delete this row?');

  if(doubleCheck === true) {
    element.parentNode.parentNode.remove();
  }
  return;
}

// Function to save data to a file
function saveTable(): void {
  console.log('saveTable Working');
}
