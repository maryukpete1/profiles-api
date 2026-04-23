// Quick test script — run with: node test-api.js (while server is running)
const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        http.get({ hostname: 'localhost', port: 3000, path }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`\nGET ${path} → ${res.statusCode}`);
                try { console.log(JSON.stringify(JSON.parse(data), null, 2).slice(0, 600)); } catch { console.log(data); }
                resolve({ status: res.statusCode, body: JSON.parse(data) });
            });
        }).on('error', reject);
    });
}

function post(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`\nPOST ${path} body=${JSON.stringify(body)} → ${res.statusCode}`);
                try { console.log(JSON.stringify(JSON.parse(data), null, 2).slice(0, 600)); } catch { console.log(data); }
                resolve({ status: res.statusCode, body: JSON.parse(data) });
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    // 1. Create a profile
    const r1 = await post('/api/profiles', { name: 'ella' });
    const id = r1.body.data && r1.body.data.id;

    // 2. Duplicate – should return "Profile already exists"
    await post('/api/profiles', { name: 'ella' });

    // 3. Another name
    await post('/api/profiles', { name: 'samuel' });

    // 4. Missing name → 400
    await post('/api/profiles', {});

    // 5. Get all
    await get('/api/profiles');

    // 6. Filter by gender
    await get('/api/profiles?gender=female');

    // 7. Get single profile by ID
    if (id) await get(`/api/profiles/${id}`);

    // 8. Get non-existent profile → 404
    await get('/api/profiles/non-existent-id-0000');

    console.log('\n\n✅ All tests ran!');
}

run().catch(console.error);
