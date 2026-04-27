browser.runtime.sendMessage({}, function (o) {
  /**
   * Enum string values.
   * @enum {string}
   */
  const RATE_ACTIONS = {
    FASTER: 'faster',
    SLOWER: 'slower',
    RESET: 'reset',
  }

  var state = {
    settings: {
      speed: 1,
      speedStep: 0.25,
      slowerKeyCode: '109,189,173',
      fasterKeyCode: '107,187,61',
      resetKeyCode: '106',
      displayOption: 'InPlayerControls',
      allowMouseWheel: true,
      mouseInvert: false,
      rememberSpeed: false,
      presetSpeeds: '1.5, 2',
    },
  }

  var refInterval

  browser.storage.sync.get(state.settings).then(function (storage) {
    state.settings.speed = Number(storage.speed) * 100
    state.settings.speedStep = Number(storage.speedStep) * 100
    state.settings.slowerKeyCode = storage.slowerKeyCode
    state.settings.fasterKeyCode = storage.fasterKeyCode
    state.settings.resetKeyCode = storage.resetKeyCode
    state.settings.displayOption = storage.displayOption
    state.settings.allowMouseWheel = Boolean(storage.allowMouseWheel)
    state.settings.mouseInvert = Boolean(storage.mouseInvert)
    state.settings.rememberSpeed = Boolean(storage.rememberSpeed)
    state.settings.presetSpeeds =
      storage.presetSpeeds == null ? '1.5, 2' : storage.presetSpeeds
    refInterval = setInterval(refreshFn, 16)
  })

  function getStateSpeed() {
    return isNaN(Number(state.settings.speed)) ? 100 : Number(state.settings.speed)
  }

  function getStateStepSpeed() {
    return isNaN(Number(state.settings.speedStep)) ? 25 : Number(state.settings.speedStep)
  }

  function getPlaybackReadySpeed() {
    return getStateSpeed() / 100
  }

  function setStateSpeed(value) {
    state.settings.speed = Number(value)
  }

  function refreshFn() {
    if (document.readyState === 'complete') {
      clearInterval(refInterval)

      state.videoController = function (videoElem) {
        this.video = videoElem
        if (!state.settings.rememberSpeed) {
          setStateSpeed(100)
        }

        this.initializeControls()

        videoElem.addEventListener('play', function () {
          videoElem.playbackRate = getPlaybackReadySpeed()
        })

        videoElem.addEventListener(
          'ratechange',
          function () {
            if (videoElem.readyState === 0) {
              return
            }
            var currentSpeed = this.getVideoSpeed()
            setStateSpeed(currentSpeed)
            this.speedIndicator.textContent = (currentSpeed / 100).toFixed(2)
            browser.storage.sync.set({ speed: currentSpeed / 100 })
          }.bind(this)
        )

        videoElem.playbackRate = getPlaybackReadySpeed()
      }

      state.videoController.prototype.getVideoSpeed = function () {
        return Number(String((this.video.playbackRate).toFixed(2)).replace('.','')) // trick how to parse like 1.12 to 112 without any phantom 0.(0)1
      }

      state.videoController.prototype.remove = function () {
        this.parentElement.removeChild(this)
      }

      state.videoController.prototype.initializeControls = function () {
        var docFragment = document.createDocumentFragment()

        var box = document.createElement('div')
        box.setAttribute('id', 'PlayBackRatePanel')
        box.className = 'PlayBackRatePanel'

        var btnRateView = document.createElement('button')
        btnRateView.setAttribute('id', 'PlayBackRate')
        btnRateView.className = 'ysc-btn'

        var btnDecreaseSpeed = document.createElement('button')
        btnDecreaseSpeed.setAttribute('id', 'SpeedDown')
        btnDecreaseSpeed.className = 'ysc-btn ysc-btn-left'
        btnDecreaseSpeed.textContent = '<'

        var btnIncreaseSpeed = document.createElement('button')
        btnIncreaseSpeed.setAttribute('id', 'SpeedUp')
        btnIncreaseSpeed.className = 'ysc-btn ysc-btn-right'
        btnIncreaseSpeed.textContent = '>'

        var presetSpeeds = String(state.settings.presetSpeeds || '')
          .split(',')
          .map(function (s) { return Number(s.trim()) })
          .filter(function (n) { return !isNaN(n) && n > 0 && n <= 16 })
        var btnPresets = presetSpeeds.map(function (s) {
          var b = document.createElement('button')
          b.setAttribute('data-ysc-preset', String(s))
          b.className = 'ysc-btn ysc-btn-preset'
          b.textContent = s.toFixed(s % 1 === 0 ? 0 : 1) + 'x'
          return b
        })

        function hidePresets() {
          btnPresets.forEach(function (b) { b.style.display = 'none' })
        }

        var inPlayerControls = state.settings.displayOption == 'InPlayerControls'

        if (state.settings.displayOption == 'None') {
          box.style.display = 'none'
          btnIncreaseSpeed.style.display = 'none'
          btnDecreaseSpeed.style.display = 'none'
          btnRateView.style.border = 'none'
          btnRateView.style.background = 'transparent'
          hidePresets()
        } else if (state.settings.displayOption == 'Always') {
          box.style.display = 'inline'
        } else if (state.settings.displayOption == 'Simple') {
          box.style.display = 'inline'
          btnIncreaseSpeed.style.display = 'none'
          btnDecreaseSpeed.style.display = 'none'
          btnRateView.style.border = 'none'
          btnRateView.style.background = 'transparent'
          hidePresets()
        } else if (state.settings.displayOption == 'FadeInFadeOut') {
          box.style.display = 'none'
        } else if (inPlayerControls) {
          box.className = 'PlayBackRatePanel PlayBackRatePanelInPlayer'
          box.style.display = 'inline-flex'
        } else {
          box.style.display = 'inline'
        }

        // Order matters. For default modes the panel uses float:right so children
        // appear right-to-left. For in-player mode we use flex (no reversal).
        if (inPlayerControls) {
          box.appendChild(btnDecreaseSpeed)
          box.appendChild(btnRateView)
          box.appendChild(btnIncreaseSpeed)
          btnPresets.forEach(function (b) { box.appendChild(b) })
        } else {
          // Panel uses float:right, so the first appended child ends up on the
          // right. Order here yields visual: "< rate > [preset1] [preset2]".
          if (btnPresets.length) {
            btnPresets[btnPresets.length - 1].classList.add('ysc-btn-preset-last')
          } else {
            // No presets: the > arrow is now the rightmost element and gets
            // the rounded right corners.
            btnIncreaseSpeed.classList.add('ysc-btn-preset-last')
          }
          btnPresets.slice().reverse().forEach(function (b) { box.appendChild(b) })
          box.appendChild(btnIncreaseSpeed)
          box.appendChild(btnRateView)
          box.appendChild(btnDecreaseSpeed)
        }
        docFragment.appendChild(box)

        var self = this
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
            // Fallback to default location until the player controls appear,
            // then move it into place.
            this.video.parentElement.parentElement.insertBefore(docFragment, this.video.parentElement)
            var moveObserver = new MutationObserver(function () {
              if (mountIntoPlayerControls()) {
                moveObserver.disconnect()
              }
            })
            moveObserver.observe(document.documentElement, { childList: true, subtree: true })
            // Safety stop after 30s.
            setTimeout(function () { moveObserver.disconnect() }, 30000)
          }
        } else {
          this.video.parentElement.parentElement.insertBefore(docFragment, this.video.parentElement)
          this.video.parentElement.parentElement.addEventListener('mouseover', handleMouseIn)
          this.video.parentElement.parentElement.addEventListener('mouseout', handleMouseOut)
        }

        var currentSpeed =  getStateSpeed() / 100

        btnRateView.textContent = currentSpeed.toFixed(2)
        this.speedIndicator = btnRateView

        box.addEventListener(
          'click',
          function (value) {
            if (value.target === btnDecreaseSpeed) {
              changeRate(RATE_ACTIONS.SLOWER)
            } else if (value.target === btnIncreaseSpeed) {
              changeRate(RATE_ACTIONS.FASTER)
            } else if (value.target === btnRateView) {
              changeRate(RATE_ACTIONS.RESET)
            } else if (value.target.hasAttribute && value.target.hasAttribute('data-ysc-preset')) {
              setRateExact(Number(value.target.getAttribute('data-ysc-preset')))
            }
            value.preventDefault()
            value.stopPropagation()
          },
          true
        )

        box.addEventListener(
          'dblclick',
          function (value) {
            value.preventDefault()
            value.stopPropagation()
          },
          true
        )
      }

      function handleMouseIn() {
        var box = document.getElementById('PlayBackRatePanel')
        if (state.settings.displayOption == 'FadeInFadeOut') {
          box.style.display = 'inline'
        }
      }

      function handleMouseOut() {
        var box = document.getElementById('PlayBackRatePanel')
        if (
          state.settings.displayOption == 'FadeInFadeOut' &&
          box.className != 'PlayBackRatePanelFullScreen'
        ) {
          box.style.display = 'none'
        }
      }

      function changeVideoSpeed(videoElem, speed) {
        videoElem.playbackRate = speed / 100
      }

      /**
       * Sets the exact playback rate (e.g. 1, 1.5, 2) on all uncancelled videos.
       * @param {number} rate
       */
      function setRateExact(rate) {
        var videoElems = document.getElementsByTagName('video')
        for (let videoElem of videoElems) {
          if (!videoElem.classList.contains('vc-cancelled')) {
            changeVideoSpeed(videoElem, rate * 100)
          }
        }
        var box = document.getElementById('PlayBackRatePanel')
        if (box) {
          var savedStyleDisplay = box.style.display
          if (savedStyleDisplay === 'none') {
            box.style.display = 'inline'
            setTimeout(function () { box.style.display = savedStyleDisplay }, 300)
          }
        }
      }

      /**
       *
       * @param {RATE_ACTIONS} action
       */
      function changeRate(action) {
        var videoElems = document.getElementsByTagName('video')

        for (let videoElem of videoElems) {
          if (!videoElem.classList.contains('vc-cancelled')) {
            var newSpeed

            if (action === RATE_ACTIONS.FASTER) {
              newSpeed = Math.min(getStateSpeed() + getStateStepSpeed(), 1600)
            }
            if (action === RATE_ACTIONS.SLOWER) {
              newSpeed = Math.max(getStateSpeed() - getStateStepSpeed(), 0)
            }
            if (action === RATE_ACTIONS.RESET) {
              if (getStateSpeed() === 100) {
                newSpeed = state.resetedSpeed
              } else {
                state.resetedSpeed = getStateSpeed()
                newSpeed = 100
              }
            }

            changeVideoSpeed(videoElem, newSpeed)
          }
        }

        var box = document.getElementById('PlayBackRatePanel')
        var savedStyleDisplay = box.style.display
        if (savedStyleDisplay === 'none') {
          box.style.display = 'inline'

          setTimeout(function () {
            box.style.display = savedStyleDisplay
          }, 300)
        }
      }

      function handleWheel(e) {
        if (e.shiftKey) {
          if ('deltaY' in e) {
            rolled = e.deltaY
            if (state.settings.mouseInvert) {
              if (rolled > 0) changeRate(RATE_ACTIONS.FASTER)
              else if (rolled < 0) changeRate(RATE_ACTIONS.SLOWER)
            } else {
              if (rolled > 0) changeRate(RATE_ACTIONS.SLOWER)
              else if (rolled < 0) changeRate(RATE_ACTIONS.FASTER)
            }
          }
        }
      }

      var processedVideos = new WeakSet()

      function attachController(videoElem) {
        if (!videoElem || processedVideos.has(videoElem)) {
          // Video already processed; if the panel got removed by YouTube's
          // SPA re-rendering, re-inject it.
          if (
            videoElem &&
            videoElem.parentElement &&
            videoElem.parentElement.parentElement &&
            !videoElem.parentElement.parentElement.querySelector('#PlayBackRatePanel')
          ) {
            processedVideos.delete(videoElem)
          } else {
            return
          }
        }
        if (!videoElem.parentElement || !videoElem.parentElement.parentElement) {
          return
        }
        processedVideos.add(videoElem)
        new state.videoController(videoElem)
      }

      function scanForVideos(root) {
        var videos = (root || document).getElementsByTagName('video')
        for (let v of videos) {
          attachController(v)
        }
      }

      var mutationObserver = new MutationObserver(function (mutations) {
        for (var m of mutations) {
          for (var node of m.addedNodes) {
            if (!node || node.nodeType !== 1) continue
            if (node.nodeName === 'VIDEO') {
              attachController(node)
            } else if (node.getElementsByTagName) {
              var nested = node.getElementsByTagName('video')
              for (let v of nested) attachController(v)
            }
          }
        }
      })

      function handleKeyDown(e) {
        var keyPressed = e.which
        if (
          document.activeElement.nodeName === 'INPUT' &&
          document.activeElement.getAttribute('type') === 'text'
        ) {
          return false
        }

        if (state.settings.fasterKeyCode.match(new RegExp('(?:^|,)' + keyPressed + '(?:,|$)'))) {
          changeRate(RATE_ACTIONS.FASTER)
        } else if (state.settings.slowerKeyCode.match(new RegExp('(?:^|,)' + keyPressed + '(?:,|$)'))) {
          changeRate(RATE_ACTIONS.SLOWER)
        } else if (state.settings.resetKeyCode.match(new RegExp('(?:^|,)' + keyPressed + '(?:,|$)'))) {
          changeRate(RATE_ACTIONS.RESET)
        }

        return false
      }

      function onFullscreen() {
        var box = document.getElementById('PlayBackRatePanel')
        if (document.fullscreenElement !== null) {
          box.className = 'PlayBackRatePanelFullScreen'
        } else {
          box.className = 'PlayBackRatePanel'
        }
      }

      if (state.settings.allowMouseWheel) {
        document.addEventListener('wheel', handleWheel, false)
      }

      document.addEventListener('keydown', handleKeyDown, true)
      mutationObserver.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
      })
      document.addEventListener('webkitfullscreenchange', onFullscreen, false)
      document.addEventListener('mozfullscreenchange', onFullscreen, false)
      document.addEventListener('fullscreenchange', onFullscreen, false)

      // YouTube SPA navigation: re-scan after the player rebuilds.
      document.addEventListener('yt-navigate-finish', function () {
        scanForVideos()
      })
      document.addEventListener('yt-page-data-updated', function () {
        scanForVideos()
      })

      scanForVideos()
    }
  }
})

browser.runtime.sendMessage('show_page_action')
