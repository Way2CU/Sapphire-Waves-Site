/**
 * Slides JavaScript
 * Sapphire Waves
 *
 * Copyright (c) 2013. by Way2CU
 * Author: Mladen Mijatov
 */

function SlideControls() {
	var self = this;

	self._paused = false;
	self._show_next = false;
	self._container = null;
	self._active_slide = null;
	self._slides = null;
	self._controls = null;
	self._slide_buttons = null;
	self._slide_animators = new Array();

	/**
	 * Complete object initialization.
	 */
	self._init = function() {
		self._container = $('div#slides');
		self._slides = self._container.find('div.slide');
		
		// create controls
		self._controls = $('div#slides div.controls');
		self._slides.each(function(index) {
			var button = $('<a>');
			
			// configure button
			button
				.attr('href', 'javascript:void(0);')
				.data('slide', index)
				.click(self._handle_button_click)
				.appendTo(self._controls);

			// store button for later use
			if (self._slide_buttons == null) {
				button.addClass('active');  // select first button
				self._slide_buttons = button;

			} else {
				self._slide_buttons = self._slide_buttons.add(button);
			}
		});

		// create slide animators
		self._slide_animators.push(new MainSlide(self));
		self._slide_animators.push(new FirstSlide(self));
		self._slide_animators.push(new SecondSlide(self));
		self._slide_animators.push(new ThirdSlide(self));

		// connect events for container
		self._container.hover(
					self._handle_mouse_enter,
					self._handle_mouse_leave
				);

		// show initial slide
		self._show_slide(0);
	};

	self.next_slide = function(event) {
		// prevent default behavior
		if (event != undefined)
			event.preventDefault();

		// calculate next slide index
		var slide = self._active_slide + 1;
		if (slide >= self._slides.length)
			slide = 0;

		// show specific slide
		self._show_slide(slide);
	};

	/**
	 * Switch to previous slide.
	 *
	 * @param object event
	 */
	self.previous_slide = function(event) {
		// prevent default behavior
		if (event != undefined)
			event.preventDefault();

		// calculate previous slide index
		var slide = self._active_slide - 1;
		if (slide < 0)
			slide = self._slides.length - 1;

		// show specific slide
		self._show_slide(slide);
	};

	/**
	 * Notification from slide that animation is completed.
	 */
	self.notify_slide_end = function() {
		if (!self._paused)
			setTimeout(self.next_slide, 4000); else
			self._show_next = true;
	};

	/**
	 * Switch between slides.
	 *
	 * @param integer slide
	 */
	self._show_slide = function(slide) {
		// don't allow showing already visible slide
		if (self._active_slide == slide)
			return;

		// get slide objects
		var current_slide = self._slides.eq(self._active_slide);
		var new_slide = self._slides.eq(slide);

		// notify animators
		if (self._active_slide != null)
			self._slide_animators[self._active_slide].stop();
		self._slide_animators[slide].play();

		// make the transition
		if (self._active_slide != null)
			current_slide
				.animate(
						{opacity: 0}, 1000, 
						function() { 
							current_slide.css('visibility', 'hidden') 
						}
					);

		new_slide
			.css({
				visibility: 'visible',
				opacity: 0
			})
			.animate({opacity: 1}, 1000);

		// mark active slide button
		self._slide_buttons
				.removeClass('active')
				.eq(slide).addClass('active');

		// store new slide index for future use
		self._active_slide = slide;
	};

	/**
	 * Handle clicking on slide button.
	 *
	 * @param object event
	 */
	self._handle_button_click = function(event) {
		// prevent default behavior
		event.preventDefault();

		// switch to associated slide
		var slide = $(this).data('slide');
		self._show_slide(slide);
	};

	/**
	 * Handle mouse entering slides container.
	 *
	 * @param object event
	 * @return boolean
	 */
	self._handle_mouse_enter = function(event) {
		self._paused = true;
	};

	/**
	 * Handle mouse leaving slides container.
	 *
	 * @param object event
	 * @return boolean
	 */
	self._handle_mouse_leave = function(event) {
		self._paused = false;

		if (self._show_next) {
			self._show_next = false;
			self.next_slide();
		}
	};

	// finalize object
	self._init();
}


function MainSlide(controller) {
	var self = this;

	self.controller = controller;
	self.timeout_id = null;

	self.container = null;
	self.image_screen = null;
	self.image_widget = null;
	self.image_glass = null;
	self.glow = null;

	/**
	 * Complete object initialization.
	 */
	self.init = function() {
		self.container = $('div#slides div#main-slide.slide');
		self.image_screen = self.container.find('img.screen');
		self.image_widget = self.container.find('img.widget');
		self.image_glass = self.container.find('img.glass');

		self.glow = $('<span>');
		self.glow.insertAfter(self.image_screen);
	};

	/**
	 * Replay slide from beginning.
	 */
	self.play = function() {
		self._reset_slide();

		self.timeout_id = setTimeout(self._animate_step1, 1000);
	};

	/**
	 * Stop playing slide.
	 */
	self.stop = function() {
		if (self.timeout_id != null) {
			clearTimeout(self.timeout_id);
			self.timeout_id = null;
		}
	};

	/**
	 * Reset slide before animating.
	 */
	self._reset_slide = function() {
		self.image_screen.css({
					left: 0,
					bottom: 40
				});

		self.image_widget.css({
					left: 115,
					bottom: 160,
					opacity: 0
				});

		self.image_glass.css({
					right: -self.image_glass.width(),
					bottom: 0
				});

		self.glow.css('opacity', 0);
	};

	/**
	 * First animation step.
	 */
	self._animate_step1 = function() {
		self.image_glass.animate({right: 0}, 800);
		self.image_widget
				.delay(800)
				.animate({opacity: 1}, 1000);
		self.glow
				.delay(800)
				.animate(
					{opacity: 1},
					1000,
					function() {
						// notify controller animation has ended
						setTimeout(self.controller.notify_slide_end, 10000);
					}
				);
	};

	/**
	 * Handle timeout.
	 */
	self._handleTimeout = function() {
		self.timeout_id = null;
		self.controller.notify_slide_end();
	};

	// finalize object
	this.init();
}


function FirstSlide(controller) {
	var self = this;

	self.controller = controller;
	self.container = null;
	self.image_droplet = null;
	self.image_tree = null;
	self.image_line = null;

	self.tree_size = null;

	/**
	 * Complete object initialization.
	 */
	self.init = function() {
		self.container = $('div#slides div#1.slide');
		
		self.image_droplet = self.container.find('img.droplet');
		self.image_tree = self.container.find('img.tree');
		self.image_line = self.container.find('img.line');

		self.tree_size = {
				width: self.image_tree.width(),
				height: self.image_tree.height()
			};
	};

	/**
	 * Reset slide element positions.
	 */
	self._reset_slide = function() {
		self.image_droplet.css({
					top: -self.image_droplet.height(),
					left: (400 - self.image_droplet.width()) / 2
				});

		self.image_line.css({
					bottom: 0,
					left: (400 - self.image_line.width()) / 2,
					opacity: 0,
					width: 0,
					marginLeft: 60
				});

		self.image_tree.css({
					bottom: -self.image_tree.height(),
					left: (400 - self.image_tree.width()) / 2,
					width: self.tree_size.width * 0.2,
					height: self.tree_size.height * 0.2,
					marginLeft: (self.tree_size.width - (self.tree_size.width * 0.2)) / 2
				});
	};

	/**
	 * Animate first step.
	 */
	self._animate_step1 = function() {
		self.image_droplet.animate({top: 400}, 800);
		self.image_line
				.delay(500)
				.animate({
					opacity: 1,
					width: 120,
					marginLeft: 0
				}, 300);
		self.image_tree
				.delay(1100)
				.animate({
					bottom: 0,
					width: self.tree_size.width * 1.2,
					height: self.tree_size.height * 1.2,
					marginLeft: 0
				}, 1000,
				function() {
					// notify controller animation has ended
					self.controller.notify_slide_end();
				});
	};

	/**
	 * Replay slide from beginning.
	 */
	self.play = function() {
		// reset objects
		self._reset_slide();

		// delay slide animation for a moment
		setTimeout(self._animate_step1, 2000);
	};

	/**
	 * Stop playing slide.
	 */
	self.stop = function() {
		self.image_line.stop(true, false);
		self.image_tree.stop(true, false);
		self.image_droplet.stop(true, false);
	};

	// finalize object
	this.init();
}


function SecondSlide(controller) {
	var self = this;

	self.controller = controller;
	self.time = null;
	self.playing = false;

	self.container = null;
	self.image_pipes = null;
	self.image_fan = null;
	self.image_glass = null;
	self.image_drop = new Array();
	self.last_drop_size = null;

	// relative element positions
	self.position_fan = {
				left: 29,
				top: 283
			};

	self.position_glass = {
				left: -20,
				top: 830
			};

	self.position_drop = [
				{left: 55, top: -330},
				{left: 40, top: -40},
				{left: 65, top: -50},
				{left: 30, top: -80},
				{left: 71, top: -110}
			];

	/**
	 * Complete object initialization.
	 */
	self._init = function() {
		self.container = $('div#slides div#2.slide');
		
		self.image_pipes = self.container.find('img.pipe');
		self.image_fan = self.container.find('img.fan');
		self.image_glass = self.container.find('img.glass');

		// grab all the drops
		for (var i=1, count=5; i<=count; i++) {
			var drop = self.container.find('img.drop'+i);

			if (drop.length > 0)
				self.image_drop.push(drop);
		}
	};

	/**
	 * Reset slide animation.
	 */
	self._reset_slide = function() {
		var position = {left: 120, top: 250};

		// configure pipes
		self.image_pipes.css({
					left: position.left,
					top: position.top
				});

		// configure fan
		self.image_fan.css({
					left: position.left + self.position_fan.left,
					top: position.top + self.position_fan.top
				});

		// configure glass at the bottom
		self.image_glass.css({
					left: position.left + self.position_glass.left,
					top: position.top + self.position_glass.top
				});

		// configure drops
		for (var i=0, count=self.image_drop.length; i<count; i++) {
			var drop = self.image_drop[i];
			var data = self.position_drop[i];

			drop.css({
					left: position.left + data.left,
					top: position.top + data.top
				});

			if (i == 0)
				drop.show(); else
				drop.hide();
		}

		// store size for animation
		self.last_drop_size = {
					width: self.image_drop[4].width(),
					height: self.image_drop[4].height()
				};
	};

	/**
	 * Handle requestAnimationFrame call.
	 *
	 * @param integer timestamp
	 */
	self._handle_animation_request = function(timestamp) {
		if (self.time == null)
			self.time = timestamp;

		// calulate rotation angle based on time (360° / 1s)
		progress = timestamp - self.time;
		angle = Math.round((359 * progress) / 1000);

		// make sure we don't go into infinity
		if (angle > 359) {
			self.time = timestamp;
			angle = 0;
		}

		// apply rotation
		self.image_fan.css({
					transform: 'rotate('+angle+'deg)',
					mozTransform: 'rotate('+angle+'deg)',
					webkitTransform: 'rotate('+angle+'deg)'
				});

		// continue animation cycle if we are still playing
		if (self.playing)
			requestAnimationFrame(self._handle_animation_request);
	};

	/**
	 * Animate elements to first step.
	 */
	self._animate_step1 = function() {
		var time = 2000;
		var position = {left: 120, top: -100};

		self.image_pipes.animate(
					{
						left: position.left,
						top: position.top
					}, time
				);

		self.image_fan.animate(
					{
						left: position.left + self.position_fan.left,
						top: position.top + self.position_fan.top
					}, time
				);

		self.image_drop[0].animate(
					{top: 200}, time,
					function() {
						self.image_drop[0].hide();
						self.image_drop[1].show();
					}
				);

		self.image_glass.animate(
					{
						left: position.left + self.position_glass.left,
						top: position.top + self.position_glass.top
					}, time,
					function() {
						// move on to next step
						if (self.playing)
							setTimeout(self._animate_step2, 1000);
					}
				);
	};

	/**
	 * Animate elements to second step.
	 */
	self._animate_step2 = function() {
		var time = 2000;
		var position = {left: -270, top: -100};

		self.image_pipes.animate(
					{
						left: position.left,
						top: position.top
					}, time
				);

		self.image_fan.animate(
					{
						left: position.left + self.position_fan.left,
						top: position.top + self.position_fan.top
					}, time
				);

		self.image_drop[1].animate(
					{left: 170}, time,
					function() {
						self.image_drop[1].hide();
						self.image_drop[2].show();
					}
				);

		self.image_glass.animate(
					{
						left: position.left + self.position_glass.left,
						top: position.top + self.position_glass.top
					}, time,
					function() {
						if (self.playing)
							setTimeout(self._animate_step3, 1000);
					}
				);
	};

	/**
	 * Animate elements to third step.
	 */
	self._animate_step3 = function() {
		var time = 2000;
		var position = {left: -270, top: -450};

		self.image_pipes.animate(
					{
						left: position.left,
						top: position.top
					}, time
				);

		self.image_fan.animate(
					{
						left: position.left + self.position_fan.left,
						top: position.top + self.position_fan.top
					}, time
				);

		self.image_drop[2].animate(
					{top: position.top + 600}, time,
					function() {
						self.image_drop[2].hide();
						self.image_drop[3].show();
					}
				);

		self.image_glass.animate(
					{
						left: position.left + self.position_glass.left,
						top: position.top + self.position_glass.top
					}, time, function() {
						if (self.playing)
							setTimeout(self._animate_step4, 1000);
					}
				);
	};

	/**
	 * Animate elements to fourth step.
	 */
	self._animate_step4 = function() {
		var time = 2000;
		var position = {left: 170, top: -550};

		self.image_pipes.animate(
					{
						left: position.left,
						top: position.top
					}, time
				);

		self.image_fan.animate(
					{
						left: position.left + self.position_fan.left,
						top: position.top + self.position_fan.top
					}, time
				);

		self.image_drop[3]
				.animate(
					{
						left: position.left + 50,
						top: position.top + 620
					}, time,
					function() {
						self.image_drop[3].hide();
					}
				);

		self.image_glass.animate(
					{
						left: position.left + self.position_glass.left,
						top: position.top + self.position_glass.top
					}, time,
					function() {
						if (self.playing)
							setTimeout(self._animate_step5, 1000);
					}
				);
	};

	/**
	 * Animate last step.
	 */
	self._animate_step5 = function() {
		self.image_drop[4]
				.css({
					width: 0,
					height: 0,
					marginLeft: 0,
					opacity: 1
				})
				.show()
				.animate({
					width: self.last_drop_size.width,
					height: self.last_drop_size.height,
					marginLeft: - Math.round(self.last_drop_size.width / 2)
				}, 1000)
				.animate({
					width: self.last_drop_size.width - 10,
					height: self.last_drop_size.height - 10,
					marginLeft: - Math.round((self.last_drop_size.width - 10) / 2)
				}, 300)
				.animate({
					width: self.last_drop_size.width,
					height: self.last_drop_size.height,
					marginLeft: - Math.round(self.last_drop_size.width / 2)
				}, 300)
				.animate({
					width: self.last_drop_size.width - 10,
					height: self.last_drop_size.height - 10,
					marginLeft: - Math.round((self.last_drop_size.width - 10) / 2)
				}, 300)
				.animate({
					width: self.last_drop_size.width,
					height: self.last_drop_size.height,
					marginLeft: - Math.round(self.last_drop_size.width / 2)
				}, 300)
				.animate({
					top: 300,
					opacity: 0
				}, 600,
				function() {
					// notify controller animation has ended
					self.controller.notify_slide_end();
				});
	};

	/**
	 * Play slide.
	 */
	self.play = function() {
		self.playing = true;

		// reset positions
		self._reset_slide();

		// animate elements
		setTimeout(self._animate_step1, 2000);

		// start fan animation
		requestAnimationFrame(self._handle_animation_request);
	};

	/**
	 * Stop playing slide.
	 */
	self.stop = function() {
		self.playing = false;
		self.image_pipes.stop(true, false);
		self.image_fan.stop(true, false);
		self.image_glass.stop(true, false);

		for (var i=0, count=self.image_drop.length; i<count; i++)
			self.image_drop[i].stop(true, false);
	};

	// finalize object
	self._init();
}


function ThirdSlide(controller) {
	var self = this;

	self.controller = controller;
	self.container = null;
	self.image_body = null;
	self.image_gradient = null;
	self.image_fill = null;
	self.image_brain = null;
	self.image_lungs = null;
	self.image_heart = null;
	self.image_liver = null;
	self.image_bars = new Array();
	self.overlays = null;

	// target widths
	self.target_bar_width = [10, 50, 30, 60];

	/**
	 * Complete object initialization.
	 */
	self._init = function() {
		var spacing = 50;

		self.container = $('div#slides div#3.slide');

		self.image_body = self.container.find('img.body');
		self.image_gradient = self.container.find('img.gradient');
		self.image_fill = self.container.find('img.fill');
		self.image_brain = self.container.find('img.brain');
		self.image_lungs = self.container.find('img.lungs');
		self.image_heart = self.container.find('img.heart');
		self.image_liver = self.container.find('img.liver');

		self.overlays = self.container.find('div.overlay');

		// configure elements
		var body_css = {
					left: 30,
					top: 30
				};
		self.image_body.css(body_css);
		self.image_gradient.css(body_css);
		self.image_fill.css(body_css);

		self.image_brain.css({
					left: 335,
					top: 41
				});

		self.image_lungs.css({
					left: 340,
					top: 90
				});

		self.image_heart.css({
					left: 345,
					top: 140
				});

		self.image_liver.css({
					left: 335,
					top: 200
				});

		// position all bars
		for (var i=1, count=4; i<=count; i++) {
			var bar = self.container.find('img.bar'+i);

			bar.css({
					left: 200,
					top: 50 + ((i - 1) * spacing)
				});

			// add bar to the list for later use
			self.image_bars.push(bar);
		}

		// position all the labels
		self.container.find('span').each(function(index) {
			var label = $(this);

			label.css({
					left: 200,
					top: 28 + (index * spacing)
				});
		});

		// position overlays
		self.overlays.each(function(index) {
			var overlay = $(this);

			overlay.css({
					top: 51 + (index * spacing),
					width: 116
				});
		});
	};

	/**
	 * Reset slide objects.
	 */
	self._reset_slide = function() {
		self.overlays.each(function(index) {
			var overlay = $(this);
			overlay.css('width', 116);
		});

		self.image_gradient.css('opacity', 0);
		self.image_fill.css('opacity', 0);
	};

	/**
	 * Animate frist step.
	 */
	self._animate_step1 = function() {
		self.overlays.each(function(index) {
			var overlay = $(this);

			overlay
				.delay(index * 700)
				.animate({width: 0}, 3000);
		});

		self.image_gradient.animate({opacity: 1}, 3000);
		self.image_fill
				.delay(3000)
				.animate(
					{opacity: 1}, 3000,
					function() {
						// notify controller animation has ended
						self.controller.notify_slide_end();
					});
	};

	/**
	 * Start playing slide from beginning.
	 */
	self.play = function() {
		// reset slides to original position
		self._reset_slide();

		// delay first animation
		setTimeout(self._animate_step1, 2000);
	};

	/**
	 * Stop playing slide.
	 */
	self.stop = function() {
		self.overlays.stop(true, false);
		self.image_gradient.stop(true, false);
		self.image_fill.stop(true, false);
	};

	// finalize object
	self._init();
}

$(function() {
	var slide_controls = new SlideControls();

});
