try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(':memory:');
    console.log('node:sqlite OK');
    db.close();
} catch (e) {
    console.log('node:sqlite FAIL:', e.message);
}
