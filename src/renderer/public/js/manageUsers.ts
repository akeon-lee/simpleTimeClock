/**
 * @overview: This module controls everything that has to do with the user,
 * We also include a library for storing and editing data.
 * 
 * @todo: Importing and exporting cutom modules not working. Try to find a fix so
 * we can have the library in it's own file.
 * 
 */

// Dependencies
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../../models/user';

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

// Write data to the file
lib.create = (dir, file, data): Promise<object> => {
  return new Promise((resolve, reject) => {
    // Open the file for writing
    fs.open(`${lib.baseDir + dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
      if(!err && fileDescriptor) {
        // Convert the data to a string
        const stringData = JSON.stringify(data);
  
        // Write to file and close it
        fs.writeFile(fileDescriptor, stringData, (err) => {
          if(err) {
            reject({ error: 'Error writing to file' });
          }
  
          fs.close(fileDescriptor, (err) => {
            if(err) {
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
        resolve({ success: parsedData });
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
  .catch(err => console.log(err));
});
