/**
 * Main JavaScript
 * Site Name
 *
 * Copyright (c) 2014. by Way2CU, http://way2cu.com
 * Authors:
 */
var Caracal = Caracal || {};


function on_site_load() {
	if ($('div.article').length > 0) {
		Caracal.testimonial_pages = new PageControl('div.testimonials_container', 'div.article')
		Caracal.testimonial_pages.attachControls('div.testimonials_container nav a')
	}
	
	$('div.testimonial a.arrow').click(function(event) { 
		event.preventDefault(); 
		$(this).parent().toggleClass('active');
	});	
}

$(on_site_load);