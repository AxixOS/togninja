const neonDb = require('./database.js');

neonDb.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'galleries' ORDER BY ordinal_position`)
  .then(r => { 
    console.log(r.map(x => x.column_name).join('\n')); 
    process.exit(0); 
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
