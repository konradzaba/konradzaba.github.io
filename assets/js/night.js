var DarkMode = (function() {
  const DARK_MODE_QUERY = '(prefers-color-scheme: dark)'
  const DARK_CLASS = 'dark'
  function isDark() {
    return window.matchMedia && window.matchMedia(DARK_MODE_QUERY).matches
  }

  function watch(fn) {
    window.matchMedia &&
      window.matchMedia(DARK_MODE_QUERY).addEventListener('change', e => {
        const isDarkMode = e.matches
        fn && fn(isDarkMode)
      })
  }

  function init() {
    var html = document.getElementsByTagName('html')[0].classList
    if (isDark()) {
      html.add(DARK_CLASS)
    }
    watch(function(isDarkMode) {
      isDarkMode ? html.add(DARK_CLASS) : html.remove(DARK_CLASS)
    })
  }

  init()
})()