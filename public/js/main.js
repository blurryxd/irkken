'use strict';

let originalData = null;
let map = null;
let marker = null;

// read userID from cookie
console.log(document.cookie);
const ID = document.cookie.split('=')[1];
console.log('userID is', ID);

document.querySelector('#reset-button').addEventListener('click', () => {
  update(originalData);
});

document.querySelector('.modal button').addEventListener('click', (evt) => {
  evt.target.parentNode.classList.add('hidden');
});

const createArticle = (image, title, texts) => {
  let text = '';
  for (let t of texts) {
    text += `<p>${t}</p>`;
  }

  return `<img src="${image}" alt="${title}">
                <h3 class="card-title">${title}</h3>
                <p>${text}</p>
                <p><button>View</button></p>`;
};

const categoryButtons = (items) => {
  items = removeDuplicates(items, 'category');
  console.log(items);
  document.querySelector('#categories').innerHTML = '';
  for (let item of items) {
    const button = document.createElement('button');
    button.class = 'btn btn-secondary';
    button.innerText = item.category;
    document.querySelector('#categories').appendChild(button);
    button.addEventListener('click', () => {
      sortItems(originalData, item.category);
    });
  }
};

const sortItems = (items, rule) => {
  const newItems = items.filter(item => item.category === rule);
  // console.log(newItems);
  update(newItems);
};

//Kuvien lisääminen sivulle
const getData = () => {
  fetch('/node/images').then(response => {
    return response.json();
  }).then(items => {
    originalData = items;
    update(items);
  });
};

const removeDuplicates = (myArr, prop) => {
  return myArr.filter((obj, pos, arr) => {
    return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
  });
};

const update = (items) => {
  categoryButtons(items);
  document.querySelector('main').innerHTML = '';
  for (let item of items) {
    // console.log(item);
    const article = document.createElement('article');
    const time = moment(item.time);
    article.innerHTML = createArticle(item.image, item.title, [
      '<small>' + time.format('dddd, MMMM Do YYYY, HH:mm') + '</small>',
      item.details]);
    article.addEventListener('click', () => {
      addView(item);
      document.querySelector('.modal').classList.remove('hidden');
      document.querySelector('.modal img').src = item.original;
      document.querySelector('#hidden').value = item.mID;
      document.querySelector('.modal h4').innerHTML = 'Title: ' + item.title +
          ' - Views: ' + item.views;
      addComments(item);
      resetMap(item);
      document.querySelector('#map').addEventListener('transitionend', () => {
        map.invalidateSize();
      });
    });
    document.querySelector('main').appendChild(article);
  }
};

const addComments = (image) => {
  const lista = document.querySelector('#comments');
  console.log('lista', lista);
  fetch('/node/comments/' + image.mID).then((vastaus) => {
    return vastaus.json();
  }).then((json) => {
    console.log('kommentit', json);
    lista.innerHTML = json.map(kommentti => `
          <li>
          ${kommentti.username}: ${kommentti.kommentti}
          </li>
       `).join('');
  });

};

const initMap = () => {
  map = L.map('map').setView([0, 0], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  getData();
};

const resetMap = (item) => {
  try {
    map.removeLayer(marker);
  } catch (e) {

  }
  const coords = JSON.parse(item.coordinates);
  console.log(coords);
  map.panTo([coords.lat, coords.lng]);
  marker = L.marker([coords.lat, coords.lng]).addTo(map);
  map.invalidateSize();
};

initMap();

// lähettää tiedot tietokantaan
const frm = document.querySelector('#mediaform');

const sendForm = (evt) => {
  evt.preventDefault();
  const fd = new FormData(frm);
  const settings = {
    method: 'post',
    body: fd,
  };

  fetch('/node/upload', settings).then((response) => {
    return response.json();
  }).then((json) => {
    console.log(json);
    // update list
    //getImages();
  });
};

frm.addEventListener('submit', sendForm);

const addView = (image) => {
  fetch('/node/viewAdd/' + image.mID).then((response) => {
    return response.json();
  }).then((json) => {
    console.log(json);
  });
};

const frm2 = document.querySelector('#kommenttiformi');

/*
const sendComment = (evt) => {
  evt.preventDefault();
  const fd = new FormData(frm);
  const settings = {
    method: 'post',
    body: fd,
    req.user.ID,
    req.image.mID,
  };

  fetch('/node/comment', settings).then((response) => {
    return response.json();
  }).then((json) => {
    console.log(json);
  });
};

frm2.addEventListener('submit', sendComment);*/
