// button name => content script setting convertion is done within each individual button's onclick event listener

document.addEventListener('DOMContentLoaded', () => {
  const filterActiveButton = document.getElementById('filterActiveButton');
  const removeMessageButton = document.getElementById('removeMessageButton');
  const minSequenceLengthSlider = document.getElementById('minSequenceLengthSlider');
  const minSequenceLengthSliderText = document.getElementById('minSequenceLengthSliderText');
  const replaceWithCountSlider = document.getElementById('replaceWithCountSlider');
  const replaceWithCountSliderText = document.getElementById('replaceWithCountSliderText');


  // Themed Subtitle Colors button
  filterActiveButton.addEventListener('click', () => {
    const settingValue = toggleButton('filterActiveButton');
    setSetting('filterActive', settingValue);
  });

  // Remove Message button
  removeMessageButton.addEventListener('click', () => {
    const settingValue = toggleButton('removeMessageButton');
    setSetting('removeMessage', settingValue);
  });


  // Minimum Sequence Length
  minSequenceLengthSliderText.addEventListener('keydown', minSequenceLengthSliderDirectInput);
  minSequenceLengthSliderText.addEventListener('blur', minSequenceLengthSliderDirectInput);
  minSequenceLengthSlider.addEventListener('input', function (event) {
    document.getElementById('minSequenceLengthSliderText').style.filter = 'brightness(65%)';
    setMinSequenceLengthSliderText(event.target.value);
  });
  minSequenceLengthSlider.addEventListener('change', function (event) {
    document.getElementById('minSequenceLengthSliderText').style.filter = 'brightness(100%)';
    setSetting('minSequenceLength', event.target.value);
  });
  function minSequenceLengthSliderDirectInput(event){
    if (event.type === 'blur' || event.key === 'Enter') {
      setMinSequenceLengthSliderText(event.target.value);
    }
  }
  function setMinSequenceLengthSliderText(number){
    minSequenceLengthSliderText.value = `${parseInt(number)}`;
  }


  // Spam Threshold Slider
  spamThresholdSliderText.addEventListener('keydown', spamThresholdSliderDirectInput);
  spamThresholdSliderText.addEventListener('blur', spamThresholdSliderDirectInput);
  spamThresholdSlider.addEventListener('input', function (event) {
    document.getElementById('spamThresholdSliderText').style.filter = 'brightness(65%)';
    setspamThresholdSliderText(event.target.value);
  });
  spamThresholdSlider.addEventListener('change', function (event) {
    document.getElementById('spamThresholdSliderText').style.filter = 'brightness(100%)';
    setSetting('spamThreshold', event.target.value);
  });
  function spamThresholdSliderDirectInput(event){
    if (event.type === 'blur' || event.key === 'Enter') {
      setspamThresholdSliderText(event.target.value);
    }
  }
  function setspamThresholdSliderText(number){
    spamThresholdSliderText.value = `${parseInt(number)}`;
  }



  // Replace with n Repetitions
  replaceWithCountSliderText.addEventListener('keydown', replaceWithCountSliderDirectInput);
  replaceWithCountSliderText.addEventListener('blur', replaceWithCountSliderDirectInput);
  replaceWithCountSlider.addEventListener('input', function (event) {
    document.getElementById('replaceWithCountSliderText').style.filter = 'brightness(65%)';
    setreplaceWithCountSliderText(event.target.value);
  });
  replaceWithCountSlider.addEventListener('change', function (event) {
    document.getElementById('replaceWithCountSliderText').style.filter = 'brightness(100%)';
    setSetting('replaceWithCount', event.target.value);
  });
  function replaceWithCountSliderDirectInput(event){
    if (event.type === 'blur' || event.key === 'Enter') {
      setreplaceWithCountSliderText(event.target.value);
    }
  }
  function setreplaceWithCountSliderText(number){
    replaceWithCountSliderText.value = `${parseInt(number)}`;
  }


  // // Reset settings button
  // restoreDefaultSettingsButton.addEventListener('click', async () => {
  //   momentaryButtonPress('restoreDefaultSettingsButton');
  //   // Block execution until all settings have been defaulted, then reload
  //   await restoreDefaultSettings();
  //   location.reload();
  // });

 
  // Need to wait for the async settings to load before trying to udpdate the menu state
  loadSettings().then(() => {
    loadMenuState();
    // Set slider text brigtnesses to 100%
    const sliderTexts = document.getElementsByClassName('sliderText');
    for(const slider of sliderTexts){
      slider.style.filter = 'brightness(100%)';
    }
  });
});

function momentaryButtonPress(buttonId){
  const button = document.getElementById(buttonId);
  button.classList.toggle("enabled");
  setTimeout( () => {
    button.classList.toggle("enabled");
  }, 150)
}

function onSettingUpdate(key, value){
}

function toggleButton(buttonId) {
  const button = document.getElementById(buttonId);
  return button.classList.toggle("enabled");
}

async function loadMenuState() {
  for (const key in setting) {
    const value = getSetting(key);
    const id = getSettingID(key);
    if(id && (value !== null)){
      applyMenuState(key, value);
    }
  }
}

function applyMenuState(key, value) {
  switch (setting[key].ui) {
    case 'button':
      console.log(`${key}: ${value}`);
      setButton(setting[key].id, value);
      if(key === 'debug' && value){
        toggleDebug();
      } else if(key === 'experimental' && value){
        toggleExperimental();
      }
      break;
    case 'range':
      const slider = document.getElementById(setting[key].id)
      slider.value = value;
      // Trigger the input event listener to update text boxes
      const inputEvent = new Event('input');
      slider.dispatchEvent(inputEvent);
      break;
    case 'text':
      // TODO
      break;
    case 'value':
      // TODO
      break;
    case 'apiKey':
      // Only validated API keys will be saved
      if(value !== ''){
        // Fill in the API key text field with a visual indicator
        fillApiKeyBox();
      }
    break;
  }
}

function setButton(buttonId, savedValue) {
  let button = document.getElementById(buttonId);
  if(button){
    let buttonEnabled = button.classList.contains('enabled');
  
    if (buttonEnabled ^ savedValue) {
      button.classList.add('enabled');
    }
  }
}
