$(document).ready(function(){
	$('.header').height($(window).height());
	$('.gallery a').simpleLightbox();

	$(window).scroll(function(){
		//checks if window is scrolled more than x px adds/removed solid class
		if($(this).scrollTop()>100){
			$('.navbar').addClass('solid');
		}
		else{
			$('.navbar').removeClass('solid');
		}

		if($(this).scrollTop()>300)
		{
			$('.navbar-brand').removeClass('hidden');			
		}
		else{
			$('.navbar-brand').addClass('hidden');	
		}
	})
})

// The function actually applying the offset
function offsetAnchor() {
	if (location.hash.length !== 0) {
	  window.scrollTo(window.scrollX, window.scrollY - 80);
	}
  }
  
  // Captures click events of all <a> elements with href starting with #
  $(document).on('click', 'a[href^="#"]', function(event) {
	// Click events are captured before hashchanges. Timeout
	// causes offsetAnchor to be called after the page jump.
	window.setTimeout(function() {
	  offsetAnchor();
	}, 0);
  });
  
  // Set the offset when entering page with hash present in the url
  window.setTimeout(offsetAnchor, 0);