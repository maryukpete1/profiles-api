// Simple rule-based natural language parser
// Returns an object of filters
const COUNTRY_MAP = {
    nigeria: 'NG',
    angola: 'AO',
    kenya: 'KE',
    'united states': 'US',
    usa: 'US',
    uk: 'GB',
    'united kingdom': 'GB',
    congo: 'CD',
    'democratic republic of the congo': 'CD',
    // will also check DB directly if not in map ideally, but assignment limits us rule-based logic
};

function parseQuery(q) {
    if (!q || typeof q !== 'string') return null;
    const tokens = q.toLowerCase().split(/\s+/);

    const filters = {};

    // 1. Gender rules
    if (tokens.includes('male') || tokens.includes('males') || tokens.includes('boy') || tokens.includes('boys')) {
        filters.gender = 'male';
    } else if (tokens.includes('female') || tokens.includes('females') || tokens.includes('girl') || tokens.includes('girls')) {
        filters.gender = 'female';
    }

    // 2. Age Group rules
    if (tokens.includes('teenager') || tokens.includes('teenagers')) filters.age_group = 'teenager';
    else if (tokens.includes('adult') || tokens.includes('adults')) filters.age_group = 'adult';
    else if (tokens.includes('child') || tokens.includes('children')) filters.age_group = 'child';
    else if (tokens.includes('senior') || tokens.includes('seniors')) filters.age_group = 'senior';

    // 3. Exact "young" rule
    if (tokens.includes('young')) {
        filters.min_age = 16;
        filters.max_age = 24;
    }

    // 4. Above/Over and Under/Below rules
    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        if ((word === 'above' || word === 'over' || word === 'older') && (i + 1 < tokens.length)) {
            const num = parseInt(tokens[i + 1].replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num)) filters.min_age = word === 'older' && tokens[i + 1] === 'than' ? parseInt(tokens[i + 2], 10) : num;
        }
        if ((word === 'under' || word === 'below' || word === 'younger') && (i + 1 < tokens.length)) {
            const num = parseInt(tokens[i + 1].replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num)) filters.max_age = word === 'younger' && tokens[i + 1] === 'than' ? parseInt(tokens[i + 2], 10) : num;
        }
    }

    // 5. Country rules
    let fromIndex = tokens.indexOf('from');
    if (fromIndex === -1) fromIndex = tokens.indexOf('in');
    if (fromIndex !== -1 && fromIndex + 1 < tokens.length) {
        const nextWords = tokens.slice(fromIndex + 1).filter(w => !['the', 'republic', 'of'].includes(w));
        const potentialCountry = nextWords.join(' ');

        // We try to find the country in our map
        let found = false;
        for (const [name, code] of Object.entries(COUNTRY_MAP)) {
            if (potentialCountry.includes(name)) {
                filters.country_id = code;
                found = true;
                break;
            }
        }
        // If not found in simple map, we attach the raw word for the DB to search `country_name`
        if (!found) {
            filters._country_name_search = tokens[fromIndex + 1];
        }
    }

    // Check if we parsed anything meaningful. If it's an uninterpretable query, we return null or empty.
    if (Object.keys(filters).length === 0) {
        return null;
    }

    return filters;
}

module.exports = { parseQuery };
