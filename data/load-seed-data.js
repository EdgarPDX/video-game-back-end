const client = require('../lib/client');
// import our seed data:
const videoGames = require('./video-games.js');
const typesData = require('./type.js');
const usersData = require('./users.js');
const { getEmoji } = require('../lib/emoji.js');

run();

async function run() {

  try {
    await client.connect();

    const users = await Promise.all(
      usersData.map(user => {
        return client.query(`
                      INSERT INTO users (email, hash)
                      VALUES ($1, $2)
                      RETURNING *;
                  `,
        [user.email, user.hash]);
      })
    );
      
    const user = users[0].rows[0];

    await Promise.all(
      typesData.map(gametype => {
        return client.query(`
                    INSERT INTO gametypes (type)
                    VALUES ($1);
                `,
        [gametype.type]);
      })
    );

    await Promise.all(
      videoGames.map(game => {
        return client.query(`
                    INSERT INTO videogames (name, rating, adult, type_id, owner_id)
                    VALUES ($1, $2, $3, $4, $5);
                `,
        [game.name, game.rating, game.adult, game.type_id, user.id]);
      })
    );
    

    console.log('seed data load complete', getEmoji(), getEmoji(), getEmoji());
  }
  catch(err) {
    console.log(err);
  }
  finally {
    client.end();
  }
    
}
