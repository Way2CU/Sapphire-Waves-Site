/**
 * General functions for web frontend
 * Sapphire Waves
 *
 * Copyright (c) 2014. by Way2CU
 * Author: Mladen Mijatov
 */

var created_ga = false;
var items_to_show = null;
var window_height = 0;
var main_menu_position = 0;
var top_container = null;
var dialog = null;
var dialog_content = null;

/**
 * When window is resized cache the size for faster access.
 *
 * @param object event
 * @return boolean
 */
function update_size(event) {
	window_height = $(window).height();
}

/**
 * Show elements when they become visible as user scrolls down the page.
 *
 * @param object event
 * @return boolean
 */
function show_elements(event) {
	var bottom_position = $(window).scrollTop() + window_height;

	items_to_show.each(function(index) {
		var item = $(this);
		var offset = item.data('offset');

		if (offset.top <= bottom_position && item.hasClass('hidden'))
			item.removeClass('hidden');
	});
}

/**
 * Show pop-up form container.
 *
 * @param object container
 */
function show_form_container(container) {
	var all_containers = $('div.pop-up');

	// hide other containers
	all_containers.not(container).slideUp();

	// show assigned container
	container
		.slideDown(function(event) {
			container.data('can-hide', true);
		})
		.bind('clickoutside', function(event) {
			if (!container.data('can-hide'))
				return;

			container
				.slideUp()
				.removeData('can-hide')
				.unbind('clickoutside');
		});
}

function toggle_top_container_visibility() {
	if (top_container.hasClass('visible'))
		top_container.removeClass('visible').slideUp(); else
		top_container.addClass('visible').slideDown();
}

/**
 * Handle submission of contact from.
 *
 * @param object event
 */
function handle_contact_form_submit(event) {
	var form = $(this);
	var overlay = form.find('div.overlay');
	var fields = form.find('input, textarea');
	var data = {};
	var empty_fields = 0;

	// prevent browser from submitting manually
	event.preventDefault();

	// get data from form
	fields.each(function() {
		var field = $(this);

		data[field.attr('name')] = field.val();
		if (field.data('required') && field.val() == '')
			empty_fields++;
	});

	// email must contain few characters
	var position_at = data.email.indexOf('@', 0);
	var position_dot = data.email.indexOf('.', position_at);

	if (!(position_at > 0 && position_dot > position_at))
		empty_fields++;

	// there are invalid fields, don't submit
	if (empty_fields > 0) {
		dialog.setError(true);
		dialog.setSize(300, 100);
		dialog.setContent(dialog_content);
		dialog.setTitle(language_handler.getText(null, 'title_contact_us'));
		dialog_content.html(language_handler.getText(null, 'contact_message_missing_fields'));
		dialog.show();
		return;
	}

	// show overlay
	overlay
		.css({
			display: 'block',
			opacity: 0
		})
		.animate({opacity: 1}, 300);
	
	// send data to server
	new Communicator('contact_form')
			.on_success(function(data) {
				// show form again
				overlay.animate({opacity: 0}, 300, function() {
						$(this).css('display', 'none');
					});

				// show dialog
				dialog.setError(data.error);
				dialog.setSize(300, 100);
				dialog.setContent(dialog_content);
				dialog.setTitle(language_handler.getText(null, 'title_contact_us'));
				dialog_content.html(data.message);
				dialog.show();

				// reset form fields
				form[0].reset();

				// hide contact form
				toggle_top_container_visibility();
			})
			.send('send_from_ajax', data);
}

/**
 * Detach and reattach main menu depending on page scroll position.
 *
 * @param object event
 * @return boolean
 */
function update_main_menu(event) {
	var main_menu = $('nav#main');
	var top_position = $(window).scrollTop();
	var floating = main_menu.hasClass('detached');

	if (!floating && top_position > main_menu_position) {
		main_menu.addClass('detached');

	} else if (floating && top_position < main_menu_position) {
		main_menu.removeClass('detached');
	}
}

$(function() {
	dialog = new Dialog();
	dialog_content = $('<div>');

	dialog_content.css('padding', 20);
	top_container = $('div#top_container');

	// configure main menu events
	var main_menu = $('nav#main');

	if (main_menu.length > 0) {
		main_menu_position = main_menu.offset().top;
		$(window).scroll(update_main_menu);
	}

	// implement events for each element
	$('a[data-event]').click(function(event) {
		var item = $(this);
		var label = item.data('event');
		var event_data = {
			'eventCategory': 'Button',
			'eventAction': 'Click',
			'eventLabel': label
		};

		if (item.data('delay-event') == 1) {
			event.preventDefault();

			event_data['hitCallback'] = function() {
				document.location = item.attr('href');
			};
		}

		// send an event
		if (typeof ga != 'undefined') {
			if (!created_ga) {
				ga('create', 'UA-42556571-6');
				created_ga = true;
			}

			ga('send', 'event', event_data);
		}
	});
	
	// implement testimonials
	$('a.testimonial, a.watch_video').not('.mobile').click(function(event) {
		event.preventDefault();

		// get properties needed for dialog
		var item = $(this);
		var url = item.attr('href');
		var title = item.attr('title');

		// configure dialog
		dialog.setTitle(title);
		dialog.setError(false);
		dialog.setScroll(false)
		dialog.setClearOnClose(true);
		dialog.setSize(800, 450);
		dialog.setContentFromURL(url);
		dialog.showWhenReady();
	});

	// implement slides resize
	update_size();
	$(window).resize(update_size);

	// implement reveal animations
	items_to_show = $('.hidden');
	$(window).scroll(show_elements);

	// cache item offsets to speed up later calculations
	items_to_show.each(function(index) {
		var item = $(this);
		var offset = item.offset();

		offset.top += item.height() / 2;
		item.data('offset', offset);
	});

	// scroll to the top by clicking on logo
	$('nav#main .logo').click(function(event) {
		$(window).scrollTop(0);
		event.preventDefault();
	});

	// implement start button
	$('a.start').click(function(event) {
		event.preventDefault();
		window.open($(this).attr('href'), '_blank', 'directories=0,fullscreen=0,height=420,width=350,location=0,menubar=0,resizable=0,scrollbars=0,status=0,toolbar=0');
	});

	// implement pop-up forms
	var buttons = $('a.login, a.sign-up, a.settings');

	buttons.click(function(event) {
		// prevent browser from following URL
		event.preventDefault();

		// get required data
		var item = $(this);
		var container = item.parent().find('div.pop-up').eq(0);

		// handle buttons other buttons on the page
		if (container.length == 0 && item.hasClass('sign-up')) {
			$(window).scrollTop(0);
			buttons.filter('.sign-up').filter('.original').trigger('click');
			return;
		}

		// show form
		show_form_container(container);
	});

	// show login window if hash is provided
	if (window.location.hash == '#login')
		$('a.login').trigger('click');

	// show password recovery form
	$('a.password-recovery').click(function(event) {
		// prevent browser from following URL
		event.preventDefault();

		// get required data
		var item = $('a.login');
		var container = item.parent().find('div.pop-up').eq(1);

		// show form
		show_form_container(container);
	});

	// show contact form from the top
	$('a.contact-us').click(function(event) {
		event.preventDefault();

		if (top_container.hasClass('visible')) {
			toggle_top_container_visibility();
			return;
		}

		new Communicator('contact-us')
				.on_success(function(data) {
					top_container.html($(data));
					top_container.find('form')
						.submit(handle_contact_form_submit)
						.find('button.close').click(function(event) {
							toggle_top_container_visibility();
							event.preventDefault();
						});
					toggle_top_container_visibility();
				})
				.use_cache(true)
				.get('_default', undefined, 'html');
	});

	// implement login form behavior
	$('a.login').parent().find('form').eq(0)
		.submit(function(event) {
			var form = $(this);
			var overlay = form.find('div.overlay');
			var fields = form.find('input');
			var data = {};

			// prevent default behavior
			event.preventDefault();
			
			// collect data
			fields
				.removeClass('invalid')
				.each(function(index) {
					var field = $(this);

					if (field.attr('type') == 'checkbox')
						data[field.attr('name')] = field.is(':checked') ? 1 : 0; else
						data[field.attr('name')] = field.val();

					if (field.data('required') && field.val() == '')
						field.addClass('invalid');
				});

			// there are invalid fields, don't submit
			if (fields.filter('.invalid').length > 0)
				return;

			// show overlay
			overlay
				.css({
					display: 'block',
					opacity: 0
				})
				.animate({opacity: 1}, 300);

			// send data
			new Communicator('backend')
					.on_success(function(data) {
						// handle response
						if (data.logged_in) {
							location.reload(true);

						} else {
							// show form again
							overlay.animate({opacity: 0}, 300, function() {
									$(this).css('display', 'none');
								});

							dialog.setTitle(language_handler.getText(null, 'menu_sign_in'));
							dialog.setError(data.error);
							dialog.setSize(300, 100);
							dialog.setContent(dialog_content);
							dialog_content.html(data.message);
							dialog.show();
						}

						// if (data.show_captcha) {
						// 	form.find('div.captcha')
						// 		.data('required', 1)
						// 		.slideDown();
						// }
					})
					.get('json_login', data);

		})
		.find('input').focus(function(event) {
			$(this).removeClass('invalid');
		});

	// implement password recovery form
	$('div#password_recovery_form form')
		.submit(function(event) {
			var form = $(this);
			var overlay = form.find('div.overlay');
			var fields = form.find('input');
			var data = {};

			// prevent default behavior
			event.preventDefault();
			
			// collect data
			fields
				.removeClass('invalid')
				.each(function(index) {
					var field = $(this);

					data[field.attr('name')] = field.val();
					if (field.data('required') && field.val() == '')
						field.addClass('invalid');
				});

			// there are invalid fields, don't submit
			if (fields.filter('.invalid').length > 0)
				return;

			// show overlay
			overlay
				.css({
					display: 'block',
					opacity: 0
				})
				.animate({opacity: 1}, 300);

			// send request to server
			new Communicator('backend')
				.on_success(function(data) {
					// show form again
					overlay.animate({opacity: 0}, 300, function() {
							$(this).css('display', 'none');
						});

					// prepare dialog
					dialog.setTitle(language_handler.getText(null, 'title_password_recovery'));
					dialog.setError(data.error);
					dialog.setSize(300, 100);
					dialog.setContent(dialog_content);
					dialog_content.html(data.message);

					// reset data if user was created
					if (!data.error)
						form[0].reset();

					// show dialog
					dialog.show();
				})
				.on_error(function(xhr, status, error) {
					dialog.setTitle(language_handler.getText(null, 'title_password_recovery'));
					dialog.setError(true);
					dialog.setSize(300, 100);
					dialog.setContent(dialog_content);
					dialog_content.html(error);

					dialog.show();
				})
				.get('password_recovery', data);
		})
		.find('input').focus(function(event) {
			$(this).removeClass('invalid');
		});

	// implement logout option
	$('a.logout').click(function(event) {
		// prevent default behavior
		event.preventDefault();

		// send data
		new Communicator('backend')
				.on_success(function(data) {
					if (!data.logged_in)
						location.reload(true);
				})
				.get('json_logout');
	});

	// implement signup form
	$('a.sign-up').parent().find('form')
		.submit(function(event) {
			var form = $(this);
			var overlay = form.find('div.overlay');
			var fields = form.find('input');
			var data = {
					show_result: 1
				};

			// prevent default behavior
			event.preventDefault();
			
			// collect data
			fields
				.removeClass('invalid')
				.each(function(index) {
					var field = $(this);

					data[field.attr('name')] = field.val();
					if (field.data('required'))
						if ((field.attr('type') != 'checkbox' && field.val() == '') ||
							(field.attr('type') == 'checkbox' && !field.is(':checked')))
							field.addClass('invalid');
				});
			data.username = data.email;

			// email must contain few characters
			var position_at = data.email.indexOf('@', 0);
			var position_dot = data.email.indexOf('.', position_at);

			if (!(position_at > 0 && position_dot > position_at))
				fields.filter('[name=email]').addClass('invalid');

			// passwords must match
			if (data.password != data.password_repeat)
				fields.filter('[name=password_repeat]').addClass('invalid');

			// there are invalid fields, don't submit
			if (fields.filter('.invalid').length > 0)
				return;

			// show overlay
			overlay
				.css({
					display: 'block',
					opacity: 0
				})
				.animate({opacity: 1}, 300);

			// send data
			new Communicator('backend')
					.on_success(function(data) {
						// show form again
						overlay.animate({opacity: 0}, 300, function() {
								$(this).css('display', 'none');
							});

						// prepare dialog
						dialog.setTitle(language_handler.getText(null, 'title_sign_up'));
						dialog.setError(data.error);
						dialog.setSize(300, 100);
						dialog.setContent(dialog_content);

						if (!data.error)
							dialog_content.html(language_handler.getText(null, 'message_user_created')); else
							dialog_content.html(data.message); 

						// reset data if user was created
						if (!data.error)
							form[0].reset();

						// show dialog
						dialog.show();
					})
					.on_error(function(xhr, status, error) {
						dialog.setTitle(language_handler.getText(null, 'title_sign_up'));
						dialog.setError(true);
						dialog.setSize(300, 100);
						dialog.setContent(dialog_content);
						dialog_content.html(error);

						dialog.show();
					})
					.send('save_unpriviledged_user', data);

		})
		.find('input').focus(function(event) {
			$(this).removeClass('invalid');
		});

	// // implement captcha refresh
	// $('button.reload_captcha').click(function(event) {
	// 	var images = $('label.captcha img');
	// 	var input = $('label.captcha input');
	// 	var source = images.eq(0).data('source');

	// 	images.attr('src', source + '&amp;' + Date.now());
	// 	input.val('');
	// });

	// implement mobile menu
	if ($('meta[name=viewport]').length > 0)
		new MobileMenu('mobile_top', 'main');

	// web site beacon
	var license = 'b3f22-cdc5baa5b5-77ab0a8154-e608d';
	var beacon = new Beacon('sapphire_waves', 'web_site', license);
	beacon.set_interval(30).start();
});
