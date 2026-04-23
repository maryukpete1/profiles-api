/**
 * Generates a UUID v7 (time-ordered UUID).
 * Implements the spec: 48-bit unix_ts_ms, 4-bit version (7),
 * 12-bit rand_a, 2-bit variant, 62-bit rand_b.
 * @returns {string}
 */
function generateUUIDv7() {
    const now = Date.now(); // milliseconds since Unix epoch

    // 48-bit timestamp
    const tsHigh = Math.floor(now / 0x100000000);
    const tsLow = now & 0xFFFFFFFF;

    // Random bits
    const rand = new Uint8Array(10);
    for (let i = 0; i < 10; i++) {
        rand[i] = Math.floor(Math.random() * 256);
    }

    // Build the UUID bytes (16 bytes total)
    const bytes = new Uint8Array(16);

    // bytes 0-5: 48-bit timestamp
    bytes[0] = (tsHigh >> 8) & 0xFF;
    bytes[1] = tsHigh & 0xFF;
    bytes[2] = (tsLow >> 24) & 0xFF;
    bytes[3] = (tsLow >> 16) & 0xFF;
    bytes[4] = (tsLow >> 8) & 0xFF;
    bytes[5] = tsLow & 0xFF;

    // bytes 6-7: version (7) + 12 random bits
    bytes[6] = 0x70 | (rand[0] & 0x0F);
    bytes[7] = rand[1];

    // bytes 8-9: variant (10xx) + 14 random bits
    bytes[8] = 0x80 | (rand[2] & 0x3F);
    bytes[9] = rand[3];

    // bytes 10-15: 48 random bits
    bytes[10] = rand[4];
    bytes[11] = rand[5];
    bytes[12] = rand[6];
    bytes[13] = rand[7];
    bytes[14] = rand[8];
    bytes[15] = rand[9];

    // Convert to hex string
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join('-');
}

module.exports = { generateUUIDv7 };
