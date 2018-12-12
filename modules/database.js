'use strict';
const mysql = require('mysql2');

const connect = () => {
  // create the connection to database
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
  });
  return connection;
};

const select = (connection, callback, res) => {
  // simple query
  connection.query(
      'SELECT * FROM bc_media',
      (err, results, fields) => {
        // console.log(results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
        callback(results, res);
      },
  );
};

const getComments = (connection, data, callback) => {
  // simple query
  connection.execute(
      'SELECT irkken_comments.kommentti, irkken_users.username FROM irkken_comments, irkken_users, bc_media WHERE irkken_comments.uID = irkken_users.ID AND irkken_comments.mID = bc_media.mID AND bc_media.mID = ?',
      data,
      (err, results, fields) => {
        // console.log(results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
        callback(results);
      },
  );
};

const insert = (data, connection, callback) => {
  // simple query
  connection.execute(
      'INSERT INTO bc_media (category, title, details, thumbnail, image, original, coordinates) VALUES (?, ?, ?, ?, ?, ?, ?);',
      data,
      (err, results, fields) => {
        // console.log(results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
        callback();
      },
  );
};

const insertComment = (data, connection, callback) => {
  // simple query
  connection.execute(
      'INSERT INTO irkken_comments (uID, mID, kommentti) VALUES (?, ?, ?);',
      data,
      (err, results, fields) => {
        // console.log(results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
        callback();
      },
  );
};

const update = (data, connection) => {
  // simple query
  return connection.execute(
      'UPDATE bc_media SET category = ?, title = ?, details = ? WHERE mID = ?;',
      data,
      (err, results, fields) => {
        // console.log(results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
      },
  );
};

const del = (data, connection) => {
  // simple query
  return connection.execute(
      'DELETE FROM bc_media WHERE mID = ?;',
      data,
      (err, results, fields) => {
        console.log(results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
      },
  );
};

const login = (data, connection, callback) => {
  // simple query
  connection.execute(
      'SELECT * FROM irkken_users WHERE username = ?;',
      data,
      (err, results, fields) => {
        console.log('login', results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
        callback(results);
      },
  );
};

const register = (data, connection, callback) => {
  // simple query
  connection.execute(
      'INSERT INTO irkken_users (username, password) VALUES (?, ?);',
      data,
      (err, results, fields) => {
        console.log('register', results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
        console.log(err);
        callback();
      },
  );
};

const addView = (data, connection) => {
  // simple query
  return connection.execute(
      'UPDATE bc_media SET views = views + 1 WHERE mID = ?;',
      data,
      (err, results, fields) => {
        console.log(err);
      },
  );
};

module.exports = {
  connect: connect,
  select: select,
  insert: insert,
  update: update,
  del: del,
  login: login,
  register: register,
  getComments: getComments,
  insertComment: insertComment,
  addView: addView,
};
