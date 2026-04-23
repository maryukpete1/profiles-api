/**
 * Classifies an age from Agify into the correct age group.
 * @param {number} age
 * @returns {string}
 */
function getAgeGroup(age) {
    if (age >= 0 && age <= 12) return 'child';
    if (age >= 13 && age <= 19) return 'teenager';
    if (age >= 20 && age <= 59) return 'adult';
    return 'senior'; // 60+
}

module.exports = { getAgeGroup };
