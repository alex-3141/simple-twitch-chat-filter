// Static settings reference object. Live varables are stored in localStorage
const setting = {
  // Setting Name             UI Element ID                    UI Element type     Data Type         Default Value
  'filterActive':             {id: 'filterActiveButton',       ui: 'button',       type: 'bool',     default: true},
  'removeMessage':            {id: 'removeMessageButton',      ui: 'button',       type: 'bool',     default: false},
  'minSequenceLength':        {id: 'minSequenceLengthSlider',  ui: 'range',        type: 'int',      default: 3},
  'spamThreshold':            {id: 'spamThresholdSlider',      ui: 'range',        type: 'int',      default: 3},
  'replaceWithCount':         {id: 'replaceWithCountSlider',   ui: 'range',        type: 'int',      default: 3},
};

// Settings that should not be cleared by restoreDefaultSettings
const persist = [];

// HOW TO USE
// If you load this as part of another script, include these two things:
// Call loadSettings() to initialize settings and return execution once things are ready
// loadSettings().then(() => {
//   yourCodeHere();
// });
//
// Have a onSettingUpdate(key, newValue, oldValue) function to react to settings changes
// onSettingUpdate(key, newValue, oldValue);

// Listen for setting updates and reflect them in the settings object
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    if(setting[key].value != newValue){
      setting[key].value = newValue;
      onSettingUpdate(key, newValue, oldValue);
    }
  }
});

// Populate chrome.storage and settings object to provide synchronous storage
function loadSettings() {
  return new Promise(async (resolve) => {
    let keys = Object.keys(setting);
    for (const key of keys) {
      const storage = await new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
          resolve(result);
        });
      });
      if (key in storage) {
        setting[key].value = storage[key];
      } else {
        await new Promise((resolve) => {
          chrome.storage.local.set({ [key]: setting[key].default }, () => {
            resolve();
          });
        });
        setting[key].value = setting[key].default;
      }
    }
    resolve();
  });
}

function getSetting(key) {
  switch(setting[key].type){
    case 'string':
      return String(setting[key].value);
    case 'bool':
      return Boolean(setting[key].value);
    case 'int':
      return parseInt(setting[key].value);
    case 'float':
      return parseFloat(setting[key].value);
    default:
      return setting[key].value;
  }
}

async function restoreDefaultSettings(){
  for(const key in setting){
    if(!persist.includes(key)){
      await setDefaultSetting(key);
    }
  }
}


async function setDefaultSetting(key){
  await setSetting(key, getDefaultSetting(key));
}

async function clearApiKey(){
  await setDefaultSetting('apiKey');
}

// TODO: Error checking for attempting to use wrong data type
async function setSetting(key, value) {
  setting[key].value = value;
  await syncSetting(key, value);
}

// Sync a setting to chrome.storage
async function syncSetting(key, value){
  new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
}

// Read from static setting object
function getSettingUI(key) {
  return setting[key].ui;
}
function getSettingID(key) {
  return setting[key].id;
}
function getDefaultSetting(key) {
  return setting[key].default;
}