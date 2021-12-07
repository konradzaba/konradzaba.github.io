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
	
	if(localStorage.getItem('darkTheme') == null){
		isDark() ? localStorage.setItem('darkTheme','true') : localStorage.setItem('darkTheme','false');
	}

	if (localStorage.getItem('darkTheme')=='false') {
      html.remove(DARK_CLASS)
    }
	
	if (localStorage.getItem('darkTheme')=='true') {
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