var defaultStorage = {
  speedStep: 0.25,
  slowerKey: '-',
  fasterKey: '+',
  resetKey: '*',
  displayOption: 'InPlayerControls',
  allowMouseWheel: true,
  mouseInvert: false,
  rememberSpeed: false,
  presetSpeeds: '1.5, 2',
}

function onSave() {
  var speedStep = document.getElementById('speedStep').valueAsNumber
  var slowerKey = document.getElementById('slowerKeyInput').value
  var fasterKey = document.getElementById('fasterKeyInput').value
  var resetKey = document.getElementById('resetKeyInput').value
  var allowMouseWheel = document.getElementById('allowMouseWheel').checked
  var mouseInvert = document.getElementById('mouseInvert').checked
  var rememberSpeed = document.getElementById('rememberSpeed').checked
  var presetSpeedsRaw = document.getElementById('presetSpeeds').value
  var displayValue = document.querySelector('input[name="displayOption"]:checked').value

  speedStep = isNaN(speedStep) ? defaultStorage.speedStep : speedStep

  var presetSpeeds = presetSpeedsRaw
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => !isNaN(n) && n > 0 && n <= 16)
    .join(', ')

  browser.storage.sync
    .set({
      speedStep: speedStep,
      slowerKey: slowerKey,
      fasterKey: fasterKey,
      resetKey: resetKey,
      displayOption: displayValue,
      mouseInvert: mouseInvert,
      allowMouseWheel: allowMouseWheel,
      rememberSpeed: rememberSpeed,
      presetSpeeds: presetSpeeds,
    })
    .then(function () {
      var statusElem = document.getElementById('status')
      statusElem.textContent = 'Options saved'
      setTimeout(function () {
        statusElem.textContent = ''
      }, 1000)
    })
}

function loadFromStorage() {
  browser.storage.sync.get(defaultStorage).then(function (store) {
    document.getElementById('speedStep').value = Number(store.speedStep).toFixed(2)
    document.getElementById('slowerKeyInput').value = store.slowerKey
    document.getElementById('fasterKeyInput').value = store.fasterKey
    document.getElementById('resetKeyInput').value = store.resetKey
    document.getElementById(store.displayOption).checked = true
    document.getElementById('allowMouseWheel').checked = store.allowMouseWheel
    document.getElementById('mouseInvert').checked = store.mouseInvert
    document.getElementById('rememberSpeed').checked = store.rememberSpeed
    document.getElementById('presetSpeeds').value = store.presetSpeeds
  })
}

function resetStorage() {
  browser.storage.sync.set(defaultStorage).then(function () {
    loadFromStorage()
    var statusElem = document.getElementById('status')
    statusElem.textContent = 'Default options restored'

    setTimeout(function () {
      statusElem.textContent = ''
    }, 1000)
  })
}

function handleDOMContentLoaded() {
  document.getElementById('save').addEventListener('click', onSave)
  document.getElementById('restore').addEventListener('click', resetStorage)

  loadFromStorage()
}

document.addEventListener('DOMContentLoaded', handleDOMContentLoaded)
