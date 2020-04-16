const fs = require('fs');

const EN_JSON = `${__dirname}/en.json`, FR_JSON = `${__dirname}/fr.json`, ES_JSON = `${__dirname}/es.json`, DE_JSON = `${__dirname}/de.json`;
const FILE_MAPPING = [
  [`${__dirname}/fr_old.json`, FR_JSON],
  [`${__dirname}/es_old.json`, ES_JSON],
  [`${__dirname}/de_old.json`, DE_JSON]
];

let PARSED_FR_JSON, PARSED_ES_JSON, PARSED_DE_JSON;

/**
 * Reads all translation files, including english translations.
 * Maps english translations, then makes maps for each foreign
 * language file based on english map.
 * 
 * Renames old translation files, then saves new, map-based foreign
 * language translation objects to new translation files.
 */
Promise.all(
  [EN_JSON, FR_JSON, ES_JSON, DE_JSON].map((fileName) => readFileAsync(fileName))
).then((arrayOfContents) => {

  const [enStr, frStr, esStr, deStr] = arrayOfContents;

  PARSED_FR_JSON = JSON.parse(frStr);
  PARSED_ES_JSON = JSON.parse(esStr);
  PARSED_DE_JSON = JSON.parse(deStr);

  let enMap = JSONToMap(JSON.parse(enStr));

  let frMap = buildLanguageMap(PARSED_FR_JSON, enMap);
  let esMap = buildLanguageMap(PARSED_ES_JSON, enMap);
  let deMap = buildLanguageMap(PARSED_DE_JSON, enMap);

  let frObj = mapToJSON(frMap);
  let esObj = mapToJSON(esMap);
  let deObj = mapToJSON(deMap);

  PARSED_FR_JSON = JSON.stringify(frObj, null, 2);
  PARSED_ES_JSON = JSON.stringify(esObj, null, 2);
  PARSED_DE_JSON = JSON.stringify(deObj, null, 2);

  return Promise.all(FILE_MAPPING.map(([newFile, oldFile]) => renameFileAsync(oldFile, newFile)));

}).then(() => {
  return Promise.all([
    [FR_JSON, PARSED_FR_JSON], 
    [ES_JSON, PARSED_ES_JSON], 
    [DE_JSON, PARSED_DE_JSON]]
    .map(([fileName, parsedJSON]) => writeFileAsync(fileName, parsedJSON)));

}).then(() => {
  console.log('Translation JSON files have been saved.')
}).catch(err => console.error(err));


/**
 * Reads file asynchronously
 * @param {string} fileName 
 */
function readFileAsync(fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf8', (err, contents) => {
      if (err) { return reject(`Read file failed: ${err}`); }

      return resolve(contents);
    });
  });
}

/**
 * Renames file asynchronously
 * @param {string} oldFileName 
 * @param {string} newFileName 
 */
function renameFileAsync(oldFileName, newFileName) {
  return new Promise((resolve, reject) => {
    fs.rename(oldFileName, newFileName, (err) => {
      if (err) { return reject(`Rename file failed: ${err}`); }

      return resolve();
    });
  });
}

/**
 * Writes to new file asynchronously
 * @param {string} fileName 
 * @param {JSON object} fileContent 
 */
function writeFileAsync(fileName, fileContent) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, fileContent, 'utf8', (err, contents) => {
      if (err) { return reject(`Write file failed: ${err}`); }

      return resolve(contents);
    });
  });
}

/**
 * Recursively traverses object;
 * returns map
 * @param {object} jsonObj 
 */
function JSONToMap(jsonObj) {
  let m = new Map();

  for (let [key, value] of Object.entries(jsonObj)) {
    if (value instanceof Object) {
      m.set(key, JSONToMap(value));
    } else {
      m.set(key, value);
    }
  }

  return m;
}

/**
 * Recursively traverses map;
 * returns object
 * @param {*} langMap 
 */
function mapToJSON(langMap) {
  let o = new Object();

  for (let [key, value] of langMap.entries()) {
    if (value instanceof Object) {
      o[key] = mapToJSON(value);
    } else {
      o[key] = value;
    }
  }

  return o;
}

/**
 * Recursively traverses map;
 * returns a new, ordered map based on keys from
 * traversed map and values from map param.
 * 
 * If no translation is found, uses default from
 * map param.
 * @param {object} langJSON 
 * @param {map} enMap 
 */
function buildLanguageMap(langJSON, enMap) {
  let m = new Map();

  for (let [key, value] of enMap.entries()) {
    if (langJSON[key] && langJSON[key] instanceof Object) {
      m.set(key, buildLanguageMap(langJSON[key], value));
    } else if (langJSON[key]) {
      m.set(key, langJSON[key]);
    } else {
      m.set(key, value);
    }
  }

  return m;
}
