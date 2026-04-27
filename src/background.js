// In MV3 there is only `browser.action`. To mimic the old page-action behavior
// (icon enabled only on YouTube tabs) we disable the action by default and
// enable it per-tab when the content script signals it is running.
browser.action.disable()

browser.runtime.onMessage.addListener(function (request, sender) {
  if (request === 'show_page_action' && sender.tab && sender.tab.id != null) {
    browser.action.enable(sender.tab.id)
  }
})

browser.action.onClicked.addListener(function () {
  browser.runtime.openOptionsPage()
})
