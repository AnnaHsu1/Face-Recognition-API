const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : 'db',
    database : 'smart-brain'
  }
});

const app = express();
app.use(bodyParser.json());
app.use(cors());


app.listen(3000, () => {
  console.log('running 3000')
})

/* root */ 
app.get('/', (req, res) => {
  db.select('*').from('users')
  .then(users => {
    console.log(users)
    res.json(users)
  })
  .catch(err => res.status(400).json(err))
})

/* /signin */
app.post('/signin', (req, res) => {
  db.select('email', 'hash').from('login')
  .where('email', '=', req.body.email)
  .then(data => {
    const validPassword = bcrypt.compareSync(req.body.password, data[0].hash);
    if(validPassword){
      return db.select('*').from('users')
      .where('email', '=', data[0].email)
      .then(user => {
        console.log(user[0])
        res.json(user[0])
      })
      .catch(err => res.status(400).json("unable to get user"))
    }
    else {
      res.status(400).json('invalid password')
    }
  })
  .catch(err => res.json("wrong credentials"))
})

/* /register when user registers, user added to both users and login database*/
app.post('/register', (req, res) => {
  const {name, email, password} = req.body;
  const hash = bcrypt.hashSync(password);
  db.transaction(trx => {
    trx.insert({
      hash: hash,
      email: email
    })
    .into('login')
    .returning('email')
    .then(loginEmail => {
      return trx('users')
      .returning('*')
      .insert({
        email: Object.values(loginEmail[0])[0],
        name: name,
        joined: new Date()
      })
      .then(data => {
        res.json(data[0]);
        console.log(data[0]);
      })
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
    .catch(err => res.status(404).json(err))

})

/* /profile/:id */
app.get('/profile/:id', (req, res) => {
  const {id} = req.params;
  db.select('*').from('users').where({id: id}).then(user => {
    if(user.length)
    res.json(user[0])
    else {
      res.status(400).json("Id not found")
    }
  })
  .catch(err => res.status(400).json("Error getting user"))
})

/* /image */
app.put('/image', (req, res) => {
  const {id} = req.body;
  db('users').where({id: id}).increment('entries', 1).returning('entries').then(entries => {
    if(entries.length){
      console.log(entries[0]);
      res.json(Object.values(entries[0]));
    }
    else {
      res.status(400).json("Invalid Id")
    }
  })
  .catch(err => res.status(400).json("Error getting entries"))

})


