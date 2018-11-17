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
 * 
 */

// Function to react to form submission when adding a user
const form: HTMLFormElement = document.querySelector('form');
/** 
 * @todo: Get The id to equal date + number format 
 * */
let date = new Date();
let m: number = date.getMonth() + 1, d: number = date.getDate(), y: number = date.getFullYear(), s: number = date.getSeconds();
const id: string = m.toString() + checkNum(d).toString() + y.toString().substr(-2) + s.toString();

// Function to add 0 to decimals less than 10
function checkNum(i): number { if(i < 10) { i = '0' + i; } return i; };

form.addEventListener('submit', (e) => {
  e.preventDefault();
  // Get the form data
  const formData: FormData = new FormData(form);

  const userData = <User>{};
  for (const [key, value] of formData.entries()) {
    userData.id = Number(id);
    userData[key] = <string>value;
    userData.session = {
      status: false
    };
    userData.data = [];
  }
  
  // Create the user
  lib.create('users', userData.id, userData)
    .then((done) => {
      console.log(done);
    })
  .catch(error => console.log(error));
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
              <td data-value="Job">
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

  // Loop through users data
  for(const session of user.data) {
    const note = session['notes'].map(notes => notes.note);

    // Insert the users data into the table for the body
    const content: string = `
      <tr class="insert">
        <td data-value="${session['inDate']}">
          ${session['inDate']}
        </td>
        <td data-value="${session['clockIn']}">
          ${session['clockIn']}
        </td>
        <td data-value="${session['clockOut']}">
          ${session['clockOut']}
        </td>
        <td data-value="${'placeholder'}">
          ${note}
        </td>
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
  const modal: HTMLElement = document.querySelector('.userModal');
  const span: HTMLElement = document.querySelector('.close');
  
  modal.style.display = 'block';
  
  // When the user clicks on <span> (x), close the modal
  span.onclick = () => {
    modal.style.display = 'none';
  }
  
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
  }
}
