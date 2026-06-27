var state = {
  settings: {
    speed: 1,
    speedStep: 0.25,
    slowerKey: '-',
    fasterKey: '+',
    resetKey: '*',
    displayOption: 'InPlayerControls',
    allowMouseWheel: true,
    mouseInvert: false,
    rememberSpeed: false,
    presetSpeeds: '1.5, 2',
  },
}

browser.storage.sync.get(state.settings).then(function (storage) {
  Object.assign(state.settings, storage)
  state.settings.speed = Number(state.settings.speed)
  state.settings.speedStep = Number(state.settings.speedStep)
  state.settings.fasterKeys = state.settings.fasterKey.split(',')
  state.settings.slowerKeys = state.settings.slowerKey.split(',')
  state.settings.resetKeys = state.settings.resetKey.split(',')

  if (!state.settings.rememberSpeed) state.settings.speed = 1

  function flashIndicator() {
    var box = document.getElementById('PlayBackRatePanel')
    if (!box) return
    var savedDisplay = box.style.display
    if (savedDisplay === 'none') {
      box.style.display = 'inline-flex'
      setTimeout(function () { box.style.display = savedDisplay }, 300)
    }
  }

  function changeRate(action) {
    var videoElems = document.getElementsByTagName('video')
    var newSpeed = state.settings.speed

    if (action === 'faster') {
      newSpeed = Math.min(newSpeed + state.settings.speedStep, 16)
    } else if (action === 'slower') {
      newSpeed = Math.max(newSpeed - state.settings.speedStep, 0)
    } else if (action === 'reset') {
      if (newSpeed === 1) {
        newSpeed = state.resetedSpeed || 1
      } else {
        state.resetedSpeed = newSpeed
        newSpeed = 1
      }
    }

    for (let videoElem of videoElems) {
      if (!videoElem.classList.contains('vc-cancelled')) {
        videoElem.playbackRate = newSpeed
      }
    }
    flashIndicator()
  }

  function setRateExact(rate) {
    for (let videoElem of document.getElementsByTagName('video')) {
      if (!videoElem.classList.contains('vc-cancelled')) {
        videoElem.playbackRate = rate
      }
    }
    flashIndicator()
  }

  function initializeControls(videoElem) {
    var currentSpeed = state.settings.speed
    var inPlayerControls = state.settings.displayOption == 'InPlayerControls'
    var presetSpeeds = String(state.settings.presetSpeeds || '')
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= 16)

    var box = document.createElement('div')
    box.id = 'PlayBackRatePanel'
    box.className = inPlayerControls ? 'PlayBackRatePanel PlayBackRatePanelInPlayer' : 'PlayBackRatePanel'
    box.style.display = (state.settings.displayOption === 'None' || state.settings.displayOption === 'FadeInFadeOut') ? 'none' : 'inline-flex'

    var controls = []
    controls.push(`<button id="SpeedDown" class="ysc-btn ysc-btn-left"><</button>`)
    controls.push(`<button id="PlayBackRate" class="ysc-btn">${currentSpeed.toFixed(2)}</button>`)
    controls.push(`<button id="SpeedUp" class="ysc-btn">></button>`)
    presetSpeeds.forEach(s => {
      controls.push(`<button data-ysc-preset="${s}" class="ysc-btn ysc-btn-preset">${s.toFixed(s % 1 === 0 ? 0 : 1)}x</button>`)
    })

    if (!inPlayerControls) {
      const lastIdx = controls.length - 1
      controls[lastIdx] = controls[lastIdx].replace('class="', 'class="ysc-btn-preset-last ')
    }

    box.innerHTML = controls.join('')
    var speedIndicator = box.querySelector('#PlayBackRate')

    if (state.settings.displayOption == 'Simple') {
      box.querySelector('#SpeedDown').style.display = 'none'
      box.querySelector('#SpeedUp').style.display = 'none'
      speedIndicator.style.border = 'none'
      speedIndicator.style.background = 'transparent'
    }

    function mountIntoPlayerControls() {
      var rightControls = document.querySelector('.ytp-right-controls')
      if (rightControls) {
        rightControls.insertBefore(box, rightControls.firstChild)
        return true
      }
      return false
    }

    if (inPlayerControls) {
      if (!mountIntoPlayerControls()) {
        videoElem.parentElement.parentElement.insertBefore(box, videoElem.parentElement)
        var moveObserver = new MutationObserver(() => {
          if (mountIntoPlayerControls()) moveObserver.disconnect()
        })
        moveObserver.observe(document.documentElement, { childList: true, subtree: true })
        setTimeout(() => moveObserver.disconnect(), 30000)
      }
    } else {
      videoElem.parentElement.parentElement.insertBefore(box, videoElem.parentElement)
      videoElem.parentElement.parentElement.addEventListener('mouseover', handleMouseIn)
      videoElem.parentElement.parentElement.addEventListener('mouseout', handleMouseOut)
    }

    box.addEventListener('click', e => {
      if (e.target.id === 'SpeedDown') changeRate('slower')
      else if (e.target.id === 'SpeedUp') changeRate('faster')
      else if (e.target.id === 'PlayBackRate') changeRate('reset')
      else if (e.target.hasAttribute && e.target.hasAttribute('data-ysc-preset')) {
        setRateExact(Number(e.target.getAttribute('data-ysc-preset')))
      }
      e.preventDefault()
      e.stopPropagation()
    }, true)

    box.addEventListener('dblclick', e => {
      e.preventDefault()
      e.stopPropagation()
    }, true)

    return speedIndicator
  }

  function handleMouseIn() {
    var box = document.getElementById('PlayBackRatePanel')
    if (state.settings.displayOption == 'FadeInFadeOut') box.style.display = 'inline-flex'
  }

  function handleMouseOut() {
    var box = document.getElementById('PlayBackRatePanel')
    if (state.settings.displayOption == 'FadeInFadeOut' && box.className != 'PlayBackRatePanelFullScreen') {
      box.style.display = 'none'
    }
  }

  function initVideo(videoElem) {
    if (!videoElem || !videoElem.parentElement || !videoElem.parentElement.parentElement) return
    if (videoElem.dataset.ysc && videoElem.parentElement.parentElement.querySelector('#PlayBackRatePanel')) return
    videoElem.dataset.ysc = '1'

    var speedIndicator = initializeControls(videoElem)

    videoElem.addEventListener('play', () => { videoElem.playbackRate = state.settings.speed })

    videoElem.addEventListener('ratechange', () => {
      if (videoElem.readyState === 0) return
      state.settings.speed = videoElem.playbackRate
      speedIndicator.textContent = state.settings.speed.toFixed(2)
      browser.storage.sync.set({ speed: state.settings.speed })
    })

    videoElem.playbackRate = state.settings.speed
  }

  function handleWheel(e) {
    if (e.shiftKey && 'deltaY' in e) {
      var faster = state.settings.mouseInvert ? e.deltaY > 0 : e.deltaY < 0
      changeRate(faster ? 'faster' : 'slower')
    }
  }

  function handleKeyDown(e) {
    if (document.activeElement.nodeName === 'INPUT' && document.activeElement.getAttribute('type') === 'text') return
    if (state.settings.fasterKeys.includes(e.key)) changeRate('faster')
    else if (state.settings.slowerKeys.includes(e.key)) changeRate('slower')
    else if (state.settings.resetKeys.includes(e.key)) changeRate('reset')
  }

  function onFullscreen() {
    var box = document.getElementById('PlayBackRatePanel')
    if (!box) return
    box.className = document.fullscreenElement !== null ? 'PlayBackRatePanelFullScreen' : 'PlayBackRatePanel'
  }

  if (state.settings.allowMouseWheel) document.addEventListener('wheel', handleWheel, false)
  document.addEventListener('keydown', handleKeyDown, true)
  document.addEventListener('fullscreenchange', onFullscreen, false)
  document.addEventListener('yt-navigate-finish', () => scanForVideos())
  document.addEventListener('yt-page-data-updated', () => scanForVideos())

  var mutationObserver = new MutationObserver(mutations => {
    for (var m of mutations) {
      for (var node of m.addedNodes) {
        if (!node || node.nodeType !== 1) continue
        if (node.nodeName === 'VIDEO') initVideo(node)
        else if (node.getElementsByTagName) {
          for (let v of node.getElementsByTagName('video')) initVideo(v)
        }
      }
    }
  })
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true })

  function scanForVideos() {
    for (let v of document.getElementsByTagName('video')) initVideo(v)
  }
  scanForVideos()
})

browser.runtime.sendMessage('show_page_action')
