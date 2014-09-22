/**
 * Control Panel JavaScript
 * Sapphire Waves
 *
 * Copyright (c) 2014. by Way2CU
 * Author: Mladen Mijatov
 */

function Chart() {
	var self = this;

	self.container = $('div#usage_statistics');
	self.data = null;
	self.chart = null;
	self.chart_options = null;

	/**
	 * Complete object initialization.
	 */
	self.init = function() {
		// create data storage
		self.data = new google.visualization.DataTable();
		self.data.addColumn('date', language_handler.getText(null, 'label_date'));
		self.data.addColumn('number', language_handler.getText(null, 'label_time_used'));

		// configure chart
		self.chart_options = {
				width: self.container.width(),
				height: self.container.height(),
				curveType: 'function',
				pointSize: 5,
				chartArea: {
						left: 40,
						top: 10,
						width: '90%',
						height: '70%'
					},
				backgroundColor: {
						fill: '#E7F1F8',
					},
				hAxis: {
						baselineColor: '#8eb2cb',
						gridlines: {
							color: '#8eb2cb',
							count: 10
						}
					},
				vAxis: {
						baselineColor: '#8eb2cb',
						gridlines: {
							color: '#8eb2cb',
							count: 5
						}
					},
				legend: {
						position: 'bottom'
					}
			};

		self.chart = new google.visualization.LineChart(self.container[0]);

		// load data from server
		new Communicator('sapphire_waves')
					.on_success(self._handle_data_load)
					.on_error(self._handle_data_load_error)
					.get('json_statstics');
	};

	/**
	 * Handle loading data from the server.
	 *
	 * @param object data
	 */
	self._handle_data_load = function(data) {
		for (var i=0, count=data.length; i<count; i++) {
			var item = data[i];
			self.data.addRow([
						new Date(item[1]),
						parseInt(item[0]) / 60
					]);
		}

		self.chart.draw(self.data, self.chart_options);
	};

	/**
	 * Handle error during data load.
	 *
	 * @param object xhr
	 * @param string request_status
	 * @param string error_message
	 */
	self._handle_data_load_error = function(xhr, request_status, error_message) {
		console.log(request_status, error_message);
	};

	// finalize object
	self.init();
}

/**
 * Handle password change form submit event.
 *
 * @param object event
 * @return boolean
 */
function handle_password_change(event) {
	// prevent default submit action
	event.preventDefault();

	var form = $(this);
	var overlay = form.find('div.overlay');
	var current_password = form.find('input[name=current_password]');
	var new_password = form.find('input[name=new_password]');
	var repeat_password = form.find('input[name=repeat_password]');

	// test for password validity
	var old_password_ok = current_password.val() != '';
	var new_password_ok = new_password.val() != '' && new_password.val() == repeat_password.val();

	// mark invalid fields
	if (!old_password_ok)
		current_password.addClass('invalid'); else
		current_password.removeClass('invalid');

	if (!new_password_ok) {
		new_password.addClass('invalid');
		repeat_password.addClass('invalid');

	} else {
		new_password.removeClass('invalid');
		repeat_password.removeClass('invalid');
	}

	if (form.find('.invalid').length > 0)
		return;

	// prepare data
	var data = {
			'current_password': current_password.val(),
			'new_password': new_password.val()
		};
	
	// show overlay
	overlay
		.css({
			display: 'block',
			opacity: 0
		})
		.animate({opacity: 1}, 300);

	// send password change request
	if (old_password_ok && new_password_ok)
		new Communicator('backend')
				.on_success(function(data) {
					dialog.setTitle(language_handler.getText(null, 'title_password_change'));
					dialog.setError(data.error);
					dialog.setSize(300, 100);
					dialog.setContent(dialog_content);
					dialog_content.html(data.message);

					// reset fields
					form[0].reset();
					
					// show dialog
					dialog.show();

					// show form again
					overlay.animate({opacity: 0}, 300, function() {
							$(this).css('display', 'none');
						});
				})
				.on_error(function(xhr, request_status, error_string) {
					dialog.setTitle(language_handler.getText(null, 'title_password_change'));
					dialog.setError(data.error);
					dialog.setSize(300, 100);
					dialog.setContent(dialog_content);
					dialog_content.html(data.message);
					
					// show dialog
					dialog.show();

					// show form again
					overlay.animate({opacity: 0}, 300, function() {
							$(this).css('display', 'none');
						});
				})
				.send('save_unpriviledged_password', data);
}

$(function() {
	new Chart();

	// implement password change
	$('div.account_settings form').submit(handle_password_change);
});
