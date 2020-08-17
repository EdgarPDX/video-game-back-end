const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

const newUser = {
  id: 1,
  email: 'fake@fake.net',
  hash: '34cr68i',
};

app.get('/videogames', async(req, res) => {
  const data = await client.query(`
    SELECT v.id, name, rating, adult, t.type AS type_id
    FROM videogames AS v
    JOIN gametypes AS t
    ON v.type_id = t.id
    `);

  res.json(data.rows);
});

app.get('/gametypes', async(req, res) => {
  const data = await client.query(`
  SELECT * FROM gametypes`);

  res.json(data.rows);
});

app.get('/videogames/:id', async(req, res) => {
  const videoGameId = req.params.id;

  const data = await client.query(`
    SELECT v.id, name, rating, adult, t.type AS gametype_type
    FROM videogames AS v
    JOIN gametypes AS t
    ON v.type_id=t.id
    WHERE v.id=$1
    `, [videoGameId]);
  res.json(data.rows[0]);
});

app.delete('/videogames/:id', async(req, res) => {
  const videoGameId = req.params.id;

  const data = await client.query('DELETE FROM videogames WHERE videogames.id=$1;', [videoGameId]);
  res.json(data.rows[0]);
});

app.put('/videogames/:id', async(req, res) => {
  const videoGameId = req.params.id;

  try {
    const updatedGame = {
      name: req.body.name,
      rating: req.body.rating,
      adult: req.body.adult,
      type_id: req.body.type_id
    };

    const data = await client.query(`
    UPDATE videogames
    SET name=$1, rating=$2, adult=$3, type_id=$4
    WHERE videogames.id =$5
    RETURNING *
    `, [updatedGame.name, updatedGame.rating, updatedGame.adult, updatedGame.type_id, videoGameId]);

    res.json(data.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
  
});


app.post('/videogames', async(req, res) => {
  const newGame = {
    name: req.body.name,
    rating: req.body.rating,
    adult: req.body.adult,
    type_id: req.body.type_id,
  };

  const data = await client.query(`
  INSERT INTO videogames(name, rating, adult, type_id, owner_id)
  VALUES($1, $2, $3, $4, $5)
  RETURNING *
  `, [newGame.name, newGame.rating, newGame.adult, newGame.type_id, newUser.id]);
 
  res.json(data.rows[0]);
});

app.use(require('./middleware/error'));

module.exports = app;
