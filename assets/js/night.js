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
	debugger
    var html = document.getElementsByTagName('html')[0].classList
	
	if(sessionStorage.getItem('darkTheme') == null){
		isDark() ? sessionStorage.setItem('darkTheme','true') : sessionStorage.setItem('darkTheme','false');
	}

	if (sessionStorage.getItem('darkTheme')=='false') {
      html.remove(DARK_CLASS)
    }
	
	if (sessionStorage.getItem('darkTheme')=='true') {
		html.add(DARK_CLASS)
	}
	else{
		html.remove(DARK_CLASS)
	}
    watch(function(isDarkMode) {
      isDarkMode ? html.add(DARK_CLASS) : html.remove(DARK_CLASS);
    })
  }

  init()
})()