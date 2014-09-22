/**
 * Password Recovery JavaScript
 * Sapphire Waves
 *
 * Copyright (c) 2014. by Way2CU
 * Author: Mladen Mijatov
 */

$(function() {
	var dialog = new Dialog();
	var content = $('<div>');

	content.css('padding', 20);
	$('div#password-recovery form').submit(function(event) {
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

		// passwords must match
		if (data.password != data.password_repeat)
			fields.find('input[name=password_repeat]').addClass('invalid');

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
					dialog.setTitle(language_handler.getText(null, 'title_password_recovery'));
					dialog.setError(data.error);
					dialog.setSize(300, 100);
					dialog.setContent(content);
					content.html(data.message);

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
					dialog.setContent(content);
					content.html(error);

					dialog.show();
				})
				.send('password_recovery_save', data);

	})
	.find('input').focus(function(event) {
		$(this).removeClass('invalid');
	});
});
